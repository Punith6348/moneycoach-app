// ─── CategoryBudgets.jsx ─────────────────────────────────────────────────────
// Category-level monthly budgeting.
// Users set a cap per expense category; the tab shows spent vs budget,
// progress bars, and warnings. No changes to existing financial calculations.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from "react";
import { currentMonthKey, monthKeyToLabel } from "./useAppData";

const C = {
  ink:"#111827", muted:"#6B7280", border:"#E5E7EB", bg:"#F8FAFC",
  red:"#DC2626", green:"#16A34A", amber:"#D97706", blue:"#2563EB",
};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;

// All variable categories — matches VARIABLE_CATS in App.jsx
const ALL_CATS = [
  { name:"Food",          icon:"🍽" },
  { name:"Grocery",       icon:"🛒" },
  { name:"Travel",        icon:"🚗" },
  { name:"Coffee",        icon:"☕" },
  { name:"Entertainment", icon:"🎬" },
  { name:"Medical",       icon:"💊" },
  { name:"Other",         icon:"💸" },
];

// ── Status helpers ────────────────────────────────────────────────────────────
function getStatus(spent, budget) {
  if (!budget || budget <= 0) return "unset";
  const p = spent / budget;
  if (p >= 1)    return "over";
  if (p >= 0.8)  return "warn";
  if (p >= 0.5)  return "mid";
  return "good";
}

const STATUS_STYLE = {
  good: { bar:C.green,  label:"On track",  labelColor:C.green,  bg:"#F0FDF4", border:"#BBF7D0" },
  mid:  { bar:C.blue,   label:"Midway",    labelColor:C.blue,   bg:"#EFF6FF", border:"#BFDBFE" },
  warn: { bar:C.amber,  label:"⚠ 80%+ used", labelColor:C.amber, bg:"#FFFBEB", border:"#FDE68A" },
  over: { bar:C.red,    label:"🔴 Over budget", labelColor:C.red, bg:"#FFF1F2", border:"#FECACA" },
  unset:{ bar:C.border, label:"No budget",  labelColor:C.muted, bg:"#fff",    border:C.border  },
};

