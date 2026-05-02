// ─── LoansTab.jsx ─────────────────────────────────────────────────────────────
// Fixes: tenure years-only, correct interest-saved via amortization,
// multi-option insights (+500/+1000/+2000), custom extra EMI, completion dates,
// progress vs original principal, clean wording.
// ──────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
import { calcEMI, calcLoanTotals, calcEarlyClosureImpact } from "./useAppData";

const C = { ink:"#111827", muted:"#6B7280", border:"#E5E7EB", bg:"#F8FAFC",
            red:"#DC2626", green:"#16A34A", amber:"#D97706", blue:"#2563EB", purple:"#7C3AED" };
const fmt   = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const moSfx = (n) => `${n} month${n !== 1 ? "s" : ""}`;

const LOAN_TYPES = ["Home Loan","Car Loan","Personal Loan","Gold Loan",
                    "Education Loan","Business Loan","Two-Wheeler Loan","Other"];
const LOAN_ICON  = { "Home Loan":"🏠","Car Loan":"🚗","Personal Loan":"💳","Gold Loan":"🥇",
                     "Education Loan":"🎓","Business Loan":"🏢","Two-Wheeler Loan":"🛵","Other":"🏦" };
const QUICK_EXTRAS = [500, 1000, 2000];

const LOAN_CSS = `
  .mc-loan-grid       { display:grid; grid-template-columns:1fr; gap:14px; }
  .mc-loan-form-grid  { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .mc-insight-opts    { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  @media(min-width:640px){ .mc-loan-grid { grid-template-columns:1fr 1fr; } }
  @media(max-width:480px){
    .mc-loan-form-grid { grid-template-columns:1fr; }
    .mc-insight-opts   { grid-template-columns:1fr; }
  }
`;

const inp = (x={}) => ({ width:"100%", padding:"9px 11px", borderRadius:8,
  border:`1.5px solid ${C.border}`, fontFamily:"inherit",
  fontSize:16, background:"#fff", outline:"none", boxSizing:"border-box", ...x });

const Lbl = ({children, req}) => (
  <p style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,margin:"0 0 4px"}}>
    {children}{req&&<span style={{color:C.red}}> *</span>}
  </p>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function amountInWords(n) {
  if (!n || isNaN(n) || +n <= 0) return "";
  const v = Math.round(+n);
  if (v >= 1e7) return `${(v/1e7).toFixed(v%1e7===0?0:2)} Crore Rupees`;
  if (v >= 1e5) return `${(v/1e5).toFixed(v%1e5===0?0:2)} Lakh Rupees`;
  if (v >= 1e3) return `${(v/1e3).toFixed(v%1e3===0?0:1)} Thousand Rupees`;
  return `${v} Rupees`;
}
function tenureLabel(months) {
  if (!months) return "";
  const y = Math.floor(months/12), m = months%12;
  if (y && m) return `${y} yr ${m} mo`;
  if (y)      return `${y} year${y>1?"s":""}`;
  return `${m} month${m>1?"s":""}`;
}
function completionStr(startDate, tenureMonths) {
  if (!startDate || !tenureMonths) return null;
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + +tenureMonths);
  return d.toLocaleDateString("en-IN", {month:"long", year:"numeric"});
}

// ── DotMenu ───────────────────────────────────────────────────────────────────
function DotMenu({onEdit, onDelete}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);
  const btn = (danger) => ({
    display:"block", width:"100%", padding:"10px 14px", textAlign:"left",
    background:"none", border:"none", fontSize:13, color:danger?C.red:C.ink,
    cursor:"pointer", fontFamily:"inherit", fontWeight:500,
  });
  return (
    <div ref={ref} style={{position:"relative",flexShrink:0}}>
      <button onClick={()=>setOpen(p=>!p)}
        style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,
                background:open?C.bg:"#fff",color:C.muted,cursor:"pointer",fontSize:16,
                display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",lineHeight:1}}>⋮</button>
      {open && (
        <div style={{position:"absolute",right:0,top:32,zIndex:60,background:"#fff",
                     border:`1px solid ${C.border}`,borderRadius:10,
                     boxShadow:"0 4px 20px rgba(0,0,0,0.12)",minWidth:110,overflow:"hidden"}}>
          <button style={btn(false)} onClick={()=>{setOpen(false);onEdit();}}
            onMouseEnter={e=>e.currentTarget.style.background=C.bg}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>✏️ Edit</button>
          <div style={{height:1,background:C.border,margin:"0 8px"}}/>
          <button style={btn(true)} onClick={()=>{setOpen(false);onDelete();}}
            onMouseEnter={e=>e.currentTarget.style.background="#FFF1F2"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>🗑 Delete</button>
        </div>
      )}
    </div>
  );
}

