// ─── SpendingChart.jsx (chart overlap fix) ────────────────────────────────
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export const CATEGORY_CONFIG = {
  // Variable
  Food:          { icon: "🍽", color: "#F97316", group: "variable" },
  Travel:        { icon: "🚗", color: "#3B82F6", group: "variable" },
  Coffee:        { icon: "☕", color: "#92400E", group: "variable" },
  Grocery:       { icon: "🛒", color: "#22C55E", group: "variable" },
  Medical:       { icon: "💊", color: "#EF4444", group: "variable" },
  Entertainment: { icon: "🎬", color: "#A855F7", group: "variable" },
  Other:         { icon: "💸", color: "#78716C", group: "variable" },
  // Fixed
  Rent:          { icon: "🏠", color: "#0EA5E9", group: "fixed" },
  Electricity:   { icon: "⚡", color: "#EAB308", group: "fixed" },
  Water:         { icon: "💧", color: "#06B6D4", group: "fixed" },
  Internet:      { icon: "📶", color: "#8B5CF6", group: "fixed" },
  "EMI/Loan":    { icon: "🏦", color: "#DC2626", group: "fixed" },
  Insurance:     { icon: "🛡", color: "#059669", group: "fixed" },
  "School Fees": { icon: "🎓", color: "#D97706", group: "fixed" },
  Maintenance:   { icon: "🔧", color: "#64748B", group: "fixed" },
};

function aggregateByCategory(expenses) {
  if (!expenses || expenses.length === 0) return [];
  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);
  if (grandTotal === 0) return [];
  const grouped = {};
  expenses.forEach(e => {
    if (!grouped[e.label]) grouped[e.label] = { total: 0, count: 0 };
    grouped[e.label].total += e.amount;
    grouped[e.label].count += 1;
  });
  return Object.entries(grouped).map(([name, { total, count }]) => ({
    name,
    icon:  CATEGORY_CONFIG[name]?.icon  || "💸",
    color: CATEGORY_CONFIG[name]?.color || "#78716C",
    total: Math.round(total),
    pct:   Math.round((total / grandTotal) * 100),
    count,
  })).sort((a, b) => b.total - a.total);
}

const fmt      = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const fmtShort = (n) => n >= 1000 ? `₹${(n/1000).toFixed(1)}k` : `₹${n}`;

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #E7E5E0", borderRadius: 10, padding: "10px 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1C1917" }}>{d.icon} {d.name}</p>
      <p style={{ margin: "3px 0 0", fontSize: 13, color: d.color, fontWeight: 700, fontFamily: "Georgia, serif" }}>{fmt(d.total)}</p>
      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#78716C" }}>{d.pct}% · {d.count} {d.count === 1 ? "entry" : "entries"}</p>
    </div>
  );
}

function CategoryRow({ cat, rank, isSelected, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 10px",
      borderRadius: 10, cursor: "pointer", marginBottom: 4,
      background: isSelected ? `${cat.color}11` : "transparent",
      border: `1.5px solid ${isSelected ? cat.color : "transparent"}`,
    }}>
      <span style={{ fontSize: 11, color: "#78716C", minWidth: 18, textAlign: "center" }}>#{rank}</span>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1917" }}>{cat.icon} {cat.name}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: cat.color, fontFamily: "Georgia, serif" }}>{fmt(cat.total)}</span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: "#E7E5E0" }}>
          <div style={{ height: "100%", borderRadius: 99, width: `${cat.pct}%`, background: cat.color, transition: "width 0.5s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
          <span style={{ fontSize: 10, color: "#78716C" }}>{cat.count} entries</span>
          <span style={{ fontSize: 10, color: "#78716C" }}>{cat.pct}%</span>
        </div>
      </div>
    </div>
  );
}

