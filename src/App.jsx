// ─── App.jsx (with DailyCheckIn + useStreak) ─────────────────────────────
import { useState } from "react";
import InsightCard       from "./InsightCard";
import SpendingChart     from "./SpendingChart";
import DailyBudgetGuide, { calculateDailyBudget } from "./DailyBudgetGuide";
import DailyCheckIn      from "./DailyCheckIn";
import { useStreak }     from "./useStreak";

const formatINR  = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const todayISO   = () => new Date().toISOString().split("T")[0];
const formatDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });
const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

const C = { bg: "#F7F5F0", card: "#FFFFFF", ink: "#1C1917", muted: "#78716C", border: "#E7E5E0", red: "#DC2626", green: "#16A34A", amber: "#D97706" };
const shadow = "0 1px 3px rgba(0,0,0,0.08)";

const Card  = ({ children, style = {} }) => (
  <div style={{ background: C.card, borderRadius: 14, padding: 20, boxShadow: shadow, border: `1px solid ${C.border}`, ...style }}>{children}</div>
);
const Label = ({ children }) => (
  <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "1.2px", fontFamily: "sans-serif", fontWeight: 600 }}>{children}</p>
);

function ProgressBar({ pct }) {
  const color = pct < 60 ? C.green : pct < 85 ? C.amber : C.red;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: C.muted, fontFamily: "sans-serif" }}>Budget used</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "sans-serif" }}>{Math.min(Math.round(pct), 100)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: C.border }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${Math.min(pct, 100)}%`, background: color, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

// ── Streak badge for top nav ──────────────────────────────────────────────
function StreakBadge({ streak }) {
  if (streak === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#FFF7ED", border: "1px solid #FDBA74", borderRadius: 99, padding: "4px 10px" }}>
      <span style={{ fontSize: 14 }}>🔥</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#EA580C", fontFamily: "sans-serif" }}>{streak}</span>
    </div>
  );
}

const CATEGORIES = [
  { name: "Food", icon: "🍽" }, { name: "Travel", icon: "🚗" },
  { name: "Coffee", icon: "☕" }, { name: "Grocery", icon: "🛒" },
  { name: "Medical", icon: "💊" }, { name: "Entertainment", icon: "🎬" },
  { name: "Other", icon: "💸" },
];
const ICONS = Object.fromEntries(CATEGORIES.map(c => [c.name, c.icon]));

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
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>💰</div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif", letterSpacing: -1 }}>Money Coach</h1>
          <p style={{ margin: "10px 0 0", color: C.muted, fontSize: 14, fontFamily: "sans-serif", lineHeight: 1.7 }}>Track daily spending.<br />Get smarter weekly insights.</p>
        </div>
        <Card style={{ padding: 28 }}>
          <div style={{ marginBottom: 18 }}>
            <Label>Your Name (optional)</Label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Puneeth"
              style={{ width: "100%", marginTop: 8, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 15, fontFamily: "sans-serif", outline: "none", boxSizing: "border-box", background: C.bg, color: C.ink }} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <Label>Monthly Income (₹) *</Label>
            <input type="number" value={income} onChange={e => setIncome(e.target.value)} placeholder="e.g. 50000"
              onKeyDown={e => e.key === "Enter" && go()} autoFocus
              style={{ width: "100%", marginTop: 8, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 22, fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", background: C.bg, color: C.ink }} />
          </div>
          <button onClick={go} style={{ width: "100%", padding: 15, borderRadius: 12, background: C.ink, color: "#fff", border: "none", fontSize: 15, fontFamily: "sans-serif", fontWeight: 700, cursor: "pointer" }}>
            Start Tracking →
          </button>
        </Card>
        <p style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.muted, fontFamily: "sans-serif" }}>All data stays on your device.</p>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
function DashboardScreen({ monthlyIncome, userName, onReset }) {
  const [expenses, setExpenses] = useState([]);
  const [amount,   setAmount]   = useState("");
  const [label,    setLabel]    = useState("Other");
  const [note,     setNote]     = useState("");
  const [toast,    setToast]    = useState(null);
  const [showAll,  setShowAll]  = useState(false);
  const [tab,      setTab]      = useState("checkin"); // open on check-in first

  // ── Daily budget calculation (needed for streak) ─────────────────────
  const budgetData     = calculateDailyBudget(monthlyIncome, expenses);
  const safeDailySpend = budgetData.safeDailySpend;

  // ── Streak hook — wired to expenses ──────────────────────────────────
  const {
    streak, bestStreak, zeroDays, totalDays,
    checkIns, todayCheckedIn, todaySpend, todayUnderBudget,
    recordZeroSpend, recordSpendDay,
  } = useStreak(safeDailySpend, expenses);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining  = monthlyIncome - totalSpent;
  const pctSpent   = monthlyIncome > 0 ? (totalSpent / monthlyIncome) * 100 : 0;
  const remColor   = remaining < 0 ? C.red : remaining < monthlyIncome * 0.2 ? C.amber : C.green;
  const recentExpenses = [...expenses].reverse();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // ── Add expense: also auto-records spend day in streak ───────────────
  const handleAdd = () => {
    const v = parseFloat(amount.replace(/,/g, ""));
    if (!v || v <= 0) { showToast("Enter a valid amount ⚠️"); return; }
    setExpenses(prev => [...prev, {
      id: Date.now(), amount: v, label, note: note.trim(), date: new Date().toISOString()
    }]);
    // Auto-record check-in when expense is added
    recordSpendDay();
    setAmount(""); setNote("");
    showToast(`${formatINR(v)} saved under ${label} ✓`);
  };

  const TABS = [
    { key: "checkin",   label: "✅ Check-In" },
    { key: "dashboard", label: "🏠 Home"     },
    { key: "budget",    label: "📅 Budget"   },
    { key: "charts",    label: "🥧 Charts"   },
    { key: "insight",   label: "💡 Insights" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>

      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#fff", padding: "10px 22px", borderRadius: 99, fontSize: 13, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>{toast}</div>
      )}

      {/* Top nav with streak badge */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, fontFamily: "sans-serif" }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
          </p>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif" }}>
            {getGreeting()}, {userName} 👋
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Streak badge always visible in header */}
          <StreakBadge streak={streak} />
          <button onClick={onReset} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, color: C.muted, cursor: "pointer", fontFamily: "sans-serif" }}>⚙</button>
        </div>
      </div>

      {/* Tab bar — 5 tabs */}
      <div style={{ display: "flex", background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 4px", overflowX: "auto" }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: "0 0 auto", padding: "12px 14px", background: "none", border: "none",
            borderBottom: tab === key ? `2.5px solid ${C.ink}` : "2.5px solid transparent",
            fontSize: 11, fontWeight: tab === key ? 700 : 400,
            color: tab === key ? C.ink : C.muted,
            cursor: "pointer", fontFamily: "sans-serif", whiteSpace: "nowrap"
          }}>{label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 40px" }}>

        {/* ══ TAB: CHECK-IN (default) ══ */}
        {tab === "checkin" && (
          <>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: C.muted, fontFamily: "sans-serif" }}>
              Check in daily to build your streak — even on zero-spend days!
            </p>
            <DailyCheckIn
              streak={streak}
              bestStreak={bestStreak}
              zeroDays={zeroDays}
              totalDays={totalDays}
              todayCheckedIn={todayCheckedIn}
              todaySpend={todaySpend}
              todayUnderBudget={todayUnderBudget}
              safeDailySpend={safeDailySpend}
              checkIns={checkIns}
              expenses={expenses}
              onZeroSpend={recordZeroSpend}
              onAddExpense={() => setTab("dashboard")}
            />
          </>
        )}

        {/* ══ TAB: HOME ══ */}
        {tab === "dashboard" && (
          <>
            {/* Streak banner on home tab too */}
            {streak > 0 && (
              <div style={{ marginBottom: 12, background: "#FFF7ED", borderRadius: 12, padding: "10px 14px", border: "1px solid #FDBA74", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🔥</span>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#EA580C", fontFamily: "sans-serif" }}>{streak}-day streak!</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#D97706", fontFamily: "sans-serif" }}>Best: {bestStreak} days · Zero-spend days: {zeroDays}</p>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <Card><Label>Monthly Income</Label><p style={{ margin: "5px 0 0", fontSize: 20, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif" }}>{formatINR(monthlyIncome)}</p></Card>
              <Card><Label>Spent Today</Label><p style={{ margin: "5px 0 0", fontSize: 20, fontWeight: 700, color: todaySpend > 0 ? C.red : C.muted, fontFamily: "Georgia, serif" }}>{formatINR(todaySpend)}</p></Card>
            </div>

            <Card style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div><Label>Total Spent</Label><p style={{ margin: "5px 0 0", fontSize: 26, fontWeight: 700, color: C.red, fontFamily: "Georgia, serif" }}>{formatINR(totalSpent)}</p></div>
                <div style={{ textAlign: "right" }}><Label>Remaining</Label><p style={{ margin: "5px 0 0", fontSize: 26, fontWeight: 700, color: remColor, fontFamily: "Georgia, serif" }}>{remaining >= 0 ? formatINR(remaining) : `−${formatINR(remaining)}`}</p></div>
              </div>
              <ProgressBar pct={pctSpent} />
              <p style={{ margin: "8px 0 0", fontSize: 11, color: C.muted, textAlign: "center", fontFamily: "sans-serif" }}>
                {formatINR(monthlyIncome)} − {formatINR(totalSpent)} = <strong style={{ color: remColor }}>{formatINR(Math.abs(remaining))}</strong>
              </p>
            </Card>

            <div style={{ marginBottom: 14 }}>
              <InsightCard monthlyIncome={monthlyIncome} expenses={expenses} showDetails={false} />
            </div>

            <Card style={{ marginBottom: 14 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: C.ink, fontFamily: "sans-serif" }}>+ Log Expense</h2>
              <Label>Amount (₹) *</Label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 250"
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                style={{ width: "100%", marginTop: 8, marginBottom: 14, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 22, fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", background: C.bg, color: C.ink }} />
              <Label>Category</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8, marginBottom: 14 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.name} onClick={() => setLabel(cat.name)} style={{
                    padding: "6px 12px", borderRadius: 99,
                    border: `1.5px solid ${label === cat.name ? C.ink : C.border}`,
                    background: label === cat.name ? C.ink : C.card,
                    color: label === cat.name ? "#fff" : C.ink,
                    fontSize: 12, fontFamily: "sans-serif", fontWeight: 600, cursor: "pointer"
                  }}>{cat.icon} {cat.name}</button>
                ))}
              </div>
              <Label>Note (optional)</Label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Lunch with team"
                style={{ width: "100%", marginTop: 8, marginBottom: 14, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "sans-serif", outline: "none", boxSizing: "border-box", background: C.bg, color: C.ink }} />
              <button onClick={handleAdd} style={{ width: "100%", padding: 14, borderRadius: 12, background: C.ink, color: "#fff", border: "none", fontSize: 15, fontFamily: "sans-serif", fontWeight: 700, cursor: "pointer" }}>
                Save Expense ✓
              </button>
            </Card>

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.ink, fontFamily: "sans-serif" }}>Recent Expenses</h2>
                <span style={{ fontSize: 12, color: C.muted, background: C.bg, padding: "3px 10px", borderRadius: 99, border: `1px solid ${C.border}`, fontFamily: "sans-serif" }}>{expenses.length} total</span>
              </div>
              {expenses.length === 0 && (
                <div style={{ textAlign: "center", padding: "28px 0" }}>
                  <p style={{ fontSize: 28, margin: "0 0 8px" }}>📭</p>
                  <p style={{ margin: 0, color: C.muted, fontSize: 13, fontFamily: "sans-serif" }}>No expenses yet. Log your first one above!</p>
                </div>
              )}
              {(showAll ? recentExpenses : recentExpenses.slice(0, 5)).map((e, i, arr) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{ICONS[e.label] || "💸"}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.ink, fontFamily: "sans-serif" }}>{e.label}{e.note ? ` · ${e.note}` : ""}</p>
                      <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: "sans-serif" }}>{formatDate(e.date)}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.red, fontFamily: "Georgia, serif" }}>−{formatINR(e.amount)}</span>
                </div>
              ))}
              {expenses.length > 5 && (
                <button onClick={() => setShowAll(p => !p)} style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, fontSize: 13, color: C.muted, cursor: "pointer", fontFamily: "sans-serif" }}>
                  {showAll ? "Show less ↑" : `Show all ${expenses.length} expenses ↓`}
                </button>
              )}
            </Card>
          </>
        )}

        {/* ══ TAB: BUDGET ══ */}
        {tab === "budget" && (
          <>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: C.muted, fontFamily: "sans-serif" }}>Your personalised daily limit — recalculates every time you log an expense.</p>
            <DailyBudgetGuide monthlyIncome={monthlyIncome} expenses={expenses} />
          </>
        )}

        {/* ══ TAB: CHARTS ══ */}
        {tab === "charts" && (
          <>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: C.muted, fontFamily: "sans-serif" }}>Tap any slice or bar to inspect that category.</p>
            <SpendingChart expenses={expenses} monthlyIncome={monthlyIncome} />
          </>
        )}

        {/* ══ TAB: INSIGHTS ══ */}
        {tab === "insight" && (
          <>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: C.muted, fontFamily: "sans-serif" }}>Based on your last 7 days. Updates automatically when you log a new expense.</p>
            <InsightCard monthlyIncome={monthlyIncome} expenses={expenses} showDetails={true} />
            <Card style={{ marginTop: 14 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: "sans-serif" }}>How this is calculated</h3>
              {[
                ["Weekly Total",      "Sum of all expenses in the last 7 days"],
                ["Daily Average",     "Weekly total ÷ 7"],
                ["Projected Monthly", "Daily average × days in month"],
                ["Projected Savings", "Monthly income − projected monthly spend"],
                ["Risk Level",        "Excellent ≥30% · Safe ≥20% · Warning ≥10% · Tight ≥0% · Danger <0%"],
              ].map(([lbl, desc]) => (
                <div key={lbl} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.ink, fontFamily: "sans-serif", minWidth: 130 }}>{lbl}</span>
                  <span style={{ fontSize: 11, color: C.muted, fontFamily: "sans-serif", lineHeight: 1.5 }}>{desc}</span>
                </div>
              ))}
            </Card>
          </>
        )}
      </div>
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
