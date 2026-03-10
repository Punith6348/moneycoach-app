// ─── useAppData.js — Central persistence hook ────────────────────────────
// Save to: moneycoach-app/src/useAppData.js

import { useState, useEffect } from "react";

const STORAGE_KEY = "moneyCoachData_v2";

const DEFAULT_STATE = {
  screen:        "onboarding",
  name:          "",
  monthlyIncome: 0,
  allExpenses:   {},   // { "2026-03": [{id,amount,label,note,date},...] }
  checkIns:      [],   // [{ date:"2026-03-10", zeroDay:bool, ts:number }]
};

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch { return null; }
}

function saveToStorage(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch (e) { console.warn("localStorage write failed", e); }
}

// ── HELPERS ───────────────────────────────────────────────────────────────
export const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
};

export const monthKeyToLabel = (key) => {
  const [y, m] = key.split("-");
  return new Date(parseInt(y), parseInt(m)-1, 1)
    .toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

// Fix #5: Only return months that have data + always include current month
export const getActiveMonthKeys = (allExpenses) => {
  const current = currentMonthKey();
  const withData = Object.keys(allExpenses).filter(k => (allExpenses[k]?.length || 0) > 0);
  const all = Array.from(new Set([current, ...withData]));
  // Sort descending (newest first)
  return all.sort((a, b) => b.localeCompare(a));
};

// ── HOOK ──────────────────────────────────────────────────────────────────
export function useAppData() {
  const [data, setData] = useState(() => {
    const saved = loadFromStorage();
    return saved ? { ...DEFAULT_STATE, ...saved } : { ...DEFAULT_STATE };
  });

  useEffect(() => { saveToStorage(data); }, [data]);

  const completeOnboarding = ({ income, name }) => {
    setData(prev => ({ ...prev, screen: "dashboard", monthlyIncome: income, name: name || "" }));
  };

  // Fix #5: auto-creates month bucket when first expense is added
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

  // Edit expense in any month
  const editExpense = (monthKey, id, updates) => {
    setData(prev => ({
      ...prev,
      allExpenses: {
        ...prev.allExpenses,
        [monthKey]: (prev.allExpenses[monthKey] || []).map(e =>
          e.id === id ? { ...e, ...updates } : e
        ),
      },
    }));
  };

  // Delete expense from any month
  const deleteExpense = (monthKey, id) => {
    setData(prev => ({
      ...prev,
      allExpenses: {
        ...prev.allExpenses,
        [monthKey]: (prev.allExpenses[monthKey] || []).filter(e => e.id !== id),
      },
    }));
  };

  const addCheckIn = (checkIn) => {
    setData(prev => {
      if (prev.checkIns.some(c => c.date === checkIn.date)) return prev;
      return { ...prev, checkIns: [...prev.checkIns, checkIn] };
    });
  };

  // Fix #3: only place localStorage is cleared
  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setData({ ...DEFAULT_STATE });
  };

  return {
    screen: data.screen, name: data.name,
    monthlyIncome: data.monthlyIncome,
    allExpenses: data.allExpenses, checkIns: data.checkIns,
    completeOnboarding, addExpense, editExpense, deleteExpense, addCheckIn, resetAll,
  };
}
