// ─── useAppData.js — Extended with financial planning data ───────────────
import { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { loadFromFirestore, migrateLocalToFirestore } from "./useFirestoreSync.js";

const STORAGE_KEY = "moneyCoachData_v3";

const DEFAULT_STATE = {
  screen:        "onboarding",
  name:          "",
  incomeSources:    [],
  fixedExpenses:    [],
  savingsPlans:     [],
  futurePayments:   [],
  loans:            [],  // [{id, name, principal, rate, tenureMonths, emi, startDate}]
  creditCards:      [],  // [{id, name, bank, limit, outstanding, minDue, dueDate, apr, rewardRate, bestFor}]
  categoryBudgets:  {},  // { "Food": 3000, "Travel": 1500, ... }
  recurringExpenses:[],  // [{id, label, category, amount, dayOfMonth, note, active}]
  assets:           [],  // [{id, label, type, value, note}]  type: savings|fd|stocks|gold|property|other
  allExpenses:   {},
  checkIns:      [],
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return (typeof p === "object" && p) ? p : null;
  } catch { return null; }
}

function persist(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn("localStorage write failed", e); }
}

// ── Financial calculation helpers ─────────────────────────────────────────
export function calcTotalIncome(sources) {
  return sources.reduce((s, x) => s + (x.amount || 0), 0);
}
export function calcTotalFixed(fixed) {
  return fixed.reduce((s, x) => s + (x.amount || 0), 0);
}
export function calcTotalSavings(plans) {
  return plans.reduce((s, x) => s + (x.amount || 0), 0);
}
// Monthly reserve needed for each future payment
export function calcMonthlyReserve(payment) {
  const months = { yearly: 12, halfyearly: 6, quarterly: 3 };
  const divisor = months[payment.frequency] || 12;
  const now  = new Date();
  const due  = new Date(payment.nextDate + "T00:00:00"); // local midnight, not UTC
  const diff = Math.round((due - now) / (1000 * 60 * 60 * 24 * 30));
  // If already overdue or due this month, reserve full amount; cap at cycle length
  const mUntilDue = Math.max(1, Math.min(diff, divisor));
  return Math.ceil(payment.totalAmount / mUntilDue);
}
export function calcTotalReserve(payments) {
  return payments.reduce((s, p) => s + calcMonthlyReserve(p), 0);
}
export function calcRemainingBudget(income, fixed, savings, reserve, loanEmi = 0) {
  return income - fixed - savings - reserve - loanEmi;
}
export function calcDailyLimit(remaining) {
  const now   = new Date();
  const days  = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const today = now.getDate();
  const daysLeft = Math.max(1, days - today + 1);
  return Math.max(0, Math.round(remaining / daysLeft));
}

// ── Loan calculation helpers ──────────────────────────────────────────────
// Standard reducing-balance EMI formula
export function calcEMI(principal, annualRate, tenureMonths) {
  if (!principal || !annualRate || !tenureMonths) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return Math.round(principal / tenureMonths);
  return Math.round(principal * r * Math.pow(1+r, tenureMonths) / (Math.pow(1+r, tenureMonths) - 1));
}

// Walk an amortization schedule from a given outstanding balance.
// Returns { months, totalInterest } until balance reaches 0.
function amortize(outstanding, annualRate, emi) {
  if (outstanding <= 0 || emi <= 0) return { months: 0, totalInterest: 0 };
  const r = annualRate / 12 / 100;
  let balance = outstanding;
  let totalInterest = 0;
  let months = 0;
  const MAX = 1200; // safety cap (100 years)
  while (balance > 0 && months < MAX) {
    const interest = r > 0 ? balance * r : 0;
    const principal = Math.min(emi - interest, balance);
    if (principal <= 0) break; // EMI too small to cover interest
    totalInterest += interest;
    balance -= principal;
    months++;
  }
  return { months, totalInterest: Math.round(totalInterest) };
}

