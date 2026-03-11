// ─── BudgetDashboard.jsx — Refined layout, tighter spacing ───────────────
// Changes: compact hero card (~25% shorter), 4-card summary row balanced,
//          tighter flow breakdown rows, compact future payment list.
// Zero calculation changes.

import { calcMonthlyReserve } from "./useAppData";

const C = {ink:"#1C1917",muted:"#78716C",border:"#E7E5E0",bg:"#F7F5F0",red:"#DC2626",green:"#16A34A",amber:"#D97706",blue:"#2563EB",purple:"#7C3AED"};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;

const DASH_CSS = `
  /* 4-col summary row: 2-col on mobile → 4-col ≥600px */
  .mc-summary-row { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:12px; }
  @media(min-width:600px){ .mc-summary-row { grid-template-columns:repeat(4,1fr); } }
`;

// ── Flow row inside budget breakdown ─────────────────────────────────────
function FlowRow({icon, label, sublabel, amount, color, isTotal}) {
  return (
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding: isTotal ? "10px 14px" : "8px 14px",
      background: isTotal ? `${color}0C` : "transparent",
      borderRadius: isTotal ? 7 : 0,
      borderBottom: isTotal ? "none" : `1px solid ${C.bg}`,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
        <span style={{fontSize:isTotal?16:14,flexShrink:0}}>{icon}</span>
        <div style={{minWidth:0}}>
          <p style={{margin:0,fontSize:isTotal?12:11,fontWeight:isTotal?700:500,color:C.ink,whiteSpace:"nowrap"}}>{label}</p>
          {sublabel && <p style={{margin:0,fontSize:10,color:C.muted,whiteSpace:"nowrap"}}>{sublabel}</p>}
        </div>
      </div>
      <p style={{margin:0,marginLeft:12,fontSize:isTotal?15:12,fontWeight:700,color,fontFamily:"Georgia,serif",flexShrink:0}}>
        {amount}
      </p>
    </div>
  );
}

function Divider({label}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"3px 14px"}}>
      <div style={{flex:1,height:1,background:C.border}} />
      <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:600,whiteSpace:"nowrap"}}>{label}</p>
      <div style={{flex:1,height:1,background:C.border}} />
    </div>
  );
}

