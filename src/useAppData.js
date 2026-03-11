// ─── useAppData.js — Atomic state + sync localStorage ────────────────────
// Save to: moneycoach-app/src/useAppData.js
//
// KEY FIX: Every mutation uses setData(prev => next) so React always
// gets the freshest state. localStorage is written INSIDE the updater
// (synchronously, before React re-renders), so UI and storage are 1:1.
// No useEffect, no async gap, no stale closure.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from "react";

const STORAGE_KEY = "moneyCoachData_v2";

const DEFAULT_STATE = {
  screen:        "onboarding",
  name:          "",
  monthlyIncome: 0,
  allExpenses:   {},   // { "2026-03": [{id,amount,label,note,date}] }
  checkIns:      [],   // [{ date:"2026-03-10", zeroDay:bool, ts:number }]
};

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (typeof parsed === "object" && parsed) ? parsed : null;
  } catch { return null; }
}

// Synchronous write — called inside setData updater, before React re-renders
function persist(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn("[MoneyCoach] localStorage write failed", e); }
}

// ─── EXPORTED HELPERS ─────────────────────────────────────────────────────
export const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
};

export const monthKeyToLabel = (key) => {
  const [y, m] = key.split("-");
  return new Date(parseInt(y), parseInt(m)-1, 1)
    .toLocaleDateString("en-IN", { month:"long", year:"numeric" });
};

// Only show months with data + always include current month, sorted newest first
export const getActiveMonthKeys = (allExpenses) => {
  const current  = currentMonthKey();
  const withData = Object.keys(allExpenses).filter(k => (allExpenses[k]?.length || 0) > 0);
  return Array.from(new Set([current, ...withData])).sort((a,b) => b.localeCompare(a));
};

// ─── HOOK ─────────────────────────────────────────────────────────────────
export function useAppData() {

  const [data, setData] = useState(() => {
    const saved = loadFromStorage();
    return saved ? { ...DEFAULT_STATE, ...saved } : { ...DEFAULT_STATE };
  });

  // Central updater: compute next state, write to localStorage, return to React
  const commit = (patchFn) => {
    setData(prev => {
      const next = patchFn(prev);
      persist(next);  // ← synchronous, inside the setState callback
      return next;
    });
  };

  const completeOnboarding = ({ income, name }) =>
    commit(prev => ({ ...prev, screen:"dashboard", monthlyIncome:income, name:name||"" }));

  const addExpense = (expense) => {
    const key = currentMonthKey();
    commit(prev => ({
      ...prev,
      allExpenses: {
        ...prev.allExpenses,
        [key]: [...(prev.allExpenses[key] || []), expense],
      },
    }));
  };

  const editExpense = (monthKey, id, updates) =>
    commit(prev => ({
      ...prev,
      allExpenses: {
        ...prev.allExpenses,
        [monthKey]: (prev.allExpenses[monthKey] || []).map(e =>
          e.id === id ? { ...e, ...updates } : e
        ),
      },
    }));

  const deleteExpense = (monthKey, id) =>
    commit(prev => ({
      ...prev,
      allExpenses: {
        ...prev.allExpenses,
        [monthKey]: (prev.allExpenses[monthKey] || []).filter(e => e.id !== id),
      },
    }));

  const addCheckIn = (checkIn) =>
    commit(prev => {
      if (prev.checkIns.some(c => c.date === checkIn.date)) return prev;
      return { ...prev, checkIns: [...prev.checkIns, checkIn] };
    });

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setData({ ...DEFAULT_STATE });
  };

  return {
    screen: data.screen, name: data.name,
    monthlyIncome: data.monthlyIncome,
    allExpenses: data.allExpenses,
    checkIns: data.checkIns,
    completeOnboarding, addExpense, editExpense, deleteExpense, addCheckIn, resetAll,
  };
}
