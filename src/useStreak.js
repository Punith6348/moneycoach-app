// ─── useStreak.js ─────────────────────────────────────────────────────────
// Save to: moneycoach-app/src/useStreak.js
//
// Custom hook that tracks:
//   - streak of consecutive days under daily budget
//   - zero-spend days
//   - check-in history
//
// USAGE:
//   const { streak, checkIns, recordZeroSpend, recordSpendDay, todayCheckedIn } =
//     useStreak(safeDailySpend, expenses);
// ─────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";

// ─── HELPERS ──────────────────────────────────────────────────────────────
const toDateStr = (date = new Date()) => date.toISOString().split("T")[0];

const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateStr(d);
};

// ─── STREAK CALCULATION LOGIC ─────────────────────────────────────────────
/**
 * calculateStreak
 *
 * A "streak day" = any day where the user either:
 *   a) Recorded zero spend, OR
 *   b) Spent less than or equal to their safe daily budget
 *
 * The streak BREAKS if:
 *   - User spent MORE than safeDailySpend on any past day
 *   - A day was skipped entirely (no check-in, no expense)
 *     → we are lenient: only break on days with confirmed overspend
 *
 * Algorithm:
 *   1. Merge checkIns + expense days into a unified day map
 *   2. Walk backwards from yesterday
 *   3. Count consecutive "under budget" days
 *   4. Stop when an overspend day or unchecked gap is found
 */
export function calculateStreak(checkIns, expenses, safeDailySpend) {
  // Build a map: dateStr → totalSpent
  const spendByDay = {};
  expenses.forEach(e => {
    const d = e.date.split("T")[0];
    spendByDay[d] = (spendByDay[d] || 0) + e.amount;
  });

  // Build unified day map: dateStr → { spent, checkedIn, zeroDay }
  const dayMap = {};

  // From expenses
  Object.entries(spendByDay).forEach(([d, spent]) => {
    dayMap[d] = { spent, checkedIn: false, zeroDay: false };
  });

  // From checkIns (zero-spend days override)
  checkIns.forEach(ci => {
    if (!dayMap[ci.date]) {
      dayMap[ci.date] = { spent: 0, checkedIn: true, zeroDay: ci.zeroDay };
    } else {
      dayMap[ci.date].checkedIn = true;
      dayMap[ci.date].zeroDay   = ci.zeroDay;
    }
  });

  // Walk backwards from yesterday, count streak
  let streak = 0;
  let cursor = new Date();
  cursor.setDate(cursor.getDate() - 1); // start from yesterday

  for (let i = 0; i < 365; i++) {
    const dateStr = toDateStr(cursor);
    const day     = dayMap[dateStr];

    if (!day) break; // no data = gap = streak ends

    const underBudget =
      day.zeroDay ||
      (safeDailySpend > 0 && day.spent <= safeDailySpend) ||
      day.spent === 0;

    if (underBudget) {
      streak++;
    } else {
      break; // overspend day = streak ends
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// ─── STREAK LABEL HELPER ──────────────────────────────────────────────────
export function streakLabel(streak) {
  if (streak === 0) return { emoji: "🌱", text: "Start your streak today!" };
  if (streak === 1) return { emoji: "🔥", text: "1 day streak — keep going!" };
  if (streak < 7)  return { emoji: "🔥", text: `${streak} day streak!` };
  if (streak < 14) return { emoji: "🏆", text: `${streak} days — amazing!` };
  if (streak < 30) return { emoji: "⭐", text: `${streak} day streak — superb!` };
  return               { emoji: "💎", text: `${streak} days — legendary!` };
}

// ─── MAIN HOOK ────────────────────────────────────────────────────────────
export function useStreak(safeDailySpend, expenses) {
  // checkIns: [{ date: "2025-03-10", zeroDay: true/false, ts: timestamp }]
  const [checkIns, setCheckIns] = useState([]);

  const todayStr = toDateStr();

  // Has the user checked in today?
  const todayCheckedIn = checkIns.some(ci => ci.date === todayStr);

  // Did user spend today (from expenses)?
  const todaySpend = useMemo(() =>
    expenses
      .filter(e => e.date.startsWith(todayStr))
      .reduce((s, e) => s + e.amount, 0),
    [expenses, todayStr]
  );

  // Is today under budget?
  const todayUnderBudget = safeDailySpend > 0
    ? todaySpend <= safeDailySpend
    : todaySpend === 0;

  // Streak count — recalculates when checkIns or expenses change
  const streak = useMemo(
    () => calculateStreak(checkIns, expenses, safeDailySpend),
    [checkIns, expenses, safeDailySpend]
  );

  // Total zero-spend days
  const zeroDays = checkIns.filter(ci => ci.zeroDay).length;

  // Total days tracked
  const totalDays = useMemo(() => {
    const allDays = new Set([
      ...checkIns.map(ci => ci.date),
      ...expenses.map(e => e.date.split("T")[0]),
    ]);
    return allDays.size;
  }, [checkIns, expenses]);

  // Best streak (walk full history)
  const bestStreak = useMemo(() => {
    let best = 0, current = 0;
    const spendByDay = {};
    expenses.forEach(e => {
      const d = e.date.split("T")[0];
      spendByDay[d] = (spendByDay[d] || 0) + e.amount;
    });
    checkIns.forEach(ci => {
      const spent = spendByDay[ci.date] || 0;
      const ok = ci.zeroDay || spent === 0 || (safeDailySpend > 0 && spent <= safeDailySpend);
      if (ok) { current++; best = Math.max(best, current); }
      else { current = 0; }
    });
    return Math.max(best, streak);
  }, [checkIns, expenses, safeDailySpend, streak]);

  // ── Actions ──────────────────────────────────────────────────────────────

  // Record a zero-spend day
  const recordZeroSpend = () => {
    if (todayCheckedIn) return;
    setCheckIns(prev => [...prev, { date: todayStr, zeroDay: true, ts: Date.now() }]);
  };

  // Record that user spent today (called automatically when expense logged)
  const recordSpendDay = () => {
    if (todayCheckedIn) return;
    setCheckIns(prev => [...prev, { date: todayStr, zeroDay: false, ts: Date.now() }]);
  };

  return {
    streak,
    bestStreak,
    zeroDays,
    totalDays,
    checkIns,
    todayCheckedIn,
    todaySpend,
    todayUnderBudget,
    recordZeroSpend,
    recordSpendDay,
  };
}
