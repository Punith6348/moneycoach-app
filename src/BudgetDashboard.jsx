// ─── BudgetDashboard.jsx ─────────────────────────────────────────────────
// Layout: Hero → Summary row → Income Allocation → Recent Expenses
// "Monthly Budget Flow" removed — numbers already in summary cards above.
// No calculation changes.

import { useState } from "react";
import { calcMonthlyReserve, calcLoanTotals } from "./useAppData";

const C = {ink:"#1C1917",muted:"#78716C",border:"#E7E5E0",bg:"#F7F5F0",red:"#DC2626",green:"#16A34A",amber:"#D97706",blue:"#2563EB",purple:"#7C3AED"};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;

const DASH_CSS = `
  .mc-summary-row {
    display: grid;
    grid-template-columns: repeat(2,1fr);
    gap: 6px;
    margin-bottom: 10px;
  }
  @media(min-width:860px){
    .mc-summary-row { grid-template-columns: repeat(4,1fr); gap:8px; margin-bottom:12px; }
  }
  .mc-summary-card { padding:8px 10px; }
  @media(min-width:480px){ .mc-summary-card { padding:9px 11px; } }
  @media(min-width:860px){ .mc-summary-card { padding:11px 12px; } }
  .mc-summary-amt { font-size:14px; }
  @media(min-width:480px){ .mc-summary-amt { font-size:15px; } }
  @media(min-width:860px){ .mc-summary-amt { font-size:14px; } }
  .mc-summary-lbl { font-size:8px; }
  @media(min-width:480px){ .mc-summary-lbl { font-size:9px; } }
  .mc-summary-icon { font-size:12px; }
  @media(min-width:480px){ .mc-summary-icon { font-size:13px; } }
  .mc-alloc-row { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
  @media(min-width:600px){ .mc-alloc-row { grid-template-columns:repeat(3,1fr); } }

  /* Clickable card hover / press */
  .mc-card-btn {
    text-align:left; font-family:inherit; cursor:pointer;
    transition: box-shadow 0.15s, transform 0.1s, background 0.15s;
  }
  .mc-card-btn:hover {
    box-shadow: 0 3px 10px rgba(0,0,0,0.10) !important;
    transform: translateY(-1px);
  }
  .mc-card-btn:active { transform: scale(0.97); opacity:0.9; }

  /* Flash highlight animation for scroll target */
  @keyframes sectionFlash {
    0%   { box-shadow: 0 0 0 3px #2563EB66; }
    60%  { box-shadow: 0 0 0 5px #2563EB44; }
    100% { box-shadow: 0 0 0 0px transparent; }
  }
  .mc-section-flash { animation: sectionFlash 1.1s ease forwards; border-radius:12px; }
`;

const ICONS_MAP = {
  "🍽":"Food","🚗":"Travel","☕":"Coffee","🛒":"Grocery",
  "💊":"Medical","🎬":"Entertainment","💸":"Other",
  "🏠":"Rent","⚡":"Electricity","💧":"Water","📶":"Internet",
  "🏦":"EMI/Loan","🛡":"Insurance","🔧":"Maintenance","🎓":"School Fees",
};
const CAT_ICONS = {
  Food:"🍽",Travel:"🚗",Coffee:"☕",Grocery:"🛒",Medical:"💊",Entertainment:"🎬",Other:"💸",
  Rent:"🏠",Electricity:"⚡",Water:"💧",Internet:"📶","EMI/Loan":"🏦",Insurance:"🛡",Maintenance:"🔧","School Fees":"🎓",
};

