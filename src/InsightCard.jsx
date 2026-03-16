// ─── InsightCard.jsx — Unified Insights Hub ──────────────────────────────────
// Merges former "Insights" + "Monthly Review" into one clean analysis page.
// Sections (in order):
//   1. Month selector  2. Monthly Summary waterfall  3. Budget pace/warning
//   4. Category breakdown + MoM  5. Month highlights  6. Income allocation  7. Insights
//
// generateInsight() export preserved — used by SpendingChart.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { CATEGORY_CONFIG } from "./SpendingChart";
import { calcLoanTotals, monthKeyToLabel, getActiveMonthKeys } from "./useAppData";

const C = {
  ink:"#1C1917", muted:"#78716C", border:"#E7E5E0", bg:"#F7F5F0",
  red:"#DC2626", green:"#16A34A", amber:"#D97706", blue:"#2563EB", purple:"#7C3AED",
};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const pct = (part, total) => total > 0 ? Math.round((part / total) * 100) : 0;
const CAT_ICONS = { Food:"🍽",Travel:"🚗",Coffee:"☕",Grocery:"🛒",Medical:"💊",Entertainment:"🎬",Other:"💸" };

// ── generateInsight — preserved for SpendingChart.jsx ────────────────────────
export function generateInsight(monthlyIncome, expenses) {
  if (!monthlyIncome || monthlyIncome <= 0 || expenses.length === 0) return null;
  const now=new Date(), weekAgo=new Date(now-7*24*60*60*1000);
  const we=expenses.filter(e=>new Date(e.date)>=weekAgo);
  const wt=we.reduce((s,e)=>s+e.amount,0), wp=Math.round((wt/monthlyIncome)*100);
  const da=wt/7, dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const ps=monthlyIncome-da*dim, sr=(ps/monthlyIncome)*100;
  const bc={}; we.forEach(e=>{bc[e.label]=(bc[e.label]||0)+e.amount;});
  const tc=Object.entries(bc).sort((a,b)=>b[1]-a[1])[0];
  const cd=now.getDate(), dr=dim-cd;
  const ms=expenses.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,e)=>s+e.amount,0);
  const rb=monthlyIncome-ms, dbl=dr>0?Math.round(rb/dr):0;
  let risk,emoji,headline,advice,tip;
  if(sr>=30){risk="excellent";emoji="🏆";headline=`You spent ${fmt(wt)} this week — ${wp}% of income.`;advice="Outstanding! Saving over 30%.";tip="Consider routing surplus to a SIP or emergency fund.";}
  else if(sr>=20){risk="safe";emoji="🟢";headline=`You spent ${fmt(wt)} this week — ${wp}% of income.`;advice="On track with a healthy savings rate.";tip=tc?`Top spend: ${tc[0]} (${fmt(tc[1])}).`:"Keep tracking daily.";}
  else if(sr>=10){risk="warning";emoji="🟡";headline=`You spent ${fmt(wt)} this week — ${wp}% of income.`;advice="Saving, but tighter than ideal.";tip=tc?`Try reducing ${tc[0]} (${fmt(tc[1])} this week).`:"Aim to cut ₹200–₹500/day.";}
  else if(sr>=0){risk="tight";emoji="🟠";headline=`You spent ${fmt(wt)} this week — ${wp}% of income.`;advice="Very little savings projected.";tip=`${fmt(rb)} left for ${dr} days (~${fmt(dbl)}/day).`;}
  else{risk="danger";emoji="🔴";headline=`You spent ${fmt(wt)} this week — ${wp}% of income.`;advice="Spending more than you earn.";tip=tc?`${tc[0]} is biggest drain at ${fmt(tc[1])}.`:"Review all categories.";}
  return{risk,emoji,headline,advice,tip,weeklyTotal:wt,weeklyPct:wp,projectedSavings:ps,savingsRate:Math.round(sr),daysInMonth:dim,currentDay:cd,daysRemaining:dr,monthSpentSoFar:ms,remainingBalance:rb,dailyBudgetLeft:dbl,topCategory:tc,byCategory:bc};
}

// ── Small UI helpers ──────────────────────────────────────────────────────────
function Bar({value,max,color,h=4}){
  const w=max>0?Math.min(100,pct(value,max)):0;
  return(<div style={{height:h,borderRadius:99,background:C.border,overflow:"hidden",marginTop:3}}><div style={{height:"100%",width:`${w}%`,background:color,borderRadius:99,transition:"width 0.45s"}}/></div>);
}

