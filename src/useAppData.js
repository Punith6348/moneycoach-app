// ─── useAppData.js ────────────────────────────────────────────────────────
// Central persistence hook — ALL app data lives here.
// Reads from localStorage on mount, writes on every change.
// Save to: moneycoach-app/src/useAppData.js
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

const STORAGE_KEY = "moneyCoachData_v1";

// ─── Default empty state ──────────────────────────────────────────────────
const DEFAULT_STATE = {
  screen:       "onboarding",  // "onboarding" | "dashboard"
  name:         "",            // user's name (optional)
  monthlyIncome: 0,
  // Multi-month expenses: { "2026-03": [{id, amount, label, note, date}] }
  allExpenses:  {},
  // Streak check-ins: [{ date: "2026-03-10", zeroDay: true, ts: 1234 }]
  checkIns:     [],
};

// ─── Safe read from localStorage ─────────────────────────────────────────
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Basic validation — must have at least monthlyIncome
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch (e) {
    console.warn("Money Coach: failed to read localStorage", e);
    return null;
  }
}

// ─── Safe write to localStorage ──────────────────────────────────────────
function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Money Coach: failed to write localStorage", e);
  }
}

// ─── MAIN HOOK ────────────────────────────────────────────────────────────
export function useAppData() {
  // ── 1. Initialise state from localStorage (runs ONCE on mount) ─────────
  const [data, setData] = useState(() => {
    const saved = loadFromStorage();
    if (saved) {
      // Merge with defaults so new fields added later don't break old saves
      return { ...DEFAULT_STATE, ...saved };
    }
    return { ...DEFAULT_STATE };
  });

  // ── 2. Write to localStorage whenever data changes ────────────────────
  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  // ── 3. Convenience updaters ───────────────────────────────────────────

  const completeOnboarding = ({ income, name }) => {
    setData(prev => ({
      ...prev,
      screen:        "dashboard",
      monthlyIncome: income,
      name:          name || "",
    }));
  };

  // Add expense to the correct month bucket
  const addExpense = (expense) => {
    const key = currentMonthKey();
    setData(prev => ({
      ...prev,
      allExpenses: {
        ...prev.allExpenses,
        [key]: [...(prev.allExpenses[key] || []), expense],
      },
    }));
  };

  // Record a check-in (zero-spend or spend day)
  const addCheckIn = (checkIn) => {
    // Prevent duplicates for the same date
    setData(prev => {
      const already = prev.checkIns.some(c => c.date === checkIn.date);
      if (already) return prev;
      return { ...prev, checkIns: [...prev.checkIns, checkIn] };
    });
  };

  // ── 4. Hard reset — ONLY called from Reset button ─────────────────────
  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setData({ ...DEFAULT_STATE });
  };

  return {
    // State
    screen:        data.screen,
    name:          data.name,
    monthlyIncome: data.monthlyIncome,
    allExpenses:   data.allExpenses,
    checkIns:      data.checkIns,
    // Actions
    completeOnboarding,
    addExpense,
    addCheckIn,
    resetAll,
    // Direct setter for edge cases
    setData,
  };
}

// ─── HELPERS (used by App + hooks) ────────────────────────────────────────
export const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
};

export const monthKeyToLabel = (key) => {
  const [y, m] = key.split("-");
  return new Date(parseInt(y), parseInt(m)-1, 1)
    .toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

export const getMonthKeys = (n = 12) => {
  const keys = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
    d.setMonth(d.getMonth()-1);
  }
  return keys;
};
