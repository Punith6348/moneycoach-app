// ─── InsightCard.jsx ─────────────────────────────────────────────────────────
// 3 sections only: Snapshot · vs Last Month · Actionable Insights
// generateInsight() export preserved — used by SpendingChart.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { calcLoanTotals, monthKeyToLabel, getActiveMonthKeys } from "./useAppData";

const C = {
  ink:"#111827", muted:"#6B7280", border:"#E5E7EB", bg:"#F8FAFC",
  red:"#DC2626", green:"#16A34A", amber:"#D97706", blue:"#2563EB", purple:"#7C3AED",
};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;
const CAT_ICONS = { Food:"🍽",Travel:"🚗",Coffee:"☕",Grocery:"🛒",Medical:"💊",Entertainment:"🎬",Other:"💸" };

// ── generateInsight — preserved for SpendingChart.jsx ────────────────────────
export function generateInsight(monthlyIncome, expenses) {
  if (!monthlyIncome || monthlyIncome <= 0 || expenses.length === 0) return null;
  const now=new Date(), weekAgo=new Date(now-7*24*60*60*1000);
  const we=expenses.filter(e=>e.date&&new Date(e.date)>=weekAgo);
  const wt=we.reduce((s,e)=>s+e.amount,0), wp=Math.round((wt/monthlyIncome)*100);
  const da=wt/7, dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const ps=monthlyIncome-da*dim, sr=(ps/monthlyIncome)*100;
  const bc={}; we.forEach(e=>{bc[e.label]=(bc[e.label]||0)+e.amount;});
  const tc=Object.entries(bc).sort((a,b)=>b[1]-a[1])[0];
  const cd=now.getDate(), dr=dim-cd;
  const ms=expenses.filter(e=>{if(!e.date)return false;const d=new Date(e.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,e)=>s+e.amount,0);
  const rb=monthlyIncome-ms, dbl=dr>0?Math.round(rb/dr):0;
  let risk,emoji,headline,advice,tip;
  if(sr>=30){risk="excellent";emoji="🏆";headline=`Spent ${fmt(wt)} this week — ${wp}% of income.`;advice="Saving over 30%.";tip="Route surplus to a SIP or emergency fund.";}
  else if(sr>=20){risk="safe";emoji="🟢";headline=`Spent ${fmt(wt)} this week — ${wp}% of income.`;advice="On track.";tip=tc?`Top spend: ${tc[0]} (${fmt(tc[1])}).`:"Keep tracking.";}
  else if(sr>=10){risk="warning";emoji="🟡";headline=`Spent ${fmt(wt)} this week — ${wp}% of income.`;advice="Tighter than ideal.";tip=tc?`Cut ${tc[0]} (${fmt(tc[1])} this week).`:"Aim to cut ₹200–₹500/day.";}
  else if(sr>=0){risk="tight";emoji="🟠";headline=`Spent ${fmt(wt)} this week — ${wp}% of income.`;advice="Very little savings.";tip=`${fmt(rb)} left for ${dr} days (~${fmt(dbl)}/day).`;}
  else{risk="danger";emoji="🔴";headline=`Spent ${fmt(wt)} this week — ${wp}% of income.`;advice="Spending more than income.";tip=tc?`${tc[0]}: ${fmt(tc[1])}.`:"Review all categories.";}
  return{risk,emoji,headline,advice,tip,weeklyTotal:wt,weeklyPct:wp,projectedSavings:ps,savingsRate:Math.round(sr),daysInMonth:dim,currentDay:cd,daysRemaining:dr,monthSpentSoFar:ms,remainingBalance:rb,dailyBudgetLeft:dbl,topCategory:tc,byCategory:bc};
}

// ── Month selector ────────────────────────────────────────────────────────────
function MonthPicker({ selected, onChange, allExpenses }) {
  const keys = getActiveMonthKeys(allExpenses);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:16,
                  overflowX:"auto", paddingBottom:2, scrollbarWidth:"none" }}>
      <p style={{ margin:0, fontSize:9, color:C.muted, fontWeight:700,
                  textTransform:"uppercase", letterSpacing:"0.8px", flexShrink:0 }}>Month:</p>
      {keys.map(k => {
        const active = k === selected;
        return (
          <button key={k} onClick={() => onChange(k)} style={{
            flexShrink:0, padding:"4px 12px", borderRadius:99, cursor:"pointer",
            fontFamily:"inherit", fontSize:11, fontWeight: active ? 700 : 500,
            border: `1.5px solid ${active ? C.ink : C.border}`,
            background: active ? C.ink : "#fff",
            color: active ? "#fff" : C.muted,
            transition:"all 0.12s",
          }}>
            {monthKeyToLabel(k)}
          </button>
        );
      })}
    </div>
  );
}