export default function BudgetDashboard({
  totalIncome, totalFixed, totalSavings, totalReserve,
  remaining, dailyLimit,
  incomeSources, fixedExpenses, savingsPlans, futurePayments,
  currentExpenses,
}) {
  const now        = new Date();
  const lastDay    = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysLeft   = Math.max(1, lastDay - now.getDate() + 1);
  const monthSpent = currentExpenses.reduce((s,e) => s+e.amount, 0);
  const todaySpent = currentExpenses
    .filter(e => e.date.startsWith(now.toISOString().split("T")[0]))
    .reduce((s,e) => s+e.amount, 0);

  const remColor  = remaining < 0 ? C.red : remaining < totalIncome * 0.1 ? C.amber : C.green;
  const spentPct  = remaining > 0 ? Math.min((monthSpent / remaining) * 100, 100) : 100;
  const barColor  = spentPct < 60 ? C.green : spentPct < 85 ? C.amber : C.red;
  const monthName = now.toLocaleDateString("en-IN", {month:"long"});

  return (
    <div>
      <style>{DASH_CSS}</style>

      {/* ══ 1. HERO CARD — compact, ~25% shorter than before ══ */}
      <div style={{
        background:"#1C1917", borderRadius:14, padding:"16px 20px",
        marginBottom:12, position:"relative", overflow:"hidden",
      }}>
        {/* Subtle background ring */}
        <div style={{position:"absolute",top:-50,right:-50,width:160,height:160,borderRadius:"50%",background:"rgba(255,255,255,0.03)",pointerEvents:"none"}} />

        {/* Row 1: Remaining Balance label */}
        <p style={{margin:0,fontSize:10,color:"#A8A29E",textTransform:"uppercase",letterSpacing:"1.4px",fontWeight:600}}>
          Remaining Balance
        </p>

        {/* Row 2: Big amount */}
        <p style={{
          margin:"4px 0 0", lineHeight:1,
          fontSize: remaining >= 1000000 ? 32 : remaining >= 100000 ? 38 : 44,
          fontWeight:700, fontFamily:"Georgia,serif",
          color: remaining >= 0 ? "#fff" : "#F87171",
        }}>
          {remaining >= 0 ? fmt(remaining) : `−${fmt(remaining)}`}
        </p>

        {/* Thin separator */}
        <div style={{height:1, background:"rgba(255,255,255,0.1)", margin:"12px 0 10px"}} />

        {/* Row 3: Daily spend + days left in one line */}
        <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
          <p style={{margin:0,fontSize:18,fontWeight:700,fontFamily:"Georgia,serif",color:dailyLimit>0?"#E7E5E0":"#F87171"}}>
            {dailyLimit > 0 ? fmt(dailyLimit) : "₹0"}
          </p>
          <p style={{margin:0,fontSize:11,color:"#A8A29E"}}>suggested / day &nbsp;·&nbsp; {daysLeft} days left in {monthName}</p>
        </div>

        {/* Row 4: description */}
        <p style={{margin:"3px 0 0",fontSize:10,color:"#57534E",lineHeight:1.5}}>
          Recommended daily spend based on your remaining budget.
        </p>

        {/* Row 5: today's spend pill — only when spent something */}
        {todaySpent > 0 && (
          <div style={{marginTop:10,display:"inline-flex",gap:5,alignItems:"center",background:"rgba(255,255,255,0.07)",borderRadius:99,padding:"4px 11px",border:"1px solid rgba(255,255,255,0.1)"}}>
            <span style={{fontSize:10,color:"#D6D3D1"}}>Today:</span>
            <span style={{fontSize:11,fontWeight:700,color:todaySpent<=dailyLimit?"#86EFAC":"#F87171"}}>{fmt(todaySpent)}</span>
            <span style={{fontSize:10,color:todaySpent<=dailyLimit?"#86EFAC":"#F87171"}}>
              {todaySpent <= dailyLimit ? "✓ within limit" : "⚠ over limit"}
            </span>
          </div>
        )}
      </div>

      {/* ══ 2. SUMMARY CARDS — 4-up desktop, 2-up mobile ══ */}
      <div className="mc-summary-row">
        {[
          {label:"Total Income",         value:fmt(totalIncome),  color:C.green,  icon:"💰"},
          {label:"Fixed Expenses",        value:fmt(totalFixed),   color:C.red,    icon:"🏠"},
          {label:"Savings & Inv.",        value:fmt(totalSavings), color:C.blue,   icon:"📈"},
          {label:"Remaining Budget",      value:remaining>=0?fmt(remaining):`−${fmt(remaining)}`, color:remColor, icon:"✅"},
        ].map(t => (
          <div key={t.label} style={{
            background:"#fff", borderRadius:11, border:`1px solid ${C.border}`,
            padding:"10px 12px", boxShadow:"0 1px 2px rgba(0,0,0,0.04)",
            display:"flex", flexDirection:"column", gap:4,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:12}}>{t.icon}</span>
              <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:600,lineHeight:1.2}}>{t.label}</p>
            </div>
            <p style={{margin:0,fontSize:16,fontWeight:700,color:t.color,fontFamily:"Georgia,serif"}}>{t.value}</p>
          </div>
        ))}
      </div>

      {/* ══ 3. BUDGET FLOW BREAKDOWN ══ */}
      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.04)",overflow:"hidden",marginBottom:12}}>
        {/* Header */}
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bg}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:C.ink}}>Monthly Budget Flow</p>
            <p style={{margin:0,fontSize:10,color:C.muted}}>Where your money is allocated</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px"}}>Spent this month</p>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:barColor,fontFamily:"Georgia,serif"}}>{fmt(monthSpent)}</p>
          </div>
        </div>

        <FlowRow icon="💰" label="Total Income"
          sublabel={`${incomeSources.length} source${incomeSources.length!==1?"s":""}`}
          amount={fmt(totalIncome)} color={C.green} />

        <Divider label="monthly deductions" />

        <FlowRow icon="🏠" label="Fixed Expenses"
          sublabel={`${fixedExpenses.length} item${fixedExpenses.length!==1?"s":""}`}
          amount={`− ${fmt(totalFixed)}`} color={C.red} />

        <FlowRow icon="📈" label="Savings & Investments"
          sublabel={`${savingsPlans.length} plan${savingsPlans.length!==1?"s":""}`}
          amount={`− ${fmt(totalSavings)}`} color={C.blue} />

        {totalReserve > 0 && (
          <FlowRow icon="📅" label="Future Reserve"
            sublabel={`${futurePayments.length} upcoming`}
            amount={`− ${fmt(totalReserve)}`} color={C.purple} />
        )}

        <Divider label="available to spend" />

        <FlowRow icon="✅" label="Remaining Budget" isTotal
          sublabel="For daily expenses this month"
          amount={remaining >= 0 ? fmt(remaining) : `−${fmt(remaining)}`}
          color={remColor} />

        {/* Spend progress bar */}
        <div style={{padding:"6px 14px 10px"}}>
          <div style={{height:4,borderRadius:99,background:C.bg,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:99,width:`${spentPct}%`,background:barColor,transition:"width 0.5s"}} />
          </div>
          <p style={{margin:"4px 0 0",fontSize:9,color:C.muted,textAlign:"right"}}>
            {Math.round(spentPct)}% of available budget spent
          </p>
        </div>
      </div>

      {/* ══ 4. FUTURE PAYMENT RESERVE (only if entries exist) ══ */}
      {futurePayments.length > 0 && (
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.04)",overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bg}`,background:"#FAF5FF"}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:C.ink}}>📅 Future Payment Reserve</p>
            <p style={{margin:0,fontSize:10,color:C.muted}}>Monthly targets to cover upcoming bills</p>
          </div>
          {futurePayments.map(p => {
            const monthly = calcMonthlyReserve(p);
            const days    = Math.max(0, Math.round((new Date(p.nextDate)-new Date())/(1000*60*60*24)));
            const urgency = days<30?C.red:days<90?C.amber:C.purple;
            return (
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",borderBottom:`1px solid ${C.bg}`,gap:8}}>
                <div style={{minWidth:0}}>
                  <p style={{margin:0,fontSize:11,fontWeight:700,color:C.ink}}>{p.label}</p>
                  <p style={{margin:0,fontSize:10,color:C.muted}}>{fmt(p.totalAmount)} · due in {days} days</p>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:urgency,fontFamily:"Georgia,serif"}}>{fmt(monthly)}</p>
                  <p style={{margin:0,fontSize:9,color:C.muted}}>/ month</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
