// ─── LoansTab.jsx — Track loans, EMI burden, and interest savings ─────────
import { useState, useRef, useEffect } from "react";
import { calcEMI, calcLoanTotals, calcEarlyClosureImpact } from "./useAppData";

const C   = {ink:"#1C1917",muted:"#78716C",border:"#E7E5E0",bg:"#F7F5F0",red:"#DC2626",green:"#16A34A",amber:"#D97706",blue:"#2563EB",purple:"#7C3AED"};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const Lbl = ({children}) => <p style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,margin:"0 0 4px"}}>{children}</p>;

const LOAN_TYPES = ["Home Loan","Car Loan","Personal Loan","Gold Loan","Education Loan","Business Loan","Two-Wheeler Loan","Other"];

const LOAN_CSS = `
  .mc-loan-grid { display:grid; grid-template-columns:1fr; gap:14px; }
  @media(min-width:640px){ .mc-loan-grid { grid-template-columns:1fr 1fr; } }
  .mc-loan-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  @media(max-width:480px){ .mc-loan-form-grid { grid-template-columns:1fr; } }
`;

const inputStyle = (extra={}) => ({
  width:"100%", padding:"9px 11px", borderRadius:8,
  border:`1.5px solid ${C.border}`, fontFamily:"inherit",
  fontSize:13, background:"#fff", outline:"none",
  boxSizing:"border-box", ...extra,
});

