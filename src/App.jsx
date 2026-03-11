// ─── App.jsx — State sync fix ─────────────────────────────────────────────
// FIX: allExpenses and checkIns come ONLY from useAppData (single source).
//      Every tab receives the same expenses reference — no local copies.
//      Adding an expense triggers one commit() → React re-renders ALL tabs.
// ─────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from "react";
import InsightCard      from "./InsightCard";
import SpendingChart    from "./SpendingChart";
import DailyBudgetGuide from "./DailyBudgetGuide";
import DailyCheckIn     from "./DailyCheckIn";
import { useStreak }    from "./useStreak";
import { useAppData, currentMonthKey, monthKeyToLabel, getActiveMonthKeys } from "./useAppData";
import { calculateDailyBudget } from "./DailyBudgetGuide";

// ─── HELPERS ──────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;

const getGreeting = (name) => {
  const h = new Date().getHours();
  const t = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${t}, ${name}` : t;
};

const groupByDate = (expenses) => {
  const groups  = {};
  const todayStr = new Date().toISOString().split("T")[0];
  const yest     = new Date(); yest.setDate(yest.getDate()-1);
  const yestStr  = yest.toISOString().split("T")[0];

  [...expenses].reverse().forEach(e => {
    const d = e.date.split("T")[0];
    const label = d === todayStr ? "Today"
      : d === yestStr ? "Yesterday"
      : new Date(d).toLocaleDateString("en-IN", {weekday:"long",day:"numeric",month:"short"});
    if (!groups[label]) groups[label] = [];
    groups[label].push(e);
  });
  return groups;
};

// ─── CATEGORIES ───────────────────────────────────────────────────────────
const VARIABLE_CATS = [
  {name:"Food",icon:"🍽"},{name:"Travel",icon:"🚗"},{name:"Coffee",icon:"☕"},
  {name:"Grocery",icon:"🛒"},{name:"Medical",icon:"💊"},{name:"Entertainment",icon:"🎬"},
  {name:"Other",icon:"💸"},
];
const FIXED_CATS = [
  {name:"Rent",icon:"🏠"},{name:"Electricity",icon:"⚡"},{name:"Water",icon:"💧"},
  {name:"Internet",icon:"📶"},{name:"EMI/Loan",icon:"🏦"},{name:"Insurance",icon:"🛡"},
  {name:"Maintenance",icon:"🔧"},{name:"School Fees",icon:"🎓"},
];
const ALL_CATS = [...VARIABLE_CATS, ...FIXED_CATS];
const ICONS    = Object.fromEntries(ALL_CATS.map(c => [c.name, c.icon]));
const C = { ink:"#1C1917", muted:"#78716C", border:"#E7E5E0", bg:"#F7F5F0", red:"#DC2626", green:"#16A34A", amber:"#D97706" };

// ─── SHARED UI PIECES ─────────────────────────────────────────────────────
const Label = ({children}) => <p className="label" style={{margin:0}}>{children}</p>;

function ProgressBar({pct}) {
  const color = pct < 60 ? C.green : pct < 85 ? C.amber : C.red;
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{width:`${Math.min(pct,100)}%`,background:color}} />
    </div>
  );
}

function StreakBadge({streak}) {
  if (!streak) return null;
  return (
    <div className="streak-badge">
      <span style={{fontSize:14}}>🔥</span>
      <span style={{fontSize:12,fontWeight:700,color:"#EA580C"}}>{streak}</span>
    </div>
  );
}

// ─── SUMMARY STRIP ────────────────────────────────────────────────────────
// Receives expenses directly — rerenders whenever expenses array changes
function SummaryStrip({monthlyIncome, expenses}) {
  const totalSpent  = expenses.reduce((s,e) => s+e.amount, 0);
  const remaining   = monthlyIncome - totalSpent;
  const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.round((remaining/monthlyIncome)*100)) : 0;
  const remColor    = remaining < 0 ? C.red : remaining < monthlyIncome*0.2 ? C.amber : C.green;
  const rateColor   = savingsRate >= 30 ? C.green : savingsRate >= 15 ? C.amber : C.red;
  return (
    <div className="summary-strip">
      {[
        {label:"Monthly Income",   value:fmt(monthlyIncome),  color:C.ink},
        {label:"Total Spent",      value:fmt(totalSpent),     color:C.red},
        {label:"Remaining",        value:remaining>=0?fmt(remaining):`−${fmt(remaining)}`, color:remColor},
        {label:"Savings Rate",     value:`${savingsRate}%`,   color:rateColor},
      ].map(t => (
        <div key={t.label} className="summary-tile">
          <div className="summary-tile-label">{t.label}</div>
          <div className="summary-tile-value" style={{color:t.color}}>{t.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── MONTH SELECTOR ───────────────────────────────────────────────────────
function MonthSelector({selectedMonth, onChange, allExpenses}) {
  const keys       = getActiveMonthKeys(allExpenses);
  const currentKey = currentMonthKey();
  return (
    <div className="month-bar">
      <select className="month-select" value={selectedMonth} onChange={e => onChange(e.target.value)}>
        {keys.map(key => (
          <option key={key} value={key}>
            {monthKeyToLabel(key)}{key===currentKey?" (Current)":""}
          </option>
        ))}
      </select>
      {selectedMonth===currentKey
        ? <span className="month-badge">📅 This Month</span>
        : <span style={{fontSize:11,color:C.muted}}>Viewing past data · read-only</span>}
    </div>
  );
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────
function EditModal({expense, monthKey, onSave, onClose}) {
  const [amount, setAmount] = useState(String(expense.amount));
  const [label,  setLabel]  = useState(expense.label);
  const [note,   setNote]   = useState(expense.note||"");
  const save = () => {
    const v = parseFloat(amount);
    if (!v || v<=0) return;
    onSave(monthKey, expense.id, {amount:v, label, note:note.trim()});
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontSize:16,fontWeight:700,color:C.ink}}>Edit Expense</p>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.muted}}>✕</button>
        </div>
        <Label>Amount (₹) *</Label>
        <input className="input-base input-number mt-8 mb-12" type="number"
          value={amount} onChange={e=>setAmount(e.target.value)} autoFocus />
        <Label>Category</Label>
        <div className="chip-row">{VARIABLE_CATS.map(c=>(
          <button key={c.name} className={`chip ${label===c.name?"active":""}`} onClick={()=>setLabel(c.name)}>{c.icon} {c.name}</button>
        ))}</div>
        <div className="chip-row" style={{marginTop:0}}>{FIXED_CATS.map(c=>(
          <button key={c.name} className={`chip ${label===c.name?"active":""}`} onClick={()=>setLabel(c.name)}>{c.icon} {c.name}</button>
        ))}</div>
        <Label>Note (optional)</Label>
        <input className="input-base input-text mt-8 mb-14" type="text"
          value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note" />
        <div style={{display:"flex",gap:10}}>
          <button className="btn-ghost" style={{flex:1,padding:11}} onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{flex:2}} onClick={save}>Save Changes ✓</button>
        </div>
      </div>
    </div>
  );
}

// ─── EXPENSE LIST ─────────────────────────────────────────────────────────
// KEY FIX: receives `expenses` as a prop — pure derived render, no local copy
function ExpenseList({expenses, monthKey, onEdit, onDelete, isCurrentMonth}) {
  const [editTarget, setEditTarget] = useState(null);
  const totalSpent = expenses.reduce((s,e) => s+e.amount, 0);
  const groups     = useMemo(() => groupByDate(expenses), [expenses]);

  return (
    <>
      {editTarget && (
        <EditModal expense={editTarget} monthKey={monthKey}
          onSave={onEdit} onClose={()=>setEditTarget(null)} />
      )}
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p className="section-title" style={{margin:0}}>Expenses</p>
          <div style={{textAlign:"right"}}>
            <p style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:600}}>Total</p>
            <p style={{fontSize:18,fontWeight:700,color:C.red,fontFamily:"Georgia,serif"}}>{fmt(totalSpent)}</p>
          </div>
        </div>
        {expenses.length===0 ? (
          <div style={{textAlign:"center",padding:"28px 0"}}>
            <p style={{fontSize:28,marginBottom:8}}>📭</p>
            <p style={{color:C.muted,fontSize:13}}>No expenses logged yet.</p>
          </div>
        ) : Object.entries(groups).map(([groupLabel, items]) => (
          <div key={groupLabel}>
            <p className="expense-group-label">{groupLabel}</p>
            {items.map(e => (
              <div key={e.id} className="expense-row">
                <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
                  <div className="expense-icon">{ICONS[e.label]||"💸"}</div>
                  <div style={{minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:600,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {e.label}{e.note?` · ${e.note}`:""}
                    </p>
                    <p style={{fontSize:11,color:C.muted,marginTop:2}}>
                      {new Date(e.date).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                    </p>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <span style={{fontSize:14,fontWeight:700,color:C.red,fontFamily:"Georgia,serif"}}>{fmt(e.amount)}</span>
                  {isCurrentMonth && (
                    <div className="expense-actions">
                      <button className="btn-edit" onClick={()=>setEditTarget(e)}>Edit</button>
                      <button className="btn-danger" onClick={()=>{ if(window.confirm("Delete this expense?")) onDelete(monthKey,e.id); }}>Del</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── LOG EXPENSE FORM ─────────────────────────────────────────────────────
function LogExpenseForm({onAdd, disabled}) {
  const [amount, setAmount] = useState("");
  const [label,  setLabel]  = useState("Food");
  const [note,   setNote]   = useState("");

  const submit = () => {
    const v = parseFloat(amount.replace(/,/g,""));
    if (!v||v<=0||disabled) return;
    onAdd({amount:v, label, note:note.trim()});
    setAmount(""); setNote(""); // reset form immediately
  };

  return (
    <div className="card" style={{opacity:disabled?0.65:1}}>
      <p className="section-title">+ Log Expense</p>
      {disabled && (
        <div style={{marginBottom:10,padding:"7px 11px",borderRadius:8,background:"#FFFBEB",border:"1px solid #FCD34D",fontSize:12,color:"#D97706"}}>
          ⚠️ Switch to current month to add expenses.
        </div>
      )}
      <Label>Amount (₹) *</Label>
      <input className="input-base input-number mt-8 mb-12" type="number" value={amount}
        onChange={e=>setAmount(e.target.value)} placeholder="e.g. 250"
        onKeyDown={e=>e.key==="Enter"&&submit()} disabled={disabled} />

      <Label>Daily Expenses</Label>
      <div className="chip-row">
        {VARIABLE_CATS.map(c=>(
          <button key={c.name} className={`chip ${label===c.name?"active":""}`}
            onClick={()=>!disabled&&setLabel(c.name)} disabled={disabled}>{c.icon} {c.name}</button>
        ))}
      </div>
      <Label>Fixed / Monthly Bills</Label>
      <div className="chip-row">
        {FIXED_CATS.map(c=>(
          <button key={c.name} className={`chip ${label===c.name?"active":""}`}
            onClick={()=>!disabled&&setLabel(c.name)} disabled={disabled}>{c.icon} {c.name}</button>
        ))}
      </div>
      <Label>Note (optional)</Label>
      <input className="input-base input-text mt-8 mb-12" type="text" value={note}
        onChange={e=>setNote(e.target.value)} placeholder="e.g. Monthly rent" disabled={disabled} />
      <button className="btn-primary" onClick={submit} disabled={disabled}>Save Expense ✓</button>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────
function OnboardingScreen({onComplete}) {
  const [income, setIncome] = useState("");
  const [name,   setName]   = useState("");
  const go = () => {
    const v = parseFloat(income.replace(/,/g,""));
    if (!v||v<=0) return;
    onComplete({income:v, name:name.trim()});
  };
  return (
    <div className="onboarding-wrap">
      <div className="onboarding-box">
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:52,marginBottom:12}}>💰</div>
          <h1 style={{fontSize:30,fontWeight:700,color:C.ink,fontFamily:"Georgia,serif",letterSpacing:-1}}>Money Coach</h1>
          <p style={{marginTop:8,color:C.muted,fontSize:14,lineHeight:1.7}}>Track daily spending.<br/>Get smarter weekly insights.</p>
        </div>
        <div className="card card-lg">
          <div style={{marginBottom:16}}>
            <Label>Your Name (optional)</Label>
            <input className="input-base input-text mt-8" type="text" value={name}
              onChange={e=>setName(e.target.value)} placeholder="Your Name" />
          </div>
          <div style={{marginBottom:22}}>
            <Label>Monthly Income (₹) *</Label>
            <input className="input-base input-number mt-8" type="number" value={income}
              onChange={e=>setIncome(e.target.value)} placeholder="e.g. 50000"
              onKeyDown={e=>e.key==="Enter"&&go()} autoFocus />
          </div>
          <button className="btn-primary" onClick={go}>Start Tracking →</button>
        </div>
        <p style={{textAlign:"center",marginTop:12,fontSize:12,color:C.muted}}>All data stays on your device.</p>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
function DashboardScreen({name, monthlyIncome, allExpenses, checkIns, addExpense, editExpense, deleteExpense, addCheckIn, resetAll}) {

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [toast,         setToast]         = useState(null);
  const [tab,           setTab]           = useState("checkin");

  const isCurrentMonth = selectedMonth === currentMonthKey();

  // KEY FIX: these are derived fresh from allExpenses on every render.
  // Because allExpenses comes from useAppData state (not a local copy),
  // every addExpense() call triggers a re-render of DashboardScreen,
  // which recomputes these values and passes them down to all children.
  const expenses = useMemo(
    () => allExpenses[selectedMonth] || [],
    [allExpenses, selectedMonth]   // allExpenses reference changes on every addExpense()
  );

  const currentExpenses = useMemo(
    () => allExpenses[currentMonthKey()] || [],
    [allExpenses]
  );

  const budgetData     = calculateDailyBudget(monthlyIncome, currentExpenses);
  const safeDailySpend = budgetData.safeDailySpend;

  const {
    streak, bestStreak, zeroDays, totalDays,
    todayCheckedIn, todaySpend, todayUnderBudget,
    recordZeroSpend, recordSpendDay,
  } = useStreak(safeDailySpend, currentExpenses, checkIns, addCheckIn);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2500); };

  // KEY FIX: handleAdd creates expense object here, calls addExpense()
  // which does a synchronous localStorage write + functional setState.
  // React immediately re-renders DashboardScreen → all tabs get fresh expenses.
  const handleAdd = ({amount, label, note}) => {
    const expense = { id:Date.now(), amount, label, note, date:new Date().toISOString() };
    addExpense(expense);          // ← triggers re-render of entire dashboard
    recordSpendDay();
    setSelectedMonth(currentMonthKey()); // snap to current month so new item is visible
    showToast(`${fmt(amount)} saved under ${label} ✓`);
  };

  const handleReset = () => {
    if (window.confirm("This will permanently delete ALL your data. Are you sure?")) resetAll();
  };

  const MonthBar = () => (
    <MonthSelector selectedMonth={selectedMonth} onChange={setSelectedMonth} allExpenses={allExpenses} />
  );

  const TABS = [
    {key:"checkin",   label:"✅ Check-In"},
    {key:"dashboard", label:"🏠 Home"},
    {key:"budget",    label:"📅 Budget"},
    {key:"charts",    label:"🥧 Charts"},
    {key:"insight",   label:"💡 Insights"},
  ];

  return (
    <div className="app-shell">
      {toast && <div className="toast">{toast}</div>}

      {/* Top nav */}
      <div className="top-nav">
        <div className="top-nav-inner">
          <div>
            <p className="label" style={{marginBottom:3}}>
              {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"})}
            </p>
            <h1 style={{fontSize:17,fontWeight:700,color:C.ink,fontFamily:"Georgia,serif"}}>
              {getGreeting(name)} 👋
            </h1>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <StreakBadge streak={streak} />
            <button className="btn-danger" onClick={handleReset}>🗑 Reset</button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        <div className="tab-bar-inner">
          {TABS.map(({key,label}) => (
            <button key={key} className={`tab-btn ${tab===key?"active":""}`}
              onClick={()=>setTab(key)}>{label}</button>
          ))}
        </div>
      </div>

      <main className="page-content">

        {/* ══ CHECK-IN ══ */}
        {tab==="checkin" && (
          <>
            <p className="page-subtitle">Check in daily — even zero-spend days count toward your streak!</p>
            <div className="grid-sidebar">
              {/* DailyCheckIn gets currentExpenses (live) */}
              <DailyCheckIn
                streak={streak} bestStreak={bestStreak} zeroDays={zeroDays} totalDays={totalDays}
                todayCheckedIn={todayCheckedIn} todaySpend={todaySpend}
                todayUnderBudget={todayUnderBudget} safeDailySpend={safeDailySpend}
                checkIns={checkIns} expenses={currentExpenses}
                onZeroSpend={recordZeroSpend} onAddExpense={()=>setTab("dashboard")} />
              {/* Log form on check-in tab too for quick entry */}
              <LogExpenseForm onAdd={handleAdd} disabled={false} />
            </div>
          </>
        )}

        {/* ══ HOME ══ */}
        {tab==="dashboard" && (
          <>
            {/* Summary strip — driven by currentExpenses, updates instantly */}
            <SummaryStrip monthlyIncome={monthlyIncome} expenses={currentExpenses} />

            {streak > 0 && (
              <div style={{marginBottom:14,background:"#FFF7ED",borderRadius:12,padding:"10px 14px",border:"1px solid #FDBA74",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>🔥</span>
                <div>
                  <p style={{fontWeight:700,color:"#EA580C",fontSize:13}}>{streak}-day streak!</p>
                  <p style={{color:"#D97706",fontSize:11,marginTop:1}}>Best: {bestStreak} · Zero-spend days: {zeroDays}</p>
                </div>
              </div>
            )}

            <MonthBar />

            <div className="grid-sidebar">
              {/* Left: form + list — both get `expenses` (derived from allExpenses) */}
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <LogExpenseForm onAdd={handleAdd} disabled={!isCurrentMonth} />
                <ExpenseList
                  expenses={expenses}           // live — rerenders on every addExpense()
                  monthKey={selectedMonth}
                  onEdit={editExpense}
                  onDelete={deleteExpense}
                  isCurrentMonth={isCurrentMonth} />
              </div>

              {/* Right: balance card + insight — also driven by `expenses` */}
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {(() => {
                  const spent = expenses.reduce((s,e)=>s+e.amount,0);
                  const rem   = monthlyIncome - spent;
                  const pct   = monthlyIncome>0 ? (spent/monthlyIncome)*100 : 0;
                  const rc    = rem<0?C.red:rem<monthlyIncome*0.2?C.amber:C.green;
                  return (
                    <div className="card">
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <div>
                          <Label>Total Spent</Label>
                          <p style={{marginTop:4,fontSize:26,fontWeight:700,color:C.red,fontFamily:"Georgia,serif"}}>{fmt(spent)}</p>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <Label>Remaining</Label>
                          <p style={{marginTop:4,fontSize:26,fontWeight:700,color:rc,fontFamily:"Georgia,serif"}}>
                            {rem>=0?fmt(rem):`−${fmt(rem)}`}
                          </p>
                        </div>
                      </div>
                      <ProgressBar pct={pct} />
                      <p style={{marginTop:7,fontSize:11,color:C.muted,textAlign:"center"}}>
                        {fmt(monthlyIncome)} − {fmt(spent)} = <strong style={{color:rc}}>{fmt(Math.abs(rem))}</strong>
                      </p>
                    </div>
                  );
                })()}
                {/* InsightCard gets `expenses` — rerenders when expenses changes */}
                <InsightCard monthlyIncome={monthlyIncome} expenses={expenses} showDetails={false} />
              </div>
            </div>
          </>
        )}

        {/* ══ BUDGET ══ */}
        {tab==="budget" && (
          <>
            <p className="page-subtitle">Your personalised daily limit for the current month.</p>
            <div style={{maxWidth:680}}>
              {/* Always uses currentExpenses — unaffected by month selector */}
              <DailyBudgetGuide monthlyIncome={monthlyIncome} expenses={currentExpenses} />
            </div>
          </>
        )}

        {/* ══ CHARTS ══ */}
        {tab==="charts" && (
          <>
            <p className="page-subtitle">Tap any slice or bar to inspect a category.</p>
            <MonthBar />
            {/* SpendingChart gets `expenses` — updates when month or expenses changes */}
            <SpendingChart expenses={expenses} monthlyIncome={monthlyIncome} />
          </>
        )}

        {/* ══ INSIGHTS ══ */}
        {tab==="insight" && (
          <>
            <p className="page-subtitle">Based on the selected month's activity.</p>
            <MonthBar />
            <div style={{maxWidth:680}}>
              <InsightCard monthlyIncome={monthlyIncome} expenses={expenses} showDetails={true} />
              <div className="card mt-14">
                <p className="section-title">How this is calculated</p>
                {[
                  ["Weekly Total","Sum of all expenses in the last 7 days"],
                  ["Daily Average","Weekly total ÷ 7"],
                  ["Projected Monthly","Daily average × days in month"],
                  ["Projected Savings","Monthly income − projected monthly spend"],
                  ["Risk Level","Excellent ≥30% · Safe ≥20% · Warning ≥10% · Tight ≥0% · Danger <0%"],
                ].map(([l,d])=>(
                  <div key={l} style={{display:"flex",gap:12,marginBottom:9}}>
                    <span style={{fontSize:11,fontWeight:700,color:C.ink,minWidth:135}}>{l}</span>
                    <span style={{fontSize:11,color:C.muted,lineHeight:1.6}}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────
// useAppData is the ONLY place state lives.
// DashboardScreen receives everything as props — no local state for expenses.
export default function App() {
  const {
    screen, name, monthlyIncome, allExpenses, checkIns,
    completeOnboarding, addExpense, editExpense, deleteExpense, addCheckIn, resetAll,
  } = useAppData();

  if (screen==="onboarding") return <OnboardingScreen onComplete={completeOnboarding} />;
  return (
    <DashboardScreen
      name={name} monthlyIncome={monthlyIncome}
      allExpenses={allExpenses} checkIns={checkIns}
      addExpense={addExpense} editExpense={editExpense}
      deleteExpense={deleteExpense} addCheckIn={addCheckIn}
      resetAll={resetAll} />
  );
}
