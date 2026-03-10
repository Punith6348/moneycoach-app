// ─── InsightCard.jsx ───────────────────────────────────────────────────────
// Drop this file into: moneycoach-app/src/InsightCard.jsx
// Usage: <InsightCard monthlyIncome={50000} expenses={expenses} />
// ──────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";

// ─── 1. ALGORITHM (pure function, no React needed) ────────────────────────
function fmt(n) {
  return `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
}

export function generateInsight(monthlyIncome, expenses) {
  // Guard: not enough data
  if (!monthlyIncome || monthlyIncome <= 0 || expenses.length === 0) {
    return null;
  }

  const now = new Date();

  // ── Step 1: Weekly total ─────────────────────────────────────────────
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const weeklyExpenses = expenses.filter(
    (e) => new Date(e.date) >= weekAgo
  );
  const weeklyTotal = weeklyExpenses.reduce((s, e) => s + e.amount, 0);

  // ── Step 2: Weekly % of income ───────────────────────────────────────
  const weeklyPct = Math.round((weeklyTotal / monthlyIncome) * 100);

  // ── Step 3: Daily burn rate ──────────────────────────────────────────
  const dailyAvg = weeklyTotal / 7;

  // ── Step 4: Projected monthly spend ─────────────────────────────────
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const projectedMonthlySpend = dailyAvg * daysInMonth;

  // ── Step 5: Savings estimate ─────────────────────────────────────────
  const projectedSavings = monthlyIncome - projectedMonthlySpend;
  const savingsRate = (projectedSavings / monthlyIncome) * 100;

  // ── Step 6: Category breakdown ───────────────────────────────────────
  const byCategory = {};
  weeklyExpenses.forEach((e) => {
    byCategory[e.label] = (byCategory[e.label] || 0) + e.amount;
  });
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  // ── Step 7: Mid-month check ──────────────────────────────────────────
  const currentDay = now.getDate();
  const daysRemaining = daysInMonth - currentDay;
  const monthSpentSoFar = expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);
  const remainingBalance = monthlyIncome - monthSpentSoFar;
  const dailyBudgetLeft = daysRemaining > 0 ? Math.round(remainingBalance / daysRemaining) : 0;

  // ── Step 8: Risk classification + messages ───────────────────────────
  let risk, emoji, headline, advice, tip;

  if (savingsRate >= 30) {
    risk = "excellent";
    emoji = "🏆";
    headline = `You spent ${fmt(weeklyTotal)} this week — ${weeklyPct}% of your income. You may save ${fmt(projectedSavings)} this month.`;
    advice = "Outstanding discipline! You're saving over 30% of your income.";
    tip = "Consider putting your surplus into a SIP, RD, or emergency fund.";
  } else if (savingsRate >= 20) {
    risk = "safe";
    emoji = "🟢";
    headline = `You spent ${fmt(weeklyTotal)} this week — ${weeklyPct}% of your income. At this pace you may save ${fmt(projectedSavings)} this month.`;
    advice = "You're on track with a healthy savings rate.";
    tip = topCategory ? `Your top spend this week was ${topCategory[0]} (${fmt(topCategory[1])}).` : "Keep tracking daily to stay consistent.";
  } else if (savingsRate >= 10) {
    risk = "warning";
    emoji = "🟡";
    headline = `You spent ${fmt(weeklyTotal)} this week — ${weeklyPct}% of your income. You may save only ${fmt(projectedSavings)} this month.`;
    advice = "You're saving, but it's tighter than ideal. Small cuts can help.";
    tip = topCategory ? `Try reducing ${topCategory[0]} spending (${fmt(topCategory[1])} this week).` : "Aim to cut ₹200–₹500 from daily discretionary spends.";
  } else if (savingsRate >= 0) {
    risk = "tight";
    emoji = "🟠";
    headline = `You spent ${fmt(weeklyTotal)} this week — ${weeklyPct}% of your income. You may save only ${fmt(projectedSavings)} this month.`;
    advice = "Very little savings projected. Your budget needs attention.";
    tip = `You have ${fmt(remainingBalance)} left for ${daysRemaining} days — about ${fmt(dailyBudgetLeft)}/day.`;
  } else {
    risk = "danger";
    emoji = "🔴";
    headline = `You spent ${fmt(weeklyTotal)} this week — ${weeklyPct}% of your income. At this pace you may overspend by ${fmt(Math.abs(projectedSavings))} this month.`;
    advice = "You're spending more than you earn. Immediate action needed.";
    tip = topCategory ? `${topCategory[0]} is your biggest drain at ${fmt(topCategory[1])} this week. Review it.` : "Review all expense categories and eliminate non-essentials immediately.";
  }

  return {
    risk,
    emoji,
    headline,
    advice,
    tip,
    // Raw numbers for display
    weeklyTotal,
    weeklyPct,
    dailyAvg,
    projectedMonthlySpend,
    projectedSavings,
    savingsRate: Math.round(savingsRate),
    daysInMonth,
    currentDay,
    daysRemaining,
    monthSpentSoFar,
    remainingBalance,
    dailyBudgetLeft,
    topCategory,
    byCategory,
  };
}

// ─── 2. STYLE TOKENS ──────────────────────────────────────────────────────
const RISK_STYLES = {
  excellent: { bg: "#F0FDF4", border: "#86EFAC", accent: "#16A34A", badge: "#DCFCE7", badgeText: "#15803D" },
  safe:      { bg: "#F0FDF4", border: "#86EFAC", accent: "#16A34A", badge: "#DCFCE7", badgeText: "#15803D" },
  warning:   { bg: "#FFFBEB", border: "#FCD34D", accent: "#D97706", badge: "#FEF3C7", badgeText: "#B45309" },
  tight:     { bg: "#FFF7ED", border: "#FDBA74", accent: "#EA580C", badge: "#FFEDD5", badgeText: "#C2410C" },
  danger:    { bg: "#FFF1F2", border: "#FCA5A5", accent: "#DC2626", badge: "#FEE2E2", badgeText: "#B91C1C" },
};

const RISK_LABEL = {
  excellent: "Excellent",
  safe:      "On Track",
  warning:   "Warning",
  tight:     "Tight",
  danger:    "Danger",
};

// ─── 3. STAT PILL ─────────────────────────────────────────────────────────
function StatPill({ label, value, accent }) {
  return (
    <div style={{ flex: 1, minWidth: 100, background: "#fff", borderRadius: 10, padding: "10px 12px", textAlign: "center", border: "1px solid #E7E5E0" }}>
      <p style={{ margin: 0, fontSize: 10, color: "#78716C", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "sans-serif", fontWeight: 600 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 700, color: accent, fontFamily: "Georgia, serif" }}>{value}</p>
    </div>
  );
}

// ─── 4. CATEGORY BAR ──────────────────────────────────────────────────────
function CategoryBar({ byCategory, weeklyTotal, accent }) {
  if (!byCategory || Object.keys(byCategory).length === 0) return null;
  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return (
    <div style={{ marginTop: 14 }}>
      <p style={{ margin: "0 0 8px", fontSize: 11, color: "#78716C", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "sans-serif", fontWeight: 600 }}>
        Weekly Breakdown
      </p>
      {entries.map(([cat, amt]) => {
        const pct = Math.round((amt / weeklyTotal) * 100);
        return (
          <div key={cat} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 12, color: "#1C1917", fontFamily: "sans-serif" }}>{cat}</span>
              <span style={{ fontSize: 12, color: "#78716C", fontFamily: "sans-serif" }}>₹{Math.round(amt).toLocaleString("en-IN")} · {pct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: "#E7E5E0" }}>
              <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: accent, transition: "width 0.5s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 5. INSIGHT CARD COMPONENT ────────────────────────────────────────────
/**
 * InsightCard
 * Props:
 *   monthlyIncome  {number}   — user's declared monthly income
 *   expenses       {Array}    — array of { id, amount, label, date } objects
 *   showDetails    {boolean}  — whether to show stat pills + category bars (default: true)
 */
export default function InsightCard({ monthlyIncome, expenses, showDetails = true }) {

  // ── useMemo: re-runs ONLY when expenses or income changes ─────────────
  const insight = useMemo(
    () => generateInsight(monthlyIncome, expenses),
    [monthlyIncome, expenses]
  );

  // ── Empty state ───────────────────────────────────────────────────────
  if (!insight) {
    return (
      <div style={{ borderRadius: 14, background: "#F7F5F0", border: "1.5px dashed #D6D3CE", padding: "20px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 24 }}>📊</p>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#78716C", fontFamily: "sans-serif" }}>
          Log at least one expense to see your weekly insight.
        </p>
      </div>
    );
  }

  const s = RISK_STYLES[insight.risk];

  return (
    <div style={{ borderRadius: 14, background: s.bg, border: `1.5px solid ${s.border}`, padding: "18px", transition: "all 0.3s ease" }}>

      {/* ── Header row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{insight.emoji}</span>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: s.accent, textTransform: "uppercase", letterSpacing: "1px", fontFamily: "sans-serif" }}>
            Weekly Insight
          </p>
        </div>
        {/* Risk badge */}
        <span style={{ background: s.badge, color: s.badgeText, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, fontFamily: "sans-serif", letterSpacing: "0.5px" }}>
          {RISK_LABEL[insight.risk]}
        </span>
      </div>

      {/* ── Headline message ── */}
      <p style={{ margin: "0 0 8px", fontSize: 14, color: "#1C1917", lineHeight: 1.7, fontFamily: "sans-serif", fontWeight: 500 }}>
        {insight.headline}
      </p>

      {/* ── Advice line ── */}
      <p style={{ margin: "0 0 4px", fontSize: 13, color: s.accent, fontFamily: "sans-serif", fontWeight: 600 }}>
        {insight.advice}
      </p>

      {/* ── Tip line ── */}
      <p style={{ margin: 0, fontSize: 12, color: "#78716C", fontFamily: "sans-serif", fontStyle: "italic" }}>
        💡 {insight.tip}
      </p>

      {/* ── Stat pills ── */}
      {showDetails && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <StatPill label="Weekly Spend"   value={`₹${Math.round(insight.weeklyTotal).toLocaleString("en-IN")}`}         accent={s.accent} />
            <StatPill label="% of Income"    value={`${insight.weeklyPct}%`}                                                accent={s.accent} />
            <StatPill label="Daily Avg"      value={`₹${Math.round(insight.dailyAvg).toLocaleString("en-IN")}`}            accent={s.accent} />
            <StatPill label="Proj. Savings"  value={insight.projectedSavings >= 0 ? `₹${Math.round(insight.projectedSavings).toLocaleString("en-IN")}` : `−₹${Math.round(Math.abs(insight.projectedSavings)).toLocaleString("en-IN")}`} accent={insight.projectedSavings >= 0 ? s.accent : "#DC2626"} />
          </div>

          {/* ── Category breakdown bars ── */}
          <CategoryBar byCategory={insight.byCategory} weeklyTotal={insight.weeklyTotal} accent={s.accent} />
        </>
      )}
    </div>
  );
}
