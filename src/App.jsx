// ─── App.jsx — with localStorage persistence + name fix ──────────────────
import { useState, useMemo } from "react";
import InsightCard      from "./InsightCard";
import SpendingChart    from "./SpendingChart";
import DailyBudgetGuide from "./DailyBudgetGuide";
import DailyCheckIn     from "./DailyCheckIn";
import { useStreak }    from "./useStreak";
import { useAppData, currentMonthKey, monthKeyToLabel, getMonthKeys } from "./useAppData";
import { calculateDailyBudget } from "./DailyBudgetGuide";

// ─── HELPERS ──────────────────────────────────────────────────────────────
const formatINR  = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const formatDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });

// Greeting — shows name if provided, plain greeting if not (Fix #1)
const getGreeting = (name) => {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${time}, ${name}` : time;
};

// ─── CATEGORIES ───────────────────────────────────────────────────────────
const VARIABLE_CATS = [
  { name: "Food", icon: "🍽" }, { name: "Travel", icon: "🚗" },
  { name: "Coffee", icon: "☕" }, { name: "Grocery", icon: "🛒" },
  { name: "Medical", icon: "💊" }, { name: "Entertainment", icon: "🎬" },
  { name: "Other", icon: "💸" },
];
const FIXED_CATS = [
  { name: "Rent", icon: "🏠" }, { name: "Electricity", icon: "⚡" },
  { name: "Water", icon: "💧" }, { name: "Internet", icon: "📶" },
  { name: "EMI/Loan", icon: "🏦" }, { name: "Insurance", icon: "🛡" },
  { name: "School Fees", icon: "🎓" }, { name: "Maintenance", icon: "🔧" },
];
const ALL_CATS = [...VARIABLE_CATS, ...FIXED_CATS];
const ICONS    = Object.fromEntries(ALL_CATS.map(c => [c.name, c.icon]));

// ─── COLOURS ──────────────────────────────────────────────────────────────
const C = {
  ink: "#1C1917", muted: "#78716C", border: "#E7E5E0", bg: "#F7F5F0",
  red: "#DC2626", green: "#16A34A", amber: "#D97706",
};

// ─── SHARED UI ────────────────────────────────────────────────────────────
const Label = ({ children }) => <p className="label" style={{ margin: 0 }}>{children}</p>;

function ProgressBar({ pct }) {
  const color = pct < 60 ? C.green : pct < 85 ? C.amber : C.red;
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${Math.min(pct,100)}%`, background: color }} />
    </div>
  );
}

function StreakBadge({ streak }) {
  if (!streak) return null;
  return (
    <div className="streak-badge">
      <span style={{ fontSize: 15 }}>🔥</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#EA580C" }}>{streak}</span>
    </div>
  );
}

// ─── MONTH SELECTOR ───────────────────────────────────────────────────────
function MonthSelector({ selectedMonth, onChange, allExpenses }) {
  const monthKeys  = getMonthKeys(12);
  const currentKey = currentMonthKey();
  return (
    <div className="month-bar">
      <select className="month-select" value={selectedMonth} onChange={e => onChange(e.target.value)}>
        {monthKeys.map(key => (
          <option key={key} value={key}>
            {monthKeyToLabel(key)}{key === currentKey ? " (Current)" : ""}
          </option>
        ))}
      </select>
      {selectedMonth === currentKey
        ? <span className="month-badge">📅 This Month</span>
        : <span style={{ fontSize: 11, color: C.muted }}>Viewing past data — add expenses in current month</span>
      }
      {allExpenses[selectedMonth]?.length > 0 && (
        <span style={{ fontSize: 11, color: C.muted }}>· {allExpenses[selectedMonth].length} expenses</span>
      )}
    </div>
  );
}

