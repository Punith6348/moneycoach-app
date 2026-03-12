// ─── InsightCard.jsx — Multi-card insights dashboard ─────────────────────
// Cards: Spending Health · Category Alert · Savings Opportunity ·
//        Top Spending Summary · Monthly Trend · Budget Warning
// All original calc logic preserved. Only layout and cards extended.

import { useMemo } from "react";
import { CATEGORY_CONFIG } from "./SpendingChart";

const C   = { ink:"#1C1917", muted:"#78716C", border:"#E7E5E0", bg:"#F7F5F0" };
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;

// ── Original generateInsight — UNCHANGED ─────────────────────────────────
export function generateInsight(monthlyIncome, expenses) {
  if (!monthlyIncome || monthlyIncome <= 0 || expenses.length === 0) return null;
  const now     = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const weeklyExpenses      = expenses.filter(e => new Date(e.date) >= weekAgo);
  const weeklyTotal         = weeklyExpenses.reduce((s,e) => s+e.amount, 0);
  const weeklyPct           = Math.round((weeklyTotal / monthlyIncome) * 100);
  const dailyAvg            = weeklyTotal / 7;
  const daysInMonth         = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const projectedMonthlySpend = dailyAvg * daysInMonth;
  const projectedSavings    = monthlyIncome - projectedMonthlySpend;
  const savingsRate         = (projectedSavings / monthlyIncome) * 100;
  const byCategory          = {};
  weeklyExpenses.forEach(e => { byCategory[e.label] = (byCategory[e.label]||0) + e.amount; });
  const topCategory         = Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0];
  const currentDay          = now.getDate();
  const daysRemaining       = daysInMonth - currentDay;
  const monthSpentSoFar     = expenses
    .filter(e => { const d=new Date(e.date); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear(); })
    .reduce((s,e)=>s+e.amount,0);
  const remainingBalance    = monthlyIncome - monthSpentSoFar;
  const dailyBudgetLeft     = daysRemaining > 0 ? Math.round(remainingBalance/daysRemaining) : 0;
  let risk, emoji, headline, advice, tip;
  if (savingsRate >= 30)      { risk="excellent"; emoji="🏆"; headline=`You spent ${fmt(weeklyTotal)} this week — ${weeklyPct}% of your income.`; advice="Outstanding! Saving over 30% of income."; tip="Consider putting surplus into a SIP, RD, or emergency fund."; }
  else if (savingsRate >= 20) { risk="safe";      emoji="🟢"; headline=`You spent ${fmt(weeklyTotal)} this week — ${weeklyPct}% of your income.`; advice="You're on track with a healthy savings rate."; tip=topCategory?`Top spend: ${topCategory[0]} (${fmt(topCategory[1])}).`:"Keep tracking daily."; }
  else if (savingsRate >= 10) { risk="warning";   emoji="🟡"; headline=`You spent ${fmt(weeklyTotal)} this week — ${weeklyPct}% of your income.`; advice="Saving, but tighter than ideal."; tip=topCategory?`Try reducing ${topCategory[0]} (${fmt(topCategory[1])} this week).`:"Aim to cut ₹200–₹500 from daily spends."; }
  else if (savingsRate >= 0)  { risk="tight";     emoji="🟠"; headline=`You spent ${fmt(weeklyTotal)} this week — ${weeklyPct}% of your income.`; advice="Very little savings projected."; tip=`${fmt(remainingBalance)} left for ${daysRemaining} days — ~${fmt(dailyBudgetLeft)}/day.`; }
  else                        { risk="danger";    emoji="🔴"; headline=`You spent ${fmt(weeklyTotal)} this week — ${weeklyPct}% of your income.`; advice="Spending more than you earn. Action needed."; tip=topCategory?`${topCategory[0]} is biggest drain at ${fmt(topCategory[1])} this week.`:"Review all categories immediately."; }
  return { risk, emoji, headline, advice, tip, weeklyTotal, weeklyPct, dailyAvg, projectedMonthlySpend, projectedSavings, savingsRate:Math.round(savingsRate), daysInMonth, currentDay, daysRemaining, monthSpentSoFar, remainingBalance, dailyBudgetLeft, topCategory, byCategory };
}

