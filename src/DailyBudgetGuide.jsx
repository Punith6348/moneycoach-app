// ─── DailyBudgetGuide.jsx ─────────────────────────────────────────────────
// Save to: moneycoach-app/src/DailyBudgetGuide.jsx
//
// USAGE in App.jsx:
//   import DailyBudgetGuide from "./DailyBudgetGuide";
//   <DailyBudgetGuide monthlyIncome={monthlyIncome} expenses={expenses} />
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";

// ─── 1. CALCULATION LOGIC (pure function) ────────────────────────────────
/**
 * calculateDailyBudget
 *
 * Inputs:
 *   monthlyIncome  {number}  — user's monthly income
 *   expenses       {Array}   — [{ id, amount, label, date }]
 *
 * Steps:
 *   1. Total spent this month
 *   2. Remaining balance = income − spent
 *   3. Days remaining in current month (including today)
 *   4. Safe daily spend = remaining ÷ days remaining
 *   5. Today's spend so far
 *   6. Remaining budget for today = safe daily − today's spend
 *   7. Status classification
 *
 * Returns: object with all values needed for the UI
 */
export function calculateDailyBudget(monthlyIncome, expenses) {
  const now        = new Date();
  const year       = now.getFullYear();
  const month      = now.getMonth();
  const today      = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Step 1 — Total spent this month
  const monthStart = new Date(year, month, 1);
  const monthlyExpenses = expenses.filter(e => new Date(e.date) >= monthStart);
  const totalSpent = monthlyExpenses.reduce((s, e) => s + e.amount, 0);

  // Step 2 — Remaining balance
  const remaining = monthlyIncome - totalSpent;

  // Step 3 — Days remaining (including today)
  const daysRemaining = daysInMonth - today + 1;
  const daysGone      = today - 1;

  // Step 4 — Safe daily spend
  // Guard: if balance is negative, safe spend is 0
  const safeDailySpend = remaining > 0
    ? Math.floor(remaining / daysRemaining)
    : 0;

  // Ideal daily spend (if user had spent nothing)
  const idealDailySpend = Math.floor(monthlyIncome / daysInMonth);

  // Step 5 — Today's actual spend
  const todayStr = now.toISOString().split("T")[0];
  const todaySpend = expenses
    .filter(e => e.date.startsWith(todayStr))
    .reduce((s, e) => s + e.amount, 0);

  // Step 6 — Remaining budget for today
  const todayRemaining = Math.max(safeDailySpend - todaySpend, 0);
  const todayOverspent = todaySpend > safeDailySpend
    ? todaySpend - safeDailySpend
    : 0;

  // Projected month-end savings at current pace
  const avgDailySpend = daysGone > 0 ? totalSpent / daysGone : 0;
  const projectedTotal = totalSpent + (avgDailySpend * daysRemaining);
  const projectedSavings = monthlyIncome - projectedTotal;

  // Step 7 — Status
  // Compare today's spend to safe daily budget
  const todayPct = safeDailySpend > 0
    ? Math.round((todaySpend / safeDailySpend) * 100)
    : 0;

  let status;
  if (remaining <= 0)          status = "broke";
  else if (todayOverspent > 0) status = "over";
  else if (todayPct >= 80)     status = "near";
  else if (todayPct >= 50)     status = "halfway";
  else                         status = "good";

  return {
    // Core numbers
    totalSpent,
    remaining,
    safeDailySpend,
    idealDailySpend,
    todaySpend,
    todayRemaining,
    todayOverspent,
    todayPct,
    // Time
    daysRemaining,
    daysGone,
    daysInMonth,
    today,
    // Projection
    projectedSavings,
    projectedTotal,
    // Status
    status,
  };
}

