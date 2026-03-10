// ─── App.jsx — Fully Responsive ───────────────────────────────────────────
import { useState } from "react";
import InsightCard       from "./InsightCard";
import SpendingChart     from "./SpendingChart";
import DailyBudgetGuide  from "./DailyBudgetGuide";
import DailyCheckIn      from "./DailyCheckIn";
import { useStreak }     from "./useStreak";

// Import DailyBudgetGuide's calculation function
// (add `export` to calculateDailyBudget in DailyBudgetGuide.jsx if not already)
import { calculateDailyBudget } from "./DailyBudgetGuide";

// ─── HELPERS ──────────────────────────────────────────────────────────────
const formatINR   = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const todayISO    = () => new Date().toISOString().split("T")[0];
const formatDate  = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });
const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

const CATEGORIES = [
  { name: "Food", icon: "🍽" }, { name: "Travel", icon: "🚗" },
  { name: "Coffee", icon: "☕" }, { name: "Grocery", icon: "🛒" },
  { name: "Medical", icon: "💊" }, { name: "Entertainment", icon: "🎬" },
  { name: "Other", icon: "💸" },
];
const ICONS = Object.fromEntries(CATEGORIES.map(c => [c.name, c.icon]));

// ─── COLOUR TOKENS (inline fallback for coloured cards) ───────────────────
const C = {
  green: "#16A34A", greenBg: "#F0FDF4", greenBorder: "#86EFAC",
  red: "#DC2626", amber: "#D97706",
  ink: "#1C1917", muted: "#78716C", border: "#E7E5E0", bg: "#F7F5F0",
};

// ─── SMALL SHARED PIECES ──────────────────────────────────────────────────
function Label({ children }) {
  return <p className="label" style={{ margin: 0 }}>{children}</p>;
}

function ProgressBar({ pct }) {
  const color = pct < 60 ? C.green : pct < 85 ? C.amber : C.red;
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}

function StreakBadge({ streak }) {
  if (streak === 0) return null;
  return (
    <div className="streak-badge">
      <span style={{ fontSize: 15 }}>🔥</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#EA580C", fontFamily: "sans-serif" }}>{streak}</span>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────
function OnboardingScreen({ onComplete }) {
  const [income, setIncome] = useState("");
  const [name,   setName]   = useState("");
  const go = () => {
    const v = parseFloat(income.replace(/,/g, ""));
    if (!v || v <= 0) return;
    onComplete({ income: v, name: name.trim() || "there" });
  };
  return (
    <div className="onboarding-wrap">
      <div className="onboarding-box">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>💰</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif", letterSpacing: -1 }}>Money Coach</h1>
          <p style={{ marginTop: 10, color: C.muted, fontSize: 15, lineHeight: 1.7 }}>
            Track daily spending.<br />Get smarter weekly insights.
          </p>
        </div>

        <div className="card card-lg">
          <div style={{ marginBottom: 18 }}>
            <Label>Your Name (optional)</Label>
            <input className="input-base input-text mt-8" type="text" value={name}
              onChange={e => setName(e.target.value)} placeholder="e.g. Puneeth" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <Label>Monthly Income (₹) *</Label>
            <input className="input-base input-number mt-8" type="number" value={income}
              onChange={e => setIncome(e.target.value)} placeholder="e.g. 50000"
              onKeyDown={e => e.key === "Enter" && go()} autoFocus />
          </div>
          <button className="btn-primary" onClick={go}>Start Tracking →</button>
        </div>
        <p style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.muted }}>All data stays on your device.</p>
      </div>
    </div>
  );
}