// ── Inline editable budget input ──────────────────────────────────────────────
function BudgetInput({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");

  const open = () => { setDraft(value > 0 ? String(value) : ""); setEditing(true); };
  const save = () => {
    const v = parseFloat(draft);
    onChange(isNaN(v) || v < 0 ? 0 : v);
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ fontSize:12, color:C.muted }}>₹</span>
        <input
          autoFocus
          type="number"
          value={draft}
          min="0"
          placeholder="e.g. 3000"
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          style={{
            width:90, padding:"5px 8px", borderRadius:7, fontSize:13,
            border:`1.5px solid ${C.blue}`, outline:"none", fontFamily:"Georgia,serif",
            background:"#fff", boxSizing:"border-box",
          }}
        />
        <button onClick={save}
          style={{ padding:"5px 10px", borderRadius:7, border:"none",
                   background:C.ink, color:"#fff", fontSize:11, fontWeight:700,
                   cursor:"pointer", fontFamily:"inherit" }}>
          ✓
        </button>
        <button onClick={cancel}
          style={{ padding:"5px 8px", borderRadius:7,
                   border:`1px solid ${C.border}`, background:"#fff",
                   color:C.muted, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <button onClick={open} style={{
      display:"flex", alignItems:"center", gap:5,
      background:"transparent", border:`1px dashed ${value > 0 ? C.border : C.blue+"66"}`,
      borderRadius:7, padding:"4px 10px", cursor:"pointer",
      fontFamily:"inherit",
    }}>
      {value > 0 ? (
        <span style={{ fontSize:13, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif" }}>
          {fmt(value)}
        </span>
      ) : (
        <span style={{ fontSize:11, color:C.blue, fontWeight:600 }}>+ Set budget</span>
      )}
      <span style={{ fontSize:10, color:C.muted }}>✏</span>
    </button>
  );
}

// ── Single category row ───────────────────────────────────────────────────────
function CatRow({ cat, spent, budget, onSetBudget }) {
  const status  = getStatus(spent, budget);
  const ss      = STATUS_STYLE[status];
  const usedPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const leftAmt = budget > 0 ? budget - spent : null;

  return (
    <div style={{
      background: ss.bg, border:`1px solid ${ss.border}`,
      borderRadius:11, padding:"12px 14px", marginBottom:8,
    }}>
      {/* Top row: icon + name + status badge | budget input */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
          <span style={{ fontSize:18, flexShrink:0 }}>{cat.icon}</span>
          <div style={{ minWidth:0 }}>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.ink }}>{cat.name}</p>
            <span style={{ fontSize:9, fontWeight:700, color:ss.labelColor,
                           textTransform:"uppercase", letterSpacing:"0.6px" }}>
              {ss.label}
            </span>
          </div>
        </div>
        <BudgetInput value={budget || 0} onChange={v => onSetBudget(cat.name, v)} />
      </div>

      {/* Progress bar — only if budget is set */}
      {budget > 0 && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
            <p style={{ margin:0, fontSize:10, color:C.muted }}>
              Spent: <strong style={{ color:ss.bar }}>{fmt(spent)}</strong>
            </p>
            <p style={{ margin:0, fontSize:10, color:C.muted }}>
              {status === "over"
                ? <span style={{ color:C.red, fontWeight:700 }}>Over by {fmt(Math.abs(leftAmt))}</span>
                : <span>Left: <strong style={{ color:C.green }}>{fmt(leftAmt)}</strong></span>
              }
            </p>
          </div>
          <div style={{ height:6, borderRadius:99, background:C.border, overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:99,
              width:`${usedPct}%`,
              background: ss.bar,
              transition:"width 0.45s",
            }} />
          </div>
          <p style={{ margin:"3px 0 0", fontSize:9, color:C.muted, textAlign:"right" }}>
            {usedPct}% of {fmt(budget)} budget used
          </p>
        </>
      )}

      {/* No budget set — show spend anyway */}
      {!budget && spent > 0 && (
        <p style={{ margin:0, fontSize:11, color:C.muted }}>
          Spent {fmt(spent)} this month · set a budget to track progress
        </p>
      )}
      {!budget && spent === 0 && (
        <p style={{ margin:0, fontSize:11, color:C.muted }}>
          No spending or budget set yet for this category
        </p>
      )}
    </div>
  );
}

// ── Summary strip at top ──────────────────────────────────────────────────────
function SummaryStrip({ cats, spentMap, budgets }) {
  const budgetedCats  = cats.filter(c => (budgets[c.name] || 0) > 0);
  const overCount     = budgetedCats.filter(c => (spentMap[c.name]||0) > budgets[c.name]).length;
  const warnCount     = budgetedCats.filter(c => {
    const p = (spentMap[c.name]||0) / budgets[c.name];
    return p >= 0.8 && p < 1;
  }).length;
  const totalBudgeted = budgetedCats.reduce((s,c) => s + budgets[c.name], 0);
  const totalSpent    = budgetedCats.reduce((s,c) => s + (spentMap[c.name]||0), 0);

  if (budgetedCats.length === 0) return null;

  return (
    <div style={{
      display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14,
    }}>
      {[
        { label:"Total Budget",   value:fmt(totalBudgeted), color:C.blue  },
        { label:"Total Spent",    value:fmt(totalSpent),    color:totalSpent>totalBudgeted?C.red:C.ink },
        { label:"Alerts",
          value: overCount > 0 ? `${overCount} over` : warnCount > 0 ? `${warnCount} warning` : "All clear",
          color: overCount > 0 ? C.red : warnCount > 0 ? C.amber : C.green },
      ].map(t => (
        <div key={t.label} style={{
          background:"#fff", borderRadius:10, border:`1px solid ${C.border}`,
          padding:"9px 11px", boxShadow:"0 1px 2px rgba(0,0,0,0.04)",
        }}>
          <p style={{ margin:0, fontSize:8, color:C.muted, textTransform:"uppercase",
                      letterSpacing:"0.7px", fontWeight:700 }}>{t.label}</p>
          <p style={{ margin:"3px 0 0", fontSize:14, fontWeight:700, color:t.color,
                      fontFamily:"Georgia,serif" }}>{t.value}</p>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default function CategoryBudgets({ categoryBudgets, setCategoryBudget, allExpenses }) {
  const [sortBy, setSortBy] = useState("category"); // "category" | "spent" | "status"

  const monthKey = currentMonthKey();
  const monthExpenses = useMemo(() => allExpenses[monthKey] || [], [allExpenses, monthKey]);

  // Aggregate spending per category for current month
  const spentMap = useMemo(() => {
    const m = {};
    monthExpenses.forEach(e => { m[e.label] = (m[e.label] || 0) + e.amount; });
    return m;
  }, [monthExpenses]);

  // Sort categories
  const sortedCats = useMemo(() => {
    const cats = [...ALL_CATS];
    if (sortBy === "spent") {
      return cats.sort((a,b) => (spentMap[b.name]||0) - (spentMap[a.name]||0));
    }
    if (sortBy === "status") {
      const order = { over:0, warn:1, mid:2, good:3, unset:4 };
      return cats.sort((a,b) => {
        const sa = order[getStatus(spentMap[a.name]||0, categoryBudgets[a.name]||0)];
        const sb = order[getStatus(spentMap[b.name]||0, categoryBudgets[b.name]||0)];
        return sa - sb;
      });
    }
    return cats; // default: fixed category order
  }, [sortBy, spentMap, categoryBudgets]);

  const budgetedCount = ALL_CATS.filter(c => (categoryBudgets[c.name]||0) > 0).length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:14 }}>
        <h2 style={{ margin:"0 0 3px", fontSize:17, fontWeight:700,
                     color:C.ink, fontFamily:"Georgia,serif" }}>
          Category Budgets
        </h2>
        <p style={{ margin:0, fontSize:11, color:C.muted }}>
          {monthKeyToLabel(monthKey)} · tap ✏ to set or edit a budget
        </p>
      </div>

      {/* Guidance — shown until at least one budget is set */}
      {budgetedCount === 0 && (
        <div style={{
          background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:11,
          padding:"12px 14px", marginBottom:14,
          display:"flex", alignItems:"flex-start", gap:10,
        }}>
          <span style={{ fontSize:18, flexShrink:0 }}>💡</span>
          <p style={{ margin:0, fontSize:12, color:C.ink, lineHeight:1.6 }}>
            Tap <strong>"+ Set budget"</strong> next to any category to set a monthly spending limit.
            Once set, you'll see how much you've used and get warnings when you're close to the limit.
          </p>
        </div>
      )}

      {/* Summary strip */}
      <SummaryStrip cats={ALL_CATS} spentMap={spentMap} budgets={categoryBudgets} />

      {/* Sort controls */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
        <p style={{ margin:0, fontSize:9, color:C.muted, fontWeight:700,
                    textTransform:"uppercase", letterSpacing:"0.7px" }}>Sort:</p>
        {[
          { key:"category", label:"Category" },
          { key:"spent",    label:"Highest Spend" },
          { key:"status",   label:"Alerts First" },
        ].map(s => (
          <button key={s.key} onClick={() => setSortBy(s.key)} style={{
            padding:"3px 10px", borderRadius:99, cursor:"pointer",
            fontFamily:"inherit", fontSize:10, fontWeight: sortBy===s.key ? 700 : 500,
            border: `1.5px solid ${sortBy===s.key ? C.ink : C.border}`,
            background: sortBy===s.key ? C.ink : "#fff",
            color: sortBy===s.key ? "#fff" : C.muted,
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Category rows */}
      {sortedCats.map(cat => (
        <CatRow
          key={cat.name}
          cat={cat}
          spent={spentMap[cat.name] || 0}
          budget={categoryBudgets[cat.name] || 0}
          onSetBudget={setCategoryBudget}
        />
      ))}

      {/* Footer note */}
      <p style={{ margin:"12px 0 0", fontSize:10, color:C.muted, textAlign:"center" }}>
        Budgets reset automatically each month. Spending data comes from your logged expenses.
      </p>
    </div>
  );
}

// ── Export a compact widget for the Dashboard ─────────────────────────────────
// Shows top 2 budget alerts (over or near limit). Returns null if nothing to show.
export function BudgetAlertWidget({ categoryBudgets, currentExpenses, onNavigate }) {
  const spentMap = useMemo(() => {
    const m = {};
    (currentExpenses || []).forEach(e => { m[e.label] = (m[e.label]||0) + e.amount; });
    return m;
  }, [currentExpenses]);

  // Find categories with budgets that are over or ≥80%
  const alerts = ALL_CATS
    .filter(c => (categoryBudgets[c.name]||0) > 0)
    .map(c => {
      const spent  = spentMap[c.name] || 0;
      const budget = categoryBudgets[c.name];
      const usedPct = Math.round((spent / budget) * 100);
      const status = getStatus(spent, budget);
      return { ...c, spent, budget, usedPct, status };
    })
    .filter(c => c.status === "over" || c.status === "warn")
    .sort((a,b) => b.usedPct - a.usedPct)
    .slice(0, 2);

  if (alerts.length === 0) return null;

  return (
    <div style={{
      background:"#fff", borderRadius:12, border:`1px solid ${C.border}`,
      boxShadow:"0 1px 2px rgba(0,0,0,0.04)", overflow:"hidden", marginBottom:12,
    }}>
      <div style={{
        padding:"8px 14px", borderBottom:`1px solid ${C.bg}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.ink }}>
          ⚠ Budget Alerts
        </p>
        {onNavigate && (
          <button onClick={() => onNavigate("catbudget", null)} style={{
            background:"none", border:"none", fontSize:11, color:C.blue,
            cursor:"pointer", fontFamily:"inherit", fontWeight:600, padding:0,
          }}>
            View all →
          </button>
        )}
      </div>
      <div style={{ padding:"6px 14px 10px" }}>
        {alerts.map((a, i) => (
          <div key={a.name} style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"6px 0",
            borderBottom: i < alerts.length-1 ? `1px solid ${C.bg}` : "none",
          }}>
            <span style={{ fontSize:16, flexShrink:0 }}>{a.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                <p style={{ margin:0, fontSize:11, fontWeight:600, color:C.ink }}>{a.name}</p>
                <p style={{ margin:0, fontSize:11, fontWeight:700,
                             color: a.status==="over" ? C.red : C.amber,
                             fontFamily:"Georgia,serif" }}>
                  {a.usedPct}%
                </p>
              </div>
              <div style={{ height:4, borderRadius:99, background:C.border, overflow:"hidden" }}>
                <div style={{
                  height:"100%", borderRadius:99,
                  width:`${Math.min(a.usedPct,100)}%`,
                  background: a.status==="over" ? C.red : C.amber,
                  transition:"width 0.4s",
                }} />
              </div>
              <p style={{ margin:"2px 0 0", fontSize:9, color:C.muted }}>
                {fmt(a.spent)} of {fmt(a.budget)}
                {a.status === "over"
                  ? <span style={{ color:C.red, fontWeight:700 }}> · over by {fmt(a.spent - a.budget)}</span>
                  : <span> · {fmt(a.budget - a.spent)} left</span>
                }
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
