// ─── DailyCheckIn.jsx ─────────────────────────────────────────────────────
// Save to: moneycoach-app/src/DailyCheckIn.jsx
//
// USAGE in App.jsx:
//   import DailyCheckIn from "./DailyCheckIn";
//   <DailyCheckIn
//     streak={streak}
//     bestStreak={bestStreak}
//     zeroDays={zeroDays}
//     totalDays={totalDays}
//     todayCheckedIn={todayCheckedIn}
//     todaySpend={todaySpend}
//     todayUnderBudget={todayUnderBudget}
//     safeDailySpend={safeDailySpend}
//     onZeroSpend={recordZeroSpend}
//     onAddExpense={() => setTab("dashboard")}
//   />
// ─────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { streakLabel } from "./useStreak";

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────
const fmt = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// ─── STYLE TOKENS ─────────────────────────────────────────────────────────
const C = {
  bg: "#F7F5F0", card: "#FFFFFF", ink: "#1C1917",
  muted: "#78716C", border: "#E7E5E0",
  green: "#16A34A", greenBg: "#F0FDF4", greenBorder: "#86EFAC",
  red: "#DC2626", redBg: "#FFF1F2", redBorder: "#FCA5A5",
  amber: "#D97706", amberBg: "#FFFBEB", amberBorder: "#FCD34D",
};

// ─── STREAK RING ──────────────────────────────────────────────────────────
// Visual flame ring — grows as streak increases
function StreakRing({ streak }) {
  const size   = 96;
  const r      = 36;
  const circ   = 2 * Math.PI * r;
  // Cap visual fill at 30 days
  const pct    = Math.min((streak / 30) * 100, 100);
  const offset = circ - (pct / 100) * circ;
  const label  = streakLabel(streak);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E7E5E0" strokeWidth={7} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={streak >= 14 ? "#F59E0B" : streak >= 7 ? "#F97316" : streak >= 1 ? "#EF4444" : "#E7E5E0"}
          strokeWidth={7} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{label.emoji}</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: C.ink, fontFamily: "Georgia, serif", lineHeight: 1, marginTop: 2 }}>{streak}</span>
        <span style={{ fontSize: 9, color: C.muted, fontFamily: "sans-serif", marginTop: 1 }}>days</span>
      </div>
    </div>
  );
}

// ─── STAT TILE ────────────────────────────────────────────────────────────
function StatTile({ emoji, label, value, accent = C.ink }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "10px 6px", background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
      <p style={{ margin: 0, fontSize: 16 }}>{emoji}</p>
      <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 700, color: accent, fontFamily: "Georgia, serif" }}>{value}</p>
      <p style={{ margin: "2px 0 0", fontSize: 10, color: C.muted, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</p>
    </div>
  );
}