export default function SpendingChart({ expenses = [], monthlyIncome = 0 }) {
  const [chartType,   setChartType]   = useState("pie");
  const [selectedCat, setSelectedCat] = useState(null);

  const data       = useMemo(() => aggregateByCategory(expenses), [expenses]);
  const grandTotal = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  if (data.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ fontSize: 36, marginBottom: 10 }}>📊</p>
        <p style={{ color: "#78716C", fontSize: 13 }}>Log at least one expense to see your spending breakdown.</p>
      </div>
    );
  }

  const selected = data.find(d => d.name === selectedCat);
  const handleClick = (name) => setSelectedCat(p => p === name ? null : name);

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <p className="label">Spending Breakdown</p>
          {/* FIX: total shown ABOVE chart, not overlapping */}
          <p style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: "#1C1917", fontFamily: "Georgia, serif" }}>
            {fmt(grandTotal)}
          </p>
          <p style={{ marginTop: 2, fontSize: 11, color: "#78716C" }}>
            {data.length} categories · {expenses.length} expenses
            {monthlyIncome > 0 && (
              <span style={{ marginLeft: 8, fontWeight: 700, color: grandTotal > monthlyIncome ? "#DC2626" : "#16A34A" }}>
                · {Math.round((grandTotal / monthlyIncome) * 100)}% of income
              </span>
            )}
          </p>
        </div>
        {/* Toggle */}
        <div style={{ display: "flex", gap: 6 }}>
          {[["pie","🥧"],["bar","📊"]].map(([type, icon]) => (
            <button key={type} onClick={() => setChartType(type)} style={{
              padding: "5px 12px", borderRadius: 8,
              border: `1.5px solid ${chartType === type ? "#1C1917" : "#E7E5E0"}`,
              background: chartType === type ? "#1C1917" : "#fff",
              color: chartType === type ? "#fff" : "#78716C",
              fontSize: 13, cursor: "pointer", fontFamily: "inherit"
            }}>{icon}</button>
          ))}
        </div>
      </div>

      {/* ── PIE CHART — total label is ABOVE, ring is separate ── */}
      {chartType === "pie" && (
        <div className="chart-outer">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                paddingAngle={2} dataKey="total" labelLine={false}
                onClick={d => handleClick(d.name)}>
                {data.map(entry => (
                  <Cell key={entry.name} fill={entry.color}
                    opacity={selectedCat && selectedCat !== entry.name ? 0.3 : 1}
                    stroke={selectedCat === entry.name ? "#1C1917" : "none"} strokeWidth={2}
                    style={{ cursor: "pointer" }} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── BAR CHART ── */}
      {chartType === "bar" && (
        <div className="chart-outer">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onClick={d => d?.activePayload && handleClick(d.activePayload[0]?.payload?.name)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#78716C" }}
                tickFormatter={v => v.slice(0,5)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#78716C" }} tickFormatter={fmtShort}
                axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#E7E5E044" }} />
              <Bar dataKey="total" radius={[6,6,0,0]}>
                {data.map(entry => (
                  <Cell key={entry.name} fill={entry.color}
                    opacity={selectedCat && selectedCat !== entry.name ? 0.3 : 1}
                    style={{ cursor: "pointer" }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Selected detail */}
      {selected && (
        <div style={{ margin: "0 0 10px", padding: "12px 14px", borderRadius: 10, background: `${selected.color}11`, border: `1.5px solid ${selected.color}44` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{selected.icon} {selected.name}</span>
            <button onClick={() => setSelectedCat(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#78716C" }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {[["Total", fmt(selected.total)], ["Share", `${selected.pct}%`], ["Entries", `${selected.count}`], ["Avg", fmt(selected.total/selected.count)]].map(([l,v]) => (
              <div key={l}>
                <p style={{ margin: 0, fontSize: 10, color: "#78716C", textTransform: "uppercase", letterSpacing: 1 }}>{l}</p>
                <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: selected.color, fontFamily: "Georgia, serif" }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category rows */}
      <div style={{ marginTop: 8 }}>
        <p className="label" style={{ marginBottom: 8 }}>By Category — tap to inspect</p>
        {data.map((cat, i) => (
          <CategoryRow key={cat.name} cat={cat} rank={i+1}
            isSelected={selectedCat === cat.name} onClick={() => handleClick(cat.name)} />
        ))}
      </div>
    </div>
  );
}
