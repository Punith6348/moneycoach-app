// ─── BudgetDashboard.jsx — Financial summary + daily limit ───────────────
// Save to: moneycoach-app/src/BudgetDashboard.jsx

import { calcMonthlyReserve } from "./useAppData";

const C = {ink:"#1C1917",muted:"#78716C",border:"#E7E5E0",bg:"#F7F5F0",red:"#DC2626",green:"#16A34A",amber:"#D97706",blue:"#2563EB",purple:"#7C3AED"};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;

function FlowRow({icon, label, amount, color, sublabel, isTotal}) {
  return (
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding: isTotal ? "14px 16px" : "11px 16px",
      background: isTotal ? `${color}0F` : "transparent",
      borderRadius: isTotal ? 10 : 0,
      borderBottom: isTotal ? "none" : `1px solid ${C.bg}`,
      marginBottom: isTotal ? 0 : 0,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:isTotal?20:16}}>{icon}</span>
        <div>
          <p style={{margin:0,fontSize:isTotal?14:13,fontWeight:isTotal?700:500,color:C.ink}}>{label}</p>
          {sublabel && <p style={{margin:"2px 0 0",fontSize:11,color:C.muted}}>{sublabel}</p>}
        </div>
      </div>
      <p style={{margin:0,fontSize:isTotal?20:14,fontWeight:700,color,fontFamily:"Georgia,serif"}}>
        {amount}
      </p>
    </div>
  );
}

