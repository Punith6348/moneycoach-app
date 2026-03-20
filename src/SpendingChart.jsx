// ─── SpendingChart.jsx — Donut chart + category breakdown + drill-down ────
import { useMemo, useState } from "react";

// ── Colour palette per category ──────────────────────────────────────────
export const CATEGORY_CONFIG = {
  Food:          { icon:"🍽", color:"#F97316" },
  Travel:        { icon:"🚗", color:"#3B82F6" },
  Coffee:        { icon:"☕", color:"#92400E" },
  Grocery:       { icon:"🛒", color:"#22C55E" },
  Medical:       { icon:"💊", color:"#EF4444" },
  Entertainment: { icon:"🎬", color:"#A855F7" },
  Other:         { icon:"💸", color:"#6B7280" },
  Rent:          { icon:"🏠", color:"#0EA5E9" },
  Electricity:   { icon:"⚡", color:"#EAB308" },
  Water:         { icon:"💧", color:"#06B6D4" },
  Internet:      { icon:"📶", color:"#8B5CF6" },
  "EMI/Loan":    { icon:"🏦", color:"#DC2626" },
  Insurance:     { icon:"🛡", color:"#059669" },
  "School Fees": { icon:"🎓", color:"#D97706" },
  Maintenance:   { icon:"🔧", color:"#64748B" },
};

const C   = { ink:"#111827", muted:"#6B7280", border:"#E5E7EB", bg:"#F8FAFC" };
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;

// ── Aggregate expenses into per-category totals ──────────────────────────
function aggregate(expenses) {
  if (!expenses?.length) return [];
  const grand = expenses.reduce((s,e) => s+e.amount, 0);
  if (!grand) return [];
  const map = {};
  expenses.forEach(e => {
    if (!map[e.label]) map[e.label] = { total:0, count:0, items:[] };
    map[e.label].total += e.amount;
    map[e.label].count += 1;
    map[e.label].items.push(e);
  });
  return Object.entries(map).map(([name,{total,count,items}]) => ({
    name,
    icon:  CATEGORY_CONFIG[name]?.icon  || "💸",
    color: CATEGORY_CONFIG[name]?.color || "#6B7280",
    total: Math.round(total),
    pct:   Math.round((total/grand)*100),
    count,
    items: [...items].sort((a,b) => new Date(b.date)-new Date(a.date)),
  })).sort((a,b) => b.total - a.total);
}

// ── Pure SVG donut — no recharts dependency ──────────────────────────────
function DonutChart({ data, grandTotal, selectedCat, onSelect }) {
  const SIZE = 220;
  const CX   = SIZE / 2;
  const CY   = SIZE / 2;
  const R    = 80;   // outer radius
  const r    = 52;   // inner radius (hole)
  const GAP  = 1.5;  // degrees gap between segments

  // Build segments from sorted data
  const segments = useMemo(() => {
    if (!data.length) return [];
    const total = data.reduce((s,d) => s+d.total, 0);
    let angle = -90; // start at top
    return data.map(d => {
      const sweep   = (d.total / total) * 360;
      const start   = angle;
      const end     = angle + sweep - GAP;
      angle        += sweep;
      // Arc path helper
      const polar = (cx, cy, rad, deg) => {
        const rad2 = (deg * Math.PI) / 180;
        return [cx + rad * Math.cos(rad2), cy + rad * Math.sin(rad2)];
      };
      const [x1,y1] = polar(CX, CY, R, start);
      const [x2,y2] = polar(CX, CY, R, end);
      const [x3,y3] = polar(CX, CY, r, end);
      const [x4,y4] = polar(CX, CY, r, start);
      const large   = sweep - GAP > 180 ? 1 : 0;
      const path    = `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${x3},${y3} A${r},${r} 0 ${large},0 ${x4},${y4} Z`;
      return { ...d, path, sweep };
    });
  }, [data]);

  const selectedData = data.find(d => d.name === selectedCat);

  return (
    <div style={{ display:"flex", justifyContent:"center", margin:"4px 0 8px" }}>
      <svg width={SIZE} height={SIZE} style={{ overflow:"visible" }}>
        {/* Segments */}
        {segments.map(seg => {
          const dimmed = selectedCat && selectedCat !== seg.name;
          const active = selectedCat === seg.name;
          return (
            <path
              key={seg.name}
              d={seg.path}
              fill={seg.color}
              opacity={dimmed ? 0.25 : 1}
              stroke={active ? "#111827" : "#fff"}
              strokeWidth={active ? 2 : 1}
              style={{ cursor:"pointer", transition:"opacity 0.2s" }}
              onClick={() => onSelect(seg.name)}
            />
          );
        })}
        {/* Centre label */}
        <text x={CX} y={CY - 12} textAnchor="middle"
          style={{ fontSize:11, fill:C.muted, fontFamily:"inherit" }}>
          {selectedData ? `${selectedData.pct}%` : "Total Spent"}
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle"
          style={{ fontSize:selectedData?19:18, fontWeight:700, fill:C.ink, fontFamily:"Georgia,serif" }}>
          {selectedData ? fmt(selectedData.total) : fmt(grandTotal)}
        </text>
        {selectedData && (
          <text x={CX} y={CY + 26} textAnchor="middle"
            style={{ fontSize:10, fill:C.muted, fontFamily:"inherit" }}>
            {selectedData.icon} {selectedData.name}
          </text>
        )}
      </svg>
    </div>
  );
}

