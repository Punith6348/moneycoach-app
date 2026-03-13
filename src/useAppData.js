// ─── useAppData.js — Extended with financial planning data ───────────────
import { useState } from "react";

const STORAGE_KEY = "moneyCoachData_v3";

const DEFAULT_STATE = {
  screen:        "onboarding",
  name:          "",
  incomeSources:    [],
  fixedExpenses:    [],
  savingsPlans:     [],
  futurePayments:   [],
  loans:            [],  // [{id, name, principal, rate, tenureMonths, emi, startDate}]
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
  // How many months until next payment date?
  const now  = new Date();
  const due  = new Date(payment.nextDate);
  const diff = Math.max(1, Math.round((due - now) / (1000 * 60 * 60 * 24 * 30)));
  const mUntilDue = Math.min(diff, divisor);
  return Math.ceil(payment.totalAmount / mUntilDue);
}
export function calcTotalReserve(payments) {
  return payments.reduce((s, p) => s + calcMonthlyReserve(p), 0);
}
export function calcRemainingBudget(income, fixed, savings, reserve) {
  return income - fixed - savings - reserve;
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
export function calcLoanTotals(loan) {
  const emi            = loan.emi || calcEMI(loan.principal, loan.rate, loan.tenureMonths);
  const totalPayable   = emi * loan.tenureMonths;
  const totalInterest  = totalPayable - loan.principal;
  // Months elapsed since startDate
  const start          = loan.startDate ? new Date(loan.startDate) : new Date();
  const now            = new Date();
  const monthsElapsed  = Math.max(0, Math.floor((now - start) / (1000*60*60*24*30.44)));
  const monthsLeft     = Math.max(0, loan.tenureMonths - monthsElapsed);
  const paidAmt        = Math.min(emi * monthsElapsed, totalPayable);
  const outstanding    = Math.max(0, totalPayable - paidAmt);
  const paidPct        = totalPayable > 0 ? Math.min(100, Math.round((paidAmt / totalPayable) * 100)) : 0;
  return { emi, totalPayable, totalInterest, monthsElapsed, monthsLeft, paidAmt, outstanding, paidPct };
}
// "What if EMI increases by X?" helper
export function calcEarlyClosureImpact(loan, extraEmi) {
  const { emi } = calcLoanTotals(loan);
  const newEmi  = emi + extraEmi;
  const r       = loan.rate / 12 / 100;
  if (r === 0) {
    const newMonths = Math.ceil(loan.principal / newEmi);
    return { savedMonths: Math.max(0, loan.tenureMonths - newMonths), savedInterest: 0 };
  }
  // Remaining principal from today
  const start         = loan.startDate ? new Date(loan.startDate) : new Date();
  const now           = new Date();
  const elapsed       = Math.max(0, Math.floor((now - start) / (1000*60*60*24*30.44)));
  const remaining     = Math.max(0, loan.tenureMonths - elapsed);
  const outstandingP  = emi > 0
    ? loan.principal * Math.pow(1+r, elapsed) - emi * (Math.pow(1+r, elapsed) - 1) / r
    : loan.principal;
  if (outstandingP <= 0) return { savedMonths: 0, savedInterest: 0 };
  const newMonths     = Math.ceil(Math.log(newEmi / (newEmi - outstandingP * r)) / Math.log(1+r));
  const savedMonths   = Math.max(0, remaining - newMonths);
  const savedInterest = Math.max(0, Math.round(savedMonths * emi - (savedMonths > 0 ? 0 : 0)));
  // simpler: interest saved = difference in total payable
  const oldTotal      = emi     * remaining;
  const newTotal      = newEmi  * Math.max(0, newMonths);
  return { savedMonths, savedInterest: Math.max(0, Math.round(oldTotal - newTotal)) };
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

// ── HOOK ──────────────────────────────────────────────────────────────────
export function useAppData() {
  const [data, setData] = useState(() => {
    const saved = load();
    return saved ? {...DEFAULT_STATE, ...saved} : {...DEFAULT_STATE};
  });

  const commit = (fn) => {
    setData(prev => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  };

  // Onboarding
  const completeOnboarding = ({name, incomeSources}) => {
    commit(prev => ({...prev, screen:"dashboard", name:name||"", incomeSources}));
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
  const editExpense   = (mk,id,upd)   => commit(prev=>({...prev,allExpenses:{...prev.allExpenses,[mk]:(prev.allExpenses[mk]||[]).map(e=>e.id===id?{...e,...upd}:e)}}));
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

  const resetAll = () => { localStorage.removeItem(STORAGE_KEY); setData({...DEFAULT_STATE}); };

  // Derived financials (computed here so all consumers get same values)
  const totalIncome   = calcTotalIncome(data.incomeSources);
  const totalFixed    = calcTotalFixed(data.fixedExpenses);
  const totalSavings  = calcTotalSavings(data.savingsPlans);
  const totalReserve  = calcTotalReserve(data.futurePayments);
  const remaining     = calcRemainingBudget(totalIncome, totalFixed, totalSavings, totalReserve);
  const dailyLimit    = calcDailyLimit(remaining);

  return {
    screen:data.screen, name:data.name,
    incomeSources:data.incomeSources, fixedExpenses:data.fixedExpenses,
    savingsPlans:data.savingsPlans, futurePayments:data.futurePayments,
    loans: data.loans || [],
    allExpenses:data.allExpenses, checkIns:data.checkIns,
    totalIncome, totalFixed, totalSavings, totalReserve, remaining, dailyLimit,
    completeOnboarding,
    addIncomeSource, updateIncomeSource, deleteIncomeSource,
    addFixedExpense, updateFixedExpense, deleteFixedExpense,
    addSavingsPlan, updateSavingsPlan, deleteSavingsPlan,
    addFuturePayment, updateFuturePayment, deleteFuturePayment,
    addExpense, editExpense, deleteExpense, addCheckIn, resetAll,
    addLoan, updateLoan, deleteLoan,
  };
}