// ─── 2. STYLE CONFIG PER STATUS ───────────────────────────────────────────
const STATUS_CONFIG = {
  good: {
    bg:        "#F0FDF4",
    border:    "#86EFAC",
    accent:    "#16A34A",
    badge:     "#DCFCE7",
    badgeText: "#15803D",
    label:     "On Track",
    emoji:     "✅",
  },
  halfway: {
    bg:        "#FFFBEB",
    border:    "#FCD34D",
    accent:    "#D97706",
    badge:     "#FEF3C7",
    badgeText: "#B45309",
    label:     "Halfway",
    emoji:     "🟡",
  },
  near: {
    bg:        "#FFF7ED",
    border:    "#FDBA74",
    accent:    "#EA580C",
    badge:     "#FFEDD5",
    badgeText: "#C2410C",
    label:     "Almost Used",
    emoji:     "🟠",
  },
  over: {
    bg:        "#FFF1F2",
    border:    "#FCA5A5",
    accent:    "#DC2626",
    badge:     "#FEE2E2",
    badgeText: "#B91C1C",
    label:     "Over Budget",
    emoji:     "🔴",
  },
  broke: {
    bg:        "#FFF1F2",
    border:    "#FCA5A5",
    accent:    "#DC2626",
    badge:     "#FEE2E2",
    badgeText: "#B91C1C",
    label:     "No Balance",
    emoji:     "🚨",
  },
};

// ─── 3. MESSAGE GENERATOR ────────────────────────────────────────────────
function buildMessage(d) {
  const fmt = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  switch (d.status) {
    case "good":
      return {
        headline: `You can spend ${fmt(d.safeDailySpend)} today to stay on track this month.`,
        sub:      d.todaySpend > 0
          ? `You've spent ${fmt(d.todaySpend)} today. ${fmt(d.todayRemaining)} left for today.`
          : `You haven't logged anything today yet. Budget wisely!`,
        tip:      `${d.daysRemaining} days left · ${fmt(d.remaining)} remaining this month.`,
      };
    case "halfway":
      return {
        headline: `You can spend ${fmt(d.todayRemaining)} more today to stay on budget.`,
        sub:      `Already spent ${fmt(d.todaySpend)} today — that's ${d.todayPct}% of your daily limit.`,
        tip:      `Daily limit is ${fmt(d.safeDailySpend)}. ${d.daysRemaining} days remaining.`,
      };
    case "near":
      return {
        headline: `Only ${fmt(d.todayRemaining)} left in today's budget!`,
        sub:      `You've used ${d.todayPct}% of your ${fmt(d.safeDailySpend)} daily limit.`,
        tip:      `Try to hold off on non-essentials for the rest of the day.`,
      };
    case "over":
      return {
        headline: `You've exceeded today's budget by ${fmt(d.todayOverspent)}.`,
        sub:      `Spent ${fmt(d.todaySpend)} vs. daily limit of ${fmt(d.safeDailySpend)}.`,
        tip:      `Tomorrow's limit adjusts down to compensate. Spend less the next ${d.daysRemaining - 1} days.`,
      };
    case "broke":
      return {
        headline: `Your monthly balance is used up.`,
        sub:      `You've spent ${fmt(d.totalSpent)} against income of ${fmt(d.totalSpent + d.remaining)}.`,
        tip:      `Avoid further expenses for the remaining ${d.daysRemaining} days if possible.`,
      };
    default:
      return { headline: "", sub: "", tip: "" };
  }
}

// ─── 4. HELPER: circular arc SVG for today's progress ────────────────────
function CircularProgress({ pct, color, size = 80 }) {
  const safeP  = Math.min(pct, 100);
  const r      = 30;
  const stroke = 6;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (safeP / 100) * circ;
  const c      = size / 2;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {/* Track */}
      <circle cx={c} cy={c} r={r} fill="none" stroke="#E7E5E0" strokeWidth={stroke} />
      {/* Progress */}
      <circle cx={c} cy={c} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

// ─── 5. STAT PILL ─────────────────────────────────────────────────────────
function Pill({ label, value, accent }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "10px 8px", background: "#fff", borderRadius: 10, border: "1px solid #E7E5E0" }}>
      <p style={{ margin: 0, fontSize: 10, color: "#78716C", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "sans-serif", fontWeight: 600 }}>{label}</p>
      <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: accent, fontFamily: "Georgia, serif" }}>{value}</p>
    </div>
  );
}