// ── Comparison row — for "vs Last Month" section ──────────────────────────────
function CmpRow({ label, curr, prev, invertGood = false, format = fmt, last = false }) {
  const hasPrev = prev > 0 || (prev === 0 && curr !== prev);
  const d       = hasPrev && prev !== 0 ? Math.round(((curr - prev) / prev) * 100) : null;
  const improved = d === null ? null : invertGood ? d < 0 : d > 0;
  const neutral  = d === 0;

  const arrowCol = d === null || neutral ? C.muted : improved ? C.green : C.red;
  const arrow    = d === null ? "—" : d > 0 ? "▲" : d < 0 ? "▼" : "─";
  const diffText = d === null ? "no prev" : `${Math.abs(d)}%`;

  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"10px 0", borderBottom: last ? "none" : `1px solid ${C.bg}`, gap:8,
    }}>
      <p style={{ margin:0, fontSize:12, fontWeight:600, color:C.ink, flex:1 }}>{label}</p>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        {/* previous */}
        <p style={{ margin:0, fontSize:11, color:C.muted }}>
          {hasPrev ? format(prev) : "—"}
        </p>
        {/* arrow + % */}
        <span style={{
          display:"inline-flex", alignItems:"center", gap:3,
          fontSize:10, fontWeight:700, color:arrowCol,
          background: neutral||d===null ? C.bg : improved ? "#F0FDF4" : "#FFF1F2",
          border: `1px solid ${neutral||d===null ? C.border : improved ? "#86EFAC" : "#FECACA"}`,
          borderRadius:99, padding:"2px 7px",
        }}>
          {arrow} {diffText}
        </span>
        {/* current */}
        <p style={{ margin:0, fontSize:13, fontWeight:700, fontFamily:"Georgia,serif",
                    color: d===null||neutral ? C.ink : improved ? C.green : C.red,
                    minWidth:60, textAlign:"right" }}>
          {format(curr)}
        </p>
      </div>
    </div>
  );
}