// Outstanding balance after N months of payments (reducing balance)
function outstandingAfter(principal, annualRate, emi, monthsElapsed) {
  if (monthsElapsed <= 0) return principal;
  const r = annualRate / 12 / 100;
  let balance = principal;
  for (let i = 0; i < monthsElapsed && balance > 0; i++) {
    const interest  = r > 0 ? balance * r : 0;
    const repaid    = Math.min(emi - interest, balance);
    if (repaid <= 0) break;
    balance -= repaid;
  }
  return Math.max(0, balance);
}

export function calcLoanTotals(loan) {
  const emi           = loan.emi || calcEMI(loan.principal, loan.rate, loan.tenureMonths);
  const totalPayable  = emi * loan.tenureMonths;
  const totalInterest = Math.max(0, totalPayable - loan.principal);

  const start         = loan.startDate ? new Date(loan.startDate) : new Date();
  const now           = new Date();
  const monthsElapsed = Math.max(0, Math.floor((now - start) / (1000*60*60*24*30.44)));
  const monthsLeft    = Math.max(0, loan.tenureMonths - monthsElapsed);

  // Actual outstanding balance via amortization walkthrough
  const outstanding   = outstandingAfter(loan.principal, loan.rate, emi, monthsElapsed);

  // Amount paid = principal - remaining principal (true repaid principal)
  const principalPaid = Math.max(0, loan.principal - outstanding);
  // paidPct relative to original principal (not total payable)
  const paidPct       = loan.principal > 0
    ? Math.min(100, Math.round((principalPaid / loan.principal) * 100))
    : 0;

  return {
    emi, totalPayable, totalInterest,
    monthsElapsed, monthsLeft,
    outstanding,
    principalPaid,   // principal repaid so far
    paidAmt: principalPaid,
    paidPct,
  };
}

// "What if EMI increases by X?" — full amortization comparison
export function calcEarlyClosureImpact(loan, extraEmi) {
  const emi      = loan.emi || calcEMI(loan.principal, loan.rate, loan.tenureMonths);
  const newEmi   = emi + extraEmi;
  const r        = loan.rate / 12 / 100;

  // Current outstanding balance
  const start        = loan.startDate ? new Date(loan.startDate) : new Date();
  const now          = new Date();
  const elapsed      = Math.max(0, Math.floor((now - start) / (1000*60*60*24*30.44)));
  const outstanding  = outstandingAfter(loan.principal, loan.rate, emi, elapsed);
  const monthsLeft   = Math.max(0, loan.tenureMonths - elapsed);

  if (outstanding <= 0) return { newEmi, savedMonths: 0, savedInterest: 0, newMonths: 0 };

  // Amortize remaining balance at current EMI vs new EMI
  const orig = amortize(outstanding, loan.rate, emi);
  const next = amortize(outstanding, loan.rate, newEmi);

  const savedMonths   = Math.max(0, orig.months - next.months);
  const savedInterest = Math.max(0, orig.totalInterest - next.totalInterest);

  // New estimated completion date = today + newMonths
  const newEndDate = new Date();
  newEndDate.setMonth(newEndDate.getMonth() + next.months);
  const newCompletionDate = newEndDate.toLocaleDateString("en-IN", {month:"long", year:"numeric"});

  return { newEmi, savedMonths, savedInterest, newMonths: next.months, newCompletionDate };
}

// ── Date/month helpers ────────────────────────────────────────────────────
export const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
};
export const monthKeyToLabel = (key) => {
  const [y,m] = key.split("-");
  return new Date(parseInt(y),parseInt(m)-1,1)
    .toLocaleDateString("en-IN",{month:"long",year:"numeric"});
};
export const getActiveMonthKeys = (allExpenses) => {
  const cur = currentMonthKey();
  const withData = Object.keys(allExpenses).filter(k=>(allExpenses[k]?.length||0)>0);
  return Array.from(new Set([cur,...withData])).sort((a,b)=>b.localeCompare(a));
};

