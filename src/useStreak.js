// ─── useStreak.js ─────────────────────────────────────────────────────────
import { useMemo } from "react";

const toDateStr = (date = new Date()) => date.toISOString().split("T")[0];

export function calculateStreak(checkIns, expenses, safeDailySpend) {
  const spendByDay = {};
  expenses.forEach(e => {
    const d = e.date.split("T")[0];
    spendByDay[d] = (spendByDay[d] || 0) + e.amount;
  });
  const dayMap = {};
  Object.entries(spendByDay).forEach(([d, spent]) => {
    dayMap[d] = { spent, zeroDay: false };
  });
  checkIns.forEach(ci => {
    if (!dayMap[ci.date]) dayMap[ci.date] = { spent: 0, zeroDay: ci.zeroDay };
    else dayMap[ci.date].zeroDay = ci.zeroDay;
  });

  let streak = 0;
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const d   = toDateStr(cursor);
    const day = dayMap[d];
    if (!day) break;
    const ok = day.zeroDay || day.spent === 0 || (safeDailySpend > 0 && day.spent <= safeDailySpend);
    if (ok) streak++; else break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function streakLabel(streak) {
  if (streak === 0) return { emoji: "🌱", text: "Start your streak today!" };
  if (streak === 1) return { emoji: "🔥", text: "1 day streak — keep going!" };
  if (streak < 7)  return { emoji: "🔥", text: `${streak} day streak!` };
  if (streak < 14) return { emoji: "🏆", text: `${streak} days — amazing!` };
  if (streak < 30) return { emoji: "⭐", text: `${streak} days — superb!` };
  return               { emoji: "💎", text: `${streak} days — legendary!` };
}

export function useStreak(safeDailySpend, expenses, checkIns, addCheckIn) {
  const todayStr       = toDateStr();
  const todayCheckedIn = checkIns.some(ci => ci.date === todayStr);

  const todaySpend = useMemo(() =>
    expenses.filter(e => e.date.startsWith(todayStr)).reduce((s, e) => s + e.amount, 0),
    [expenses, todayStr]
  );

  const streak = useMemo(() => calculateStreak(checkIns, expenses, safeDailySpend), [checkIns, expenses, safeDailySpend]);
  const zeroDays = checkIns.filter(ci => ci.zeroDay).length;

  const totalDays = useMemo(() => {
    const all = new Set([...checkIns.map(ci => ci.date), ...expenses.map(e => e.date.split("T")[0])]);
    return all.size;
  }, [checkIns, expenses]);

  const bestStreak = useMemo(() => {
    let best = 0, cur = 0;
    const spendByDay = {};
    expenses.forEach(e => { const d = e.date.split("T")[0]; spendByDay[d] = (spendByDay[d]||0) + e.amount; });
    const sorted = [...checkIns].sort((a,b) => a.date.localeCompare(b.date));
    sorted.forEach(ci => {
      const spent = spendByDay[ci.date] || 0;
      const ok = ci.zeroDay || spent === 0 || (safeDailySpend > 0 && spent <= safeDailySpend);
      if (ok) { cur++; best = Math.max(best, cur); } else cur = 0;
    });
    return Math.max(best, streak);
  }, [checkIns, expenses, safeDailySpend, streak]);

  const todayUnderBudget = safeDailySpend > 0 ? todaySpend <= safeDailySpend : todaySpend === 0;

  const recordZeroSpend = () => {
    if (todayCheckedIn) return;
    addCheckIn({ date: todayStr, zeroDay: true, ts: Date.now() });
  };
  const recordSpendDay = () => {
    if (todayCheckedIn) return;
    addCheckIn({ date: todayStr, zeroDay: false, ts: Date.now() });
  };

  return { streak, bestStreak, zeroDays, totalDays, todayCheckedIn, todaySpend, todayUnderBudget, recordZeroSpend, recordSpendDay };
}