// ── Additional data derivations (no income/storage mutations) ────────────
function deriveInsightData(monthlyIncome, expenses, prevMonthExpenses) {
  const now = new Date();

  // Month totals
  const monthTotal = expenses.reduce((s,e) => s+e.amount, 0);
  const monthPct   = monthlyIncome > 0 ? Math.round((monthTotal/monthlyIncome)*100) : 0;

  // By-category this month
  const byCat = {};
  expenses.forEach(e => {
    if (!byCat[e.label]) byCat[e.label] = 0;
    byCat[e.label] += e.amount;
  });
  const catList = Object.entries(byCat)
    .map(([name,total]) => ({ name, total:Math.round(total), pct:monthlyIncome>0?Math.round((total/monthlyIncome)*100):0, icon:CATEGORY_CONFIG[name]?.icon||"💸", color:CATEGORY_CONFIG[name]?.color||C.muted }))
    .sort((a,b) => b.total - a.total);

  // Top 3
  const top3 = catList.slice(0,3);

  // Highest category
  const topCat = catList[0] || null;

  // By-category last month
  const prevByCat = {};
  (prevMonthExpenses||[]).forEach(e => {
    if (!prevByCat[e.label]) prevByCat[e.label] = 0;
    prevByCat[e.label] += e.amount;
  });

  // Trend: compare top categories month-over-month
  const trends = catList.slice(0,5).map(c => {
    const prev = prevByCat[c.name] || 0;
    const diff = prev > 0 ? Math.round(((c.total - prev)/prev)*100) : null;
    return { ...c, prev:Math.round(prev), diff };
  }).filter(t => t.diff !== null);

  // Savings opportunity: which non-essential category could be cut 20%?
  const NON_ESSENTIAL = ["Coffee","Entertainment","Other","Food","Travel"];
  const savOpp = catList.find(c => NON_ESSENTIAL.includes(c.name) && c.total > 500);
  const savOppAmt = savOpp ? Math.round(savOpp.total * 0.2) : 0;

  // Budget warning threshold
  const WARNING_PCT = 80;
  const isOverBudget  = monthPct > 100;
  const isNearBudget  = monthPct >= WARNING_PCT && !isOverBudget;

  // Days info
  const daysInMonth   = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysPassed    = now.getDate();
  const daysLeft      = daysInMonth - daysPassed;
  const idealDailyPct = (daysPassed / daysInMonth) * 100; // where you should be
  const paceStatus    = monthPct > idealDailyPct + 10 ? "ahead" : monthPct < idealDailyPct - 10 ? "behind" : "on-track";

  return { monthTotal, monthPct, catList, top3, topCat, trends, savOpp, savOppAmt, isOverBudget, isNearBudget, daysLeft, daysInMonth, daysPassed, paceStatus, idealDailyPct:Math.round(idealDailyPct) };
}