// ── Month carry-forward: run once when month changes ─────────────────────────
// Rules:
// ✅ Income Sources, Fixed Expenses, Loans → stored in data directly, persist always
// ✅ Recurring expenses → auto-log on new month (no duplication)
// ❌ Daily expenses → stored per monthKey, never carry forward
// ❌ No balance carry-forward — each month starts fresh
function checkAndCarryForward(data) {
  const curKey = currentMonthKey();
  const lastCarryKey = data.lastCarryForwardMonth || "";

  // Already processed this month — skip
  if (lastCarryKey === curKey) return data;

  // First time setup — just mark month, no carry needed
  if (!lastCarryKey) return { ...data, lastCarryForwardMonth: curKey };

  // ── New month detected ────────────────────────────────────────────────────
  const now   = new Date();
  const today = now.getDate();
  const mk    = curKey;
  const recs  = data.recurringExpenses || [];
  const existing = data.allExpenses[mk] || [];

  // Auto-log recurring items for new month (no duplicates)
  const toAdd = [];
  recs.forEach(r => {
    if (!r.active) return;
    if (today < r.dayOfMonth) return;
    // Check not already logged this month
    if (existing.some(e => e.recurringId === r.id)) return;
    toAdd.push({
      id:          Date.now() + Math.random(),
      amount:      r.amount,
      label:       r.category,
      note:        r.note || r.label,
      date:        new Date(now.getFullYear(), now.getMonth(), r.dayOfMonth, 9, 0, 0).toISOString(),
      recurringId: r.id,
      auto:        true,
    });
  });

  // Income sources, fixed expenses, loans persist in data automatically
  // No special carry needed — they are not month-scoped
  // Daily expenses stay in their own monthKey — no carry

  return {
    ...data,
    lastCarryForwardMonth: curKey,
    allExpenses: toAdd.length > 0
      ? { ...data.allExpenses, [mk]: [...existing, ...toAdd] }
      : data.allExpenses,
  };
}