// ─── 6. DAY TIMELINE ─────────────────────────────────────────────────────
function DayTimeline({ daysGone, daysInMonth, accent }) {
  const pct = Math.round((daysGone / daysInMonth) * 100);
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: "#78716C", fontFamily: "sans-serif" }}>Day {daysGone + 1} of {daysInMonth}</span>
        <span style={{ fontSize: 10, color: "#78716C", fontFamily: "sans-serif" }}>{daysInMonth - daysGone - 1} days left after today</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "#E7E5E0" }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: accent, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

// ─── 7. MAIN COMPONENT ────────────────────────────────────────────────────
/**
 * DailyBudgetGuide
 * Props:
 *   monthlyIncome  {number}  — from App state
 *   expenses       {Array}   — from App state
 */
export default function DailyBudgetGuide({ monthlyIncome, expenses }) {

  // useMemo: recalculates only when expenses or income changes
  const d = useMemo(
    () => calculateDailyBudget(monthlyIncome, expenses),
    [monthlyIncome, expenses]
  );

  const msg = useMemo(() => buildMessage(d), [d]);
  const s   = STATUS_CONFIG[d.status];
  const fmt = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  return (
    <div style={{
      borderRadius: 14,
      background: s.bg,
      border: `1.5px solid ${s.border}`,
      overflow: "hidden",
      transition: "all 0.3s ease",
    }}>

      {/* ── Header ── */}
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${s.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>

          {/* Left: text */}
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{s.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: s.accent, textTransform: "uppercase", letterSpacing: "1px", fontFamily: "sans-serif" }}>
                Today's Budget Guide
              </span>
              <span style={{ background: s.badge, color: s.badgeText, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, fontFamily: "sans-serif" }}>
                {s.label}
              </span>
            </div>

            {/* Headline */}
            <p style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 600, color: "#1C1917", fontFamily: "sans-serif", lineHeight: 1.6 }}>
              {msg.headline}
            </p>
            {/* Sub */}
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#78716C", fontFamily: "sans-serif", lineHeight: 1.5 }}>
              {msg.sub}
            </p>
            {/* Tip */}
            <p style={{ margin: 0, fontSize: 11, color: s.accent, fontFamily: "sans-serif", fontStyle: "italic" }}>
              💡 {msg.tip}
            </p>
          </div>

          {/* Right: circular progress */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <CircularProgress pct={d.todayPct} color={s.accent} size={80} />
            {/* Centre label */}
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: s.accent, fontFamily: "Georgia, serif", lineHeight: 1 }}>
                {d.todayPct}%
              </span>
              <span style={{ fontSize: 8, color: "#78716C", fontFamily: "sans-serif", marginTop: 2 }}>today</span>
            </div>
          </div>
        </div>

        {/* Day timeline bar */}
        <DayTimeline daysGone={d.daysGone} daysInMonth={d.daysInMonth} accent={s.accent} />
      </div>

      {/* ── Stat pills ── */}
      <div style={{ display: "flex", gap: 8, padding: "14px 16px 0" }}>
        <Pill label="Safe/Day"    value={fmt(d.safeDailySpend)}  accent={s.accent} />
        <Pill label="Spent Today" value={fmt(d.todaySpend)}      accent={d.todayOverspent > 0 ? "#DC2626" : "#1C1917"} />
        <Pill label="Left Today"  value={fmt(d.todayRemaining)}  accent={d.todayRemaining > 0 ? s.accent : "#DC2626"} />
      </div>

      {/* ── Projected savings line ── */}
      <div style={{ padding: "12px 16px 16px" }}>
        <div style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid #E7E5E0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: "#78716C", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "sans-serif", fontWeight: 600 }}>
              Projected Month-end Savings
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 16, fontWeight: 700, fontFamily: "Georgia, serif", color: d.projectedSavings >= 0 ? "#16A34A" : "#DC2626" }}>
              {d.projectedSavings >= 0 ? fmt(d.projectedSavings) : `−${fmt(Math.abs(d.projectedSavings))}`}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 10, color: "#78716C", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "sans-serif", fontWeight: 600 }}>
              Days Remaining
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 16, fontWeight: 700, fontFamily: "Georgia, serif", color: "#1C1917" }}>
              {d.daysRemaining}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
