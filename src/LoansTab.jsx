// ─── LoansTab.jsx — Improved UX: amount-in-words, year+month tenure,
//     live EMI preview, total payment, rich progress, completion date ────────
import { useState, useRef, useEffect } from "react";
import { calcEMI, calcLoanTotals, calcEarlyClosureImpact } from "./useAppData";

const C   = {ink:"#1C1917",muted:"#78716C",border:"#E7E5E0",bg:"#F7F5F0",red:"#DC2626",green:"#16A34A",amber:"#D97706",blue:"#2563EB",purple:"#7C3AED"};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const Lbl = ({children,req}) => (
  <p style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,margin:"0 0 4px"}}>
    {children}{req&&<span style={{color:C.red}}> *</span>}
  </p>
);

const LOAN_TYPES = ["Home Loan","Car Loan","Personal Loan","Gold Loan","Education Loan","Business Loan","Two-Wheeler Loan","Other"];
const LOAN_ICON  = {"Home Loan":"🏠","Car Loan":"🚗","Personal Loan":"💳","Gold Loan":"🥇","Education Loan":"🎓","Business Loan":"🏢","Two-Wheeler Loan":"🛵","Other":"🏦"};

const LOAN_CSS = `
  .mc-loan-grid { display:grid; grid-template-columns:1fr; gap:14px; }
  @media(min-width:640px){ .mc-loan-grid { grid-template-columns:1fr 1fr; } }
  .mc-loan-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  @media(max-width:480px){ .mc-loan-form-grid { grid-template-columns:1fr; } }
`;

const inp = (extra={}) => ({
  width:"100%", padding:"9px 11px", borderRadius:8,
  border:`1.5px solid ${C.border}`, fontFamily:"inherit",
  fontSize:13, background:"#fff", outline:"none",
  boxSizing:"border-box", ...extra,
});

// ── Amount in Indian words ────────────────────────────────────────────────
function amountInWords(n) {
  if (!n || isNaN(n) || n <= 0) return "";
  const num = Math.round(+n);
  if (num >= 1e7)  return `${(num/1e7).toFixed(num%1e7===0?0:2)} Crore Rupees`;
  if (num >= 1e5)  return `${(num/1e5).toFixed(num%1e5===0?0:2)} Lakh Rupees`;
  if (num >= 1e3)  return `${(num/1e3).toFixed(num%1e3===0?0:1)} Thousand Rupees`;
  return `${num} Rupees`;
}

// ── Tenure display helper ─────────────────────────────────────────────────
function tenureLabel(months) {
  if (!months) return "";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y && m) return `${y} yr ${m} mo`;
  if (y)      return `${y} year${y>1?"s":""}`;
  return `${m} month${m>1?"s":""}`;
}

// ── Completion date from start + tenure ──────────────────────────────────
function completionDate(startDate, tenureMonths) {
  if (!startDate || !tenureMonths) return null;
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + +tenureMonths);
  return d.toLocaleDateString("en-IN", {month:"long", year:"numeric"});
}

