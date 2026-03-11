// ─── BudgetDashboard.jsx — Redesigned dashboard layout ───────────────────
// Changes:
//   1. Black hero card: Remaining Balance primary, Daily Limit secondary
//   2. Summary row: 4 cards side-by-side (2-col mobile → 4-col desktop)
//   3. Budget flow breakdown below
//   4. Future payment reserve if present
// All calculations unchanged.

import { calcMonthlyReserve } from "./useAppData";

const C = {ink:"#1C1917",muted:"#78716C",border:"#E7E5E0",bg:"#F7F5F0",red:"#DC2626",green:"#16A34A",amber:"#D97706",blue:"#2563EB",purple:"#7C3AED"};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;

// ── Responsive helpers injected once ─────────────────────────────────────
const RESPONSIVE_CSS = `
  .mc-summary-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
  .mc-flow-grid    { display:grid; grid-template-columns:1fr; gap:0; }
  @media(min-width:640px){
    .mc-summary-grid { grid-template-columns:repeat(4,1fr); }
  }
`;

// ── Flow row inside the budget breakdown card ─────────────────────────────
function FlowRow({icon, label, sublabel, amount, color, isTotal}) {
  return (
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding: isTotal ? "13px 16px" : "10px 16px",
      background: isTotal ? `${color}0C` : "transparent",
      borderRadius: isTotal ? 8 : 0,
      borderBottom: isTotal ? "none" : `1px solid ${C.bg}`,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <span style={{fontSize:isTotal?18:15}}>{icon}</span>
        <div>
          <p style={{margin:0,fontSize:isTotal?13:12,fontWeight:isTotal?700:500,color:C.ink,lineHeight:1.3}}>{label}</p>
          {sublabel && <p style={{margin:"1px 0 0",fontSize:10,color:C.muted}}>{sublabel}</p>}
        </div>
      </div>
      <p style={{margin:0,fontSize:isTotal?17:13,fontWeight:700,color,fontFamily:"Georgia,serif",flexShrink:0,marginLeft:12}}>
        {amount}
      </p>
    </div>
  );
}

