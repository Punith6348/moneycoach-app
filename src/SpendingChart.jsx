// ─── SpendingChart.jsx ────────────────────────────────────────────────────
// Save this file to: moneycoach-app/src/SpendingChart.jsx
//
// INSTALL RECHARTS FIRST — run this in your terminal:
//   cd ~/moneycoach-app && npm install recharts
//
// USAGE in App.jsx:
//   import SpendingChart from "./SpendingChart";
//   <SpendingChart expenses={expenses} monthlyIncome={monthlyIncome} />
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

// ─── 1. CATEGORY CONFIG ──────────────────────────────────────────────────
// Each category has a name, icon, and a unique color for the chart
export const CATEGORY_CONFIG = {
  Food:          { icon: "🍽", color: "#F97316" }, // orange
  Travel:        { icon: "🚗", color: "#3B82F6" }, // blue
  Coffee:        { icon: "☕", color: "#92400E" }, // brown
  Grocery:       { icon: "🛒", color: "#22C55E" }, // green
  Medical:       { icon: "💊", color: "#EF4444" }, // red
  Entertainment: { icon: "🎬", color: "#A855F7" }, // purple
  Other:         { icon: "💸", color: "#78716C" }, // grey
};

// ─── 2. DATA AGGREGATION LOGIC ───────────────────────────────────────────
/**
 * aggregateByCategory
 * Input:  expenses array → [{ id, amount, label, date }, ...]
 * Output: sorted array  → [{ name, icon, color, total, pct, count }, ...]
 *
 * Steps:
 *  1. Group expenses by label (category)
 *  2. Sum amounts per category
 *  3. Calculate % of grand total
 *  4. Sort by total descending
 */
function aggregateByCategory(expenses) {
  if (!expenses || expenses.length === 0) return [];

  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);
  if (grandTotal === 0) return [];

  // Step 1 & 2: group + sum
  const grouped = {};
  expenses.forEach((e) => {
    if (!grouped[e.label]) {
      grouped[e.label] = { total: 0, count: 0 };
    }
    grouped[e.label].total += e.amount;
    grouped[e.label].count += 1;
  });

  // Step 3 & 4: enrich + sort
  return Object.entries(grouped)
    .map(([name, { total, count }]) => ({
      name,
      icon:  CATEGORY_CONFIG[name]?.icon  || "💸",
      color: CATEGORY_CONFIG[name]?.color || "#78716C",
      total: Math.round(total),
      pct:   Math.round((total / grandTotal) * 100),
      count,
    }))
    .sort((a, b) => b.total - a.total);
}

