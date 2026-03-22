// ─── SpendingChart.jsx ───────────────────────────────────────────────────────
import { useMemo, useState } from "react";

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
const fmt2 = (n) => n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${(n/1000).toFixed(0)}k`:`₹${n}`;

// ── Aggregate ─────────────────────────────────────────────────────────────────
function aggregate(expenses) {
  if (!expenses?.length) return [];
  const grand = expenses.reduce((s,e)=>s+e.amount,0);
  if (!grand) return [];
  const map = {};
  expenses.forEach(e => {
    if (!map[e.label]) map[e.label]={total:0,count:0,items:[]};
    map[e.label].total+=e.amount; map[e.label].count+=1; map[e.label].items.push(e);
  });
  return Object.entries(map).map(([name,{total,count,items}])=>({
    name, total:Math.round(total), pct:Math.round((total/grand)*100), count,
    icon:CATEGORY_CONFIG[name]?.icon||"💸", color:CATEGORY_CONFIG[name]?.color||"#6B7280",
    items:[...items].sort((a,b)=>new Date(b.date)-new Date(a.date)),
  })).sort((a,b)=>b.total-a.total);
}

// ── Donut SVG ─────────────────────────────────────────────────────────────────
function Donut({ data, grandTotal, selected, onSelect }) {
  // Responsive: bigger donut
  const SIZE=240, CX=120, CY=120, R=96, r=62, GAP=1.8;
  const segs = useMemo(()=>{
    if(!data.length) return [];
    const total=data.reduce((s,d)=>s+d.total,0);
    let angle=-90;
    return data.map(d=>{
      const sweep=(d.total/total)*360, start=angle, end=angle+sweep-GAP;
      angle+=sweep;
      const polar=(cx,cy,rad,deg)=>{const r2=(deg*Math.PI)/180;return[cx+rad*Math.cos(r2),cy+rad*Math.sin(r2)];};
      const[x1,y1]=polar(CX,CY,R,start),[x2,y2]=polar(CX,CY,R,end);
      const[x3,y3]=polar(CX,CY,r,end),[x4,y4]=polar(CX,CY,r,start);
      const large=sweep-GAP>180?1:0;
      const path=[
        `M ${x1} ${y1}`,
        `A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${r} ${r} 0 ${large} 0 ${x4} ${y4}`,
        `Z`
      ].join(' ');
      return{...d,path,sweep};
    });
  },[data]);

  const sel    = data.find(d=>d.name===selected);
  const topCat = !selected && data[0]; // show top category in center when nothing selected

  return(
    <div style={{display:"flex",justifyContent:"center",marginBottom:4}}>
      <svg width={SIZE} height={SIZE} style={{overflow:"visible"}}>
        {segs.map(s=>(
          <path key={s.name} d={s.path} fill={s.color}
            opacity={selected&&selected!==s.name?0.15:1}
            stroke={selected===s.name?"#111":"#fff"}
            strokeWidth={selected===s.name?3:2}
            style={{cursor:"pointer",transition:"opacity 0.18s",filter:selected===s.name?"drop-shadow(0 2px 6px rgba(0,0,0,0.18))":"none"}}
            onClick={()=>onSelect(s.name)}/>
        ))}

        {/* Center content */}
        {sel ? (
          <>
            <text x={CX} y={CY-20} textAnchor="middle" style={{fontSize:22,fontFamily:"inherit"}}>{sel.icon}</text>
            <text x={CX} y={CY+2} textAnchor="middle" style={{fontSize:10,fill:C.muted,fontFamily:"inherit"}}>{sel.pct}% of spend</text>
            <text x={CX} y={CY+20} textAnchor="middle" style={{fontSize:19,fontWeight:700,fill:sel.color,fontFamily:"Georgia,serif"}}>{fmt(sel.total)}</text>
            <text x={CX} y={CY+36} textAnchor="middle" style={{fontSize:10,fill:sel.color,fontWeight:600,fontFamily:"inherit"}}>{sel.name}</text>
          </>
        ) : topCat ? (
          <>
            <text x={CX} y={CY-22} textAnchor="middle" style={{fontSize:9,fill:C.muted,fontFamily:"inherit",letterSpacing:"0.5px"}}>TOP SPEND</text>
            <text x={CX} y={CY-6} textAnchor="middle" style={{fontSize:18,fontFamily:"inherit"}}>{topCat.icon}</text>
            <text x={CX} y={CY+14} textAnchor="middle" style={{fontSize:17,fontWeight:700,fill:topCat.color,fontFamily:"Georgia,serif"}}>{fmt(topCat.total)}</text>
            <text x={CX} y={CY+30} textAnchor="middle" style={{fontSize:10,fill:C.muted,fontFamily:"inherit"}}>{topCat.name} · {topCat.pct}%</text>
          </>
        ) : (
          <>
            <text x={CX} y={CY-6} textAnchor="middle" style={{fontSize:10,fill:C.muted,fontFamily:"inherit"}}>Total Spent</text>
            <text x={CX} y={CY+16} textAnchor="middle" style={{fontSize:20,fontWeight:700,fill:C.ink,fontFamily:"Georgia,serif"}}>{fmt(grandTotal)}</text>
          </>
        )}
      </svg>
    </div>
  );
}

// ── Drill-down ────────────────────────────────────────────────────────────────
function DrillDown({ cat, onClose }) {
  return(
    <div style={{background:"#fff",borderRadius:12,border:`1.5px solid ${cat.color}33`,marginTop:10,overflow:"hidden"}}>
      <div style={{padding:"9px 14px",background:`${cat.color}08`,borderBottom:`1px solid ${cat.color}18`,
                   display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>{cat.icon} {cat.name}</p>
          <p style={{margin:0,fontSize:10,color:C.muted}}>{cat.count} transaction{cat.count!==1?"s":""} · {cat.pct}% of spend</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <p style={{margin:0,fontSize:15,fontWeight:700,color:cat.color,fontFamily:"Georgia,serif"}}>{fmt(cat.total)}</p>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted,lineHeight:1}}>✕</button>
        </div>
      </div>
      {cat.items.map((e,i)=>(
        <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"8px 14px",borderBottom:i<cat.items.length-1?`1px solid ${C.bg}`:"none"}}>
          <div>
            <p style={{margin:0,fontSize:12,fontWeight:600,color:C.ink}}>{e.note||cat.name}</p>
            <p style={{margin:0,fontSize:10,color:C.muted}}>
              {new Date(e.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})} ·{" "}
              {new Date(e.date).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
            </p>
          </div>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:cat.color,fontFamily:"Georgia,serif"}}>{fmt(e.amount)}</p>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN — Donut + horizontal category bars + drill-down
// ═════════════════════════════════════════════════════════════════════════════
export default function SpendingChart({ expenses=[], monthlyIncome=0 }) {
  const [sel, setSel] = useState(null);
  const data       = useMemo(()=>aggregate(expenses),[expenses]);
  const grandTotal = useMemo(()=>expenses.reduce((s,e)=>s+e.amount,0),[expenses]);
  const selCat     = data.find(d=>d.name===sel)||null;
  const toggle     = n=>setSel(p=>p===n?null:n);

  if(!data.length) return(
    <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,
                 textAlign:"center",padding:"40px 20px",marginBottom:12}}>
      <p style={{fontSize:32,margin:"0 0 8px"}}>📊</p>
      <p style={{color:C.muted,fontSize:13,margin:0}}>Log expenses to see your spending breakdown.</p>
    </div>
  );

  return(
    <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,
                 boxShadow:"0 1px 3px rgba(0,0,0,0.05)",overflow:"hidden",marginBottom:12}}>
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bg}`,
                   display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>Spending Breakdown</p>
          <p style={{margin:0,fontSize:10,color:C.muted}}>
            {data.length} categories · {expenses.length} expenses
            {monthlyIncome>0&&(
              <span style={{marginLeft:6,fontWeight:700,
                color:grandTotal>monthlyIncome?"#DC2626":"#16A34A"}}>
                · {Math.round((grandTotal/monthlyIncome)*100)}% of income
              </span>
            )}
          </p>
        </div>
        {sel&&<button onClick={()=>setSel(null)} style={{background:"none",border:`1px solid ${C.border}`,
          borderRadius:99,padding:"3px 10px",fontSize:11,color:C.muted,cursor:"pointer",fontFamily:"inherit"}}>
          Clear ✕
        </button>}
      </div>

      <div style={{padding:"14px"}}>
        {/* Donut centered */}
        <Donut data={data} grandTotal={grandTotal} selected={sel} onSelect={toggle}/>

        {/* Legend dots — centered, clickable */}
        <div style={{display:"flex",flexWrap:"wrap",gap:"5px 10px",justifyContent:"center",marginBottom:16}}>
          {data.map(d=>(
            <button key={d.name} onClick={()=>toggle(d.name)} style={{
              display:"flex",alignItems:"center",gap:4,background:"none",border:"none",
              cursor:"pointer",padding:"3px 6px",fontFamily:"inherit",borderRadius:99,
              opacity:sel&&sel!==d.name?0.3:1,transition:"opacity 0.18s",
              background:sel===d.name?`${d.color}12`:"transparent",
            }}>
              <div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/>
              <span style={{fontSize:10,color:sel===d.name?d.color:C.muted,
                            fontWeight:sel===d.name?700:400}}>{d.name}</span>
            </button>
          ))}
        </div>

        {/* Drill-down (shown when category selected) */}
        {selCat&&<DrillDown cat={selCat} onClose={()=>setSel(null)}/>}

        {/* Category list — full width horizontal bars */}
        {!selCat&&(
          <div style={{borderTop:`1px solid ${C.bg}`,paddingTop:12,display:"flex",flexDirection:"column",gap:10}}>
            {data.map(d=>{
              const isActive=sel===d.name;
              return(
                <div key={d.name} onClick={()=>toggle(d.name)}
                  style={{cursor:"pointer",padding:"6px 8px",borderRadius:9,
                          background:isActive?`${d.color}08`:"transparent",
                          transition:"background 0.15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:28,height:28,borderRadius:7,background:`${d.color}15`,
                                   display:"flex",alignItems:"center",justifyContent:"center",
                                   fontSize:15,flexShrink:0,
                                   border:isActive?`1.5px solid ${d.color}40`:"1.5px solid transparent"}}>
                        {d.icon}
                      </div>
                      <div>
                        <p style={{margin:0,fontSize:12,fontWeight:isActive?700:600,color:C.ink}}>{d.name}</p>
                        <p style={{margin:0,fontSize:9,color:C.muted}}>
                          {d.count} txn{d.count!==1?"s":""} · avg {fmt(Math.round(d.total/d.count))}
                        </p>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <p style={{margin:0,fontSize:14,fontWeight:700,color:d.color,fontFamily:"Georgia,serif"}}>{fmt(d.total)}</p>
                      <p style={{margin:0,fontSize:9,color:C.muted}}>{d.pct}% of spend</p>
                    </div>
                  </div>
                  <div style={{height:4,borderRadius:99,background:C.bg,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:99,width:`${d.pct}%`,background:d.color,
                                 opacity:sel&&!isActive?0.25:1,transition:"width 0.4s,opacity 0.18s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TREND CHART — 6-month bar chart, only shows when 2+ months have data
// ═════════════════════════════════════════════════════════════════════════════
export function TrendChart({ allExpenses, monthlyIncome=0 }) {
  const months = useMemo(()=>{
    const now=new Date(), result=[];
    for(let i=5;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const total=Math.round((allExpenses[key]||[]).reduce((s,e)=>s+e.amount,0));
      result.push({key,label:d.toLocaleDateString("en-IN",{month:"short"}),total,isCurrent:i===0});
    }
    return result;
  },[allExpenses]);

  const withData=months.filter(m=>m.total>0);
  // Only show when at least 2 months have data
  if(withData.length<2) return null;

  const maxVal=Math.max(...months.map(m=>m.total),monthlyIncome||1);
  const avgSpend=Math.round(withData.reduce((s,m)=>s+m.total,0)/withData.length);
  const last2=withData.slice(-2);
  const momChange=last2.length===2?last2[1].total-last2[0].total:null;

  return(
    <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,
                 boxShadow:"0 1px 3px rgba(0,0,0,0.05)",padding:"12px 14px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>Monthly Trend</p>
          <p style={{margin:0,fontSize:10,color:C.muted}}>6-month history · avg {fmt2(avgSpend)}/month</p>
        </div>
        {momChange!==null&&(
          <span style={{
            fontSize:11,fontWeight:700,flexShrink:0,
            color:momChange>0?"#DC2626":"#16A34A",
            background:momChange>0?"#FFF1F2":"#F0FDF4",
            border:`1px solid ${momChange>0?"#FECACA":"#86EFAC"}`,
            borderRadius:99,padding:"3px 10px",
          }}>
            {momChange>0?"▲":"▼"} {fmt2(Math.abs(momChange))} vs last
          </span>
        )}
      </div>

      <div style={{display:"flex",alignItems:"flex-end",gap:6,height:90}}>
        {months.map(m=>{
          const barH=m.total>0?Math.max(Math.round((m.total/maxVal)*80),4):0;
          const isOver=monthlyIncome>0&&m.total>monthlyIncome;
          return(
            <div key={m.key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <p style={{margin:0,fontSize:8,color:m.isCurrent?C.ink:C.muted,
                         fontWeight:m.isCurrent?700:400,whiteSpace:"nowrap"}}>
                {m.total>0?fmt2(m.total):""}
              </p>
              <div style={{width:"100%",flex:1,display:"flex",alignItems:"flex-end"}}>
                <div style={{
                  width:"100%",height:barH||2,
                  background:m.isCurrent
                    ? isOver?"#DC2626":"#2563EB"
                    : isOver?"#FCA5A5":"#CBD5E1",
                  borderRadius:"4px 4px 0 0",
                  transition:"height 0.45s",
                }}/>
              </div>
              <p style={{margin:0,fontSize:9,fontWeight:m.isCurrent?700:400,
                         color:m.isCurrent?C.ink:C.muted}}>{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Reference lines */}
      <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:"4px 16px"}}>
        {avgSpend>0&&(
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:14,height:2,background:"#94A3B8",borderRadius:99}}/>
            <span style={{fontSize:9,color:C.muted}}>Avg {fmt2(avgSpend)}</span>
          </div>
        )}
        {monthlyIncome>0&&(
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:14,height:2,background:"#EF4444",borderRadius:99}}/>
            <span style={{fontSize:9,color:C.muted}}>Income {fmt2(monthlyIncome)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CATEGORY HISTORY — only shows when 2+ months of data exist for that category
// Compact horizontal bars per category
// ═════════════════════════════════════════════════════════════════════════════
export function CategoryHistoryChart({ allExpenses }) {
  const [selCat, setSelCat] = useState(null);

  const { months, rows } = useMemo(()=>{
    const now=new Date(), months=[];
    for(let i=3;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      months.push({key,label:d.toLocaleDateString("en-IN",{month:"short"}),isCurrent:i===0});
    }
    // Build per-category data
    const catMap={};
    months.forEach(m=>{
      (allExpenses[m.key]||[]).forEach(e=>{
        if(!catMap[e.label]) catMap[e.label]={};
        catMap[e.label][m.key]=(catMap[e.label][m.key]||0)+e.amount;
      });
    });
    // Only include categories with data in 2+ months
    const rows=Object.entries(catMap)
      .map(([cat,vals])=>{
        const totals=months.map(m=>Math.round(vals[m.key]||0));
        const monthsWithData=totals.filter(v=>v>0).length;
        const total=totals.reduce((s,v)=>s+v,0);
        return{cat,totals,monthsWithData,total,
               icon:CATEGORY_CONFIG[cat]?.icon||"💸",
               color:CATEGORY_CONFIG[cat]?.color||"#6B7280"};
      })
      .filter(r=>r.monthsWithData>=2)  // ← KEY: only show if 2+ months
      .sort((a,b)=>b.total-a.total);
    return{months,rows};
  },[allExpenses]);

  // Don't render if no category has 2+ months of data
  if(rows.length===0) return null;

  const displayRows=selCat?rows.filter(r=>r.cat===selCat):rows;

  return(
    <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,
                 boxShadow:"0 1px 3px rgba(0,0,0,0.05)",overflow:"hidden",marginBottom:12}}>
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bg}`,
                   display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>Category Trends</p>
          <p style={{margin:0,fontSize:10,color:C.muted}}>
            {rows.length} categor{rows.length!==1?"ies":"y"} tracked across multiple months
          </p>
        </div>
        {selCat&&<button onClick={()=>setSelCat(null)} style={{background:"none",border:`1px solid ${C.border}`,
          borderRadius:99,padding:"3px 10px",fontSize:11,color:C.muted,cursor:"pointer",fontFamily:"inherit"}}>
          All ✕
        </button>}
      </div>

      {/* Category filter pills */}
      <div style={{padding:"8px 14px 0",display:"flex",gap:5,flexWrap:"wrap"}}>
        {rows.map(r=>{
          const active=selCat===r.cat;
          return(
            <button key={r.cat} onClick={()=>setSelCat(active?null:r.cat)} style={{
              display:"flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:99,
              fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
              border:`1.5px solid ${active?r.color:C.border}`,
              background:active?`${r.color}12`:"#fff",
              color:active?r.color:C.muted,
            }}>
              <span>{r.icon}</span>{r.cat}
            </button>
          );
        })}
      </div>

      <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:14}}>
        {displayRows.map(r=>{
          const maxVal=Math.max(...r.totals,1);
          const last2=r.totals.filter(v=>v>0).slice(-2);
          const trend=last2.length===2?last2[1]-last2[0]:null;
          return(
            <div key={r.cat}>
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:15}}>{r.icon}</span>
                  <span style={{fontSize:12,fontWeight:700,color:C.ink}}>{r.cat}</span>
                  {trend!==null&&(
                    <span style={{
                      fontSize:9,fontWeight:700,borderRadius:99,padding:"1px 7px",
                      background:trend>0?"#FFF1F2":"#F0FDF4",
                      border:`1px solid ${trend>0?"#FECACA":"#86EFAC"}`,
                      color:trend>0?"#DC2626":"#16A34A",
                    }}>
                      {trend>0?"▲":"▼"} {fmt2(Math.abs(trend))} vs last month
                    </span>
                  )}
                </div>
                <span style={{fontSize:11,fontWeight:700,color:r.color,fontFamily:"Georgia,serif"}}>
                  {fmt2(r.totals[r.totals.length-1]||0)} this month
                </span>
              </div>
              {/* Month bars — 4 columns */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
                {months.map((m,i)=>{
                  const val=r.totals[i]||0;
                  const barH=val>0?Math.max(Math.round((val/maxVal)*40),4):0;
                  return(
                    <div key={m.key} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <span style={{fontSize:8,color:m.isCurrent?C.ink:C.muted,fontWeight:m.isCurrent?700:400}}>
                        {val>0?fmt2(val):"—"}
                      </span>
                      <div style={{width:"100%",height:44,display:"flex",alignItems:"flex-end"}}>
                        <div style={{
                          width:"100%",height:barH||2,
                          background:val>0?(m.isCurrent?r.color:`${r.color}40`):"#E5E7EB",
                          borderRadius:"3px 3px 0 0",transition:"height 0.4s",
                        }}/>
                      </div>
                      <span style={{fontSize:9,color:m.isCurrent?C.ink:C.muted,
                                    fontWeight:m.isCurrent?700:400}}>{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