function Divider({label}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 16px"}}>
      <div style={{flex:1,height:1,background:C.border}} />
      <p style={{margin:0,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:600,whiteSpace:"nowrap"}}>{label}</p>
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

  const remColor     = remaining < 0 ? C.red : remaining < totalIncome * 0.1 ? C.amber : C.green;
  const spentPct     = remaining > 0 ? Math.min((monthSpent/remaining)*100, 100) : 100;
  const barColor     = spentPct < 60 ? C.green : spentPct < 85 ? C.amber : C.red;
  const monthName    = now.toLocaleDateString("en-IN",{month:"long"});

  return (
    <div>
      <style>{RESPONSIVE_CSS}</style>

      {/* ══ 1. HERO BLACK CARD: Remaining Balance + Daily Limit ══ */}
      <div style={{
        background:"#1C1917", borderRadius:16, padding:"20px 22px",
        marginBottom:14, position:"relative", overflow:"hidden",
      }}>
        {/* Subtle texture ring */}
        <div style={{position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,0.03)",pointerEvents:"none"}} />

        {/* Remaining Balance — primary */}
        <p style={{margin:0,fontSize:11,color:"#A8A29E",textTransform:"uppercase",letterSpacing:"1.3px",fontWeight:600}}>
          Remaining Balance
        </p>
        <p style={{
          margin:"6px 0 0", lineHeight:1,
          fontSize: remaining >= 100000 ? 40 : 48,
          fontWeight:700, fontFamily:"Georgia,serif",
          color: remaining >= 0 ? "#fff" : "#F87171",
        }}>
          {remaining >= 0 ? fmt(remaining) : `−${fmt(remaining)}`}
        </p>

        {/* Divider */}
        <div style={{height:1,background:"rgba(255,255,255,0.1)",margin:"14px 0 12px"}} />

        {/* Daily Limit — secondary */}
        <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
          <p style={{margin:0,fontSize:22,fontWeight:700,fontFamily:"Georgia,serif",color:dailyLimit>0?"#E7E5E0":"#F87171"}}>
            {dailyLimit > 0 ? fmt(dailyLimit) : "₹0"}
          </p>
          <p style={{margin:0,fontSize:12,color:"#A8A29E"}}>suggested per day</p>
        </div>
        <p style={{margin:"4px 0 0",fontSize:11,color:"#78716C",lineHeight:1.5}}>
          {daysLeft} days remaining in {monthName} · Recommended daily spend based on your remaining budget.
        </p>

        {/* Today's spend pill */}
        {todaySpent > 0 && (
          <div style={{marginTop:12,display:"inline-flex",gap:6,alignItems:"center",background:"rgba(255,255,255,0.07)",borderRadius:99,padding:"5px 13px",border:"1px solid rgba(255,255,255,0.1)"}}>
            <span style={{fontSize:11,color:"#D6D3D1"}}>Today:</span>
            <span style={{fontSize:12,fontWeight:700,color:todaySpent<=dailyLimit?"#86EFAC":"#F87171"}}>{fmt(todaySpent)}</span>
            <span style={{fontSize:10,color:todaySpent<=dailyLimit?"#86EFAC":"#F87171"}}>
              {todaySpent<=dailyLimit?"✓ within limit":"⚠ over limit"}
            </span>
          </div>
        )}
      </div>

      {/* ══ 2. SUMMARY CARDS ROW — 4-up desktop, 2-up mobile ══ */}
      <div className="mc-summary-grid" style={{marginBottom:14}}>
        {[
          {label:"Total Income",         value:fmt(totalIncome),            color:C.green,  icon:"💰"},
          {label:"Fixed Expenses",        value:fmt(totalFixed),             color:C.red,    icon:"🏠"},
          {label:"Savings & Investments", value:fmt(totalSavings),           color:C.blue,   icon:"📈"},
          {label:"Remaining Budget",      value:remaining>=0?fmt(remaining):`−${fmt(remaining)}`, color:remColor, icon:"✅"},
        ].map(t=>(
          <div key={t.label} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,padding:"12px 14px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
              <span style={{fontSize:14}}>{t.icon}</span>
              <p style={{margin:0,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600,lineHeight:1.2}}>{t.label}</p>
            </div>
            <p style={{margin:0,fontSize:17,fontWeight:700,color:t.color,fontFamily:"Georgia,serif"}}>{t.value}</p>
          </div>
        ))}
      </div>

      {/* ══ 3. BUDGET FLOW BREAKDOWN ══ */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.05)",overflow:"hidden",marginBottom:14}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.bg}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>Monthly Budget Flow</p>
            <p style={{margin:"1px 0 0",fontSize:11,color:C.muted}}>Where your money is allocated</p>
          </div>
          {/* Spent progress pill */}
          <div style={{textAlign:"right",flexShrink:0}}>
            <p style={{margin:0,fontSize:10,color:C.muted}}>Spent this month</p>
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
          <FlowRow icon="📅" label="Future Payment Reserve"
            sublabel={`${futurePayments.length} upcoming`}
            amount={`− ${fmt(totalReserve)}`} color={C.purple} />
        )}
        <Divider label="available to spend" />
        <FlowRow icon="✅" label="Remaining Budget" isTotal
          sublabel="For daily expenses this month"
          amount={remaining >= 0 ? fmt(remaining) : `−${fmt(remaining)}`}
          color={remColor} />

        {/* Spend progress bar */}
        <div style={{padding:"8px 16px 12px"}}>
          <div style={{height:5,borderRadius:99,background:C.bg,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:99,width:`${spentPct}%`,background:barColor,transition:"width 0.5s"}} />
          </div>
          <p style={{margin:"5px 0 0",fontSize:10,color:C.muted,textAlign:"right"}}>
            {Math.round(spentPct)}% of available budget spent
          </p>
        </div>
      </div>

      {/* ══ 4. FUTURE PAYMENT RESERVE (only if entries exist) ══ */}
      {futurePayments.length > 0 && (
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.05)",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.bg}`,background:"#FAF5FF"}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>📅 Future Payment Reserve</p>
            <p style={{margin:"1px 0 0",fontSize:11,color:C.muted}}>Monthly targets to cover upcoming bills</p>
          </div>
          {futurePayments.map(p => {
            const monthly = calcMonthlyReserve(p);
            const days    = Math.max(0, Math.round((new Date(p.nextDate)-new Date())/(1000*60*60*24)));
            const urgency = days<30?C.red:days<90?C.amber:C.purple;
            return (
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:`1px solid ${C.bg}`,gap:8}}>
                <div style={{minWidth:0}}>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:C.ink}}>{p.label}</p>
                  <p style={{margin:"1px 0 0",fontSize:10,color:C.muted}}>{fmt(p.totalAmount)} · due in {days} days</p>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:urgency,fontFamily:"Georgia,serif"}}>{fmt(monthly)}</p>
                  <p style={{margin:0,fontSize:10,color:C.muted}}>/ month</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