// ── 3-dot menu (same pattern as rest of app) ─────────────────────────────
function DotMenu({onEdit,onDelete}) {
  const [open,setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{
    if(!open) return;
    const fn = e => { if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",fn);
    return ()=>document.removeEventListener("mousedown",fn);
  },[open]);
  return (
    <div ref={ref} style={{position:"relative",flexShrink:0}}>
      <button onClick={()=>setOpen(p=>!p)}
        style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:open?C.bg:"#fff",color:C.muted,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",lineHeight:1}}>
        ⋮</button>
      {open&&(
        <div style={{position:"absolute",right:0,top:32,zIndex:60,background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",minWidth:110,overflow:"hidden"}}>
          <button onClick={()=>{setOpen(false);onEdit();}}
            style={{display:"block",width:"100%",padding:"10px 14px",textAlign:"left",background:"none",border:"none",fontSize:13,color:C.ink,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}
            onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="none"}>
            ✏️ Edit</button>
          <div style={{height:1,background:C.border,margin:"0 8px"}}/>
          <button onClick={()=>{setOpen(false);onDelete();}}
            style={{display:"block",width:"100%",padding:"10px 14px",textAlign:"left",background:"none",border:"none",fontSize:13,color:C.red,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}
            onMouseEnter={e=>e.currentTarget.style.background="#FFF1F2"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
            🗑 Delete</button>
        </div>
      )}
    </div>
  );
}

// ── Thin bar ─────────────────────────────────────────────────────────────
function Bar({pct,color,height=4}) {
  return (
    <div style={{height,borderRadius:99,background:C.bg,overflow:"hidden"}}>
      <div style={{height:"100%",borderRadius:99,width:`${Math.min(pct,100)}%`,background:color,transition:"width 0.5s"}}/>
    </div>
  );
}

// ── Add / Edit loan form ──────────────────────────────────────────────────
function LoanForm({initial, onSave, onCancel}) {
  const today = new Date().toISOString().split("T")[0];
  const [f, setF] = useState({
    name:       initial?.name       || "Home Loan",
    principal:  initial?.principal  || "",
    rate:       initial?.rate       || "",
    tenureMonths: initial?.tenureMonths || "",
    emi:        initial?.emi        || "",   // optional override
    startDate:  initial?.startDate  || today,
  });
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  // Auto-compute EMI from fields
  const autoEmi = calcEMI(+f.principal, +f.rate, +f.tenureMonths);

  const save = () => {
    if(!f.name||!f.principal||!f.rate||!f.tenureMonths) return;
    onSave({
      name:f.name, principal:+f.principal, rate:+f.rate,
      tenureMonths:+f.tenureMonths,
      emi: +f.emi || autoEmi,
      startDate:f.startDate,
    });
  };

  return (
    <div style={{background:C.bg,borderRadius:12,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
      <p style={{fontSize:13,fontWeight:700,color:C.ink,margin:"0 0 12px"}}>
        {initial ? "Edit Loan" : "Add New Loan"}
      </p>
      <style>{LOAN_CSS}</style>
      <div className="mc-loan-form-grid">
        <div>
          <Lbl>Loan Type *</Lbl>
          <select value={f.name} onChange={e=>set("name",e.target.value)} style={inputStyle()}>
            {LOAN_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <Lbl>Loan Amount (₹) *</Lbl>
          <input type="number" placeholder="e.g. 500000" value={f.principal}
            onChange={e=>set("principal",e.target.value)} style={inputStyle({fontFamily:"Georgia,serif",fontSize:15})}/>
        </div>
        <div>
          <Lbl>Interest Rate (% per annum) *</Lbl>
          <input type="number" placeholder="e.g. 8.5" value={f.rate}
            onChange={e=>set("rate",e.target.value)} style={inputStyle()}/>
        </div>
        <div>
          <Lbl>Tenure (months) *</Lbl>
          <input type="number" placeholder="e.g. 240 for 20yr" value={f.tenureMonths}
            onChange={e=>set("tenureMonths",e.target.value)} style={inputStyle()}/>
        </div>
        <div>
          <Lbl>Monthly EMI (optional override)</Lbl>
          <input type="number" value={f.emi} placeholder={autoEmi>0?`Auto: ${fmt(autoEmi)}`:"Fill fields above"}
            onChange={e=>set("emi",e.target.value)} style={inputStyle({fontFamily:"Georgia,serif",fontSize:15})}/>
          {autoEmi>0&&!f.emi&&(
            <p style={{margin:"3px 0 0",fontSize:10,color:C.green}}>Calculated EMI: {fmt(autoEmi)}/month</p>
          )}
        </div>
        <div>
          <Lbl>Loan Start Date</Lbl>
          <input type="date" value={f.startDate} max={today}
            onChange={e=>set("startDate",e.target.value)} style={inputStyle()}/>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:14}}>
        <button onClick={onCancel}
          style={{flex:1,padding:"9px",borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",color:C.muted,fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>
          Cancel</button>
        <button onClick={save}
          style={{flex:2,padding:"9px",borderRadius:10,border:"none",background:C.ink,color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          Save Loan ✓</button>
      </div>
    </div>
  );
}

// ── Single loan card ──────────────────────────────────────────────────────
function LoanCard({loan, onEdit, onDelete}) {
  const [showInsight, setShowInsight] = useState(false);
  const t   = calcLoanTotals(loan);
  const imp = calcEarlyClosureImpact(loan, 1000);

  const LOAN_ICON = {
    "Home Loan":"🏠","Car Loan":"🚗","Personal Loan":"💳",
    "Gold Loan":"🥇","Education Loan":"🎓","Business Loan":"🏢",
    "Two-Wheeler Loan":"🛵","Other":"🏦",
  };
  const icon   = LOAN_ICON[loan.name] || "🏦";
  const color  = t.paidPct < 30 ? C.red : t.paidPct < 70 ? C.amber : C.green;

  return (
    <div style={{background:"#fff",borderRadius:13,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.bg}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flex:1,minWidth:0}}>
          <div style={{width:38,height:38,borderRadius:10,background:`${C.blue}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
            {icon}
          </div>
          <div style={{minWidth:0}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>{loan.name}</p>
            <p style={{margin:0,fontSize:10,color:C.muted}}>
              {loan.rate}% p.a. · {loan.tenureMonths} months
            </p>
          </div>
        </div>
        <DotMenu onEdit={onEdit} onDelete={onDelete}/>
      </div>

      {/* Key metrics */}
      <div style={{padding:"12px 14px"}}>
        {/* Outstanding + EMI */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
          {[
            {label:"Outstanding",  value:fmt(t.outstanding),   color:C.red},
            {label:"Monthly EMI",  value:fmt(t.emi),           color:C.ink},
            {label:"Total Interest",value:fmt(t.totalInterest),color:C.amber},
          ].map(m=>(
            <div key={m.label} style={{background:C.bg,borderRadius:8,padding:"8px 10px"}}>
              <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:600}}>{m.label}</p>
              <p style={{margin:"3px 0 0",fontSize:13,fontWeight:700,color:m.color,fontFamily:"Georgia,serif"}}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar: Paid vs Outstanding */}
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <p style={{margin:0,fontSize:10,color:C.muted}}>
              Paid: <span style={{color:C.green,fontWeight:700}}>{fmt(t.paidAmt)}</span>
            </p>
            <p style={{margin:0,fontSize:10,color:C.muted}}>
              Remaining: <span style={{color:C.red,fontWeight:700}}>{fmt(t.outstanding)}</span>
            </p>
          </div>
          <Bar pct={t.paidPct} color={color} height={6}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
            <p style={{margin:0,fontSize:9,color:C.green}}>{t.paidPct}% paid</p>
            <p style={{margin:0,fontSize:9,color:C.muted}}>{t.monthsLeft} months left</p>
          </div>
        </div>

        {/* Smart insight toggle */}
        <button onClick={()=>setShowInsight(p=>!p)}
          style={{width:"100%",padding:"7px",borderRadius:8,border:`1px solid ${C.blue}44`,background:`${C.blue}08`,color:C.blue,fontFamily:"inherit",fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
          💡 {showInsight?"Hide insight":"See how to close faster →"}
        </button>

        {showInsight&&(
          <div style={{marginTop:10,padding:"10px 12px",borderRadius:10,background:"#EFF6FF",border:`1px solid ${C.blue}33`}}>
            <p style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:C.blue}}>
              If you increase EMI by ₹1,000/month:
            </p>
            {imp.savedMonths > 0 ? (
              <>
                <div style={{display:"flex",gap:14}}>
                  {[
                    {label:"Close earlier",value:`${imp.savedMonths} months`},
                    {label:"Interest saved",value:fmt(imp.savedInterest)},
                  ].map(r=>(
                    <div key={r.label}>
                      <p style={{margin:0,fontSize:9,color:C.blue,textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:600}}>{r.label}</p>
                      <p style={{margin:"2px 0 0",fontSize:14,fontWeight:700,color:C.blue,fontFamily:"Georgia,serif"}}>{r.value}</p>
                    </div>
                  ))}
                </div>
                <p style={{margin:"8px 0 0",fontSize:10,color:C.muted}}>
                  New EMI would be {fmt(t.emi+1000)}/month. Small increases make a big difference over time.
                </p>
              </>
            ) : (
              <p style={{margin:0,fontSize:12,color:C.muted}}>This loan is almost done — great work! 🎉</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Loans Tab ────────────────────────────────────────────────────────
export default function LoansTab({loans, onAdd, onUpdate, onDelete}) {
  const [showForm, setShowForm]   = useState(false);
  const [editId,   setEditId]     = useState(null);

  const totalEmi         = loans.reduce((s,l)=>s+calcLoanTotals(l).emi, 0);
  const totalOutstanding = loans.reduce((s,l)=>s+calcLoanTotals(l).outstanding, 0);
  const totalInterest    = loans.reduce((s,l)=>s+calcLoanTotals(l).totalInterest, 0);

  const handleSave = (data) => {
    if(editId !== null) { onUpdate(editId, data); setEditId(null); }
    else                { onAdd(data); }
    setShowForm(false);
  };

  return (
    <div>
      <style>{LOAN_CSS}</style>

      {/* ── Summary strip ── */}
      {loans.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
          {[
            {label:"Total Outstanding", value:fmt(totalOutstanding), color:C.red,    icon:"💰"},
            {label:"Monthly EMI",       value:fmt(totalEmi),         color:C.ink,    icon:"📅"},
            {label:"Total Interest",    value:fmt(totalInterest),    color:C.amber,  icon:"📈"},
          ].map(s=>(
            <div key={s.label} style={{background:"#fff",borderRadius:11,border:`1px solid ${C.border}`,padding:"10px 12px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:12}}>{s.icon}</span>
                <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:600,lineHeight:1.2}}>{s.label}</p>
              </div>
              <p style={{margin:"4px 0 0",fontSize:15,fontWeight:700,color:s.color,fontFamily:"Georgia,serif"}}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Add loan button / form ── */}
      {showForm || editId!==null ? (
        <LoanForm
          key={editId ?? "new"}
          initial={editId!==null ? loans.find(l=>l.id===editId) : undefined}
          onSave={handleSave}
          onCancel={()=>{setShowForm(false);setEditId(null);}}
        />
      ) : (
        <button onClick={()=>setShowForm(true)}
          style={{width:"100%",padding:"10px",borderRadius:10,border:`1.5px dashed ${C.border}`,background:"transparent",color:C.muted,fontSize:13,fontFamily:"inherit",cursor:"pointer",fontWeight:600,marginBottom:14}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.ink;e.currentTarget.style.color=C.ink;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
          + Add Loan
        </button>
      )}

      {/* ── Loan cards grid ── */}
      {loans.length === 0 && !showForm ? (
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,textAlign:"center",padding:"40px 20px"}}>
          <p style={{fontSize:32,margin:"0 0 8px"}}>🏦</p>
          <p style={{color:C.muted,fontSize:13,margin:"0 0 4px",fontWeight:600}}>No loans added yet</p>
          <p style={{color:C.muted,fontSize:12,margin:0}}>Track your home loan, car loan, personal loan and more.</p>
        </div>
      ) : (
        <div className="mc-loan-grid">
          {loans.map(loan=>(
            <LoanCard key={loan.id} loan={loan}
              onEdit={()=>{setEditId(loan.id);setShowForm(false);}}
              onDelete={()=>{if(window.confirm(`Delete "${loan.name}"?`))onDelete(loan.id);}}/>
          ))}
        </div>
      )}
    </div>
  );
}