// ─── MINI CALENDAR (last 7 days indicator dots) ───────────────────────────
function WeekDots({ checkIns, expenses, safeDailySpend }) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr  = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("en-IN", { weekday: "narrow" });
    const isToday  = i === 0;

    // Determine day status
    const ci       = checkIns.find(c => c.date === dateStr);
    const daySpend = expenses
      .filter(e => e.date.startsWith(dateStr))
      .reduce((s, e) => s + e.amount, 0);

    let status = "none"; // no data
    if (ci?.zeroDay)    status = "zero";
    else if (daySpend > 0 && safeDailySpend > 0 && daySpend <= safeDailySpend) status = "good";
    else if (daySpend > 0 && safeDailySpend > 0 && daySpend > safeDailySpend)  status = "over";
    else if (daySpend > 0) status = "good";

    const dotColor = {
      zero: C.green, good: C.green, over: C.red, none: C.border
    }[status];

    days.push({ dateStr, dayLabel, isToday, status, dotColor });
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 4px 0" }}>
      {days.map(({ dateStr, dayLabel, isToday, dotColor, status }) => (
        <div key={dateStr} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, color: isToday ? C.ink : C.muted, fontFamily: "sans-serif", fontWeight: isToday ? 700 : 400 }}>
            {dayLabel}
          </span>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: dotColor,
            border: isToday ? `2px solid ${C.ink}` : "2px solid transparent",
            transition: "background 0.3s"
          }} />
          {isToday && (
            <span style={{ fontSize: 7, color: C.muted, fontFamily: "sans-serif" }}>today</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────
/**
 * DailyCheckIn
 * Props:
 *   streak          {number}   — current streak from useStreak
 *   bestStreak      {number}   — best ever streak
 *   zeroDays        {number}   — total zero-spend days
 *   totalDays       {number}   — total days tracked
 *   todayCheckedIn  {boolean}  — has user already checked in today
 *   todaySpend      {number}   — today's total spend
 *   todayUnderBudget{boolean}  — is today under daily limit
 *   safeDailySpend  {number}   — from DailyBudgetGuide calculation
 *   checkIns        {Array}    — full checkIn history
 *   expenses        {Array}    — full expenses array
 *   onZeroSpend     {function} — call recordZeroSpend() from useStreak
 *   onAddExpense    {function} — navigate to add expense form
 */
export default function DailyCheckIn({
  streak, bestStreak, zeroDays, totalDays,
  todayCheckedIn, todaySpend, todayUnderBudget,
  safeDailySpend, checkIns, expenses,
  onZeroSpend, onAddExpense,
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const label = streakLabel(streak);

  const handleZeroSpend = () => {
    onZeroSpend();
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2500);
  };

  // ── Already checked in today ───────────────────────────────────────────
  if (todayCheckedIn && todaySpend === 0) {
    // Zero spend confirmed
    return (
      <div style={{ borderRadius: 14, background: C.greenBg, border: `1.5px solid ${C.greenBorder}`, padding: "20px 18px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "1px", fontFamily: "sans-serif" }}>Daily Check-In</p>
            <p style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif" }}>Zero-spend day! 🎉</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted, fontFamily: "sans-serif" }}>Great discipline. You didn't spend a rupee today.</p>
          </div>
          <StreakRing streak={streak} />
        </div>
        <div style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.greenBorder}`, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.green, fontFamily: "sans-serif" }}>{label.emoji} {label.text}</p>
        </div>
        <WeekDots checkIns={checkIns} expenses={expenses} safeDailySpend={safeDailySpend} />
      </div>
    );
  }

  if (todayCheckedIn && todaySpend > 0) {
    // Spent today but under budget
    const underBudget = safeDailySpend > 0 && todaySpend <= safeDailySpend;
    return (
      <div style={{ borderRadius: 14, background: underBudget ? C.greenBg : C.amberBg, border: `1.5px solid ${underBudget ? C.greenBorder : C.amberBorder}`, padding: "20px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: underBudget ? C.green : C.amber, textTransform: "uppercase", letterSpacing: "1px", fontFamily: "sans-serif" }}>Daily Check-In</p>
            <p style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif" }}>
              {underBudget ? "Under budget today! ✅" : "Spent a bit today 🟡"}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted, fontFamily: "sans-serif" }}>
              Spent {fmt(todaySpend)}{safeDailySpend > 0 ? ` of ${fmt(safeDailySpend)} daily limit` : " today"}.
            </p>
          </div>
          <StreakRing streak={streak} />
        </div>
        <WeekDots checkIns={checkIns} expenses={expenses} safeDailySpend={safeDailySpend} />
      </div>
    );
  }

  // ── Not yet checked in today — show the prompt ─────────────────────────
  return (
    <div style={{ borderRadius: 14, background: C.card, border: `1.5px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

      {/* Confetti animation overlay */}
      {showConfetti && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50, overflow: "hidden", borderRadius: 14 }}>
          {["🎉","✨","🌟","💫","🎊"].map((e, i) => (
            <span key={i} style={{
              position: "absolute",
              left: `${15 + i * 18}%`, top: "10%",
              fontSize: 22, animation: `fall${i} 2s ease-in forwards`,
              animationDelay: `${i * 0.1}s`
            }}>{e}</span>
          ))}
        </div>
      )}

      {/* Top: streak + title */}
      <div style={{ background: "#FAFAF9", borderBottom: `1px solid ${C.border}`, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", fontFamily: "sans-serif" }}>Daily Check-In</p>
          <p style={{ margin: "5px 0 0", fontSize: 16, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif" }}>Did you spend anything today?</p>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: C.muted, fontFamily: "sans-serif" }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <StreakRing streak={streak} />
      </div>

      {/* Streak label */}
      <div style={{ padding: "10px 18px 0" }}>
        <div style={{ background: streak > 0 ? "#FFF7ED" : C.bg, borderRadius: 8, padding: "8px 12px", border: `1px solid ${streak > 0 ? "#FDBA74" : C.border}`, display: "inline-block" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: streak > 0 ? "#EA580C" : C.muted, fontFamily: "sans-serif" }}>
            {label.emoji} {label.text}
          </span>
        </div>
      </div>

      {/* 7-day dots */}
      <div style={{ padding: "0 18px" }}>
        <WeekDots checkIns={checkIns} expenses={expenses} safeDailySpend={safeDailySpend} />
      </div>

      {/* Action buttons */}
      <div style={{ padding: "16px 18px", display: "flex", gap: 10 }}>
        {/* No Spending Today */}
        <button onClick={handleZeroSpend} style={{
          flex: 1, padding: "14px 10px", borderRadius: 12,
          background: C.greenBg, color: C.green,
          border: `1.5px solid ${C.greenBorder}`,
          fontSize: 13, fontFamily: "sans-serif", fontWeight: 700, cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          transition: "all 0.15s"
        }}>
          <span style={{ fontSize: 22 }}>🙌</span>
          <span>No Spending Today</span>
          <span style={{ fontSize: 10, fontWeight: 400, color: C.green }}>Keep the streak alive!</span>
        </button>

        {/* Add Expense */}
        <button onClick={onAddExpense} style={{
          flex: 1, padding: "14px 10px", borderRadius: 12,
          background: C.ink, color: "#fff",
          border: `1.5px solid ${C.ink}`,
          fontSize: 13, fontFamily: "sans-serif", fontWeight: 700, cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          transition: "all 0.15s"
        }}>
          <span style={{ fontSize: 22 }}>➕</span>
          <span>Add Expense</span>
          <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.6)" }}>Log what you spent</span>
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 8, padding: "0 18px 18px" }}>
        <StatTile emoji="🔥" label="Streak"    value={streak}     accent={streak > 0 ? "#EA580C" : C.muted} />
        <StatTile emoji="🏆" label="Best"      value={bestStreak} accent={C.amber} />
        <StatTile emoji="🙌" label="Zero Days" value={zeroDays}   accent={C.green} />
        <StatTile emoji="📅" label="Tracked"   value={totalDays}  accent={C.ink} />
      </div>
    </div>
  );
}