// ── 3-dot menu ────────────────────────────────────────────────────────────
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
        style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:open?C.bg:"#fff",color:C.muted,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",lineHeight:1}}>⋮</button>
      {open&&(
        <div style={{position:"absolute",right:0,top:32,zIndex:60,background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",minWidth:110,overflow:"hidden"}}>
          <button onClick={()=>{setOpen(false);onEdit();}}
            style={{display:"block",width:"100%",padding:"10px 14px",textAlign:"left",background:"none",border:"none",fontSize:13,color:C.ink,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}
            onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="none"}>✏️ Edit</button>
          <div style={{height:1,background:C.border,margin:"0 8px"}}/>
          <button onClick={()=>{setOpen(false);onDelete();}}
            style={{display:"block",width:"100%",padding:"10px 14px",textAlign:"left",background:"none",border:"none",fontSize:13,color:C.red,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}
            onMouseEnter={e=>e.currentTarget.style.background="#FFF1F2"} onMouseLeave={e=>e.currentTarget.style.background="none"}>🗑 Delete</button>
        </div>
      )}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────
function Bar({pct,color,height=5}) {
  return (
    <div style={{height,borderRadius:99,background:C.border,overflow:"hidden"}}>
      <div style={{height:"100%",borderRadius:99,width:`${Math.min(pct,100)}%`,background:color,transition:"width 0.5s"}}/>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// LOAN FORM — years+months tenure, amount-in-words, live EMI preview
// ═════════════════════════════════════════════════════════════════════════
function LoanForm({initial, onSave, onCancel}) {
  const today = new Date().toISOString().split("T")[0];

  // Split stored tenureMonths back into years+months for display
  const initYears  = initial?.tenureMonths ? Math.floor(initial.tenureMonths/12) : "";
  const initMonths = initial?.tenureMonths ? initial.tenureMonths % 12 : "";

  const [f, setF] = useState({
    name:       initial?.name      || "Home Loan",
    principal:  initial?.principal || "",
    rate:       initial?.rate      || "",
    tenureYears:  String(initYears),
    tenureMonths: String(initMonths),
    emiOverride:  initial?.emi && initial.emi !== calcEMI(initial.principal,initial.rate,initial.tenureMonths)
                    ? String(initial.emi) : "",
    startDate:  initial?.startDate || today,
  });
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  // Total months from years + months inputs
  const totalMonths = (parseInt(f.tenureYears)||0)*12 + (parseInt(f.tenureMonths)||0);
  const autoEmi     = calcEMI(+f.principal, +f.rate, totalMonths);
  const displayEmi  = +f.emiOverride || autoEmi;
  const words       = amountInWords(f.principal);

  const valid = f.name && +f.principal > 0 && +f.rate > 0 && totalMonths > 0;

  const save = () => {
    if (!valid) return;
    onSave({
      name: f.name,
      principal: +f.principal,
      rate: +f.rate,
      tenureMonths: totalMonths,
      emi: displayEmi,
      startDate: f.startDate,
    });
  };

  return (
    <div style={{background:C.bg,borderRadius:12,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
      <p style={{fontSize:13,fontWeight:700,color:C.ink,margin:"0 0 14px"}}>
        {initial ? "✏️ Edit Loan" : "🏦 Add New Loan"}
      </p>
      <style>{LOAN_CSS}</style>

      <div className="mc-loan-form-grid">

        {/* Loan type */}
        <div>
          <Lbl req>Loan Type</Lbl>
          <select value={f.name} onChange={e=>set("name",e.target.value)} style={inp()}>
            {LOAN_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Loan amount + words */}
        <div>
          <Lbl req>Loan Amount (₹)</Lbl>
          <input type="number" placeholder="e.g. 500000" value={f.principal}
            onChange={e=>set("principal",e.target.value)}
            style={inp({fontFamily:"Georgia,serif",fontSize:15})}/>
          {words && (
            <p style={{margin:"4px 0 0",fontSize:11,color:C.blue,fontWeight:600}}>
              📝 {words}
            </p>
          )}
        </div>

        {/* Interest rate */}
        <div>
          <Lbl req>Interest Rate (% p.a.)</Lbl>
          <input type="number" step="0.1" placeholder="e.g. 8.5" value={f.rate}
            onChange={e=>set("rate",e.target.value)} style={inp()}/>
        </div>

        {/* Tenure — years + months side by side */}
        <div>
          <Lbl req>Loan Tenure</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <div>
              <input type="number" min="0" max="30" placeholder="Years" value={f.tenureYears}
                onChange={e=>set("tenureYears",e.target.value)} style={inp()}/>
              <p style={{margin:"2px 0 0",fontSize:9,color:C.muted,textAlign:"center"}}>Years</p>
            </div>
            <div>
              <input type="number" min="0" max="11" placeholder="Months" value={f.tenureMonths}
                onChange={e=>set("tenureMonths",e.target.value)} style={inp()}/>
              <p style={{margin:"2px 0 0",fontSize:9,color:C.muted,textAlign:"center"}}>Months</p>
            </div>
          </div>
          {totalMonths > 0 && (
            <p style={{margin:"4px 0 0",fontSize:11,color:C.muted}}>= {totalMonths} months total</p>
          )}
        </div>

        {/* EMI — auto-calculated, optional override */}
        <div>
          <Lbl>Monthly EMI (auto-calculated)</Lbl>
          {autoEmi > 0 && (
            <div style={{padding:"8px 10px",borderRadius:8,background:"#F0FDF4",border:"1px solid #86EFAC",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{margin:0,fontSize:11,color:C.green,fontWeight:600}}>Calculated EMI</p>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:C.green,fontFamily:"Georgia,serif"}}>{fmt(autoEmi)}/mo</p>
            </div>
          )}
          <input type="number" value={f.emiOverride}
            placeholder={autoEmi>0?`Override (default: ${fmt(autoEmi)})`:"Fill fields above"}
            onChange={e=>set("emiOverride",e.target.value)}
            style={inp({fontFamily:"Georgia,serif",fontSize:14})}/>
          {f.emiOverride && +f.emiOverride !== autoEmi && autoEmi>0 && (
            <p style={{margin:"3px 0 0",fontSize:10,color:C.amber}}>⚠ Using your override: {fmt(+f.emiOverride)}/mo</p>
          )}
        </div>

        {/* Start date */}
        <div>
          <Lbl>Loan Start Date</Lbl>
          <input type="date" value={f.startDate} max={today}
            onChange={e=>set("startDate",e.target.value)} style={inp()}/>
          {f.startDate && totalMonths > 0 && (
            <p style={{margin:"4px 0 0",fontSize:11,color:C.muted}}>
              📅 Completes: {completionDate(f.startDate, totalMonths)}
            </p>
          )}
        </div>

      </div>

      {/* Live summary before saving */}
      {valid && displayEmi > 0 && (
        <div style={{marginTop:12,padding:"10px 14px",borderRadius:10,background:"#fff",border:`1px solid ${C.border}`,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {[
            {label:"Monthly EMI",     value:fmt(displayEmi),                                    color:C.ink},
            {label:"Total Interest",  value:fmt(displayEmi*totalMonths - +f.principal),           color:C.amber},
            {label:"Total Payment",   value:fmt(displayEmi*totalMonths),                         color:C.red},
          ].map(s=>(
            <div key={s.label} style={{textAlign:"center"}}>
              <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.7px",fontWeight:600}}>{s.label}</p>
              <p style={{margin:"3px 0 0",fontSize:13,fontWeight:700,color:s.color,fontFamily:"Georgia,serif"}}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{display:"flex",gap:10,marginTop:14}}>
        <button onClick={onCancel}
          style={{flex:1,padding:"9px",borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",color:C.muted,fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>
          Cancel</button>
        <button onClick={save} disabled={!valid}
          style={{flex:2,padding:"9px",borderRadius:10,border:"none",background:valid?C.ink:"#9CA3AF",color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:valid?"pointer":"not-allowed"}}>
          Save Loan ✓</button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// LOAN CARD — total payment, rich progress, completion date, insight
// ═════════════════════════════════════════════════════════════════════════
function LoanCard({loan, onEdit, onDelete}) {
  const [showInsight, setShowInsight] = useState(false);
  const t   = calcLoanTotals(loan);
  const imp = calcEarlyClosureImpact(loan, 1000);

  const icon        = LOAN_ICON[loan.name] || "🏦";
  const barColor    = t.paidPct < 30 ? C.red : t.paidPct < 70 ? C.amber : C.green;
  const endDate     = completionDate(loan.startDate, loan.tenureMonths);

  return (
    <div style={{background:"#fff",borderRadius:13,border:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden"}}>

      {/* ── Header ── */}
      <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.bg}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flex:1,minWidth:0}}>
          <div style={{width:40,height:40,borderRadius:10,background:`${C.blue}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
            {icon}
          </div>
          <div style={{minWidth:0}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>{loan.name}</p>
            <p style={{margin:0,fontSize:10,color:C.muted}}>
              {loan.rate}% p.a. · {tenureLabel(loan.tenureMonths)}
              {endDate && <span style={{color:C.purple}}> · until {endDate}</span>}
            </p>
          </div>
        </div>
        <DotMenu onEdit={onEdit} onDelete={onDelete}/>
      </div>

      <div style={{padding:"12px 14px"}}>

        {/* ── 4 metric tiles: Outstanding, EMI, Interest, Total Payment ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:12}}>
          {[
            {label:"Outstanding",   value:fmt(t.outstanding),              color:C.red},
            {label:"Monthly EMI",   value:fmt(t.emi),                      color:C.ink},
            {label:"Total Interest",value:fmt(t.totalInterest),            color:C.amber},
            {label:"Total Payment", value:fmt(t.totalPayable),             color:C.purple},
          ].map(m=>(
            <div key={m.label} style={{background:C.bg,borderRadius:8,padding:"8px 10px"}}>
              <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.7px",fontWeight:600}}>{m.label}</p>
              <p style={{margin:"3px 0 0",fontSize:13,fontWeight:700,color:m.color,fontFamily:"Georgia,serif"}}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* ── Progress: paid vs total payable ── */}
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5}}>
            <div>
              <p style={{margin:0,fontSize:11,fontWeight:600,color:C.ink}}>Repayment Progress</p>
              <p style={{margin:"1px 0 0",fontSize:10,color:C.muted}}>
                <span style={{color:barColor,fontWeight:700}}>{fmt(t.paidAmt)}</span>
                {" paid of "}
                <span style={{fontWeight:600}}>{fmt(t.totalPayable)}</span>
              </p>
            </div>
            <div style={{textAlign:"right"}}>
              <p style={{margin:0,fontSize:16,fontWeight:700,color:barColor,fontFamily:"Georgia,serif"}}>{t.paidPct}%</p>
              <p style={{margin:0,fontSize:9,color:C.muted}}>completed</p>
            </div>
          </div>
          <Bar pct={t.paidPct} color={barColor} height={7}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
            <p style={{margin:0,fontSize:9,color:C.muted}}>
              {t.monthsLeft} month{t.monthsLeft!==1?"s":""} remaining
            </p>
            <p style={{margin:0,fontSize:9,color:C.muted}}>
              Loan amount: {fmt(loan.principal)}
            </p>
          </div>
        </div>

        {/* ── Close Loan Faster button ── */}
        <button onClick={()=>setShowInsight(p=>!p)}
          style={{
            width:"100%", padding:"8px", borderRadius:8,
            border:`1.5px solid ${C.blue}44`, background: showInsight?`${C.blue}12`:`${C.blue}06`,
            color:C.blue, fontFamily:"inherit", fontSize:12, fontWeight:700,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          }}>
          <span>💡</span>
          <span>{showInsight ? "Hide Insight" : "Close Loan Faster"}</span>
        </button>

        {/* ── Insight panel ── */}
        {showInsight && (
          <div style={{marginTop:10,padding:"12px 14px",borderRadius:10,background:"#EFF6FF",border:`1px solid ${C.blue}30`}}>
            {imp.savedMonths > 0 ? (
              <>
                <p style={{margin:"0 0 10px",fontSize:12,color:C.ink,lineHeight:1.6}}>
                  If you increase your EMI by{" "}
                  <strong style={{color:C.blue}}>₹1,000/month</strong>{" "}
                  (new EMI: <strong>{fmt(t.emi+1000)}</strong>):
                </p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  {[
                    {label:"Close Earlier",    value:`${imp.savedMonths} month${imp.savedMonths!==1?"s":""}`, color:C.green, icon:"⏩"},
                    {label:"Interest Saved",   value:fmt(imp.savedInterest),                                  color:C.green, icon:"💰"},
                  ].map(r=>(
                    <div key={r.label} style={{background:"#fff",borderRadius:8,padding:"8px 10px",border:`1px solid ${C.blue}22`}}>
                      <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.7px",fontWeight:600}}>{r.icon} {r.label}</p>
                      <p style={{margin:"3px 0 0",fontSize:15,fontWeight:700,color:r.color,fontFamily:"Georgia,serif"}}>{r.value}</p>
                    </div>
                  ))}
                </div>
                <p style={{margin:0,fontSize:10,color:C.muted,lineHeight:1.5}}>
                  Even a small increase in EMI reduces the principal faster, cutting total interest significantly over time.
                </p>
              </>
            ) : (
              <p style={{margin:0,fontSize:12,color:C.muted}}>
                🎉 This loan is almost fully repaid — great work!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// MAIN LOANS TAB
// ═════════════════════════════════════════════════════════════════════════
export default function LoansTab({loans, onAdd, onUpdate, onDelete}) {
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);

  const totalEmi         = loans.reduce((s,l)=>s+calcLoanTotals(l).emi, 0);
  const totalOutstanding = loans.reduce((s,l)=>s+calcLoanTotals(l).outstanding, 0);
  const totalInterest    = loans.reduce((s,l)=>s+calcLoanTotals(l).totalInterest, 0);

  const handleSave = (data) => {
    if (editId !== null) { onUpdate(editId, data); setEditId(null); }
    else                 { onAdd(data); }
    setShowForm(false);
  };

  return (
    <div>
      <style>{LOAN_CSS}</style>

      {/* ── Summary strip ── */}
      {loans.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
          {[
            {label:"Total Outstanding", value:fmt(totalOutstanding), color:C.red,   icon:"💰"},
            {label:"Monthly EMI",       value:fmt(totalEmi),         color:C.ink,   icon:"📅"},
            {label:"Total Interest",    value:fmt(totalInterest),    color:C.amber, icon:"📈"},
          ].map(s=>(
            <div key={s.label} style={{background:"#fff",borderRadius:11,border:`1px solid ${C.border}`,padding:"10px 12px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                <span style={{fontSize:12}}>{s.icon}</span>
                <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:600,lineHeight:1.2}}>{s.label}</p>
              </div>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:s.color,fontFamily:"Georgia,serif"}}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Add button / form ── */}
      {(showForm || editId!==null) ? (
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

      {/* ── Loan cards ── */}
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