// ── Shared card shell ─────────────────────────────────────────────────────
function InsCard({ icon, title, badge, badgeColor, accentBg, accentBorder, children }) {
  return (
    <div style={{
      background: accentBg || "#fff",
      borderRadius:12,
      border:`1px solid ${accentBorder || C.border}`,
      boxShadow:"0 1px 3px rgba(0,0,0,0.05)",
      overflow:"hidden",
      display:"flex", flexDirection:"column",
    }}>
      {/* Card header */}
      <div style={{padding:"10px 14px", borderBottom:`1px solid ${accentBorder||C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{display:"flex", alignItems:"center", gap:7}}>
          <span style={{fontSize:15}}>{icon}</span>
          <p style={{margin:0, fontSize:11, fontWeight:700, color:C.ink, textTransform:"uppercase", letterSpacing:"0.8px"}}>{title}</p>
        </div>
        {badge && (
          <span style={{fontSize:10, fontWeight:700, color:badgeColor||C.muted, background:`${badgeColor||C.muted}18`, borderRadius:99, padding:"2px 9px", border:`1px solid ${badgeColor||C.muted}30`}}>
            {badge}
          </span>
        )}
      </div>
      <div style={{padding:"12px 14px", flex:1}}>{children}</div>
    </div>
  );
}

// ── Thin horizontal bar ───────────────────────────────────────────────────
function MiniBar({ pct, color }) {
  return (
    <div style={{height:3, borderRadius:99, background:C.border, overflow:"hidden", marginTop:4}}>
      <div style={{height:"100%", borderRadius:99, width:`${Math.min(pct,100)}%`, background:color, transition:"width 0.4s"}} />
    </div>
  );
}

// ── Risk helpers ──────────────────────────────────────────────────────────
const RISK = {
  excellent: { bg:"#F0FDF4", border:"#86EFAC", accent:"#16A34A", label:"Excellent" },
  safe:      { bg:"#F0FDF4", border:"#86EFAC", accent:"#16A34A", label:"On Track"  },
  warning:   { bg:"#FFFBEB", border:"#FCD34D", accent:"#D97706", label:"Warning"   },
  tight:     { bg:"#FFF7ED", border:"#FDBA74", accent:"#EA580C", label:"Tight"     },
  danger:    { bg:"#FFF1F2", border:"#FCA5A5", accent:"#DC2626", label:"Danger"    },
};

// ═════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════
export default function InsightCard({ monthlyIncome, expenses, prevMonthExpenses = [], showDetails = true }) {

  const insight = useMemo(() => generateInsight(monthlyIncome, expenses), [monthlyIncome, expenses]);
  const d       = useMemo(() => deriveInsightData(monthlyIncome, expenses, prevMonthExpenses), [monthlyIncome, expenses, prevMonthExpenses]);

  // ── Empty state ──
  if (!expenses?.length) {
    return (
      <div style={{background:"#fff", borderRadius:14, border:`1px solid ${C.border}`, textAlign:"center", padding:"44px 20px"}}>
        <p style={{fontSize:36, margin:"0 0 10px"}}>💡</p>
        <p style={{color:C.muted, fontSize:13, margin:0}}>Log at least one expense to see your financial insights.</p>
      </div>
    );
  }

  const rs = insight ? RISK[insight.risk] : RISK.safe;

  return (
    <div>
      <style>{`
        .mc-insight-grid { display:grid; grid-template-columns:1fr; gap:12px; }
        @media(min-width:640px){ .mc-insight-grid { grid-template-columns:1fr 1fr; } }
      `}</style>

      {/* ══ BUDGET WARNING — full width, only shown when needed ══ */}
      {(d.isOverBudget || d.isNearBudget) && (
        <div style={{
          background: d.isOverBudget ? "#FFF1F2" : "#FFFBEB",
          border:`1.5px solid ${d.isOverBudget?"#FCA5A5":"#FCD34D"}`,
          borderRadius:12, padding:"12px 16px", marginBottom:12,
          display:"flex", alignItems:"flex-start", gap:12,
        }}>
          <span style={{fontSize:22, flexShrink:0}}>{d.isOverBudget?"🚨":"⚠️"}</span>
          <div>
            <p style={{margin:0, fontSize:13, fontWeight:700, color:d.isOverBudget?"#B91C1C":"#B45309"}}>
              {d.isOverBudget
                ? `Over budget — you've spent ${d.monthPct}% of income this month`
                : `Approaching limit — ${d.monthPct}% of income spent so far`}
            </p>
            <p style={{margin:"3px 0 0", fontSize:11, color:C.muted}}>
              {d.daysLeft} days remaining · {d.isOverBudget
                ? `Try to limit spending to ${fmt(Math.max(0, monthlyIncome - d.monthTotal))} for the rest of the month.`
                : `Slow down to around ${fmt(Math.round((monthlyIncome - d.monthTotal) / Math.max(d.daysLeft,1)))}/day to stay on track.`}
            </p>
          </div>
        </div>
      )}

      <div className="mc-insight-grid">

        {/* ── 1. SPENDING HEALTH ── */}
        {insight && (
          <InsCard
            icon={insight.emoji} title="Spending Health"
            badge={rs.label} badgeColor={rs.accent}
            accentBg={rs.bg} accentBorder={rs.border}
          >
            <p style={{margin:"0 0 6px", fontSize:13, fontWeight:600, color:C.ink, lineHeight:1.5}}>
              {insight.headline}
            </p>
            <p style={{margin:"0 0 10px", fontSize:11, color:C.muted}}>{insight.advice}</p>
            {/* Pace bar */}
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:3}}>
              <p style={{margin:0, fontSize:10, color:C.muted}}>Month spent</p>
              <p style={{margin:0, fontSize:10, fontWeight:700, color:rs.accent}}>{d.monthPct}%</p>
            </div>
            <MiniBar pct={d.monthPct} color={rs.accent} />
            <div style={{display:"flex", justifyContent:"space-between", marginTop:3}}>
              <p style={{margin:0, fontSize:9, color:C.muted}}>Expected by day {d.daysPassed}: {d.idealDailyPct}%</p>
              <p style={{margin:0, fontSize:9, color:d.paceStatus==="ahead"?"#DC2626":d.paceStatus==="behind"?"#16A34A":C.muted}}>
                {d.paceStatus==="ahead"?"Spending fast":"ahead"??""}
                {d.paceStatus==="behind"?"Under budget":""}
                {d.paceStatus==="on-track"?"On pace":""}
              </p>
            </div>
            <p style={{margin:"8px 0 0", fontSize:11, color:C.muted, fontStyle:"italic"}}>💡 {insight.tip}</p>
          </InsCard>
        )}

        {/* ── 2. CATEGORY ALERT ── */}
        {d.topCat && (
          <InsCard
            icon="🔍" title="Category Alert"
            badge={`${d.topCat.pct}% of income`} badgeColor={d.topCat.color}
          >
            <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:10}}>
              <div style={{width:40, height:40, borderRadius:10, background:`${d.topCat.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, border:`1.5px solid ${d.topCat.color}40`, flexShrink:0}}>
                {d.topCat.icon}
              </div>
              <div>
                <p style={{margin:0, fontSize:15, fontWeight:700, color:d.topCat.color, fontFamily:"Georgia,serif"}}>{fmt(d.topCat.total)}</p>
                <p style={{margin:0, fontSize:12, fontWeight:600, color:C.ink}}>{d.topCat.name} — highest category</p>
              </div>
            </div>
            <MiniBar pct={d.topCat.pct} color={d.topCat.color} />
            <p style={{margin:"6px 0 0", fontSize:11, color:C.muted}}>
              {d.topCat.pct >= 30
                ? `⚠ ${d.topCat.name} alone is ${d.topCat.pct}% of income. Consider setting a weekly cap.`
                : `${d.topCat.name} is your biggest spend this month at ${d.topCat.pct}% of income.`}
            </p>
            {d.catList.length > 1 && (
              <p style={{margin:"4px 0 0", fontSize:11, color:C.muted}}>
                Next: {d.catList[1].icon} {d.catList[1].name} at {fmt(d.catList[1].total)} ({d.catList[1].pct}%)
              </p>
            )}
          </InsCard>
        )}

        {/* ── 3. SAVINGS OPPORTUNITY ── */}
        <InsCard icon="💰" title="Savings Opportunity" badge={d.savOpp?`Save ${fmt(d.savOppAmt)}/mo`:undefined} badgeColor="#16A34A">
          {d.savOpp ? (
            <>
              <p style={{margin:"0 0 8px", fontSize:13, fontWeight:600, color:C.ink}}>
                Cut {d.savOpp.name} by 20%
              </p>
              <div style={{display:"flex", justifyContent:"space-between", padding:"8px 12px", background:"#F0FDF4", borderRadius:8, border:"1px solid #86EFAC", marginBottom:8}}>
                <div style={{textAlign:"center"}}>
                  <p style={{margin:0, fontSize:10, color:C.muted}}>Current</p>
                  <p style={{margin:0, fontSize:14, fontWeight:700, color:"#DC2626", fontFamily:"Georgia,serif"}}>{fmt(d.savOpp.total)}</p>
                </div>
                <div style={{display:"flex", alignItems:"center"}}>
                  <span style={{fontSize:16, color:"#16A34A"}}>→</span>
                </div>
                <div style={{textAlign:"center"}}>
                  <p style={{margin:0, fontSize:10, color:C.muted}}>Target</p>
                  <p style={{margin:0, fontSize:14, fontWeight:700, color:"#16A34A", fontFamily:"Georgia,serif"}}>{fmt(d.savOpp.total - d.savOppAmt)}</p>
                </div>
                <div style={{textAlign:"center"}}>
                  <p style={{margin:0, fontSize:10, color:C.muted}}>You Save</p>
                  <p style={{margin:0, fontSize:14, fontWeight:700, color:"#16A34A", fontFamily:"Georgia,serif"}}>+{fmt(d.savOppAmt)}</p>
                </div>
              </div>
              <p style={{margin:0, fontSize:11, color:C.muted}}>
                Small reductions in {d.savOpp.name} compound over months. That's {fmt(d.savOppAmt*12)} saved in a year.
              </p>
            </>
          ) : (
            <p style={{margin:0, fontSize:13, color:C.muted}}>
              {insight?.savingsRate >= 30
                ? "🏆 You're already optimising well — no obvious cuts needed."
                : "Log more expenses to identify saving opportunities."}
            </p>
          )}
        </InsCard>

        {/* ── 4. TOP SPENDING SUMMARY ── */}
        <InsCard icon="🏅" title="Top Spending">
          {d.top3.length > 0 ? (
            <div>
              {d.top3.map((cat,i) => (
                <div key={cat.name} style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"7px 0",
                  borderBottom: i<d.top3.length-1 ? `1px solid ${C.bg}` : "none",
                }}>
                  <p style={{margin:0, fontSize:11, color:C.muted, minWidth:16, fontWeight:700}}>#{i+1}</p>
                  <span style={{fontSize:16}}>{cat.icon}</span>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:"flex", justifyContent:"space-between"}}>
                      <p style={{margin:0, fontSize:12, fontWeight:600, color:C.ink}}>{cat.name}</p>
                      <p style={{margin:0, fontSize:13, fontWeight:700, color:cat.color, fontFamily:"Georgia,serif"}}>{fmt(cat.total)}</p>
                    </div>
                    <MiniBar pct={d.monthTotal>0?Math.round((cat.total/d.monthTotal)*100):0} color={cat.color} />
                    <p style={{margin:"2px 0 0", fontSize:9, color:C.muted}}>
                      {d.monthTotal>0?Math.round((cat.total/d.monthTotal)*100):0}% of total spend
                    </p>
                  </div>
                </div>
              ))}
              <div style={{marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between"}}>
                <p style={{margin:0, fontSize:10, color:C.muted}}>All {d.catList.length} categories</p>
                <p style={{margin:0, fontSize:12, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif"}}>{fmt(d.monthTotal)}</p>
              </div>
            </div>
          ) : (
            <p style={{margin:0, fontSize:13, color:C.muted}}>No expenses logged this month.</p>
          )}
        </InsCard>

        {/* ── 5. MONTHLY TREND — full width ── */}
        {d.trends.length > 0 && (
          <div style={{gridColumn:"1 / -1"}}>
            <InsCard icon="📈" title="Month-over-Month Trend" badge="vs last month" badgeColor="#2563EB">
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8}}>
                {d.trends.map(t => {
                  const up   = t.diff > 0;
                  const none = t.diff === 0;
                  const col  = none ? C.muted : up ? "#DC2626" : "#16A34A";
                  return (
                    <div key={t.name} style={{
                      background:C.bg, borderRadius:9, padding:"8px 10px",
                      border:`1px solid ${C.border}`,
                    }}>
                      <div style={{display:"flex", alignItems:"center", gap:5, marginBottom:4}}>
                        <span style={{fontSize:14}}>{t.icon}</span>
                        <p style={{margin:0, fontSize:11, fontWeight:600, color:C.ink}}>{t.name}</p>
                      </div>
                      <p style={{margin:0, fontSize:13, fontWeight:700, color:t.color, fontFamily:"Georgia,serif"}}>{fmt(t.total)}</p>
                      <div style={{display:"flex", alignItems:"center", gap:3, marginTop:2}}>
                        <span style={{fontSize:11, color:col}}>{none?"–":up?"↑":"↓"}</span>
                        <span style={{fontSize:10, color:col, fontWeight:700}}>
                          {none ? "No change" : `${Math.abs(t.diff)}% vs last month`}
                        </span>
                      </div>
                      <p style={{margin:"1px 0 0", fontSize:9, color:C.muted}}>Was {fmt(t.prev)}</p>
                    </div>
                  );
                })}
              </div>
              {d.trends.length === 0 && (
                <p style={{margin:0, fontSize:12, color:C.muted}}>No previous month data to compare yet.</p>
              )}
            </InsCard>
          </div>
        )}

      </div>
    </div>
  );
}