// ── Drill-down: transactions for a single category ───────────────────────
function DrillDown({ cat, onClose }) {
  return (
    <div style={{
      background:"#fff", borderRadius:12, border:`1.5px solid ${cat.color}55`,
      marginBottom:12, overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{
        padding:"10px 14px", background:`${cat.color}0E`,
        borderBottom:`1px solid ${cat.color}22`,
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div>
          <p style={{margin:0, fontSize:13, fontWeight:700, color:C.ink}}>
            {cat.icon} {cat.name}
          </p>
          <p style={{margin:0, fontSize:10, color:C.muted}}>
            {cat.count} transaction{cat.count!==1?"s":""} · {cat.pct}% of spend
          </p>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <p style={{margin:0, fontSize:16, fontWeight:700, color:cat.color, fontFamily:"Georgia,serif"}}>
            {fmt(cat.total)}
          </p>
          <button onClick={onClose}
            style={{background:"none", border:"none", cursor:"pointer", fontSize:16, color:C.muted, lineHeight:1}}>
            ✕
          </button>
        </div>
      </div>
      {/* Transaction rows */}
      <div>
        {cat.items.map((e,i) => {
          const time    = new Date(e.date).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
          const dateStr = new Date(e.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
          return (
            <div key={e.id} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"8px 14px",
              borderBottom: i<cat.items.length-1 ? `1px solid ${C.bg}` : "none",
            }}>
              <div>
                <p style={{margin:0, fontSize:12, fontWeight:600, color:C.ink}}>
                  {e.note || cat.name}
                </p>
                <p style={{margin:0, fontSize:10, color:C.muted}}>{dateStr} · {time}</p>
              </div>
              <p style={{margin:0, fontSize:13, fontWeight:700, color:cat.color, fontFamily:"Georgia,serif"}}>
                {fmt(e.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Monthly Trend Chart — last 6 months bar chart ────────────────────────
export function TrendChart({ allExpenses, monthlyIncome = 0 }) {
  const months = useMemo(() => {
    const result = [];
    const now    = new Date();
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const exps = allExpenses[key] || [];
      const total = exps.reduce((s,e) => s+e.amount, 0);
      const label = d.toLocaleDateString("en-IN",{month:"short"});
      const isCurrent = i === 0;
      result.push({ key, label, total: Math.round(total), isCurrent });
    }
    return result;
  }, [allExpenses]);

  const maxVal  = Math.max(...months.map(m => m.total), monthlyIncome || 1);
  const hasData = months.some(m => m.total > 0);

  if (!hasData) return null;

  const fmt2 = (n) => n >= 100000
    ? `₹${(n/100000).toFixed(1)}L`
    : n >= 1000
    ? `₹${(n/1000).toFixed(0)}k`
    : `₹${n}`;

  return (
    <div style={{
      background:"#fff", borderRadius:14, border:`1px solid ${C.border}`,
      boxShadow:"0 1px 3px rgba(0,0,0,0.06)", padding:"14px 16px", marginBottom:12,
    }}>
      <div style={{ marginBottom:12 }}>
        <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.ink }}>Monthly Spending Trend</p>
        <p style={{ margin:"1px 0 0", fontSize:10, color:C.muted }}>Last 6 months · variable expenses</p>
      </div>

      {/* Bar chart */}
      <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100 }}>
        {months.map(m => {
          const barH    = maxVal > 0 ? Math.round((m.total / maxVal) * 100) : 0;
          const isEmpty = m.total === 0;
          return (
            <div key={m.key} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              {/* Value label */}
              <p style={{ margin:0, fontSize:8, color: m.isCurrent ? C.ink : C.muted,
                          fontWeight: m.isCurrent ? 700 : 400, whiteSpace:"nowrap" }}>
                {isEmpty ? "" : fmt2(m.total)}
              </p>
              {/* Bar */}
              <div style={{ width:"100%", height:72, display:"flex", alignItems:"flex-end" }}>
                <div style={{
                  width:"100%",
                  height: isEmpty ? 3 : `${Math.max(barH, 4)}%`,
                  background: m.isCurrent
                    ? "linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)"
                    : "#CBD5E1",
                  borderRadius:"4px 4px 0 0",
                  transition:"height 0.4s ease",
                  position:"relative",
                }}/>
              </div>
              {/* Month label */}
              <p style={{ margin:0, fontSize:9, color: m.isCurrent ? C.ink : C.muted,
                          fontWeight: m.isCurrent ? 700 : 400 }}>
                {m.label}
                {m.isCurrent && <span style={{ display:"block", fontSize:7, color:C.blue, textAlign:"center" }}>now</span>}
              </p>
            </div>
          );
        })}
      </div>

      {/* Income reference line label */}
      {monthlyIncome > 0 && (
        <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:16, height:2, background:"#EF4444", borderRadius:99 }} />
          <p style={{ margin:0, fontSize:9, color:C.muted }}>
            Income: {fmt2(monthlyIncome)} — bars above this mean overspend
          </p>
        </div>
      )}

      {/* Month-on-month change summary */}
      {(() => {
        const last2 = months.filter(m => m.total > 0).slice(-2);
        if (last2.length < 2) return null;
        const [prev, curr] = last2;
        const diff  = curr.total - prev.total;
        const pctD  = Math.round((Math.abs(diff) / prev.total) * 100);
        const up    = diff > 0;
        return (
          <div style={{
            marginTop:10, padding:"7px 11px", borderRadius:8,
            background: up ? "#FFF1F2" : "#F0FDF4",
            border: `1px solid ${up ? "#FECACA" : "#86EFAC"}`,
            display:"flex", alignItems:"center", gap:8,
          }}>
            <span style={{ fontSize:14 }}>{up ? "📈" : "📉"}</span>
            <p style={{ margin:0, fontSize:11, color:C.ink }}>
              Spending {up ? "up" : "down"} <strong>{pctD}%</strong> vs last month
              <span style={{ color:C.muted }}> ({up ? "+" : "-"}₹{Math.abs(diff).toLocaleString("en-IN")})</span>
            </p>
          </div>
        );
      })()}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function SpendingChart({ expenses = [], monthlyIncome = 0 }) {
  const [selectedCat, setSelectedCat] = useState(null);

  const data       = useMemo(() => aggregate(expenses), [expenses]);
  const grandTotal = useMemo(() => expenses.reduce((s,e) => s+e.amount, 0), [expenses]);
  const selected   = data.find(d => d.name === selectedCat) || null;

  const toggle = (name) => setSelectedCat(p => p===name ? null : name);

  // ── Empty state ──
  if (data.length === 0) {
    return (
      <div style={{
        background:"#fff", borderRadius:14, border:`1px solid ${C.border}`,
        textAlign:"center", padding:"44px 20px",
      }}>
        <p style={{fontSize:36, margin:"0 0 10px"}}>📊</p>
        <p style={{color:C.muted, fontSize:13, margin:0}}>
          Log at least one expense to see your spending breakdown.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ══ DONUT CARD ══ */}
      <div style={{
        background:"#fff", borderRadius:14, border:`1px solid ${C.border}`,
        boxShadow:"0 1px 3px rgba(0,0,0,0.06)", padding:"16px 16px 12px",
        marginBottom:12,
      }}>
        {/* Card header */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4}}>
          <div>
            <p style={{margin:0, fontSize:12, fontWeight:700, color:C.ink}}>Spending Breakdown</p>
            <p style={{margin:0, fontSize:10, color:C.muted}}>
              {data.length} categories · {expenses.length} expense{expenses.length!==1?"s":""}
              {monthlyIncome>0 && (
                <span style={{
                  marginLeft:6, fontWeight:700,
                  color: grandTotal>monthlyIncome ? "#DC2626" : "#16A34A",
                }}>
                  · {Math.round((grandTotal/monthlyIncome)*100)}% of income
                </span>
              )}
            </p>
          </div>
          {selectedCat && (
            <button onClick={()=>setSelectedCat(null)}
              style={{background:"none", border:`1px solid ${C.border}`, borderRadius:99,
                padding:"3px 10px", fontSize:11, color:C.muted, cursor:"pointer",
                fontFamily:"inherit"}}>
              Clear ✕
            </button>
          )}
        </div>

        {/* Donut */}
        <DonutChart
          data={data}
          grandTotal={grandTotal}
          selectedCat={selectedCat}
          onSelect={toggle}
        />

        {/* Legend dots */}
        <div style={{display:"flex", flexWrap:"wrap", gap:"4px 10px", justifyContent:"center"}}>
          {data.map(d => (
            <button key={d.name} onClick={()=>toggle(d.name)}
              style={{
                display:"flex", alignItems:"center", gap:4,
                background:"none", border:"none", cursor:"pointer",
                padding:"2px 0", fontFamily:"inherit",
                opacity: selectedCat && selectedCat!==d.name ? 0.35 : 1,
                transition:"opacity 0.2s",
              }}>
              <div style={{width:8, height:8, borderRadius:"50%", background:d.color, flexShrink:0}} />
              <span style={{fontSize:10, color:C.muted, whiteSpace:"nowrap"}}>{d.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══ DRILL-DOWN (shown when category selected) ══ */}
      {selected && (
        <DrillDown cat={selected} onClose={()=>setSelectedCat(null)} />
      )}

      {/* ══ CATEGORY BREAKDOWN LIST ══ */}
      <div style={{
        background:"#fff", borderRadius:14, border:`1px solid ${C.border}`,
        boxShadow:"0 1px 3px rgba(0,0,0,0.06)", overflow:"hidden",
      }}>
        <div style={{padding:"10px 14px", borderBottom:`1px solid ${C.bg}`}}>
          <p style={{margin:0, fontSize:12, fontWeight:700, color:C.ink}}>By Category</p>
          <p style={{margin:0, fontSize:10, color:C.muted}}>Tap a row to see transactions</p>
        </div>

        {data.map((cat, i) => {
          const isActive = selectedCat === cat.name;
          return (
            <div key={cat.name} onClick={()=>toggle(cat.name)}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"10px 14px", cursor:"pointer",
                borderBottom: i<data.length-1?`1px solid ${C.bg}`:"none",
                background: isActive ? `${cat.color}08` : "transparent",
                transition:"background 0.15s",
              }}>

              {/* Icon bubble */}
              <div style={{
                width:34, height:34, borderRadius:9, flexShrink:0,
                background: `${cat.color}18`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:16,
                border: isActive ? `1.5px solid ${cat.color}66` : "1.5px solid transparent",
              }}>
                {cat.icon}
              </div>

              {/* Name + bar */}
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                  <p style={{margin:0, fontSize:12, fontWeight:isActive?700:600, color:C.ink}}>
                    {cat.name}
                  </p>
                  <div style={{display:"flex", alignItems:"baseline", gap:5}}>
                    <p style={{margin:0, fontSize:13, fontWeight:700, color:cat.color, fontFamily:"Georgia,serif"}}>
                      {fmt(cat.total)}
                    </p>
                    <p style={{margin:0, fontSize:10, color:C.muted}}>({cat.pct}%)</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{height:3, borderRadius:99, background:C.bg, overflow:"hidden"}}>
                  <div style={{
                    height:"100%", borderRadius:99,
                    width:`${cat.pct}%`, background:cat.color,
                    transition:"width 0.4s",
                  }} />
                </div>
                <p style={{margin:"3px 0 0", fontSize:10, color:C.muted}}>
                  {cat.count} transaction{cat.count!==1?"s":""}
                  {cat.count>0 && ` · avg ${fmt(Math.round(cat.total/cat.count))}`}
                </p>
              </div>

              {/* Chevron */}
              <p style={{margin:0, fontSize:12, color:C.muted, flexShrink:0, transform:isActive?"rotate(90deg)":"none", transition:"transform 0.15s"}}>›</p>
            </div>
          );
        })}

        {/* Footer totals */}
        <div style={{
          padding:"9px 14px", background:C.bg,
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <p style={{margin:0, fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:"0.8px", fontWeight:600}}>
            Total Spent
          </p>
          <p style={{margin:0, fontSize:15, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif"}}>
            {fmt(grandTotal)}
          </p>
        </div>
      </div>
    </div>
  );
}