// ─── 3. FORMAT HELPERS ───────────────────────────────────────────────────
const fmt     = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const fmtShort = (n) => n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n}`;

// ─── 4. STYLE TOKENS ─────────────────────────────────────────────────────
const C = {
  bg: "#F7F5F0", card: "#FFFFFF", ink: "#1C1917",
  muted: "#78716C", border: "#E7E5E0",
};
const shadow = "0 1px 3px rgba(0,0,0,0.08)";

// ─── 5. CUSTOM PIE TOOLTIP ───────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: shadow }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.ink, fontFamily: "sans-serif" }}>
        {d.icon} {d.name}
      </p>
      <p style={{ margin: "3px 0 0", fontSize: 13, color: d.color, fontFamily: "Georgia, serif", fontWeight: 700 }}>
        {fmt(d.total)}
      </p>
      <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted, fontFamily: "sans-serif" }}>
        {d.pct}% · {d.count} {d.count === 1 ? "entry" : "entries"}
      </p>
    </div>
  );
}

// ─── 6. CUSTOM PIE LABEL ─────────────────────────────────────────────────
function CustomPieLabel({ cx, cy, midAngle, outerRadius, pct, name }) {
  if (pct < 8) return null; // skip tiny slices
  const RAD = Math.PI / 180;
  const r   = outerRadius + 22;
  const x   = cx + r * Math.cos(-midAngle * RAD);
  const y   = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text x={x} y={y} fill={C.muted} textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central" fontSize={11} fontFamily="sans-serif">
      {pct}%
    </text>
  );
}

// ─── 7. EMPTY STATE ───────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "36px 20px" }}>
      <p style={{ fontSize: 40, margin: "0 0 10px" }}>📊</p>
      <p style={{ margin: 0, fontSize: 14, color: C.muted, fontFamily: "sans-serif" }}>
        Log at least one expense to see your spending breakdown.
      </p>
    </div>
  );
}

// ─── 8. CATEGORY ROW ─────────────────────────────────────────────────────
function CategoryRow({ cat, rank, isSelected, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "11px 12px",
      borderRadius: 10, cursor: "pointer", marginBottom: 4,
      background: isSelected ? `${cat.color}11` : "transparent",
      border: `1.5px solid ${isSelected ? cat.color : "transparent"}`,
      transition: "all 0.15s"
    }}>
      {/* Rank */}
      <span style={{ fontSize: 11, color: C.muted, fontFamily: "sans-serif", minWidth: 16, textAlign: "center" }}>#{rank}</span>
      {/* Color dot */}
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
      {/* Icon + name */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: "sans-serif" }}>
            {cat.icon} {cat.name}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: cat.color, fontFamily: "Georgia, serif" }}>
            {fmt(cat.total)}
          </span>
        </div>
        {/* Bar */}
        <div style={{ height: 4, borderRadius: 99, background: C.border }}>
          <div style={{ height: "100%", borderRadius: 99, width: `${cat.pct}%`, background: cat.color, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontSize: 10, color: C.muted, fontFamily: "sans-serif" }}>{cat.count} {cat.count === 1 ? "entry" : "entries"}</span>
          <span style={{ fontSize: 10, color: C.muted, fontFamily: "sans-serif" }}>{cat.pct}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── 9. MAIN SpendingChart COMPONENT ─────────────────────────────────────
/**
 * SpendingChart
 * Props:
 *   expenses      {Array}   — [{ id, amount, label, date }]
 *   monthlyIncome {number}  — for budget context line in bar chart
 */
export default function SpendingChart({ expenses = [], monthlyIncome = 0 }) {

  const [chartType,    setChartType]    = useState("pie");   // "pie" | "bar"
  const [selectedCat,  setSelectedCat]  = useState(null);    // category name

  // ── useMemo: only recalculates when expenses change ──────────────────
  const data = useMemo(() => aggregateByCategory(expenses), [expenses]);

  const grandTotal = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const handleCatClick = (name) =>
    setSelectedCat((prev) => (prev === name ? null : name));

  // ── No data yet ───────────────────────────────────────────────────────
  if (data.length === 0) {
    return (
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: shadow }}>
        <EmptyState />
      </div>
    );
  }

  // ── Selected category detail ──────────────────────────────────────────
  const selected = data.find((d) => d.name === selectedCat);

  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: shadow, overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "1.2px", fontFamily: "sans-serif", fontWeight: 600 }}>
              Spending Breakdown
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif" }}>
              {fmt(grandTotal)}
            </p>
          </div>
          {/* Chart type toggle */}
          <div style={{ display: "flex", gap: 6 }}>
            {[["pie", "🥧 Pie"], ["bar", "📊 Bar"]].map(([type, label]) => (
              <button key={type} onClick={() => setChartType(type)} style={{
                padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${chartType === type ? C.ink : C.border}`,
                background: chartType === type ? C.ink : C.card,
                color: chartType === type ? "#fff" : C.muted,
                fontSize: 11, fontFamily: "sans-serif", fontWeight: 600, cursor: "pointer"
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Summary pills */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 4 }}>
          <div style={{ background: C.bg, borderRadius: 8, padding: "6px 12px", border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, color: C.muted, fontFamily: "sans-serif" }}>
              {data.length} {data.length === 1 ? "category" : "categories"}
            </span>
          </div>
          <div style={{ background: C.bg, borderRadius: 8, padding: "6px 12px", border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, color: C.muted, fontFamily: "sans-serif" }}>
              {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
            </span>
          </div>
          {monthlyIncome > 0 && (
            <div style={{ background: grandTotal > monthlyIncome ? "#FEE2E2" : "#DCFCE7", borderRadius: 8, padding: "6px 12px", border: `1px solid ${grandTotal > monthlyIncome ? "#FCA5A5" : "#86EFAC"}` }}>
              <span style={{ fontSize: 11, color: grandTotal > monthlyIncome ? "#DC2626" : "#16A34A", fontFamily: "sans-serif", fontWeight: 700 }}>
                {Math.round((grandTotal / monthlyIncome) * 100)}% of income
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── PIE CHART ── */}
      {chartType === "pie" && (
        <div style={{ padding: "10px 20px 0" }}>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="total"
                labelLine={false}
                label={CustomPieLabel}
                onClick={(d) => handleCatClick(d.name)}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    opacity={selectedCat && selectedCat !== entry.name ? 0.35 : 1}
                    stroke={selectedCat === entry.name ? C.ink : "none"}
                    strokeWidth={2}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Donut centre label */}
          <div style={{ textAlign: "center", marginTop: -220, marginBottom: 160, pointerEvents: "none" }}>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: "sans-serif" }}>Total</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif" }}>{fmt(grandTotal)}</p>
          </div>
        </div>
      )}

      {/* ── BAR CHART ── */}
      {chartType === "bar" && (
        <div style={{ padding: "10px 8px 0" }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              onClick={(d) => d?.activePayload && handleCatClick(d.activePayload[0]?.payload?.name)}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "sans-serif", fill: C.muted }}
                tickFormatter={(v) => v.slice(0, 4)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontFamily: "sans-serif", fill: C.muted }}
                tickFormatter={fmtShort} axisLine={false} tickLine={false} width={42} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: `${C.border}88` }} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    opacity={selectedCat && selectedCat !== entry.name ? 0.35 : 1}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Selected category detail card ── */}
      {selected && (
        <div style={{ margin: "0 16px 12px", padding: "12px 14px", borderRadius: 10, background: `${selected.color}11`, border: `1.5px solid ${selected.color}44` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: "sans-serif" }}>
              {selected.icon} {selected.name}
            </span>
            <button onClick={() => setSelectedCat(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.muted }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
            {[
              ["Total",   fmt(selected.total)],
              ["Share",   `${selected.pct}%`],
              ["Entries", `${selected.count}`],
              ["Avg/entry", fmt(selected.total / selected.count)],
            ].map(([lbl, val]) => (
              <div key={lbl}>
                <p style={{ margin: 0, fontSize: 10, color: C.muted, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1 }}>{lbl}</p>
                <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: selected.color, fontFamily: "Georgia, serif" }}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Category rows list ── */}
      <div style={{ padding: "8px 12px 16px" }}>
        <p style={{ margin: "0 0 8px 4px", fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", fontFamily: "sans-serif", fontWeight: 600 }}>
          By Category — tap to inspect
        </p>
        {data.map((cat, i) => (
          <CategoryRow
            key={cat.name}
            cat={cat}
            rank={i + 1}
            isSelected={selectedCat === cat.name}
            onClick={() => handleCatClick(cat.name)}
          />
        ))}
      </div>
    </div>
  );
}