// ── Insight pill ──────────────────────────────────────────────────────────────
function Pill({ text, type }) {
  const s = {
    good:    { bg:"#F0FDF4", border:"#86EFAC", icon:"✅" },
    warn:    { bg:"#FFFBEB", border:"#FCD34D", icon:"⚠️" },
    bad:     { bg:"#FFF1F2", border:"#FECACA", icon:"🔴" },
    neutral: { bg:C.bg,      border:C.border,  icon:"💡" },
  }[type] ?? { bg:C.bg, border:C.border, icon:"💡" };
  return (
    <div style={{
      background:s.bg, border:`1px solid ${s.border}`, borderRadius:10,
      padding:"11px 13px", marginBottom:8,
      display:"flex", alignItems:"flex-start", gap:10,
    }}>
      <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>{s.icon}</span>
      <p style={{ margin:0, fontSize:12, color:C.ink, lineHeight:1.6 }}>{text}</p>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom:20 }}>
      <p style={{
        margin:"0 0 10px", fontSize:10, fontWeight:700, color:C.muted,
        textTransform:"uppercase", letterSpacing:"1px",
      }}>
        {title}
      </p>
      <div style={{
        background:"#fff", borderRadius:13, border:`1px solid ${C.border}`,
        boxShadow:"0 1px 3px rgba(0,0,0,0.04)", padding:"4px 14px 4px",
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Snapshot stat tile ────────────────────────────────────────────────────────
function Stat({ label, value, color = C.ink, sub }) {
  return (
    <div style={{ padding:"10px 0", borderBottom:`1px solid ${C.bg}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <p style={{ margin:0, fontSize:12, fontWeight:600, color:C.ink }}>{label}</p>
        <p style={{ margin:0, fontSize:15, fontWeight:700, color, fontFamily:"Georgia,serif" }}>{value}</p>
      </div>
      {sub && <p style={{ margin:"2px 0 0", fontSize:10, color:C.muted }}>{sub}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default function InsightCard({
  monthlyIncome = 0, expenses = [], prevMonthExpenses = [],
  totalFixed = 0, totalSavings = 0, totalReserve = 0,
  loans = [], allExpenses = {}, selectedMonth, onMonthChange,
  showDetails = true, smartSuggestions = [], onNavigate,
}) {
  const totalLoanEmi = useMemo(
    () => loans.reduce((s, l) => s + calcLoanTotals(l).emi, 0),
    [loans]
  );

  // ── Current month numbers ─────────────────────────────────────────────────
  const totalVar    = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining   = monthlyIncome - totalFixed - totalSavings - totalReserve - totalVar - totalLoanEmi;

  // ── Previous month numbers ────────────────────────────────────────────────
  const prevVar       = prevMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const prevRemaining = monthlyIncome - totalFixed - totalSavings - totalReserve - prevVar - totalLoanEmi;
  const hasPrev       = prevMonthExpenses.length > 0;

  // ── Category totals ───────────────────────────────────────────────────────
  const catMap = useMemo(() => {
    const m = {}; expenses.forEach(e => { m[e.label] = (m[e.label]||0) + e.amount; });
    return m;
  }, [expenses]);
  const prevCatMap = useMemo(() => {
    const m = {}; prevMonthExpenses.forEach(e => { m[e.label] = (m[e.label]||0) + e.amount; });
    return m;
  }, [prevMonthExpenses]);

  const topCat    = Object.entries(catMap).sort((a,b) => b[1]-a[1])[0];
  const topCatKey = topCat?.[0] ?? null;
  const topCatAmt = topCat?.[1] ?? 0;

  // ── Snapshot values ───────────────────────────────────────────────────────
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
  const noSpendDays = daysInMonth - new Set(expenses.filter(e=>e.date).map(e => e.date.split("T")[0])).size;

  // ── Rule-based insights (priority-ordered, max 3) ─────────────────────────
  const fixedBurden = pct(totalFixed + totalLoanEmi, monthlyIncome);
  const savingsRate = pct(totalSavings, monthlyIncome);
  const spendPct    = pct(totalVar, monthlyIncome);

  const insights = useMemo(() => {
    const list = [];

    // 1. Over budget — highest urgency
    if (spendPct > 100) {
      list.push({ text:`Variable spending alone exceeds income this month. Immediate action needed.`, type:"bad" });
    }

    // 2. Top category up vs last month
    if (topCatKey && hasPrev) {
      const cur  = catMap[topCatKey] || 0;
      const prev = prevCatMap[topCatKey] || 0;
      if (cur > prev * 1.1 && prev > 0) {
        const up = Math.round(((cur - prev) / prev) * 100);
        list.push({ text:`${topCatKey} spending is up ${up}% this month (${fmt(prev)} → ${fmt(cur)}).`, type:"warn" });
      } else if (cur < prev * 0.9 && prev > 0) {
        list.push({ text:`${topCatKey} spending dropped by ${fmt(prev - cur)} vs last month — good control.`, type:"good" });
      }
    }

    // 3. Fixed burden too high
    if (fixedBurden > 60) {
      list.push({ text:`Fixed costs and EMIs consume ${fixedBurden}% of income. Very little room left for discretionary spending.`, type:"bad" });
    } else if (fixedBurden > 45) {
      list.push({ text:`Fixed costs and EMIs are at ${fixedBurden}% of income. Consider reviewing subscriptions or loans.`, type:"warn" });
    }

    // 4. Savings rate signal
    if (savingsRate >= 20) {
      list.push({ text:`Savings rate is ${savingsRate}% — above the recommended 20% benchmark. Stay consistent.`, type:"good" });
    } else if (savingsRate > 0 && savingsRate < 10) {
      list.push({ text:`Savings rate is ${savingsRate}%. Aim for at least 10% by trimming one non-essential category.`, type:"warn" });
    } else if (savingsRate === 0 && monthlyIncome > 0) {
      list.push({ text:`No savings set up. Adding even a small SIP or RD builds a powerful long-term habit.`, type:"warn" });
    }

    // 5. No-spend days positive signal
    if (noSpendDays >= 10) {
      list.push({ text:`${noSpendDays} no-spend days this month. Zero-spend days are one of the fastest ways to improve your balance.`, type:"good" });
    }

    // 6. Total variable spend improved vs last month
    if (hasPrev && prevVar > 0 && totalVar < prevVar * 0.9) {
      list.push({ text:`Total spending is down ${Math.round(((prevVar-totalVar)/prevVar)*100)}% vs last month. Strong improvement.`, type:"good" });
    }

    return list.slice(0, 3);
  }, [spendPct, topCatKey, hasPrev, catMap, prevCatMap, fixedBurden, savingsRate, noSpendDays, totalVar, prevVar, monthlyIncome]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (expenses.length === 0 && monthlyIncome === 0) {
    return (
      <div>
        {onMonthChange && <MonthPicker selected={selectedMonth} onChange={onMonthChange} allExpenses={allExpenses} />}
        <div style={{ background:"#fff", borderRadius:13, border:`1px solid ${C.border}`,
                      textAlign:"center", padding:"48px 24px" }}>
          <p style={{ fontSize:36, margin:"0 0 10px" }}>💡</p>
          <p style={{ margin:"0 0 6px", fontSize:15, fontWeight:700, color:C.ink }}>Nothing to analyse yet</p>
          <p style={{ margin:0, fontSize:12, color:C.muted, lineHeight:1.6 }}>
            Set up income in the Plan tab and log some expenses to see your insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Month selector */}
      {onMonthChange && (
        <MonthPicker selected={selectedMonth} onChange={onMonthChange} allExpenses={allExpenses} />
      )}

      {/* ── A. THIS MONTH SNAPSHOT ─────────────────────────────────────────── */}
      <Section title="This Month Snapshot">
        <Stat label="Total Spent"
          value={fmt(totalVar)}
          color={C.red}
          sub={`${expenses.length} transaction${expenses.length !== 1 ? "s" : ""} logged`} />
        <Stat label="Savings & Investments"
          value={fmt(totalSavings)}
          color={C.blue}
          sub={savingsRate > 0 ? `${savingsRate}% of income` : "None set up"} />
        <Stat label="Remaining Balance"
          value={remaining >= 0 ? fmt(remaining) : `−${fmt(Math.abs(remaining))}`}
          color={remaining >= 0 ? C.green : C.red} />
        <Stat label="Top Spending Category"
          value={topCatKey ? `${CAT_ICONS[topCatKey] || "💸"} ${topCatKey}` : "—"}
          color={C.amber}
          sub={topCatKey ? `${fmt(topCatAmt)} · ${pct(topCatAmt, totalVar)}% of spend` : "No expenses logged"} />
        <div style={{ padding:"10px 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <p style={{ margin:0, fontSize:12, fontWeight:600, color:C.ink }}>No-Spend Days</p>
            <p style={{ margin:0, fontSize:15, fontWeight:700, color:C.green, fontFamily:"Georgia,serif" }}>
              {noSpendDays}
              <span style={{ fontSize:10, fontWeight:400, color:C.muted, marginLeft:4 }}>/ {daysInMonth} days</span>
            </p>
          </div>
        </div>
      </Section>

      {/* ── B. VS LAST MONTH ───────────────────────────────────────────────── */}
      <Section title="Compared to Last Month">
        {!hasPrev ? (
          <div style={{ padding:"14px 0", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>📭</span>
            <p style={{ margin:0, fontSize:12, color:C.muted }}>
              No previous month data yet. Keep logging — comparison appears next month.
            </p>
          </div>
        ) : (
          <>
            <CmpRow
              label="Total Spending"
              curr={totalVar}
              prev={prevVar}
              invertGood={true}
            />
            <CmpRow
              label="Remaining Balance"
              curr={remaining}
              prev={prevRemaining}
              invertGood={false}
            />
            <div style={{ padding:"10px 0" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <p style={{ margin:0, fontSize:12, fontWeight:600, color:C.ink }}>Savings Rate</p>
                <span style={{
                  fontSize:13, fontWeight:700, fontFamily:"Georgia,serif",
                  color: savingsRate >= 20 ? C.green : savingsRate >= 10 ? C.amber : C.red,
                }}>
                  {savingsRate}%
                  <span style={{ fontSize:10, fontWeight:400, color:C.muted, marginLeft:6 }}>
                    {savingsRate >= 20 ? "· above target" : savingsRate >= 10 ? "· below 20% target" : "· needs attention"}
                  </span>
                </span>
              </div>
            </div>
          </>
        )}
      </Section>

      {/* ── C. ACTIONABLE INSIGHTS ─────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"1px" }}>
            Actionable Insights
          </p>
          {insights.map((ins, i) => <Pill key={i} text={ins.text} type={ins.type} />)}
        </div>
      )}

      {/* ── D. SMART SUGGESTIONS ───────────────────────────────────────────── */}
      {smartSuggestions.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"1px" }}>
            💡 Smart Suggestions
          </p>
          {smartSuggestions.map((s,i) => (
            <div key={i} onClick={()=>onNavigate&&onNavigate(s.tab)}
              style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"12px 14px", borderRadius:12, marginBottom:8,
                background:"#fff", border:`1px solid ${C.border}`,
                cursor:onNavigate?"pointer":"default",
                boxShadow:"0 1px 3px rgba(0,0,0,0.05)",
              }}>
              <span style={{ fontSize:24, flexShrink:0 }}>{s.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.ink }}>{s.title}</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:C.muted, lineHeight:1.4 }}>{s.desc}</p>
              </div>
              {onNavigate && <span style={{ fontSize:16, color:"#D1D5DB", flexShrink:0 }}>›</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