export default function BudgetDashboard({
  totalIncome, totalFixed, totalSavings, totalReserve,
  remaining, dailyLimit,
  incomeSources, fixedExpenses, savingsPlans, futurePayments,
  currentExpenses, loans = [],
  onNavigate,   // (tab, sectionId?) => void
}) {
  const [hoveredCard, setHoveredCard] = useState(null);
  const now        = new Date();
  const lastDay    = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysLeft   = Math.max(1, lastDay - now.getDate() + 1);
  const monthSpent = currentExpenses.reduce((s,e) => s+e.amount, 0);
  const todaySpent = currentExpenses
    .filter(e => e.date.startsWith(now.toISOString().split("T")[0]))
    .reduce((s,e) => s+e.amount, 0);

  // Loan aggregates
  const loanTotals     = loans.map(l => calcLoanTotals(l));
  const totalLoanEmi   = loanTotals.reduce((s,t) => s+t.emi, 0);
  const totalOutstanding = loanTotals.reduce((s,t) => s+t.outstanding, 0);
  const totalLoanInterest = loanTotals.reduce((s,t) => s+t.totalInterest, 0);
  const debtRatio      = totalIncome > 0 ? Math.round((totalLoanEmi / totalIncome) * 100) : 0;
  const debtColor      = debtRatio < 30 ? C.green : debtRatio < 40 ? C.amber : C.red;
  const debtLabel      = debtRatio < 30 ? "Safe" : debtRatio < 40 ? "Risky" : "High Debt";

  const remColor  = remaining < 0 ? C.red : remaining < totalIncome * 0.1 ? C.amber : C.green;
  const spentPct  = remaining > 0 ? Math.min((monthSpent / remaining) * 100, 100) : 100;
  const barColor  = spentPct < 60 ? C.green : spentPct < 85 ? C.amber : C.red;
  const monthName = now.toLocaleDateString("en-IN", {month:"long"});

  // ── Recent expenses: last 5 across all days ──────────────────────────
  const recentExp = [...currentExpenses]
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  // ── Income allocation %s ─────────────────────────────────────────────
  const allocPct = (v) => totalIncome > 0 ? Math.round((v / totalIncome) * 100) : 0;

  return (
    <div>
      <style>{DASH_CSS}</style>

      {/* ══ 1. HERO CARD ══ */}
      <div style={{
        background:"#1C1917", borderRadius:12, padding:"11px 14px",
        marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:12,
      }}>
        <div style={{flex:1, minWidth:0}}>
          <p style={{margin:0, fontSize:8, color:"#78716C", textTransform:"uppercase", letterSpacing:"1.3px", fontWeight:700}}>
            Remaining Balance
          </p>
          <p style={{
            margin:"2px 0 0", lineHeight:1, fontWeight:700, fontFamily:"Georgia,serif",
            fontSize: remaining >= 1000000 ? 28 : remaining >= 100000 ? 32 : 34,
            color: remaining >= 0 ? "#fff" : "#F87171",
          }}>
            {remaining >= 0 ? fmt(remaining) : `−${fmt(remaining)}`}
          </p>
          <div style={{height:1, background:"rgba(255,255,255,0.08)", margin:"7px 0 6px", maxWidth:260}} />
          <div style={{display:"flex", alignItems:"baseline", gap:4, flexWrap:"wrap"}}>
            <p style={{margin:0, fontSize:9, color:"#A8A29E"}}>Daily spend</p>
            <p style={{margin:0, fontSize:13, fontWeight:700, fontFamily:"Georgia,serif", color: dailyLimit>0?"#E7E5E0":"#F87171"}}>
              {dailyLimit > 0 ? fmt(dailyLimit) : "₹0"}
            </p>
          </div>
          <p style={{margin:"2px 0 0", fontSize:9, color:"#57534E"}}>
            {daysLeft} days left in {monthName}
          </p>
        </div>
        {todaySpent > 0 && (
          <div style={{textAlign:"right", flexShrink:0}}>
            <p style={{margin:0, fontSize:8, color:"#57534E", textTransform:"uppercase", letterSpacing:"0.8px"}}>Today</p>
            <p style={{margin:"1px 0 0", fontSize:13, fontWeight:700, fontFamily:"Georgia,serif",
              color: todaySpent <= dailyLimit ? "#86EFAC" : "#F87171"}}>
              {fmt(todaySpent)}
            </p>
            <p style={{margin:"1px 0 0", fontSize:8, color: todaySpent<=dailyLimit?"#86EFAC":"#F87171"}}>
              {todaySpent<=dailyLimit?"✓ within limit":"⚠ over limit"}
            </p>
          </div>
        )}
      </div>

      {/* ══ 2. SUMMARY CARDS ══ */}
      <div className="mc-summary-row">
        {[
          // navTo: {tab, section} for editable cards — null for computed/derived cards
          { label:"Total Income",         value:fmt(totalIncome),                                   color:C.green,  icon:"💰", navTo:{tab:"plan",    section:"plan-income"} },
          { label:"Fixed Expenses",       value:fmt(totalFixed),                                    color:C.red,    icon:"🏠", navTo:{tab:"plan",    section:"plan-fixed"}  },
          { label:"Savings & Inv.",       value:fmt(totalSavings),                              color:C.blue,   icon:"📈", navTo:{tab:"plan",  section:"plan-savings"} },
          { label:"Loan EMI",             value:loans.length>0?`${fmt(totalLoanEmi)}/mo`:"₹0", color:C.purple, icon:"🏦", navTo:{tab:"loans", section:null} },
        ].map(t => {
          const clickable = !!t.navTo && !!onNavigate;
          const hovered   = hoveredCard === t.label;
          const sharedStyle = {
            background: hovered && clickable ? "#FAFAF9" : "#fff",
            borderRadius:10,
            border:`1px solid ${hovered && clickable ? C.ink+"44" : C.border}`,
            boxShadow: hovered && clickable
              ? "0 3px 10px rgba(0,0,0,0.10)"
              : "0 1px 2px rgba(0,0,0,0.04)",
            display:"flex", flexDirection:"column", gap:0,
          };
          const inner = (
            <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <span className="mc-summary-icon" style={{lineHeight:1}}>{t.icon}</span>
                  <p className="mc-summary-lbl" style={{
                    margin:0, color:C.muted,
                    textTransform:"uppercase", letterSpacing:"0.7px",
                    fontWeight:700, lineHeight:1.3,
                  }}>{t.label}</p>
                </div>
                {/* Chevron — only on clickable cards */}
                {clickable && (
                  <span style={{
                    fontSize:9, color: hovered ? C.ink : C.border,
                    transition:"color 0.15s", lineHeight:1, flexShrink:0,
                  }}>›</span>
                )}
              </div>
              <p className="mc-summary-amt" style={{
                margin:0, fontWeight:700, color:t.color,
                fontFamily:"Georgia,serif", lineHeight:1.1,
              }}>{t.value}</p>
            </>
          );

          return clickable ? (
            <button
              key={t.label}
              className="mc-summary-card mc-card-btn"
              style={sharedStyle}
              onClick={() => onNavigate(t.navTo.tab, t.navTo.section)}
              onMouseEnter={() => setHoveredCard(t.label)}
              onMouseLeave={() => setHoveredCard(null)}
              title={`Edit ${t.label}`}
            >
              {inner}
            </button>
          ) : (
            <div
              key={t.label}
              className="mc-summary-card"
              style={sharedStyle}
            >
              {inner}
            </div>
          );
        })}
      </div>

      {/* ══ 3. INCOME ALLOCATION — replaces duplicate "Monthly Budget Flow" ══ */}
      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.04)",overflow:"hidden",marginBottom:12}}>
        {/* Card header */}
        <div style={{padding:"9px 14px",borderBottom:`1px solid ${C.bg}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:C.ink}}>Income Allocation</p>
            <p style={{margin:0,fontSize:10,color:C.muted}}>How your {fmt(totalIncome)} is distributed</p>
          </div>
          {/* Spent this month — clickable → Expenses tab */}
          <div
            onClick={() => onNavigate && onNavigate("home", null)}
            style={{
              textAlign:"right",
              cursor: onNavigate ? "pointer" : "default",
              padding:"4px 6px", borderRadius:8,
              transition:"background 0.12s",
            }}
            onMouseEnter={e=>{ if(onNavigate) e.currentTarget.style.background=C.bg; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}
            title={onNavigate ? "View Expenses" : undefined}
          >
            <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px"}}>
              Spent this month {onNavigate && <span style={{color:C.muted}}>›</span>}
            </p>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:barColor,fontFamily:"Georgia,serif"}}>{fmt(monthSpent)}</p>
          </div>
        </div>

        {/* 3-up allocation tiles */}
        <div style={{padding:"10px 14px 4px"}}>
          <div className="mc-alloc-row">
            {/* Savings tile */}
            <div style={{borderRadius:9,border:`1px solid ${C.blue}22`,background:`${C.blue}06`,padding:"9px 11px"}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                <span style={{fontSize:13}}>📈</span>
                <p style={{margin:0,fontSize:10,fontWeight:700,color:C.blue}}>Savings & Inv.</p>
              </div>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:C.blue,fontFamily:"Georgia,serif"}}>{fmt(totalSavings)}</p>
              <p style={{margin:"2px 0 0",fontSize:10,color:C.muted}}>{allocPct(totalSavings)}% of income</p>
              {savingsPlans.length > 0 && (
                <div style={{marginTop:6,borderTop:`1px solid ${C.blue}18`,paddingTop:5}}>
                  {savingsPlans.map(p=>(
                    <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}>
                      <p style={{margin:0,fontSize:10,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"55%"}}>{p.label}</p>
                      <p style={{margin:0,fontSize:10,fontWeight:600,color:C.blue,fontFamily:"Georgia,serif"}}>{fmt(p.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fixed expenses tile */}
            <div style={{borderRadius:9,border:`1px solid ${C.red}22`,background:`${C.red}06`,padding:"9px 11px"}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                <span style={{fontSize:13}}>🏠</span>
                <p style={{margin:0,fontSize:10,fontWeight:700,color:C.red}}>Fixed Bills</p>
              </div>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:C.red,fontFamily:"Georgia,serif"}}>{fmt(totalFixed)}</p>
              <p style={{margin:"2px 0 0",fontSize:10,color:C.muted}}>{allocPct(totalFixed)}% of income</p>
              {fixedExpenses.length > 0 && (
                <div style={{marginTop:6,borderTop:`1px solid ${C.red}18`,paddingTop:5}}>
                  {fixedExpenses.slice(0,4).map(f=>(
                    <div key={f.id} style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}>
                      <p style={{margin:0,fontSize:10,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"55%"}}>{f.label}</p>
                      <p style={{margin:0,fontSize:10,fontWeight:600,color:C.red,fontFamily:"Georgia,serif"}}>{fmt(f.amount)}</p>
                    </div>
                  ))}
                  {fixedExpenses.length > 4 && (
                    <p style={{margin:"3px 0 0",fontSize:9,color:C.muted}}>+{fixedExpenses.length-4} more</p>
                  )}
                </div>
              )}
            </div>

            {/* Future reserve tile — only if entries exist, else daily spend */}
            {totalReserve > 0 ? (
              <div style={{borderRadius:9,border:`1px solid ${C.purple}22`,background:`${C.purple}06`,padding:"9px 11px"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                  <span style={{fontSize:13}}>📅</span>
                  <p style={{margin:0,fontSize:10,fontWeight:700,color:C.purple}}>Future Reserve</p>
                </div>
                <p style={{margin:0,fontSize:15,fontWeight:700,color:C.purple,fontFamily:"Georgia,serif"}}>{fmt(totalReserve)}</p>
                <p style={{margin:"2px 0 0",fontSize:10,color:C.muted}}>{allocPct(totalReserve)}% of income · /month</p>
                {futurePayments.length > 0 && (
                  <div style={{marginTop:6,borderTop:`1px solid ${C.purple}18`,paddingTop:5}}>
                    {futurePayments.map(p=>{
                      const monthly=calcMonthlyReserve(p);
                      const days=Math.max(0,Math.round((new Date(p.nextDate)-new Date())/(1000*60*60*24)));
                      return (
                        <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}>
                          <p style={{margin:0,fontSize:10,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"55%"}}>{p.label} <span style={{color:days<30?C.red:C.muted}}>({days}d)</span></p>
                          <p style={{margin:0,fontSize:10,fontWeight:600,color:C.purple,fontFamily:"Georgia,serif"}}>{fmt(monthly)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* No future payments: show daily spend context tile instead */
              <div style={{borderRadius:9,border:`1px solid ${C.amber}22`,background:`${C.amber}06`,padding:"9px 11px"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                  <span style={{fontSize:13}}>📆</span>
                  <p style={{margin:0,fontSize:10,fontWeight:700,color:C.amber}}>Daily Budget</p>
                </div>
                <p style={{margin:0,fontSize:15,fontWeight:700,color:C.amber,fontFamily:"Georgia,serif"}}>{fmt(dailyLimit)}</p>
                <p style={{margin:"2px 0 0",fontSize:10,color:C.muted}}>per day · {daysLeft} days left</p>
              </div>
            )}
          </div>

          {/* Spend progress bar — only new info here */}
          <div style={{margin:"10px 0 6px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <p style={{margin:0,fontSize:9,color:C.muted}}>Daily budget used this month</p>
              <p style={{margin:0,fontSize:9,color:barColor,fontWeight:600}}>{Math.round(spentPct)}%</p>
            </div>
            <div style={{height:4,borderRadius:99,background:C.bg,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,width:`${spentPct}%`,background:barColor,transition:"width 0.5s"}} />
            </div>
          </div>
        </div>
      </div>

      {/* ══ 4. LOAN SUMMARY — only if loans exist ══ */}
      {loans.length > 0 && (
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.04)",overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"9px 14px",borderBottom:`1px solid ${C.bg}`,background:`${C.purple}08`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:C.ink}}>🏦 Loan Summary</p>
              <p style={{margin:0,fontSize:10,color:C.muted}}>{loans.length} active loan{loans.length!==1?"s":""}</p>
            </div>
            {/* Debt ratio badge */}
            <div style={{textAlign:"right"}}>
              <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px"}}>Debt Ratio</p>
              <div style={{display:"flex",alignItems:"center",gap:5,justifyContent:"flex-end"}}>
                <p style={{margin:0,fontSize:14,fontWeight:700,color:debtColor,fontFamily:"Georgia,serif"}}>{debtRatio}%</p>
                <span style={{fontSize:10,fontWeight:700,color:debtColor,background:`${debtColor}15`,borderRadius:99,padding:"1px 7px",border:`1px solid ${debtColor}30`}}>{debtLabel}</span>
              </div>
              <p style={{margin:0,fontSize:9,color:C.muted}}>of monthly income</p>
            </div>
          </div>

          {/* Three metrics */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:0}}>
            {[
              {label:"Outstanding",   value:fmt(totalOutstanding),   color:C.red},
              {label:"Monthly EMI",   value:fmt(totalLoanEmi),       color:C.purple},
              {label:"Interest Left", value:fmt(totalLoanInterest),  color:C.amber},
            ].map((m,i)=>(
              <div key={m.label} style={{padding:"10px 14px",borderRight:i<2?`1px solid ${C.bg}`:"none"}}>
                <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:600}}>{m.label}</p>
                <p style={{margin:"3px 0 0",fontSize:14,fontWeight:700,color:m.color,fontFamily:"Georgia,serif"}}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Debt ratio bar */}
          <div style={{padding:"4px 14px 10px"}}>
            <div style={{height:3,borderRadius:99,background:C.bg,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,width:`${Math.min(debtRatio,100)}%`,background:debtColor,transition:"width 0.5s"}}/>
            </div>
            <p style={{margin:"3px 0 0",fontSize:9,color:C.muted}}>
              {debtRatio < 30 ? "✓ Healthy debt load — below 30% of income" :
               debtRatio < 40 ? "⚠ Getting risky — consider prepaying one loan" :
               "🔴 High debt — EMIs exceed 40% of income"}
            </p>
          </div>
        </div>
      )}

      {/* ══ 5. RECENT EXPENSES (last 5) ══ */}
      {recentExp.length > 0 && (
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.04)",overflow:"hidden"}}>
          <div style={{padding:"9px 14px",borderBottom:`1px solid ${C.bg}`}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:C.ink}}>Recent Expenses</p>
            <p style={{margin:0,fontSize:10,color:C.muted}}>Last {recentExp.length} transactions this month</p>
          </div>
          {recentExp.map((e,i) => {
            const icon = CAT_ICONS[e.label] || "💸";
            const time = new Date(e.date).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
            const dateStr = new Date(e.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
            return (
              <div key={e.id} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"7px 14px", borderBottom: i<recentExp.length-1?`1px solid ${C.bg}`:"none", gap:8,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:9,flex:1,minWidth:0}}>
                  <div style={{width:28,height:28,borderRadius:7,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{icon}</div>
                  <div style={{minWidth:0}}>
                    <p style={{margin:0,fontSize:12,fontWeight:600,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {e.label}{e.note?` · ${e.note}`:""}
                    </p>
                    <p style={{margin:0,fontSize:10,color:C.muted}}>{dateStr} · {time}</p>
                  </div>
                </div>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:C.red,fontFamily:"Georgia,serif",flexShrink:0}}>{fmt(e.amount)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