function Divider({label}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 16px"}}>
      <div style={{flex:1,height:1,background:C.border}} />
      <p style={{margin:0,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:600}}>{label}</p>
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
  const todaySpent = currentExpenses
    .filter(e => e.date.startsWith(new Date().toISOString().split("T")[0]))
    .reduce((s,e) => s+e.amount, 0);

  const monthSpent    = currentExpenses.reduce((s,e) => s+e.amount, 0);
  const spentVsLimit  = remaining > 0 ? (monthSpent / remaining) * 100 : 100;
  const remColor      = remaining < 0 ? C.red : remaining < totalIncome * 0.1 ? C.amber : C.green;
  const dailyColor    = dailyLimit <= 0 ? C.red : C.ink;

  // Days remaining in month
  const now      = new Date();
  const lastDay  = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysLeft = Math.max(1, lastDay - now.getDate() + 1);

  return (
    <div>
      {/* ── Hero: Daily Limit ── */}
      <div style={{background:"#1C1917",borderRadius:16,padding:"24px 20px",marginBottom:16,textAlign:"center"}}>
        <p style={{margin:0,fontSize:11,color:"#A8A29E",textTransform:"uppercase",letterSpacing:"1.2px",fontWeight:600}}>Safe Daily Spending Limit</p>
        <p style={{margin:"8px 0 4px",fontSize:48,fontWeight:700,color: dailyLimit>0?"#fff":"#F87171",fontFamily:"Georgia,serif",lineHeight:1}}>
          {dailyLimit > 0 ? fmt(dailyLimit) : "₹0"}
        </p>
        <p style={{margin:0,fontSize:13,color:"#A8A29E"}}>{daysLeft} days remaining in {now.toLocaleDateString("en-IN",{month:"long"})}</p>
        {todaySpent > 0 && (
          <div style={{marginTop:12,display:"inline-flex",gap:6,alignItems:"center",background:"rgba(255,255,255,0.08)",borderRadius:99,padding:"5px 14px"}}>
            <span style={{fontSize:12,color:"#D6D3D1"}}>Spent today:</span>
            <span style={{fontSize:13,fontWeight:700,color:todaySpent>dailyLimit?"#F87171":"#86EFAC"}}>{fmt(todaySpent)}</span>
            {todaySpent <= dailyLimit
              ? <span style={{fontSize:11,color:"#86EFAC"}}>✓ within limit</span>
              : <span style={{fontSize:11,color:"#F87171"}}>⚠ over limit</span>}
          </div>
        )}
      </div>

      {/* ── Budget Flow Breakdown ── */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:16}}>

        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.bg}`}}>
          <p style={{margin:0,fontSize:15,fontWeight:700,color:C.ink}}>Monthly Budget Flow</p>
          <p style={{margin:"2px 0 0",fontSize:12,color:C.muted}}>Where your money goes each month</p>
        </div>

        <FlowRow icon="💰" label="Total Income"
          sublabel={`${incomeSources.length} source${incomeSources.length!==1?"s":""}`}
          amount={fmt(totalIncome)} color={C.green} />

        <Divider label="deductions" />

        <FlowRow icon="🏠" label="Fixed Expenses"
          sublabel={`${fixedExpenses.length} item${fixedExpenses.length!==1?"s":""}`}
          amount={`− ${fmt(totalFixed)}`} color={C.red} />

        <FlowRow icon="📈" label="Savings & Investments"
          sublabel={`${savingsPlans.length} plan${savingsPlans.length!==1?"s":""}`}
          amount={`− ${fmt(totalSavings)}`} color={C.blue} />

        <FlowRow icon="📅" label="Future Payment Reserve"
          sublabel={`${futurePayments.length} upcoming payment${futurePayments.length!==1?"s":""}`}
          amount={`− ${fmt(totalReserve)}`} color={C.purple} />

        <Divider label="remaining" />

        <FlowRow icon="✅" label="Remaining Budget" isTotal
          sublabel="Available for daily spending"
          amount={remaining >= 0 ? fmt(remaining) : `−${fmt(remaining)}`}
          color={remColor} />

        {/* Progress bar */}
        <div style={{padding:"8px 16px 14px"}}>
          <div style={{height:6,borderRadius:99,background:C.bg,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:99,width:`${Math.min(spentVsLimit,100)}%`,
              background:spentVsLimit<60?C.green:spentVsLimit<85?C.amber:C.red,transition:"width 0.5s"}} />
          </div>
          <p style={{marginTop:5,fontSize:11,color:C.muted,textAlign:"center"}}>
            {fmt(monthSpent)} spent of {fmt(remaining)} available this month ({Math.round(spentVsLimit)}%)
          </p>
        </div>
      </div>

      {/* ── Future Payment Schedule ── */}
      {futurePayments.length > 0 && (
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.bg}`,background:"#FAF5FF"}}>
            <p style={{margin:0,fontSize:15,fontWeight:700,color:C.ink}}>📅 Future Payment Reserve</p>
            <p style={{margin:"2px 0 0",fontSize:12,color:C.muted}}>Monthly saving targets to cover upcoming bills</p>
          </div>
          {futurePayments.map(p => {
            const monthly  = calcMonthlyReserve(p);
            const days     = Math.max(0, Math.round((new Date(p.nextDate)-new Date())/(1000*60*60*24)));
            const urgency  = days < 30 ? C.red : days < 90 ? C.amber : C.purple;
            return (
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${C.bg}`}}>
                <div>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>{p.label}</p>
                  <p style={{margin:"2px 0 0",fontSize:11,color:C.muted}}>
                    {fmt(p.totalAmount)} total · due in {days} days
                  </p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{margin:0,fontSize:14,fontWeight:700,color:urgency,fontFamily:"Georgia,serif"}}>{fmt(monthly)}</p>
                  <p style={{margin:0,fontSize:10,color:C.muted}}>per month</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Quick stat tiles ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {label:"Total Income",    value:fmt(totalIncome),   color:C.green},
          {label:"Fixed Expenses",  value:fmt(totalFixed),    color:C.red},
          {label:"Saving Monthly",  value:fmt(totalSavings),  color:C.blue},
          {label:"Reserve Monthly", value:fmt(totalReserve),  color:C.purple},
        ].map(t=>(
          <div key={t.label} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,padding:"12px 14px"}}>
            <p style={{margin:0,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:600}}>{t.label}</p>
            <p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:t.color,fontFamily:"Georgia,serif"}}>{t.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