// ─── LOG EXPENSE FORM ─────────────────────────────────────────────────────
function LogExpenseForm({ onAdd, disabled }) {
  const [amount, setAmount] = useState("");
  const [label,  setLabel]  = useState("Food");
  const [note,   setNote]   = useState("");

  const handleSubmit = () => {
    const v = parseFloat(amount.replace(/,/g, ""));
    if (!v || v <= 0 || disabled) return;
    onAdd({ amount: v, label, note: note.trim() });
    setAmount(""); setNote("");
  };

  return (
    <div className="card" style={{ opacity: disabled ? 0.65 : 1 }}>
      <p className="section-title">+ Log Expense</p>
      {disabled && (
        <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FCD34D", fontSize: 12, color: "#D97706" }}>
          ⚠️ Switch to the current month to log expenses.
        </div>
      )}
      <Label>Amount (₹) *</Label>
      <input className="input-base input-number mt-8 mb-14" type="number" value={amount}
        onChange={e => setAmount(e.target.value)} placeholder="e.g. 250"
        onKeyDown={e => e.key === "Enter" && handleSubmit()} disabled={disabled} />
      <Label>Daily Expenses</Label>
      <div className="chip-row">
        {VARIABLE_CATS.map(cat => (
          <button key={cat.name} className={`chip ${label === cat.name ? "active" : ""}`}
            onClick={() => !disabled && setLabel(cat.name)} disabled={disabled}>
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>
      <Label>Fixed / Monthly Bills</Label>
      <div className="chip-row">
        {FIXED_CATS.map(cat => (
          <button key={cat.name} className={`chip ${label === cat.name ? "active" : ""}`}
            onClick={() => !disabled && setLabel(cat.name)} disabled={disabled}>
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>
      <Label>Note (optional)</Label>
      <input className="input-base input-text mt-8 mb-14" type="text" value={note}
        onChange={e => setNote(e.target.value)} placeholder="e.g. Monthly rent" disabled={disabled} />
      <button className="btn-primary" onClick={handleSubmit} disabled={disabled}>
        Save Expense ✓
      </button>
    </div>
  );
}

// ─── EXPENSE LIST ─────────────────────────────────────────────────────────
function ExpenseList({ expenses }) {
  const [showAll, setShowAll] = useState(false);
  const recent = [...expenses].reverse();
  const shown  = showAll ? recent : recent.slice(0, 6);
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p className="section-title" style={{ margin: 0 }}>Expenses</p>
        <span style={{ fontSize: 12, color: C.muted, background: C.bg, padding: "3px 10px", borderRadius: 99, border: `1px solid ${C.border}` }}>
          {expenses.length} total
        </span>
      </div>
      {expenses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
          <p style={{ color: C.muted, fontSize: 13 }}>No expenses logged yet.</p>
        </div>
      ) : (
        <>
          {shown.map(e => (
            <div key={e.id} className="expense-row">
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div className="expense-icon">{ICONS[e.label] || "💸"}</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{e.label}{e.note ? ` · ${e.note}` : ""}</p>
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{formatDate(e.date)}</p>
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.red, fontFamily: "Georgia, serif" }}>−{formatINR(e.amount)}</span>
            </div>
          ))}
          {expenses.length > 6 && (
            <button className="btn-ghost" style={{ width: "100%", marginTop: 10, padding: 10 }}
              onClick={() => setShowAll(p => !p)}>
              {showAll ? "Show less ↑" : `Show all ${expenses.length} ↓`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── ONBOARDING — Fix #1: name field restored with correct placeholder ─────
function OnboardingScreen({ onComplete }) {
  const [income, setIncome] = useState("");
  const [name,   setName]   = useState(""); // blank — no prefill

  const go = () => {
    const v = parseFloat(income.replace(/,/g, ""));
    if (!v || v <= 0) return;
    onComplete({ income: v, name: name.trim() });
  };

  return (
    <div className="onboarding-wrap">
      <div className="onboarding-box">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>💰</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif", letterSpacing: -1 }}>Money Coach</h1>
          <p style={{ marginTop: 10, color: C.muted, fontSize: 15, lineHeight: 1.7 }}>Track daily spending.<br />Get smarter weekly insights.</p>
        </div>
        <div className="card card-lg">
          {/* Fix #1: name field restored, placeholder is "Your Name", no prefill */}
          <div style={{ marginBottom: 18 }}>
            <Label>Your Name (optional)</Label>
            <input className="input-base input-text mt-8" type="text"
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Your Name" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <Label>Monthly Income (₹) *</Label>
            <input className="input-base input-number mt-8" type="number"
              value={income} onChange={e => setIncome(e.target.value)}
              placeholder="e.g. 50000"
              onKeyDown={e => e.key === "Enter" && go()} autoFocus />
          </div>
          <button className="btn-primary" onClick={go}>Start Tracking →</button>
        </div>
        <p style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.muted }}>All data stays on your device.</p>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
function DashboardScreen({ name, monthlyIncome, allExpenses, checkIns, addExpense, addCheckIn, resetAll }) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [toast,         setToast]         = useState(null);
  const [tab,           setTab]           = useState("checkin");

  const isCurrentMonth  = selectedMonth === currentMonthKey();
  const expenses        = useMemo(() => allExpenses[selectedMonth] || [], [allExpenses, selectedMonth]);
  const currentExpenses = useMemo(() => allExpenses[currentMonthKey()] || [], [allExpenses]);

  const budgetData     = calculateDailyBudget(monthlyIncome, currentExpenses);
  const safeDailySpend = budgetData.safeDailySpend;

  // Fix #2: useStreak now receives persisted checkIns + addCheckIn
  const {
    streak, bestStreak, zeroDays, totalDays,
    todayCheckedIn, todaySpend, todayUnderBudget,
    recordZeroSpend, recordSpendDay,
  } = useStreak(safeDailySpend, currentExpenses, checkIns, addCheckIn);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining  = monthlyIncome - totalSpent;
  const pctSpent   = monthlyIncome > 0 ? (totalSpent / monthlyIncome) * 100 : 0;
  const remColor   = remaining < 0 ? C.red : remaining < monthlyIncome * 0.2 ? C.amber : C.green;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleAdd = ({ amount, label, note }) => {
    const expense = { id: Date.now(), amount, label, note, date: new Date().toISOString() };
    addExpense(expense); // persists to localStorage via useAppData
    recordSpendDay();
    showToast(`${formatINR(amount)} saved under ${label} ✓`);
    setSelectedMonth(currentMonthKey());
  };

  // Fix #3: resetAll only called here — clears localStorage + resets state
  const handleReset = () => {
    if (window.confirm("This will permanently delete all your data. Are you sure?")) {
      resetAll();
    }
  };

  const MonthBar = () => (
    <MonthSelector selectedMonth={selectedMonth} onChange={setSelectedMonth} allExpenses={allExpenses} />
  );

  const TABS = [
    { key: "checkin",   label: "✅ Check-In"  },
    { key: "dashboard", label: "🏠 Home"      },
    { key: "budget",    label: "📅 Budget"    },
    { key: "charts",    label: "🥧 Charts"    },
    { key: "insight",   label: "💡 Insights"  },
  ];

  return (
    <div className="app-shell">
      {toast && <div className="toast">{toast}</div>}

      {/* Top nav — Fix #1: shows name if available, plain greeting if not */}
      <div className="top-nav">
        <div className="top-nav-inner">
          <div>
            <p className="label" style={{ marginBottom: 4 }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
            </p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif" }}>
              {getGreeting(name)} 👋
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StreakBadge streak={streak} />
            {/* Fix #3: Reset only via explicit button + confirm dialog */}
            <button className="btn-ghost" onClick={handleReset}>🗑 Reset Data</button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        <div className="tab-bar-inner">
          {TABS.map(({ key, label }) => (
            <button key={key} className={`tab-btn ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>
      </div>

      <main className="page-content">

        {/* ════ CHECK-IN ════ */}
        {tab === "checkin" && (
          <>
            <p className="page-subtitle">Check in daily to build your streak — even on zero-spend days!</p>
            <div className="grid-sidebar">
              <DailyCheckIn
                streak={streak} bestStreak={bestStreak} zeroDays={zeroDays} totalDays={totalDays}
                todayCheckedIn={todayCheckedIn} todaySpend={todaySpend}
                todayUnderBudget={todayUnderBudget} safeDailySpend={safeDailySpend}
                checkIns={checkIns} expenses={currentExpenses}
                onZeroSpend={recordZeroSpend}
                onAddExpense={() => setTab("dashboard")} />
              <LogExpenseForm onAdd={handleAdd} disabled={false} />
            </div>
          </>
        )}

        {/* ════ HOME ════ */}
        {tab === "dashboard" && (
          <>
            {streak > 0 && (
              <div style={{ marginBottom: 14, background: "#FFF7ED", borderRadius: 12, padding: "10px 16px", border: "1px solid #FDBA74", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🔥</span>
                <div>
                  <p style={{ fontWeight: 700, color: "#EA580C", fontSize: 13 }}>{streak}-day streak!</p>
                  <p style={{ color: "#D97706", fontSize: 11, marginTop: 2 }}>Best: {bestStreak} days · Zero-spend days: {zeroDays}</p>
                </div>
              </div>
            )}
            <MonthBar />
            <div className="grid-sidebar">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <LogExpenseForm onAdd={handleAdd} disabled={!isCurrentMonth} />
                <ExpenseList expenses={expenses} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="grid-2">
                  <div className="card">
                    <Label>Monthly Income</Label>
                    <p style={{ marginTop: 5, fontSize: 20, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif" }}>{formatINR(monthlyIncome)}</p>
                  </div>
                  <div className="card">
                    <Label>{isCurrentMonth ? "Spent Today" : "Viewing"}</Label>
                    <p style={{ marginTop: 5, fontSize: 20, fontWeight: 700, color: isCurrentMonth && todaySpend > 0 ? C.red : C.muted, fontFamily: "Georgia, serif" }}>
                      {isCurrentMonth ? formatINR(todaySpend) : monthKeyToLabel(selectedMonth).split(" ")[0]}
                    </p>
                  </div>
                </div>
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <Label>Total Spent</Label>
                      <p style={{ marginTop: 5, fontSize: 26, fontWeight: 700, color: C.red, fontFamily: "Georgia, serif" }}>{formatINR(totalSpent)}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Label>Remaining</Label>
                      <p style={{ marginTop: 5, fontSize: 26, fontWeight: 700, color: remColor, fontFamily: "Georgia, serif" }}>
                        {remaining >= 0 ? formatINR(remaining) : `−${formatINR(remaining)}`}
                      </p>
                    </div>
                  </div>
                  <ProgressBar pct={pctSpent} />
                  <p style={{ marginTop: 8, fontSize: 11, color: C.muted, textAlign: "center" }}>
                    {formatINR(monthlyIncome)} − {formatINR(totalSpent)} = <strong style={{ color: remColor }}>{formatINR(Math.abs(remaining))}</strong>
                  </p>
                </div>
                <InsightCard monthlyIncome={monthlyIncome} expenses={expenses} showDetails={false} />
              </div>
            </div>
          </>
        )}

        {/* ════ BUDGET ════ */}
        {tab === "budget" && (
          <>
            <p className="page-subtitle">Your personalised daily limit based on the current month.</p>
            <div style={{ maxWidth: 680 }}>
              <DailyBudgetGuide monthlyIncome={monthlyIncome} expenses={currentExpenses} />
            </div>
          </>
        )}

        {/* ════ CHARTS ════ */}
        {tab === "charts" && (
          <>
            <p className="page-subtitle">Tap any slice or bar to inspect a category.</p>
            <MonthBar />
            <SpendingChart expenses={expenses} monthlyIncome={monthlyIncome} />
          </>
        )}

        {/* ════ INSIGHTS ════ */}
        {tab === "insight" && (
          <>
            <p className="page-subtitle">Based on your last 7 days of activity.</p>
            <MonthBar />
            <div style={{ maxWidth: 680 }}>
              <InsightCard monthlyIncome={monthlyIncome} expenses={expenses} showDetails={true} />
              <div className="card mt-14">
                <p className="section-title">How this is calculated</p>
                {[
                  ["Weekly Total",      "Sum of all expenses in the last 7 days"],
                  ["Daily Average",     "Weekly total ÷ 7"],
                  ["Projected Monthly", "Daily average × days in month"],
                  ["Projected Savings", "Monthly income − projected monthly spend"],
                  ["Risk Level",        "Excellent ≥30% · Safe ≥20% · Warning ≥10% · Tight ≥0% · Danger <0%"],
                ].map(([l, d]) => (
                  <div key={l} style={{ display: "flex", gap: 14, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.ink, minWidth: 140 }}>{l}</span>
                    <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{d}</span>
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

// ─── ROOT — reads persisted state, routes between screens ─────────────────
export default function App() {
  const {
    screen, name, monthlyIncome, allExpenses, checkIns,
    completeOnboarding, addExpense, addCheckIn, resetAll,
  } = useAppData(); // Fix #2: all state comes from localStorage-backed hook

  if (screen === "onboarding") {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <DashboardScreen
      name={name}
      monthlyIncome={monthlyIncome}
      allExpenses={allExpenses}
      checkIns={checkIns}
      addExpense={addExpense}
      addCheckIn={addCheckIn}
      resetAll={resetAll}
    />
  );
}