function Bar({pct, color, height=5}) {
  return (
    <div style={{height,borderRadius:99,background:C.border,overflow:"hidden"}}>
      <div style={{height:"100%",borderRadius:99,width:`${Math.min(pct,100)}%`,background:color,transition:"width 0.6s"}}/>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LOAN FORM
// ═════════════════════════════════════════════════════════════════════════════
function LoanForm({initial, onSave, onCancel}) {
  const today    = new Date().toISOString().split("T")[0];
  const initYrs  = initial?.tenureMonths ? Math.floor(initial.tenureMonths/12) : "";
  const initMos  = initial?.tenureMonths ? initial.tenureMonths%12 : "";
  // When editing, pre-fill emiOverride only if it differs from the calculated EMI
  // so the user sees their actual stored EMI, not a blank field
  const initAutoEmi = initial ? calcEMI(initial.principal, initial.rate, initial.tenureMonths) : 0;
  const initOverride = (initial?.emi && initial.emi !== initAutoEmi) ? String(initial.emi) : "";

  const [f, setF] = useState({
    name:        initial?.name      || "Home Loan",
    principal:   initial?.principal || "",
    rate:        initial?.rate      || "",
    tenureYears: String(initYrs),
    tenureMos:   String(initMos),
    emiOverride: initOverride,
    startDate:   initial?.startDate || today,
  });
  const [tried, setTried] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const totalMonths = (parseInt(f.tenureYears)||0)*12 + (parseInt(f.tenureMos)||0);
  const autoEmi  = calcEMI(+f.principal, +f.rate, totalMonths);
  const useEmi   = +f.emiOverride > 0 ? +f.emiOverride : autoEmi;
  const words    = amountInWords(f.principal);
  const endDate  = completionStr(f.startDate, totalMonths);
  const valid    = f.name && +f.principal>0 && +f.rate>0 && totalMonths>0;
  const totalInt = Math.max(0, useEmi*totalMonths - +f.principal);

  const save = () => {
    setTried(true);
    if (!valid) return;
    onSave({ name:f.name, principal:+f.principal, rate:+f.rate,
             tenureMonths:totalMonths, emi:useEmi, startDate:f.startDate,
             needsDetails: false }); // clear flag when full details are entered
  };

  return (
    <div style={{background:C.bg,borderRadius:12,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
      <p style={{fontSize:13,fontWeight:700,color:C.ink,margin:"0 0 14px"}}>
        {initial?"✏️ Edit Loan":"🏦 Add New Loan"}
      </p>
      <style>{LOAN_CSS}</style>
      <div className="mc-loan-form-grid">

        <div>
          <Lbl req>Loan Type</Lbl>
          <select value={f.name} onChange={e=>set("name",e.target.value)} style={inp()}>
            {LOAN_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <Lbl req>Loan Amount (₹)</Lbl>
          <input type="number" placeholder="e.g. 500000" value={f.principal}
            onChange={e=>set("principal",e.target.value)}
            style={inp({fontFamily:"Georgia,serif",fontSize:15})}/>
          {words&&<p style={{margin:"4px 0 0",fontSize:11,color:C.blue,fontWeight:600}}>📝 {words}</p>}
        </div>

        <div>
          <Lbl req>Interest Rate (% p.a.)</Lbl>
          <input type="number" step="0.1" placeholder="e.g. 8.5" value={f.rate}
            onChange={e=>set("rate",e.target.value)} style={inp()}/>
        </div>

        {/* Tenure: years + months, months optional */}
        <div>
          <Lbl req>Loan Tenure</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <div>
              <input type="number" min="0" max="30" placeholder="Years"
                value={f.tenureYears} onChange={e=>set("tenureYears",e.target.value)} style={inp()}/>
              <p style={{margin:"2px 0 0",fontSize:9,color:C.muted,textAlign:"center"}}>Years</p>
            </div>
            <div>
              <input type="number" min="0" max="11" placeholder="0"
                value={f.tenureMos} onChange={e=>set("tenureMos",e.target.value)} style={inp()}/>
              <p style={{margin:"2px 0 0",fontSize:9,color:C.muted,textAlign:"center"}}>Extra Months</p>
            </div>
          </div>
          {totalMonths>0&&<p style={{margin:"4px 0 0",fontSize:11,color:C.muted}}>= {totalMonths} months total</p>}
        </div>

        <div>
          <Lbl>Monthly EMI</Lbl>
          {/* ── Calculated EMI — primary display ── */}
          {autoEmi>0 ? (
            <div style={{padding:"10px 12px",borderRadius:8,background:"#F0FDF4",
                         border:"1.5px solid #86EFAC",marginBottom:8}}>
              <p style={{margin:0,fontSize:10,color:C.green,fontWeight:700,
                         textTransform:"uppercase",letterSpacing:"0.8px"}}>Calculated EMI</p>
              <p style={{margin:"2px 0 0",fontSize:20,fontWeight:700,color:C.green,
                         fontFamily:"Georgia,serif",letterSpacing:"-0.3px"}}>
                {fmt(autoEmi)}<span style={{fontSize:12,fontWeight:500,color:C.green}}> / month</span>
              </p>
            </div>
          ) : (
            <div style={{padding:"9px 12px",borderRadius:8,background:C.bg,
                         border:`1px solid ${C.border}`,marginBottom:8}}>
              <p style={{margin:0,fontSize:11,color:C.muted}}>Fill loan amount, rate & tenure to auto-calculate</p>
            </div>
          )}
          {/* ── Optional override — visually smaller ── */}
          <p style={{margin:"0 0 4px",fontSize:10,color:C.muted,fontStyle:"italic"}}>
            Different actual EMI? Enter below (optional)
          </p>
          <input type="number" value={f.emiOverride}
            placeholder="Enter your actual EMI"
            onChange={e=>set("emiOverride",e.target.value)}
            style={inp({fontSize:12,padding:"7px 10px",color:C.muted,
                        background:+f.emiOverride>0?"#fff":C.bg})}/>
          {+f.emiOverride>0&&autoEmi>0&&(
            <p style={{margin:"3px 0 0",fontSize:10,
                       color:+f.emiOverride!==autoEmi?C.amber:C.green}}>
              {+f.emiOverride!==autoEmi
                ? `⚠ Using your EMI: ${fmt(+f.emiOverride)}/mo`
                : `✓ Same as calculated`}
            </p>
          )}
        </div>

        <div>
          <Lbl>Loan Start Date</Lbl>
          <input type="date" value={f.startDate}
            max={today}
            onChange={e=>set("startDate",e.target.value)} style={inp()}/>
          {endDate&&<p style={{margin:"4px 0 0",fontSize:11,color:C.purple}}>📅 Finishes: {endDate}</p>}
        </div>
      </div>

      {/* Validation hint — shown after first save attempt */}
      {tried && !valid && (
        <p style={{margin:"10px 0 0",fontSize:11,color:C.red,fontWeight:600}}>
          ⚠ Please fill in Loan Amount, Interest Rate, and Tenure to continue.
        </p>
      )}

      {/* Live summary */}
      {valid&&useEmi>0&&(
        <div style={{marginTop:12,padding:"10px 14px",borderRadius:10,background:"#fff",
                     border:`1px solid ${C.border}`,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {[
            {label:"Monthly EMI",   value:fmt(useEmi),               color:C.ink},
            {label:"Total Interest",value:fmt(totalInt),             color:C.amber},
            {label:"Total Payment", value:fmt(+f.principal+totalInt),color:C.red},
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
          style={{flex:1,padding:"9px",borderRadius:10,border:`1px solid ${C.border}`,
                  background:"#fff",color:C.muted,fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>
          Cancel</button>
        <button onClick={save}
          style={{flex:2,padding:"9px",borderRadius:10,border:"none",
                  background: tried&&!valid ? "#9CA3AF" : C.ink,
                  color:"#fff",fontFamily:"inherit",
                  fontSize:13,fontWeight:700,cursor: tried&&!valid ? "not-allowed":"pointer"}}>
          Save Loan ✓</button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// INSIGHT PANEL  — multi-option + custom EMI
// ═════════════════════════════════════════════════════════════════════════════
function InsightPanel({loan, baseTotals}) {
  const [customExtra, setCustomExtra] = useState("");
  const baseEmi  = baseTotals.emi;
  const endDate  = completionStr(loan.startDate, loan.tenureMonths);
  const customAmt = parseInt(customExtra)||0;
  const customImp = customAmt>0 ? calcEarlyClosureImpact(loan, customAmt) : null;

  return (
    <div style={{marginTop:10,padding:"12px 14px",borderRadius:10,
                 background:"#EFF6FF",border:`1px solid ${C.blue}28`}}>

      {/* Current finish date */}
      {endDate&&(
        <p style={{margin:"0 0 10px",fontSize:11,color:C.muted}}>
          📅 At current EMI of <strong>{fmt(baseEmi)}/mo</strong>: finishes{" "}
          <strong style={{color:C.purple}}>{endDate}</strong>
        </p>
      )}

      <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:C.ink}}>
        💡 Pay extra EMI — Close Loan Faster
      </p>

      {/* Quick option cards */}
      <div className="mc-insight-opts">
        {QUICK_EXTRAS.map(extra=>{
          const imp = calcEarlyClosureImpact(loan, extra);
          const none = imp.savedMonths===0;
          return (
            <div key={extra} style={{background:"#fff",borderRadius:9,padding:"10px 11px",
                                     border:`1px solid ${C.blue}25`}}>
              {/* Card header */}
              <div style={{marginBottom:7,paddingBottom:6,borderBottom:`1px solid ${C.bg}`}}>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:C.blue}}>
                  +{fmt(extra)} EMI
                </p>
                <p style={{margin:"1px 0 0",fontSize:10,color:C.muted}}>
                  New EMI: <strong style={{color:C.ink}}>{fmt(imp.newEmi)}</strong>
                </p>
              </div>
              {none ? (
                <p style={{margin:0,fontSize:10,color:C.muted}}>🎉 Loan almost done!</p>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  <p style={{margin:0,fontSize:10,color:C.ink}}>
                    ⏩ Closes <strong style={{color:C.green}}>{moSfx(imp.savedMonths)}</strong> earlier
                  </p>
                  <p style={{margin:0,fontSize:10,color:C.ink}}>
                    💰 Saves <strong style={{color:C.green}}>{fmt(imp.savedInterest)}</strong>
                  </p>
                  {imp.newCompletionDate&&(
                    <p style={{margin:"2px 0 0",fontSize:9,color:C.purple,fontWeight:600}}>
                      📅 {imp.newCompletionDate}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom extra EMI */}
      <div style={{marginTop:12,padding:"12px 12px",background:"#fff",
                   borderRadius:9,border:`1px solid ${C.border}`}}>
        <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:C.ink}}>
          Custom Extra EMI
        </p>
        <input type="number" placeholder="e.g. 1500" value={customExtra}
          onChange={e=>setCustomExtra(e.target.value)}
          style={inp({fontFamily:"Georgia,serif",fontSize:14})}/>

        {customImp&&customImp.savedMonths>0&&(
          <div style={{marginTop:10,padding:"10px 12px",borderRadius:8,
                       background:"#EFF6FF",border:`1px solid ${C.blue}22`}}>
            <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:C.blue}}>
              With {fmt(customAmt)} extra EMI:
            </p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {[
                {label:"New EMI",        value:fmt(customImp.newEmi),        color:C.ink},
                {label:"Closes Earlier", value:moSfx(customImp.savedMonths), color:C.green},
                {label:"Interest Saved", value:fmt(customImp.savedInterest), color:C.green},
                ...(customImp.newCompletionDate
                  ? [{label:"Finish Date", value:customImp.newCompletionDate, color:C.purple}]
                  : []),
              ].map(r=>(
                <div key={r.label} style={{padding:"6px 8px",background:"#fff",
                                           borderRadius:7,border:`1px solid ${C.border}`}}>
                  <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",
                             letterSpacing:"0.7px",fontWeight:600}}>{r.label}</p>
                  <p style={{margin:"2px 0 0",fontSize:12,fontWeight:700,
                             color:r.color,fontFamily:"Georgia,serif"}}>{r.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {customAmt>0&&customImp&&customImp.savedMonths===0&&(
          <p style={{margin:"6px 0 0",fontSize:10,color:C.muted}}>
            🎉 Loan is almost fully repaid — great work!
          </p>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LOAN CARD
// ═════════════════════════════════════════════════════════════════════════════
function LoanCard({loan, onEdit, onDelete}) {
  const [showInsight, setShowInsight] = useState(false);
  const icon     = LOAN_ICON[loan.name]||"🏦";

  // EMI-only loan (from onboarding) — show simplified card with prompt to add details
  if (loan.needsDetails) {
    const emi = loan.manualEmi || loan.emi || 0;
    return (
      <div style={{background:"#fff",borderRadius:13,border:`1.5px dashed ${C.border}`,
                   boxShadow:"0 1px 4px rgba(0,0,0,0.04)",overflow:"hidden"}}>
        <div style={{padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{display:"flex",gap:10,alignItems:"center",flex:1,minWidth:0}}>
            <div style={{width:40,height:40,borderRadius:10,background:`${C.blue}12`,
                         display:"flex",alignItems:"center",justifyContent:"center",
                         fontSize:20,flexShrink:0}}>{icon}</div>
            <div style={{minWidth:0}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>{loan.name}</p>
              <p style={{margin:0,fontSize:10,color:C.muted}}>EMI added during setup</p>
            </div>
          </div>
          <DotMenu onEdit={onEdit} onDelete={onDelete}/>
        </div>
        <div style={{padding:"0 14px 14px"}}>
          <div style={{background:C.bg,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
            <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.7px",fontWeight:600}}>Monthly EMI</p>
            <p style={{margin:"3px 0 0",fontSize:18,fontWeight:700,color:C.ink,fontFamily:"Georgia,serif"}}>{fmt(emi)}</p>
          </div>
          <button onClick={onEdit}
            style={{width:"100%",padding:"9px",borderRadius:9,border:`1px solid ${C.blue}`,
                    background:"#EFF6FF",color:C.blue,fontFamily:"inherit",
                    fontSize:12,fontWeight:700,cursor:"pointer"}}>
            ✏️ Add full loan details (amount, rate, tenure) for accurate tracking
          </button>
        </div>
      </div>
    );
  }

  const t        = calcLoanTotals(loan);
  const barColor = t.paidPct<30?C.red:t.paidPct<70?C.amber:C.green;
  const endDate  = completionStr(loan.startDate, loan.tenureMonths);

  return (
    <div style={{background:"#fff",borderRadius:13,border:`1px solid ${C.border}`,
                 boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden"}}>

      {/* Header */}
      <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.bg}`,
                   display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flex:1,minWidth:0}}>
          <div style={{width:40,height:40,borderRadius:10,background:`${C.blue}12`,
                       display:"flex",alignItems:"center",justifyContent:"center",
                       fontSize:20,flexShrink:0}}>{icon}</div>
          <div style={{minWidth:0}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>{loan.name}</p>
            <p style={{margin:0,fontSize:10,color:C.muted}}>
              {loan.rate}% p.a. · {tenureLabel(loan.tenureMonths)}
              {endDate&&<span style={{color:C.purple}}> · finishes {endDate}</span>}
            </p>
          </div>
        </div>
        <DotMenu onEdit={onEdit} onDelete={onDelete}/>
      </div>

      <div style={{padding:"12px 14px"}}>

        {/* 4 metric tiles */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:12}}>
          {[
            {label:"Outstanding",   value:fmt(t.outstanding),   color:C.red},
            {label:"Monthly EMI",   value:fmt(t.emi),           color:C.ink},
            {label:"Total Interest",value:fmt(t.totalInterest), color:C.amber},
            {label:"Total Payment", value:fmt(t.totalPayable),  color:C.purple},
          ].map(m=>(
            <div key={m.label} style={{background:C.bg,borderRadius:8,padding:"8px 10px"}}>
              <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.7px",fontWeight:600}}>{m.label}</p>
              <p style={{margin:"3px 0 0",fontSize:13,fontWeight:700,color:m.color,fontFamily:"Georgia,serif"}}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Progress vs ORIGINAL PRINCIPAL */}
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <p style={{margin:0,fontSize:11,fontWeight:600,color:C.ink}}>Repayment Progress</p>
            <p style={{margin:0,fontSize:17,fontWeight:700,color:barColor,fontFamily:"Georgia,serif"}}>
              {t.paidPct}%<span style={{fontSize:9,fontWeight:400,color:C.muted,marginLeft:3}}>done</span>
            </p>
          </div>
          <Bar pct={t.paidPct} color={barColor} height={7}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,gap:8}}>
            <div style={{flex:1,background:"#F0FDF4",borderRadius:7,padding:"6px 8px",
                         border:"1px solid #BBF7D0",textAlign:"center"}}>
              <p style={{margin:0,fontSize:9,color:C.green,textTransform:"uppercase",
                         letterSpacing:"0.7px",fontWeight:700}}>Paid</p>
              <p style={{margin:"2px 0 0",fontSize:12,fontWeight:700,color:C.green,
                         fontFamily:"Georgia,serif"}}>{fmt(t.paidAmt)}</p>
            </div>
            <div style={{flex:1,background:"#FFF1F2",borderRadius:7,padding:"6px 8px",
                         border:"1px solid #FECACA",textAlign:"center"}}>
              <p style={{margin:0,fontSize:9,color:C.red,textTransform:"uppercase",
                         letterSpacing:"0.7px",fontWeight:700}}>Remaining</p>
              <p style={{margin:"2px 0 0",fontSize:12,fontWeight:700,color:C.red,
                         fontFamily:"Georgia,serif"}}>{fmt(t.outstanding)}</p>
            </div>
          </div>
          <p style={{margin:"5px 0 0",fontSize:9,color:C.muted,textAlign:"center"}}>
            {moSfx(t.monthsLeft)} left · Original loan: {fmt(loan.principal)}
          </p>
        </div>

        {/* Toggle insight */}
        <button onClick={()=>setShowInsight(p=>!p)}
          style={{width:"100%",padding:"8px",borderRadius:8,
                  border:`1.5px solid ${C.blue}44`,
                  background:showInsight?`${C.blue}12`:`${C.blue}06`,
                  color:C.blue,fontFamily:"inherit",fontSize:12,fontWeight:700,
                  cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <span>💡</span>
          <span>{showInsight?"Hide Insight":"Close Loan Faster"}</span>
        </button>

        {showInsight&&<InsightPanel loan={loan} baseTotals={t}/>}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DEBT PAYOFF PLANNER
// Shows avalanche vs snowball strategy comparison + priority order
// ═════════════════════════════════════════════════════════════════════════════
function DebtPayoffPlanner({ loans }) {
  const [extra,    setExtra]    = useState("0");
  const [strategy, setStrategy] = useState("avalanche"); // "avalanche" | "snowball"
  const [open,     setOpen]     = useState(false);

  // Compute totals per loan (skip EMI-only loans — no amortization data)
  const enriched = loans.filter(l => !l.needsDetails).map(l => {
    const t = calcLoanTotals(l);
    return { ...l, ...t, icon: LOAN_ICON[l.name] || "🏦" };
  });

  const extraAmt = Math.max(0, parseFloat(extra) || 0);

  // Strategy ordering
  const ordered = [...enriched].sort((a, b) =>
    strategy === "avalanche"
      ? b.rate - a.rate                    // highest rate first
      : a.outstanding - b.outstanding      // lowest balance first
  );

  // Simulate payoff: allocate extra EMI to #1 priority, waterfall when paid off
  function simulatePayoff(loanList, bonusEmi) {
    if (!loanList.length) return { months: 0, totalInterest: 0, order: [] };

    // Deep copy outstanding balances
    let balances = loanList.map(l => ({
      id: l.id, name: l.name, icon: l.icon,
      balance: l.outstanding, rate: l.rate, emi: l.emi,
      paidOff: false, paidOffMonth: null,
    }));

    let month = 0;
    let totalInterest = 0;
    const MAX = 600;

    while (balances.some(b => !b.paidOff) && month < MAX) {
      month++;
      // Find first unpaid (priority target gets bonus)
      const targetIdx = balances.findIndex(b => !b.paidOff);
      // Apply interest + payments
      let remaining = bonusEmi;
      for (let i = 0; i < balances.length; i++) {
        const b = balances[i];
        if (b.paidOff) continue;
        const r = b.rate / 12 / 100;
        const interest = b.balance * r;
        totalInterest += interest;
        let payment = b.emi;
        if (i === targetIdx) payment += remaining;
        const principal = Math.min(payment - interest, b.balance);
        if (principal <= 0) continue;
        b.balance -= principal;
        if (b.balance <= 1) {
          const leftover = -b.balance; // overpaid amount
          b.balance = 0;
          b.paidOff = true;
          b.paidOffMonth = month;
          // Waterfall: carry leftover EMI + freed EMI to next priority
          remaining += b.emi + leftover;
        }
      }
    }

    const order = [...balances]
      .filter(b => b.paidOffMonth)
      .sort((a, b) => a.paidOffMonth - b.paidOffMonth)
      .map(b => ({ name: b.name, icon: b.icon, month: b.paidOffMonth }));

    return { months: month, totalInterest: Math.round(totalInterest), order };
  }

  // Baseline (no extra) vs with extra
  const baseline = simulatePayoff(ordered, 0);
  const withExtra = extraAmt > 0 ? simulatePayoff(ordered, extraAmt) : null;

  const savedMonths   = withExtra ? Math.max(0, baseline.months - withExtra.months) : 0;
  const savedInterest = withExtra ? Math.max(0, baseline.totalInterest - withExtra.totalInterest) : 0;

  const finishDate = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString("en-IN", { month:"long", year:"numeric" });
  };

  if (loans.length < 2) return null; // Only useful with 2+ loans

  return (
    <div style={{ marginTop:16 }}>
      {/* Toggle header */}
      <button onClick={() => setOpen(p => !p)} style={{
        width:"100%", padding:"11px 14px", borderRadius:12,
        border:`1.5px solid ${C.purple}44`,
        background: open ? `${C.purple}10` : `${C.purple}06`,
        color:C.purple, fontFamily:"inherit", fontSize:13, fontWeight:700,
        cursor:"pointer", display:"flex", alignItems:"center",
        justifyContent:"space-between", gap:8,
      }}>
        <span>📊 Debt Payoff Planner</span>
        <span style={{ fontSize:11, fontWeight:400, color:C.muted }}>
          {open ? "Hide ▲" : "Which loan first? ▼"}
        </span>
      </button>

      {open && (
        <div style={{
          background:"#fff", borderRadius:12, border:`1px solid ${C.border}`,
          boxShadow:"0 1px 3px rgba(0,0,0,0.05)", padding:"14px",
          marginTop:8,
        }}>

          {/* Strategy toggle */}
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            {[
              { key:"avalanche", label:"⚡ Avalanche", sub:"Highest interest first · saves most money" },
              { key:"snowball",  label:"❄ Snowball",   sub:"Smallest balance first · builds momentum" },
            ].map(s => (
              <button key={s.key} onClick={() => setStrategy(s.key)} style={{
                flex:1, padding:"9px 10px", borderRadius:10, cursor:"pointer",
                fontFamily:"inherit", textAlign:"left",
                border:`1.5px solid ${strategy===s.key ? C.purple : C.border}`,
                background: strategy===s.key ? `${C.purple}10` : "#fff",
              }}>
                <p style={{ margin:0, fontSize:12, fontWeight:700,
                             color: strategy===s.key ? C.purple : C.ink }}>{s.label}</p>
                <p style={{ margin:"2px 0 0", fontSize:9, color:C.muted, lineHeight:1.4 }}>{s.sub}</p>
              </button>
            ))}
          </div>

          {/* Extra EMI input */}
          <div style={{ marginBottom:14 }}>
            <p style={{ margin:"0 0 6px", fontSize:10, fontWeight:700, color:C.muted,
                        textTransform:"uppercase", letterSpacing:"0.8px" }}>
              Extra payment per month (optional)
            </p>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, color:C.muted }}>₹</span>
              <input
                type="number" value={extra} min="0"
                onChange={e => setExtra(e.target.value)}
                placeholder="e.g. 2000"
                style={{
                  flex:1, padding:"8px 10px", borderRadius:8,
                  border:`1.5px solid ${C.border}`, fontFamily:"inherit",
                  fontSize:13, background:C.bg, outline:"none",
                }}
              />
              {[1000,2000,5000].map(v => (
                <button key={v} onClick={() => setExtra(String(v))} style={{
                  padding:"6px 10px", borderRadius:8, cursor:"pointer",
                  fontFamily:"inherit", fontSize:11, fontWeight:600,
                  border:`1px solid ${extra===String(v)?C.purple:C.border}`,
                  background: extra===String(v) ? `${C.purple}10` : "#fff",
                  color: extra===String(v) ? C.purple : C.muted,
                }}>
                  +{v >= 1000 ? `${v/1000}k` : v}
                </button>
              ))}
            </div>
          </div>

          {/* Priority order */}
          <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"0.8px" }}>
            Recommended payoff order
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
            {ordered.map((l, i) => (
              <div key={l.id} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"9px 12px", borderRadius:9,
                background: i === 0 ? `${C.purple}08` : C.bg,
                border:`1px solid ${i === 0 ? `${C.purple}30` : C.border}`,
              }}>
                <div style={{
                  width:24, height:24, borderRadius:99, flexShrink:0,
                  background: i === 0 ? C.purple : C.border,
                  color: "#fff", display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:11, fontWeight:700,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize:16, flexShrink:0 }}>{l.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.ink }}>
                    {l.name}
                    {i === 0 && <span style={{ marginLeft:6, fontSize:9, color:C.purple,
                                               fontWeight:700, background:`${C.purple}15`,
                                               borderRadius:99, padding:"1px 7px" }}>
                      FOCUS HERE
                    </span>}
                  </p>
                  <p style={{ margin:"1px 0 0", fontSize:10, color:C.muted }}>
                    {strategy === "avalanche"
                      ? `${l.rate}% interest · ${fmt(l.outstanding)} outstanding`
                      : `${fmt(l.outstanding)} outstanding · ${l.rate}% interest`}
                  </p>
                </div>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:C.muted,
                             fontFamily:"Georgia,serif", flexShrink:0 }}>
                  {fmt(l.emi)}/mo
                </p>
              </div>
            ))}
          </div>

          {/* Payoff timeline */}
          <div style={{
            background: C.bg, borderRadius:10, padding:"12px 14px", marginBottom:12,
            border:`1px solid ${C.border}`,
          }}>
            <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:700, color:C.muted,
                        textTransform:"uppercase", letterSpacing:"0.8px" }}>
              Payoff Timeline
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                { label:"Debt-free by",      value: finishDate(baseline.months),  color:C.ink   },
                { label:"Total interest",     value: fmt(baseline.totalInterest),  color:C.amber },
                ...(withExtra ? [
                  { label:"With extra · done by", value: finishDate(withExtra.months), color:C.green },
                  { label:"Interest saved",        value: fmt(savedInterest),          color:C.green },
                ] : []),
              ].map(t => (
                <div key={t.label} style={{ background:"#fff", borderRadius:8,
                                            padding:"8px 10px", border:`1px solid ${C.border}` }}>
                  <p style={{ margin:0, fontSize:9, color:C.muted, fontWeight:600,
                               textTransform:"uppercase", letterSpacing:"0.6px" }}>{t.label}</p>
                  <p style={{ margin:"3px 0 0", fontSize:12, fontWeight:700,
                               color:t.color, fontFamily:"Georgia,serif" }}>{t.value}</p>
                </div>
              ))}
            </div>
            {withExtra && savedMonths > 0 && (
              <div style={{
                marginTop:10, padding:"8px 11px", borderRadius:8,
                background:"#F0FDF4", border:"1px solid #86EFAC",
                display:"flex", alignItems:"center", gap:8,
              }}>
                <span style={{ fontSize:16 }}>🎉</span>
                <p style={{ margin:0, fontSize:12, color:C.ink }}>
                  Adding <strong>{fmt(extraAmt)}/month</strong> clears your debt{" "}
                  <strong style={{ color:C.green }}>{savedMonths} months earlier</strong> and saves{" "}
                  <strong style={{ color:C.green }}>{fmt(savedInterest)}</strong> in interest.
                </p>
              </div>
            )}
          </div>

          {/* Payoff sequence */}
          {baseline.order.length > 0 && (
            <div>
              <p style={{ margin:"0 0 6px", fontSize:10, fontWeight:700, color:C.muted,
                          textTransform:"uppercase", letterSpacing:"0.8px" }}>
                Sequence
              </p>
              <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:4 }}>
                {baseline.order.map((b, i) => (
                  <span key={b.name} style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{
                      padding:"3px 10px", borderRadius:99, fontSize:11,
                      background:`${C.purple}10`, border:`1px solid ${C.purple}30`,
                      color:C.purple, fontWeight:600,
                    }}>
                      {b.icon} {b.name} · mo {b.month}
                    </span>
                    {i < baseline.order.length - 1 && (
                      <span style={{ fontSize:12, color:C.muted }}>→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════
export default function LoansTab({loans, onAdd, onUpdate, onDelete}) {
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);

  // Only count loans with full details for calculated metrics
  const detailedLoans    = loans.filter(l => !l.needsDetails);
  const totalEmi         = loans.reduce((s,l)=>s+(l.manualEmi||l.emi||calcLoanTotals(l).emi),0);
  const totalOutstanding = detailedLoans.reduce((s,l)=>s+calcLoanTotals(l).outstanding,0);
  const totalInterest    = detailedLoans.reduce((s,l)=>s+calcLoanTotals(l).totalInterest,0);

  const handleSave = (data) => {
    if (editId!==null) { onUpdate(editId,data); setEditId(null); }
    else               { onAdd(data); }
    setShowForm(false);
  };

  return (
    <div>
      <style>{LOAN_CSS}</style>

      {loans.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
          {[
            {label:"Total Outstanding",value:fmt(totalOutstanding),color:C.red,  icon:"💰"},
            {label:"Monthly EMI",      value:fmt(totalEmi),        color:C.ink,  icon:"📅"},
            {label:"Total Interest",   value:fmt(totalInterest),   color:C.amber,icon:"📈"},
          ].map(s=>(
            <div key={s.label} style={{background:"#fff",borderRadius:11,border:`1px solid ${C.border}`,
                                       padding:"10px 12px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                <span style={{fontSize:12}}>{s.icon}</span>
                <p style={{margin:0,fontSize:9,color:C.muted,textTransform:"uppercase",
                            letterSpacing:"0.8px",fontWeight:600,lineHeight:1.2}}>{s.label}</p>
              </div>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:s.color,fontFamily:"Georgia,serif"}}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {(showForm||editId!==null) ? (
        <LoanForm key={editId??"new"}
          initial={editId!==null?loans.find(l=>l.id===editId):undefined}
          onSave={handleSave}
          onCancel={()=>{setShowForm(false);setEditId(null);}}/>
      ) : (
        <button onClick={()=>setShowForm(true)}
          style={{width:"100%",padding:"10px",borderRadius:10,
                  border:`1.5px dashed ${C.border}`,background:"transparent",
                  color:C.muted,fontSize:13,fontFamily:"inherit",
                  cursor:"pointer",fontWeight:600,marginBottom:14}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.ink;e.currentTarget.style.color=C.ink;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
          + Add Loan
        </button>
      )}

      {loans.length===0&&!showForm ? (
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,
                     textAlign:"center",padding:"40px 20px"}}>
          <p style={{fontSize:32,margin:"0 0 8px"}}>🏦</p>
          <p style={{color:C.muted,fontSize:13,margin:"0 0 4px",fontWeight:600}}>No loans added yet</p>
          <p style={{color:C.muted,fontSize:12,margin:0}}>Track your home loan, car loan, personal loan and more.</p>
        </div>
      ) : (
        <>
          <div className="mc-loan-grid">
            {loans.map(loan=>(
              <LoanCard key={loan.id} loan={loan}
                onEdit={()=>{setEditId(loan.id);setShowForm(false);}}
                onDelete={()=>{if(window.confirm(`Delete "${loan.name}"?`))onDelete(loan.id);}}/>
            ))}
          </div>
          <DebtPayoffPlanner loans={loans} />
        </>
      )}
    </div>
  );
}