// ── HOOK ──────────────────────────────────────────────────────────────────
export function useAppData(firebaseUser = null) {
  const [data, setData] = useState(() => {
    const storedUid = localStorage.getItem("moneyCoachUID");
    const saved = load();
    if (!storedUid || !saved) return {...DEFAULT_STATE};
    const restored = {
      ...DEFAULT_STATE, ...saved,
      loans:             Array.isArray(saved.loans)             ? saved.loans             : [],
      creditCards:       Array.isArray(saved.creditCards)       ? saved.creditCards       : [],
      incomeSources:     Array.isArray(saved.incomeSources)     ? saved.incomeSources     : [],
      fixedExpenses:     Array.isArray(saved.fixedExpenses)     ? saved.fixedExpenses     : [],
      savingsPlans:      Array.isArray(saved.savingsPlans)      ? saved.savingsPlans      : [],
      futurePayments:    Array.isArray(saved.futurePayments)    ? saved.futurePayments    : [],
      checkIns:          Array.isArray(saved.checkIns)          ? saved.checkIns          : [],
      allExpenses:       (saved.allExpenses && typeof saved.allExpenses==="object")       ? saved.allExpenses       : {},
      categoryBudgets:   (saved.categoryBudgets && typeof saved.categoryBudgets==="object") ? saved.categoryBudgets : {},
      recurringExpenses: Array.isArray(saved.recurringExpenses) ? saved.recurringExpenses : [],
      assets:            Array.isArray(saved.assets)            ? saved.assets            : [],
    };
    // Check month carry-forward on every app load
    const carried = checkAndCarryForward(restored);
    // Sanitize: strip any expenses with missing/invalid dates to prevent crashes
    return {
      ...carried,
      allExpenses: Object.fromEntries(
        Object.entries(carried.allExpenses||{}).map(([k,v])=>[
          k,
          (Array.isArray(v)?v:[]).filter(e=>e&&e.date&&typeof e.date==="string"&&e.date.length>0)
        ])
      ),
    };
  });

  // ── Load from Firestore when user logs in ────────────────────────────────
  useEffect(() => {
    if (!firebaseUser) return;
    (async () => {
      // Check if localStorage belongs to a different user
      const storedUid = localStorage.getItem("moneyCoachUID");

      if (storedUid && storedUid !== firebaseUser.uid) {
        // Different user — clear old user's local data completely
        localStorage.removeItem("moneyCoachData_v3");
        localStorage.removeItem("moneyCoachUID");
        // Reset state to default
        setData({...DEFAULT_STATE});
      }

      // Save current user's UID to localStorage
      localStorage.setItem("moneyCoachUID", firebaseUser.uid);

      // Only migrate if this is the SAME user (same UID in storage)
      if (!storedUid || storedUid === firebaseUser.uid) {
        await migrateLocalToFirestore(firebaseUser.uid);
      }

      // Load this user's cloud data
      const cloudData = await loadFromFirestore(firebaseUser.uid);
      if (cloudData) {
        // Sanitize allExpenses — remove entries with missing dates
        const rawExp = (cloudData.allExpenses && typeof cloudData.allExpenses==="object") ? cloudData.allExpenses : {};
        const cleanExp = Object.fromEntries(
          Object.entries(rawExp).map(([k,v])=>[
            k,
            (Array.isArray(v)?v:[]).filter(e=>e&&e.date&&typeof e.date==="string"&&e.date.length>0)
          ])
        );
        const merged = {
          ...DEFAULT_STATE, ...cloudData,
          loans:             Array.isArray(cloudData.loans)             ? cloudData.loans             : [],
          incomeSources:     Array.isArray(cloudData.incomeSources)     ? cloudData.incomeSources     : [],
          fixedExpenses:     Array.isArray(cloudData.fixedExpenses)     ? cloudData.fixedExpenses     : [],
          savingsPlans:      Array.isArray(cloudData.savingsPlans)      ? cloudData.savingsPlans      : [],
          futurePayments:    Array.isArray(cloudData.futurePayments)    ? cloudData.futurePayments    : [],
          checkIns:          Array.isArray(cloudData.checkIns)          ? cloudData.checkIns          : [],
          allExpenses:       cleanExp,
          categoryBudgets:   (cloudData.categoryBudgets && typeof cloudData.categoryBudgets==="object") ? cloudData.categoryBudgets : {},
          recurringExpenses: Array.isArray(cloudData.recurringExpenses) ? cloudData.recurringExpenses : [],
          assets:            Array.isArray(cloudData.assets)            ? cloudData.assets            : [],
        };
        setData(merged);
        persist(merged);
      } else {
        // New user with no cloud data — start fresh with onboarding
        const freshState = {...DEFAULT_STATE};
        setData(freshState);
        persist(freshState);
      }
    })();
  }, [firebaseUser?.uid]);

  const commit = (fn) => {
    setData(prev => {
      const next = fn(prev);
      persist(next);
      // Sync to Firestore if logged in
      if (firebaseUser) {
        const ref = doc(db, "users", firebaseUser.uid);
        setDoc(ref, { data: JSON.stringify(next), updatedAt: Date.now() })
          .catch(e => console.warn("Sync failed:", e));
      }
      return next;
    });
  };

  // Onboarding
  const completeOnboarding = ({name, incomeSources, fixedExpenses=[]}) => {
    commit(prev => ({
      ...prev,
      screen:"dashboard",
      name:name||"",
      incomeSources: incomeSources.map((s,i) => ({...s, id:Date.now()+i})),
      fixedExpenses: fixedExpenses.map((b,i) => ({...b, id:Date.now()+100+i})),
    }));
  };

  // Income sources
  const addIncomeSource    = (src)     => commit(prev => ({...prev, incomeSources:[...prev.incomeSources, {...src, id:Date.now()}]}));
  const updateIncomeSource = (id,upd)  => commit(prev => ({...prev, incomeSources:prev.incomeSources.map(x=>x.id===id?{...x,...upd}:x)}));
  const deleteIncomeSource = (id)      => commit(prev => ({...prev, incomeSources:prev.incomeSources.filter(x=>x.id!==id)}));

  // Fixed expenses
  const addFixedExpense    = (item)    => commit(prev => ({...prev, fixedExpenses:[...prev.fixedExpenses, {...item, id:Date.now()}]}));
  const updateFixedExpense = (id,upd)  => commit(prev => ({...prev, fixedExpenses:prev.fixedExpenses.map(x=>x.id===id?{...x,...upd}:x)}));
  const deleteFixedExpense = (id)      => commit(prev => ({...prev, fixedExpenses:prev.fixedExpenses.filter(x=>x.id!==id)}));

  // Savings plans
  const addSavingsPlan    = (plan)    => commit(prev => ({...prev, savingsPlans:[...prev.savingsPlans, {...plan, id:Date.now()}]}));
  const updateSavingsPlan = (id,upd)  => commit(prev => ({...prev, savingsPlans:prev.savingsPlans.map(x=>x.id===id?{...x,...upd}:x)}));
  const deleteSavingsPlan = (id)      => commit(prev => ({...prev, savingsPlans:prev.savingsPlans.filter(x=>x.id!==id)}));

  // Future payments
  const addFuturePayment    = (p)     => commit(prev => ({...prev, futurePayments:[...prev.futurePayments, {...p, id:Date.now()}]}));
  const updateFuturePayment = (id,upd)=> commit(prev => ({...prev, futurePayments:prev.futurePayments.map(x=>x.id===id?{...x,...upd}:x)}));
  const deleteFuturePayment = (id)    => commit(prev => ({...prev, futurePayments:prev.futurePayments.filter(x=>x.id!==id)}));

  // Daily expenses
  const addExpense    = (e)           => { const k=currentMonthKey(); commit(prev=>({...prev,allExpenses:{...prev.allExpenses,[k]:[...(prev.allExpenses[k]||[]),e]}})); };
  const editExpense   = (mk, id, upd) => commit(prev => {
    const expense = (prev.allExpenses[mk] || []).find(e => e.id === id);
    if (!expense) return prev;
    const updated = { ...expense, ...upd };
    // If date changed to a different month, move between month buckets
    const newMonthKey = updated.date
      ? `${new Date(updated.date).getFullYear()}-${String(new Date(updated.date).getMonth()+1).padStart(2,"0")}`
      : mk;
    if (newMonthKey !== mk) {
      const fromBucket = (prev.allExpenses[mk] || []).filter(e => e.id !== id);
      const toBucket   = [...(prev.allExpenses[newMonthKey] || []), updated];
      return { ...prev, allExpenses: { ...prev.allExpenses, [mk]: fromBucket, [newMonthKey]: toBucket } };
    }
    return { ...prev, allExpenses: { ...prev.allExpenses, [mk]: (prev.allExpenses[mk]||[]).map(e=>e.id===id?updated:e) } };
  });
  const deleteExpense = (mk,id)       => commit(prev=>({...prev,allExpenses:{...prev.allExpenses,[mk]:(prev.allExpenses[mk]||[]).filter(e=>e.id!==id)}}));

  // Check-ins
  const addCheckIn = (ci) => commit(prev=>{
    if(prev.checkIns.some(c=>c.date===ci.date)) return prev;
    return {...prev, checkIns:[...prev.checkIns,ci]};
  });

  // Loans
  const addLoan    = (l)      => commit(prev=>({...prev, loans:[...(prev.loans||[]), {...l, id:Date.now()}]}));
  const updateLoan = (id,upd) => commit(prev=>({...prev, loans:(prev.loans||[]).map(x=>x.id===id?{...x,...upd}:x)}));
  const deleteLoan = (id)     => commit(prev=>({...prev, loans:(prev.loans||[]).filter(x=>x.id!==id)}));

  const addCreditCard    = (c)      => commit(prev=>({...prev, creditCards:[...(prev.creditCards||[]), {...c, id:Date.now()}]}));
  const updateCreditCard = (id,upd) => commit(prev=>({...prev, creditCards:(prev.creditCards||[]).map(x=>x.id===id?{...x,...upd}:x)}));
  const deleteCreditCard = (id)     => commit(prev=>({...prev, creditCards:(prev.creditCards||[]).filter(x=>x.id!==id)}));

  // Category budgets  — value of 0 or undefined means "no budget set"
  const setCategoryBudget = (category, amount) => commit(prev => {
    const next = { ...(prev.categoryBudgets || {}) };
    if (!amount || amount <= 0) { delete next[category]; }
    else { next[category] = Math.round(amount); }
    return { ...prev, categoryBudgets: next };
  });

  // Recurring expenses
  const addRecurring    = (r)      => commit(prev=>({...prev, recurringExpenses:[...(prev.recurringExpenses||[]),{...r,id:Date.now(),active:true}]}));
  const updateRecurring = (id,upd) => commit(prev=>({...prev, recurringExpenses:(prev.recurringExpenses||[]).map(r=>r.id===id?{...r,...upd}:r)}));
  const deleteRecurring = (id)     => commit(prev=>({...prev, recurringExpenses:(prev.recurringExpenses||[]).filter(r=>r.id!==id)}));
  const toggleRecurring = (id)     => commit(prev=>({...prev, recurringExpenses:(prev.recurringExpenses||[]).map(r=>r.id===id?{...r,active:!r.active}:r)}));

  // Assets (for Net Worth)
  const addAsset    = (a)      => commit(prev=>({...prev, assets:[...(prev.assets||[]), {...a, id:Date.now()}]}));
  const updateAsset = (id,upd) => commit(prev=>({...prev, assets:(prev.assets||[]).map(a=>a.id===id?{...a,...upd}:a)}));
  const deleteAsset = (id)     => commit(prev=>({...prev, assets:(prev.assets||[]).filter(a=>a.id!==id)}));
  // Called once on app load — checks each active recurring item
  const autoLogRecurring = () => {
    const now   = new Date();
    const today = now.getDate();
    const mk    = currentMonthKey();
    commit(prev => {
      const recs     = prev.recurringExpenses || [];
      const existing = prev.allExpenses[mk]   || [];
      const toAdd    = [];
      recs.forEach(r => {
        if (!r.active) return;
        if (today < r.dayOfMonth) return; // not due yet this month
        // Check if already auto-logged this month (tagged with recurringId)
        const alreadyLogged = existing.some(e => e.recurringId === r.id);
        if (alreadyLogged) return;
        toAdd.push({
          id: Date.now() + Math.random(),
          amount:      r.amount,
          label:       r.category,
          note:        r.note || r.label,
          date:        new Date(now.getFullYear(), now.getMonth(), r.dayOfMonth, 9, 0, 0).toISOString(),
          recurringId: r.id,   // mark so we don't log twice
          auto:        true,   // flag for UI display
        });
      });
      if (toAdd.length === 0) return prev;
      return { ...prev, allExpenses: { ...prev.allExpenses, [mk]: [...existing, ...toAdd] } };
    });
  };

  // Profile
  const updateName = (newName) => commit(prev => ({ ...prev, name: newName || "" }));

  const resetAll = () => { localStorage.removeItem(STORAGE_KEY); setData({...DEFAULT_STATE}); };

  // Derived financials (computed here so all consumers get same values)
  const totalIncome   = calcTotalIncome(data.incomeSources);
  const totalFixed    = calcTotalFixed(data.fixedExpenses);
  const totalSavings  = calcTotalSavings(data.savingsPlans);
  const totalReserve  = calcTotalReserve(data.futurePayments);
  const totalLoanEmi  = (data.loans||[]).reduce((s,l) => s + (l.emi||0), 0);

  // ── Current month expenses only ──────────────────────────────────────────
  const curMonthKey    = currentMonthKey();
  const thisMonthExp   = (data.allExpenses[curMonthKey] || []);
  const thisMonthSpent = thisMonthExp.reduce((s, e) => s + (e.amount || 0), 0);

  // ── Budget = Income − Fixed − Savings − Reserve − Loan EMIs ─────────────
  const budgetForMonth = calcRemainingBudget(totalIncome, totalFixed, totalSavings, totalReserve, totalLoanEmi);

  // ── TRUE remaining = budget minus this month's daily expenses ────────────
  const remaining  = budgetForMonth - thisMonthSpent;
  const dailyLimit = calcDailyLimit(remaining);

  // ── Last month data — for Charts tab only ────────────────────────────────
  const lastMonthDate  = new Date();
  lastMonthDate.setDate(1);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthKey   = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()+1).padStart(2,"0")}`;
  const lastMonthExp   = (data.allExpenses[lastMonthKey] || []); // ALL last month expenses
  const lastMonthSpent = lastMonthExp.reduce((s, e) => s + (e.amount || 0), 0);
  const lastMonthBudget = budgetForMonth; // same plan
  const lastMonthSaved  = lastMonthBudget - lastMonthSpent;

  // ── Smart suggestions based on remaining balance ──────────────────────────
  const smartSuggestions = (() => {
    const suggestions = [];
    const loanTotals  = calcLoanTotals(data.loans || []);

    if (remaining > 0) {
      // Has money left — suggest good uses
      if ((data.loans||[]).length > 0) {
        const highestLoan = (data.loans||[]).reduce((max, l) =>
          (calcLoanTotals([l]).outstanding > calcLoanTotals([max]).outstanding ? l : max),
          data.loans[0]
        );
        suggestions.push({
          type: "loan",
          icon: "🏦",
          title: "Close Loan Faster",
          desc: `Pay ₹${Math.min(remaining, Math.round(calcLoanTotals([highestLoan]).outstanding)).toLocaleString("en-IN")} extra on ${highestLoan.name} to save interest`,
          action: "View Loans",
          tab: "loans",
        });
      }
      if (remaining > 5000) {
        suggestions.push({
          type: "savings",
          icon: "💰",
          title: "Add to Savings",
          desc: `You have ₹${remaining.toLocaleString("en-IN")} left — consider adding to your savings plan`,
          action: "View Plans",
          tab: "plan",
        });
      }
      if (remaining > 2000 && (data.savingsPlans||[]).length === 0) {
        suggestions.push({
          type: "plan",
          icon: "🎯",
          title: "Start a Savings Goal",
          desc: "No savings plan yet — start one with your leftover budget",
          action: "Add Plan",
          tab: "plan",
        });
      }
    } else {
      // Overspent — warn
      suggestions.push({
        type: "warning",
        icon: "⚠️",
        title: "Over Budget",
        desc: `You've spent ₹${Math.abs(remaining).toLocaleString("en-IN")} more than planned this month`,
        action: "View Expenses",
        tab: "expenses",
      });
    }
    return suggestions;
  })();

  return {
    screen:data.screen, name:data.name,
    incomeSources:data.incomeSources, fixedExpenses:data.fixedExpenses,
    savingsPlans:data.savingsPlans, futurePayments:data.futurePayments,
    loans: data.loans || [],
    creditCards: data.creditCards || [],
    categoryBudgets: data.categoryBudgets || {},
    recurringExpenses: data.recurringExpenses || [],
    allExpenses:data.allExpenses, checkIns:data.checkIns,
    totalIncome, totalFixed, totalSavings, totalReserve, totalLoanEmi,
    remaining, dailyLimit,
    thisMonthSpent, budgetForMonth,
    lastMonthKey, lastMonthSpent, lastMonthSaved, lastMonthBudget,
    smartSuggestions,
    completeOnboarding,
    addIncomeSource, updateIncomeSource, deleteIncomeSource,
    addFixedExpense, updateFixedExpense, deleteFixedExpense,
    addSavingsPlan, updateSavingsPlan, deleteSavingsPlan,
    addFuturePayment, updateFuturePayment, deleteFuturePayment,
    addExpense, editExpense, deleteExpense, addCheckIn, resetAll,
    addLoan, updateLoan, deleteLoan,
    addCreditCard, updateCreditCard, deleteCreditCard,
    setCategoryBudget,
    updateName,
    addRecurring, updateRecurring, deleteRecurring, toggleRecurring, autoLogRecurring,
    assets: data.assets || [],
    addAsset, updateAsset, deleteAsset,
  };
}