// ─── LOG EXPENSE FORM ─────────────────────────────────────────────────────
// Extracted as its own component so it can sit in the sidebar on desktop
function LogExpenseForm({ onAdd }) {
  const [amount, setAmount] = useState("");
  const [label,  setLabel]  = useState("Other");
  const [note,   setNote]   = useState("");

  const handleSubmit = () => {
    const v = parseFloat(amount.replace(/,/g, ""));
    if (!v || v <= 0) return false;
    onAdd({ amount: v, label, note: note.trim() });
    setAmount(""); setNote("");
    return true;
  };

  return (
    <div className="card">
      <p className="section-title">+ Log Expense</p>
      <Label>Amount (₹) *</Label>
      <input className="input-base input-number mt-8 mb-14" type="number" value={amount}
        onChange={e => setAmount(e.target.value)} placeholder="e.g. 250"
        onKeyDown={e => e.key === "Enter" && handleSubmit()} />

      <Label>Category</Label>
      <div className="chip-row">
        {CATEGORIES.map(cat => (
          <button key={cat.name} className={`chip ${label === cat.name ? "active" : ""}`}
            onClick={() => setLabel(cat.name)}>
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      <Label>Note (optional)</Label>
      <input className="input-base input-text mt-8 mb-14" type="text" value={note}
        onChange={e => setNote(e.target.value)} placeholder="e.g. Lunch with team" />

      <button className="btn-primary" onClick={handleSubmit}>Save Expense ✓</button>
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
        <p className="section-title" style={{ margin: 0 }}>Recent Expenses</p>
        <span style={{ fontSize: 12, color: C.muted, background: C.bg, padding: "3px 10px", borderRadius: 99, border: `1px solid ${C.border}` }}>
          {expenses.length} total
        </span>
      </div>

      {expenses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ fontSize: 30, marginBottom: 8 }}>📭</p>
          <p style={{ color: C.muted, fontSize: 13 }}>No expenses yet. Log your first one!</p>
        </div>
      ) : (
        <>
          {shown.map(e => (
            <div key={e.id} className="expense-row">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="expense-icon">{ICONS[e.label] || "💸"}</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
                    {e.label}{e.note ? ` · ${e.note}` : ""}
                  </p>
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{formatDate(e.date)}</p>
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.red, fontFamily: "Georgia, serif" }}>
                −{formatINR(e.amount)}
              </span>
            </div>
          ))}
          {expenses.length > 6 && (
            <button className="btn-ghost" style={{ width: "100%", marginTop: 10, padding: 10 }}
              onClick={() => setShowAll(p => !p)}>
              {showAll ? "Show less ↑" : `Show all ${expenses.length} expenses ↓`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── DASHBOARD SCREEN ─────────────────────────────────────────────────────
function DashboardScreen({ monthlyIncome, userName, onReset }) {
  const [expenses, setExpenses] = useState([]);
  const [toast,    setToast]    = useState(null);
  const [tab,      setTab]      = useState("checkin");

  const budgetData     = calculateDailyBudget(monthlyIncome, expenses);
  const safeDailySpend = budgetData.safeDailySpend;

  const { streak, bestStreak, zeroDays, totalDays, checkIns,
          todayCheckedIn, todaySpend, todayUnderBudget,
          recordZeroSpend, recordSpendDay } = useStreak(safeDailySpend, expenses);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining  = monthlyIncome - totalSpent;
  const pctSpent   = monthlyIncome > 0 ? (totalSpent / monthlyIncome) * 100 : 0;
  const remColor   = remaining < 0 ? C.red : remaining < monthlyIncome * 0.2 ? C.amber : C.green;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleAdd = ({ amount, label, note }) => {
    setExpenses(prev => [...prev, { id: Date.now(), amount, label, note, date: new Date().toISOString() }]);
    recordSpendDay();
    showToast(`${formatINR(amount)} saved under ${label} ✓`);
  };

  const TABS = [
    { key: "checkin",   label: "✅ Check-In"  },
    { key: "dashboard", label: "🏠 Home"      },
    { key: "budget",    label: "📅 Budget"    },
    { key: "charts",    label: "🥧 Charts"    },
    { key: "insight",   label: "💡 Insights"  },
  ];

  return (
    <div className="app-shell">

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* ── Sticky top nav ── */}
      <div className="top-nav">
        <div className="top-nav-inner">
          <div>
            <p className="label" style={{ marginBottom: 4 }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
            </p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif" }}>
              {getGreeting()}, {userName} 👋
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StreakBadge streak={streak} />
            <button className="btn-ghost" onClick={onReset}>⚙ Reset</button>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="tab-bar">
        <div className="tab-bar-inner">
          {TABS.map(({ key, label }) => (
            <button key={key} className={`tab-btn ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── Page content ── */}
      <main className="page-content">

        {/* ════ CHECK-IN TAB ════ */}
        {tab === "checkin" && (
          <>
            <p className="page-subtitle">Check in daily to build your streak — even on zero-spend days!</p>
            {/* On desktop: check-in + form side by side */}
            <div className="grid-sidebar">
              <div>
                <DailyCheckIn
                  streak={streak} bestStreak={bestStreak} zeroDays={zeroDays} totalDays={totalDays}
                  todayCheckedIn={todayCheckedIn} todaySpend={todaySpend}
                  todayUnderBudget={todayUnderBudget} safeDailySpend={safeDailySpend}
                  checkIns={checkIns} expenses={expenses}
                  onZeroSpend={recordZeroSpend}
                  onAddExpense={() => setTab("dashboard")} />
              </div>
              <div>
                <LogExpenseForm onAdd={handleAdd} />
              </div>
            </div>
          </>
        )}

        {/* ════ HOME TAB ════ */}
        {tab === "dashboard" && (
          <>
            {/* Streak banner */}
            {streak > 0 && (
              <div style={{ marginBottom: 14, background: "#FFF7ED", borderRadius: 12, padding: "10px 16px", border: "1px solid #FDBA74", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🔥</span>
                <div>
                  <p style={{ fontWeight: 700, color: "#EA580C", fontSize: 13 }}>{streak}-day streak!</p>
                  <p style={{ color: "#D97706", fontSize: 11, marginTop: 2 }}>Best: {bestStreak} days · Zero-spend days: {zeroDays}</p>
                </div>
              </div>
            )}

            {/* ── Desktop: sidebar layout ── */}
            <div className="grid-sidebar">

              {/* Left column: log form */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <LogExpenseForm onAdd={handleAdd} />
                <ExpenseList expenses={expenses} />
              </div>

              {/* Right column: summary cards + insight */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Summary stat cards — 2 col on mobile, 2 col on desktop */}
                <div className="grid-2">
                  <div className="card">
                    <Label>Monthly Income</Label>
                    <p style={{ marginTop: 5, fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif" }}>
                      {formatINR(monthlyIncome)}
                    </p>
                  </div>
                  <div className="card">
                    <Label>Spent Today</Label>
                    <p style={{ marginTop: 5, fontSize: 22, fontWeight: 700, color: todaySpend > 0 ? C.red : C.muted, fontFamily: "Georgia, serif" }}>
                      {formatINR(todaySpend)}
                    </p>
                  </div>
                </div>

                {/* Balance card */}
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <Label>Total Spent</Label>
                      <p style={{ marginTop: 5, fontSize: 28, fontWeight: 700, color: C.red, fontFamily: "Georgia, serif" }}>
                        {formatINR(totalSpent)}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Label>Remaining</Label>
                      <p style={{ marginTop: 5, fontSize: 28, fontWeight: 700, color: remColor, fontFamily: "Georgia, serif" }}>
                        {remaining >= 0 ? formatINR(remaining) : `−${formatINR(remaining)}`}
                      </p>
                    </div>
                  </div>
                  <ProgressBar pct={pctSpent} />
                  <p style={{ marginTop: 8, fontSize: 11, color: C.muted, textAlign: "center" }}>
                    {formatINR(monthlyIncome)} − {formatINR(totalSpent)} = <strong style={{ color: remColor }}>{formatINR(Math.abs(remaining))}</strong>
                  </p>
                </div>

                {/* Mini insight */}
                <InsightCard monthlyIncome={monthlyIncome} expenses={expenses} showDetails={false} />
              </div>
            </div>
          </>
        )}

        {/* ════ BUDGET TAB ════ */}
        {tab === "budget" && (
          <>
            <p className="page-subtitle">Your personalised daily limit — recalculates every time you log an expense.</p>
            {/* Budget guide takes full width on mobile, constrained on desktop */}
            <div style={{ maxWidth: 680 }}>
              <DailyBudgetGuide monthlyIncome={monthlyIncome} expenses={expenses} />
            </div>
          </>
        )}

        {/* ════ CHARTS TAB ════ */}
        {tab === "charts" && (
          <>
            <p className="page-subtitle">Tap any slice or bar to inspect that category.</p>
            {/* Chart fills full width — Recharts ResponsiveContainer handles sizing */}
            <SpendingChart expenses={expenses} monthlyIncome={monthlyIncome} />
          </>
        )}

        {/* ════ INSIGHTS TAB ════ */}
        {tab === "insight" && (
          <>
            <p className="page-subtitle">Based on your last 7 days. Updates automatically when you log a new expense.</p>
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
                ].map(([lbl, desc]) => (
                  <div key={lbl} style={{ display: "flex", gap: 14, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.ink, minWidth: 140 }}>{lbl}</span>
                    <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{desc}</span>
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
export default function App() {
  const [screen,        setScreen]        = useState("onboarding");
  const [monthlyIncome, setMonthlyIncome] = useState(null);
  const [userName,      setUserName]      = useState("there");

  const handleComplete = ({ income, name }) => { setMonthlyIncome(income); setUserName(name); setScreen("dashboard"); };
  const handleReset    = () => { if (window.confirm("Reset everything?")) { setMonthlyIncome(null); setUserName("there"); setScreen("onboarding"); } };

  if (screen === "onboarding") return <OnboardingScreen onComplete={handleComplete} />;
  return <DashboardScreen monthlyIncome={monthlyIncome} userName={userName} onReset={handleReset} />;
}