function Delta({curr,prev,invertGood=false}){
  if(!prev||prev===0)return null;
  const d=Math.round(((curr-prev)/prev)*100);
  const improved=invertGood?d<0:d>0, neutral=d===0;
  const col=neutral?C.muted:improved?C.green:C.red;
  const arrow=d>0?"▲":d<0?"▼":"─";
  return(<span style={{fontSize:9,fontWeight:700,color:col,background:neutral?C.bg:improved?"#F0FDF4":"#FFF1F2",border:`1px solid ${neutral?C.border:improved?"#86EFAC":"#FECACA"}`,borderRadius:99,padding:"1px 6px",display:"inline-flex",alignItems:"center",gap:2}}>{arrow} {Math.abs(d)}%</span>);
}

function Card({title,icon,subtitle,children,accent=C.blue}){
  return(
    <div style={{background:"#fff",borderRadius:13,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.05)",overflow:"hidden",marginBottom:12}}>
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bg}`,background:`${accent}08`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>{icon&&<span style={{marginRight:6}}>{icon}</span>}{title}</p>
          {subtitle&&<p style={{margin:"1px 0 0",fontSize:10,color:C.muted}}>{subtitle}</p>}
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>{children}</div>
    </div>
  );
}

function MetricRow({label,value,color=C.ink,curr,prev,invertGood,sublabel,last=false}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:last?"none":`1px solid ${C.bg}`,gap:8}}>
      <div style={{flex:1,minWidth:0}}>
        <p style={{margin:0,fontSize:12,fontWeight:600,color:C.ink}}>{label}</p>
        {sublabel&&<p style={{margin:"1px 0 0",fontSize:10,color:C.muted}}>{sublabel}</p>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
        {curr!==undefined&&prev!==undefined&&<Delta curr={curr} prev={prev} invertGood={invertGood}/>}
        <span style={{fontSize:14,fontWeight:700,color,fontFamily:"Georgia,serif"}}>{value}</span>
      </div>
    </div>
  );
}

function InsightPill({text,type="neutral"}){
  const s={good:{bg:"#F0FDF4",border:"#86EFAC",icon:"✅"},warn:{bg:"#FFFBEB",border:"#FCD34D",icon:"⚠️"},bad:{bg:"#FFF1F2",border:"#FECACA",icon:"🔴"},neutral:{bg:C.bg,border:C.border,icon:"💡"}}[type]||{bg:C.bg,border:C.border,icon:"💡"};
  return(<div style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"flex-start",gap:10}}><span style={{fontSize:14,flexShrink:0,marginTop:1}}>{s.icon}</span><p style={{margin:0,fontSize:12,color:C.ink,lineHeight:1.5}}>{text}</p></div>);
}

function MonthPicker({selected,onChange,allExpenses}){
  const keys=getActiveMonthKeys(allExpenses);
  return(
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:2,scrollbarWidth:"none"}}>
      <p style={{margin:0,fontSize:9,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",flexShrink:0}}>Month:</p>
      {keys.map(k=>{
        const active=k===selected;
        return(<button key={k} onClick={()=>onChange(k)} style={{flexShrink:0,padding:"4px 11px",borderRadius:99,cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:active?700:500,border:`1.5px solid ${active?C.ink:C.border}`,background:active?C.ink:"#fff",color:active?"#fff":C.muted,transition:"all 0.12s"}}>{monthKeyToLabel(k)}</button>);
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default function InsightCard({
  monthlyIncome, expenses, prevMonthExpenses=[],
  totalFixed=0, totalSavings=0, totalReserve=0,
  loans=[], allExpenses={}, selectedMonth, onMonthChange,
  showDetails=true,
}){
  const now=new Date();
  const totalVar    = expenses.reduce((s,e)=>s+e.amount,0);
  const prevVar     = prevMonthExpenses.reduce((s,e)=>s+e.amount,0);
  const totalLoanEmi= useMemo(()=>loans.reduce((s,l)=>s+calcLoanTotals(l).emi,0),[loans]);
  const monthEndBal = monthlyIncome-totalFixed-totalSavings-totalReserve-totalVar-totalLoanEmi;
  const prevBal     = monthlyIncome-totalFixed-totalSavings-totalReserve-prevVar-totalLoanEmi;
  const hasPrev     = prevMonthExpenses.length>0;

  const catMap=useMemo(()=>{const m={};expenses.forEach(e=>{m[e.label]=(m[e.label]||0)+e.amount;});return m;},[expenses]);
  const prevCatMap=useMemo(()=>{const m={};prevMonthExpenses.forEach(e=>{m[e.label]=(m[e.label]||0)+e.amount;});return m;},[prevMonthExpenses]);
  const catList=useMemo(()=>Object.entries(catMap).sort((a,b)=>b[1]-a[1]),[catMap]);
  const topCat=catList[0]?.[0]||null, topCatAmt=catList[0]?.[1]||0;

  const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const daysPassed=now.getDate(), daysLeft=daysInMonth-daysPassed;
  const monthPct=pct(totalVar,monthlyIncome), idealPct=pct(daysPassed,daysInMonth);
  const isOver=monthPct>100, isNear=monthPct>=80&&!isOver;
  const paceStatus=monthPct>idealPct+10?"fast":monthPct<idealPct-10?"under":"on-track";

  const biggestExp=expenses.length>0?expenses.reduce((mx,e)=>e.amount>mx.amount?e:mx,expenses[0]):null;
  const noSpendDays=daysInMonth-new Set(expenses.map(e=>e.date.split("T")[0])).size;
  const savingsRate=pct(totalSavings,monthlyIncome), fixedBurden=pct(totalFixed+totalLoanEmi,monthlyIncome);
  const NON_ESSENTIAL=["Coffee","Entertainment","Other","Food","Travel"];
  const savOpp=catList.find(([cat])=>NON_ESSENTIAL.includes(cat)&&catMap[cat]>500);
  const savOppAmt=savOpp?Math.round(savOpp[1]*0.2):0;

  const insights=useMemo(()=>{
    const list=[];
    if(isOver) list.push({text:`Over budget — ${monthPct}% of income spent. Only ${fmt(Math.max(0,monthlyIncome-totalVar))} left for the rest of the month.`,type:"bad"});
    else if(isNear) list.push({text:`At ${monthPct}% of income with ${daysLeft} days left — approaching your limit. Slow down now.`,type:"warn"});
    if(hasPrev&&totalVar>prevVar*1.15&&prevVar>0) list.push({text:`Variable spending is up ${Math.round(((totalVar-prevVar)/prevVar)*100)}% vs last month (${fmt(prevVar)} → ${fmt(totalVar)}).`,type:"warn"});
    if(topCat&&hasPrev){const cur=catMap[topCat]||0,prev=prevCatMap[topCat]||0;if(cur>prev*1.1&&prev>0)list.push({text:`${topCat} spending rose to ${fmt(cur)} — ${fmt(cur-prev)} more than last month.`,type:"warn"});else if(cur<prev*0.9&&prev>0)list.push({text:`${topCat} spending dropped by ${fmt(prev-cur)} vs last month. Good discipline.`,type:"good"});}
    if(savingsRate>=20) list.push({text:`Saving ${savingsRate}% of income — above the 20% benchmark. Strong financial habit.`,type:"good"});
    else if(savingsRate>0&&savingsRate<10) list.push({text:`Savings rate is just ${savingsRate}%. Consider increasing to at least 10% next month.`,type:"warn"});
    else if(savingsRate===0&&monthlyIncome>0) list.push({text:`No savings set up yet. Even ₹1,000/month builds a meaningful habit over time.`,type:"warn"});
    if(fixedBurden>60) list.push({text:`Fixed costs + EMIs consume ${fixedBurden}% of income — very little room left.`,type:"bad"});
    else if(fixedBurden>40) list.push({text:`Fixed costs + EMIs are ${fixedBurden}% of income. Watch variable spending closely.`,type:"neutral"});
    if(noSpendDays>=10) list.push({text:`${noSpendDays} no-spend days this month. Every zero-spend day compounds into real savings.`,type:"good"});
    if(monthEndBal<0) list.push({text:`Month-end balance is negative (${fmt(monthEndBal)}). Total outflows exceeded income.`,type:"bad"});
    if(savOpp&&list.length<3) list.push({text:`Cutting ${savOpp[0]} by 20% saves ~${fmt(savOppAmt)}/month — ${fmt(savOppAmt*12)} a year.`,type:"neutral"});
    return list.slice(0,3);
  },[isOver,isNear,monthPct,daysLeft,hasPrev,totalVar,prevVar,topCat,catMap,prevCatMap,savingsRate,fixedBurden,noSpendDays,monthEndBal,savOpp,savOppAmt]);

  if(expenses.length===0&&monthlyIncome===0) return(
    <div style={{background:"#fff",borderRadius:13,border:`1px solid ${C.border}`,textAlign:"center",padding:"48px 24px"}}>
      <p style={{fontSize:36,margin:"0 0 10px"}}>💡</p>
      <p style={{margin:"0 0 6px",fontSize:15,fontWeight:700,color:C.ink}}>No data yet</p>
      <p style={{margin:0,fontSize:12,color:C.muted,lineHeight:1.6}}>Set up income in the Plan tab and log some expenses to see your monthly insights.</p>
    </div>
  );

  return (
    <div>
      {onMonthChange&&<MonthPicker selected={selectedMonth} onChange={onMonthChange} allExpenses={allExpenses}/>}

      {/* 1. MONTHLY SUMMARY */}
      <Card title="Monthly Summary" icon="📋" subtitle={selectedMonth?monthKeyToLabel(selectedMonth):undefined} accent={C.blue}>
        <div style={{background:C.ink,borderRadius:10,padding:"12px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:8,color:"#78716C",textTransform:"uppercase",letterSpacing:"1.2px",fontWeight:700}}>Month-End Balance</p>
            <p style={{margin:"2px 0 0",fontSize:26,fontWeight:700,fontFamily:"Georgia,serif",lineHeight:1,color:monthEndBal>=0?"#fff":"#F87171"}}>
              {monthEndBal>=0?fmt(monthEndBal):`−${fmt(Math.abs(monthEndBal))}`}
            </p>
          </div>
          {hasPrev&&<div style={{textAlign:"right"}}><p style={{margin:0,fontSize:9,color:"#57534E",textTransform:"uppercase",letterSpacing:"0.8px"}}>vs last month</p><Delta curr={monthEndBal} prev={prevBal}/></div>}
        </div>
        <MetricRow label="Total Income"    value={fmt(monthlyIncome)} color={C.green}  sublabel="From all income sources"/>
        <MetricRow label="Fixed Expenses"  value={fmt(totalFixed)}    color={C.red}    sublabel="Rent, bills, subscriptions"/>
        <MetricRow label="Savings & Inv."  value={fmt(totalSavings)}  color={C.blue}   sublabel="SIPs, RDs, emergency fund"/>
        {totalLoanEmi>0&&<MetricRow label="Loan EMIs" value={fmt(totalLoanEmi)} color={C.purple} sublabel="Active loan repayments"/>}
        {totalReserve>0&&<MetricRow label="Future Reserve" value={fmt(totalReserve)} color={C.amber} sublabel="Set aside for upcoming bills"/>}
        <MetricRow label="Variable Spending" value={fmt(totalVar)} color={C.red}
          curr={hasPrev?totalVar:undefined} prev={hasPrev?prevVar:undefined} invertGood={true}
          sublabel={`${expenses.length} transaction${expenses.length!==1?"s":""}`} last/>
      </Card>

      {/* 2. SPENDING PACE */}
      {monthlyIncome>0&&expenses.length>0&&(
        <Card title="Spending Pace" icon="⏱" accent={isOver?C.red:isNear?C.amber:C.green}>
          {(isOver||isNear)&&(
            <div style={{background:isOver?"#FFF1F2":"#FFFBEB",border:`1px solid ${isOver?"#FCA5A5":"#FCD34D"}`,borderRadius:8,padding:"9px 12px",marginBottom:10,display:"flex",alignItems:"flex-start",gap:10}}>
              <span style={{fontSize:18,flexShrink:0}}>{isOver?"🚨":"⚠️"}</span>
              <div>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:isOver?"#B91C1C":"#B45309"}}>{isOver?`Over budget — ${monthPct}% of income spent`:`Approaching limit — ${monthPct}% spent so far`}</p>
                <p style={{margin:"2px 0 0",fontSize:10,color:C.muted}}>{daysLeft} days remaining · {isOver?`Limit remaining to ${fmt(Math.max(0,monthlyIncome-totalVar))}`:`~${fmt(Math.round((monthlyIncome-totalVar)/Math.max(daysLeft,1)))}/day to stay on track`}</p>
              </div>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <p style={{margin:0,fontSize:10,color:C.muted}}>Month spent: <strong>{monthPct}%</strong></p>
            <p style={{margin:0,fontSize:10,color:C.muted}}>Expected by day {daysPassed}: {idealPct}%</p>
          </div>
          <div style={{position:"relative",height:8,borderRadius:99,background:C.border,overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,bottom:0,left:`${idealPct}%`,width:2,background:"rgba(0,0,0,0.15)",zIndex:1}}/>
            <div style={{height:"100%",borderRadius:99,width:`${Math.min(monthPct,100)}%`,background:isOver?C.red:isNear?C.amber:C.green,transition:"width 0.45s"}}/>
          </div>
          <p style={{margin:"4px 0 0",fontSize:9,color:C.muted,textAlign:"center",fontWeight:600}}>
            {paceStatus==="fast"?"⚡ Spending faster than ideal pace":paceStatus==="under"?"✓ Under budget pace":"📊 On track with budget pace"}
          </p>
        </Card>
      )}

      {/* 3. CATEGORY BREAKDOWN */}
      {catList.length>0&&(
        <Card title="Category Breakdown" icon="🧾" subtitle="Variable expenses by category" accent={C.amber}>
          {catList.map(([cat,amt],i)=>{
            const prev=prevCatMap[cat]||0;
            return(
              <div key={cat} style={{padding:"7px 0",borderBottom:i<catList.length-1?`1px solid ${C.bg}`:"none"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:15}}>{CAT_ICONS[cat]||CATEGORY_CONFIG[cat]?.icon||"💸"}</span>
                    <span style={{fontSize:12,fontWeight:600,color:C.ink}}>{cat}</span>
                    {hasPrev&&prev>0&&<Delta curr={amt} prev={prev} invertGood={true}/>}
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:C.amber,fontFamily:"Georgia,serif"}}>{fmt(amt)}</span>
                </div>
                <Bar value={amt} max={totalVar} color={C.amber}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
                  <p style={{margin:0,fontSize:9,color:C.muted}}>{pct(amt,totalVar)}% of spend{hasPrev&&prev>0?` · was ${fmt(prev)}`:""}</p>
                  <p style={{margin:0,fontSize:9,color:C.muted}}>{pct(amt,monthlyIncome)}% of income</p>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* 4. HIGHLIGHTS */}
      <Card title="Month Highlights" icon="🏅" accent={C.green}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            {label:"Top Category",value:topCat?`${CAT_ICONS[topCat]||"💸"} ${topCat}`:"—",sub:topCat?fmt(topCatAmt):"No expenses",color:C.amber},
            {label:"Biggest Expense",value:biggestExp?fmt(biggestExp.amount):"—",sub:biggestExp?`${CAT_ICONS[biggestExp.label]||"💸"} ${biggestExp.label}${biggestExp.note?` · ${biggestExp.note}`:""}` :"No expenses",color:C.red},
            {label:"No-Spend Days",value:`${noSpendDays}`,sub:`out of ${daysInMonth} days`,color:C.green},
            {label:"Transactions",value:`${expenses.length}`,sub:totalVar>0?`avg ${fmt(Math.round(totalVar/Math.max(expenses.length,1)))} each`:"No expenses",color:C.blue},
          ].map(tile=>(
            <div key={tile.label} style={{background:C.bg,borderRadius:9,padding:"10px 11px",border:`1px solid ${C.border}`}}>
              <p style={{margin:0,fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.7px",fontWeight:700}}>{tile.label}</p>
              <p style={{margin:"3px 0 1px",fontSize:15,fontWeight:700,color:tile.color,fontFamily:"Georgia,serif",lineHeight:1.1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tile.value}</p>
              <p style={{margin:0,fontSize:9,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tile.sub}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 5. WHERE INCOME WENT */}
      {monthlyIncome>0&&(
        <Card title="Where Your Income Went" icon="🥧" subtitle="As a % of monthly income" accent={C.green}>
          {[
            {label:"Fixed Expenses",amt:totalFixed,color:C.red},
            {label:"Savings & Inv.",amt:totalSavings,color:C.blue},
            {label:"Loan EMIs",amt:totalLoanEmi,color:C.purple,hide:totalLoanEmi===0},
            {label:"Future Reserve",amt:totalReserve,color:C.amber,hide:totalReserve===0},
            {label:"Variable Spend",amt:totalVar,color:"#EA580C"},
            {label:"Unspent",amt:Math.max(0,monthEndBal),color:C.green,hide:monthEndBal<=0},
          ].filter(r=>!r.hide&&r.amt>0).map((row,i,arr)=>(
            <div key={row.label} style={{marginBottom:i<arr.length-1?9:0}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:2,background:row.color,flexShrink:0}}/>
                  <span style={{fontSize:11,fontWeight:600,color:C.ink}}>{row.label}</span>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:9,color:C.muted,fontWeight:600}}>{pct(row.amt,monthlyIncome)}%</span>
                  <span style={{fontSize:12,fontWeight:700,color:row.color,fontFamily:"Georgia,serif"}}>{fmt(row.amt)}</span>
                </div>
              </div>
              <Bar value={row.amt} max={monthlyIncome} color={row.color} h={5}/>
            </div>
          ))}
        </Card>
      )}

      {/* 6. ACTIONABLE INSIGHTS */}
      {insights.length>0&&(
        <Card title="Actionable Insights" icon="💡" subtitle="Rule-based observations" accent={C.blue}>
          {insights.map((ins,i)=><InsightPill key={i} text={ins.text} type={ins.type}/>)}
        </Card>
      )}

    </div>
  );
}
