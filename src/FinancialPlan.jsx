// ─── FinancialPlan.jsx ────────────────────────────────────────────────────
// Changes from previous version:
//   • ItemRow replaced with 3-dot ⋮ dropdown menu (Fix #4)
//   • Edit bug fixed: editId triggers InlineForm with correct prefilled values (Fix #3)
//   • InlineForm reinitialises when editId changes (key prop) (Fix #3)
// Save to: moneycoach-app/src/FinancialPlan.jsx

import { useState, useEffect, useRef } from "react";
import { calcMonthlyReserve } from "./useAppData";

const C = {ink:"#111827",muted:"#6B7280",border:"#E5E7EB",bg:"#F8FAFC",red:"#DC2626",green:"#16A34A",amber:"#D97706",blue:"#2563EB",purple:"#7C3AED"};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const Label = ({children}) => <p style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"1.1px",fontWeight:600,margin:"0 0 4px"}}>{children}</p>;

// ── Section card wrapper ──────────────────────────────────────────────────
function SectionCard({icon,title,color,children}) {
  return (
    <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.05)",overflow:"hidden",marginBottom:12}}>
      <div style={{background:color+"10",borderBottom:`1px solid ${color}22`,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:15}}>{icon}</span>
        <p style={{fontWeight:700,fontSize:13,color:C.ink,margin:0}}>{title}</p>
      </div>
      <div style={{padding:"12px 14px"}}>{children}</div>
    </div>
  );
}

// ── Fix #4: 3-dot dropdown menu ──────────────────────────────────────────
function DotMenu({onEdit, onDelete}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{position:"relative",flexShrink:0}}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width:28, height:28, borderRadius:6, border:`1px solid ${C.border}`,
          background: open ? C.bg : "#fff",
          color:C.muted, cursor:"pointer", fontSize:16,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"inherit", lineHeight:1,
        }}
        title="Options"
      >⋮</button>

      {open && (
        <div style={{
          position:"absolute", right:0, top:32, zIndex:50,
          background:"#fff", border:`1px solid ${C.border}`,
          borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,0.12)",
          minWidth:110, overflow:"hidden",
        }}>
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            style={{display:"block",width:"100%",padding:"10px 14px",textAlign:"left",background:"none",border:"none",fontSize:13,color:C.ink,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}
            onMouseEnter={e=>e.currentTarget.style.background=C.bg}
            onMouseLeave={e=>e.currentTarget.style.background="none"}
          >✏️ Edit</button>
          <div style={{height:1,background:C.border,margin:"0 8px"}} />
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            style={{display:"block",width:"100%",padding:"10px 14px",textAlign:"left",background:"none",border:"none",fontSize:13,color:C.red,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}
            onMouseEnter={e=>e.currentTarget.style.background="#FFF1F2"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}
          >🗑 Delete</button>
        </div>
      )}
    </div>
  );
}

// ── Row for standard items (Income, Fixed, Savings) — compact ────────────
function ItemRow({label, amount, sublabel, color, onEdit, onDelete}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.bg}`,gap:8}}>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:12,fontWeight:600,color:C.ink,margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</p>
        {sublabel && <p style={{fontSize:10,color:C.muted,margin:"1px 0 0"}}>{sublabel}</p>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <span style={{fontSize:13,fontWeight:700,color,fontFamily:"Georgia,serif"}}>{fmt(amount)}</span>
        <DotMenu onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

// Smaller, more compact add button
function AddButton({onClick, label}) {
  return (
    <button onClick={onClick}
      style={{marginTop:8,width:"100%",padding:"7px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"transparent",color:C.muted,fontSize:12,fontFamily:"inherit",cursor:"pointer",fontWeight:600}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.ink;e.currentTarget.style.color=C.ink;}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
      + {label}
    </button>
  );
}

// ── Fix #3: InlineForm with key prop so it reinitialises on edit switch ───
// key={editId||"new"} is set by each section — forces fresh useState per item
function InlineForm({fields, onSave, onCancel, title}) {
  const init = Object.fromEntries(fields.map(f => {
    if (f.default !== undefined && f.default !== "") return [f.key, f.default];
    if (f.type === "select" && f.options?.length) return [f.key, f.options[0].value];
    return [f.key, f.default ?? ""];
  }));
  const [vals, setVals] = useState(init);
  const [tried, setTried] = useState(false);  // track if user attempted save
  const set = (k,v) => setVals(p => ({...p,[k]:v}));

  const missingRequired = fields.filter(f => f.required && !String(vals[f.key]).trim());
  const canSave = missingRequired.length === 0;

  const save = () => {
    setTried(true);
    if (!canSave) return;
    onSave(vals);
  };

  const inputStyle = (k, required) => ({
    width:"100%", marginTop:4, padding:"8px 10px", borderRadius:8,
    border:`1.5px solid ${tried && required && !String(vals[k]).trim() ? C.red : C.border}`,
    fontFamily:"inherit", fontSize:13,
    background:"#fff", outline:"none", boxSizing:"border-box",
  });

  return (
    <div style={{background:C.bg,borderRadius:12,padding:16,marginTop:12,border:`1px solid ${C.border}`}}>
      <p style={{fontSize:13,fontWeight:700,color:C.ink,margin:"0 0 12px"}}>{title}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:10}}>
        {fields.map(f => (
          <div key={f.key}>
            <Label>{f.label}{f.required?" *":""}</Label>
            {f.type==="select" ? (
              <select value={vals[f.key]} onChange={e=>set(f.key,e.target.value)} style={inputStyle(f.key, f.required)}>
                {f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type==="date" ? (
              <input type="date" value={vals[f.key]} onChange={e=>set(f.key,e.target.value)} style={inputStyle(f.key, f.required)} />
            ) : (
              <input type={f.type||"text"} value={vals[f.key]} onChange={e=>set(f.key,e.target.value)}
                placeholder={f.placeholder||""} style={inputStyle(f.key, f.required)} />
            )}
            {tried && f.required && !String(vals[f.key]).trim() && (
              <p style={{margin:"2px 0 0",fontSize:10,color:C.red}}>Required</p>
            )}
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginTop:14,alignItems:"center"}}>
        <button onClick={onCancel} style={{flex:1,padding:"9px",borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",color:C.muted,fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <button onClick={save}
          disabled={tried && !canSave}
          style={{flex:2,padding:"9px",borderRadius:10,border:"none",
                  background: tried && !canSave ? C.muted : C.ink,
                  color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,
                  cursor: tried && !canSave ? "not-allowed" : "pointer",
                  opacity: tried && !canSave ? 0.7 : 1}}>
          Save ✓
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// INCOME SOURCES
// ─────────────────────────────────────────────────────────────────────────
const INCOME_LABELS = ["Salary","Freelance","Rental Income","Business Income","Other Income"];

export function IncomeSources({sources,totalIncome,onAdd,onUpdate,onDelete}) {
  const [mode,    setMode]    = useState(null); // null | "add" | id (editing)
  const editing = typeof mode==="number" ? sources.find(s=>s.id===mode) : null;

  const FIELDS = [
    {key:"label",  label:"Source",             required:true, type:"select", options:INCOME_LABELS.map(l=>({value:l,label:l}))},
    {key:"amount", label:"Monthly Amount (₹)", required:true, type:"number", placeholder:"e.g. 50000"},
    {key:"note",   label:"Note (optional)",                                  placeholder:"e.g. Net salary"},
  ];

  const handleSave = (vals) => {
    const item = {label:vals.label, amount:parseFloat(vals.amount)||0, note:vals.note};
    if(editing) onUpdate(mode, item); else onAdd(item);
    setMode(null);
  };

  return (
    <div id="plan-income">
    <SectionCard icon="💰" title="Income Sources" color={C.green}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <p style={{fontSize:10,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600,margin:0}}>Total Monthly Income</p>
        <p style={{fontSize:17,fontWeight:700,color:"#16A34A",fontFamily:"Georgia,serif",margin:0}}>{fmt(totalIncome)}</p>
      </div>

      {sources.map(s => (
        <ItemRow key={s.id} label={s.label} amount={s.amount} sublabel={s.note} color={C.green}
          onEdit={()=>setMode(s.id)} onDelete={()=>{if(window.confirm(`Delete "${s.label}"?`))onDelete(s.id);}} />
      ))}

      {/* Fix #3: key forces InlineForm to remount with fresh state when switching items */}
      {mode==="add" && (
        <InlineForm key="add" title="Add Income Source" fields={FIELDS}
          onSave={handleSave} onCancel={()=>setMode(null)} />
      )}
      {editing && (
        <InlineForm key={mode} title="Edit Income Source"
          fields={FIELDS.map(f=>({...f, default: editing[f.key]??""}))}
          onSave={handleSave} onCancel={()=>setMode(null)} />
      )}
      {mode===null && <AddButton onClick={()=>setMode("add")} label="Add Income Source" />}
    </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FIXED EXPENSES — Fix #2: only here, removed from Log Expense form
// ─────────────────────────────────────────────────────────────────────────
const FIXED_LABELS = ["Rent","Electricity","Water","Internet","EMI/Loan","Maintenance","Groceries (estimate)","Insurance","School Fees","Other Fixed"];

export function FixedExpensesSection({items,totalFixed,onAdd,onUpdate,onDelete}) {
  const [mode, setMode] = useState(null);
  const editing = typeof mode==="number" ? items.find(x=>x.id===mode) : null;

  const FIELDS = [
    {key:"label",  label:"Expense",            required:true, type:"select", options:FIXED_LABELS.map(l=>({value:l,label:l}))},
    {key:"amount", label:"Monthly Amount (₹)", required:true, type:"number", placeholder:"e.g. 12000"},
    {key:"note",   label:"Note (optional)",                                  placeholder:"e.g. Flat rent"},
  ];

  const handleSave = (vals) => {
    const item = {label:vals.label, amount:parseFloat(vals.amount)||0, note:vals.note};
    if(editing) onUpdate(mode, item); else onAdd(item);
    setMode(null);
  };

  return (
    <div id="plan-fixed">
    <SectionCard icon="🏠" title="Fixed Monthly Expenses" color={C.red}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <p style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600,margin:0}}>Total Fixed</p>
        <p style={{fontSize:17,fontWeight:700,color:C.red,fontFamily:"Georgia,serif",margin:0}}>{fmt(totalFixed)}</p>
      </div>
      <p style={{fontSize:11,color:C.muted,marginBottom:8,lineHeight:1.4}}>
        Auto-deducted from your remaining budget every month.
      </p>

      {items.map(x=>(
        <ItemRow key={x.id} label={x.label} amount={x.amount} sublabel={x.note} color={C.red}
          onEdit={()=>setMode(x.id)} onDelete={()=>{if(window.confirm(`Delete "${x.label}"?`))onDelete(x.id);}} />
      ))}

      {mode==="add" && (
        <InlineForm key="add" title="Add Fixed Expense" fields={FIELDS}
          onSave={handleSave} onCancel={()=>setMode(null)} />
      )}
      {editing && (
        <InlineForm key={mode} title="Edit Fixed Expense"
          fields={FIELDS.map(f=>({...f, default: editing[f.key]??""}))}
          onSave={handleSave} onCancel={()=>setMode(null)} />
      )}
      {mode===null && <AddButton onClick={()=>setMode("add")} label="Add Fixed Expense" />}
    </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SAVINGS / INVESTMENTS
// ─────────────────────────────────────────────────────────────────────────
const SAVINGS_LABELS = ["Mutual Fund SIP","Recurring Deposit","Emergency Fund","Retirement","PPF","NPS","Other Savings"];

export function SavingsSection({plans,totalSavings,onAdd,onUpdate,onDelete}) {
  const [mode, setMode] = useState(null);
  const editing = typeof mode==="number" ? plans.find(x=>x.id===mode) : null;

  const FIELDS = [
    {key:"label",  label:"Type",               required:true, type:"select", options:SAVINGS_LABELS.map(l=>({value:l,label:l}))},
    {key:"amount", label:"Monthly Amount (₹)", required:true, type:"number", placeholder:"e.g. 5000"},
    {key:"note",   label:"Note (optional)",                                  placeholder:"e.g. HDFC Flexi Cap"},
  ];

  const handleSave = (vals) => {
    const item = {label:vals.label, amount:parseFloat(vals.amount)||0, note:vals.note};
    if(editing) onUpdate(mode, item); else onAdd(item);
    setMode(null);
  };

  return (
    <div id="plan-savings">
    <SectionCard icon="📈" title="Savings & Investments" color={C.blue}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <p style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600,margin:0}}>Total Monthly Savings</p>
        <p style={{fontSize:17,fontWeight:700,color:C.blue,fontFamily:"Georgia,serif",margin:0}}>{fmt(totalSavings)}</p>
      </div>
      <p style={{fontSize:11,color:C.muted,marginBottom:8,lineHeight:1.4}}>
        Planned savings — not counted as daily spending.
      </p>

      {plans.map(x=>(
        <ItemRow key={x.id} label={x.label} amount={x.amount} sublabel={x.note} color={C.blue}
          onEdit={()=>setMode(x.id)} onDelete={()=>{if(window.confirm(`Delete "${x.label}"?`))onDelete(x.id);}} />
      ))}

      {mode==="add" && (
        <InlineForm key="add" title="Add Savings Plan" fields={FIELDS}
          onSave={handleSave} onCancel={()=>setMode(null)} />
      )}
      {editing && (
        <InlineForm key={mode} title="Edit Savings Plan"
          fields={FIELDS.map(f=>({...f, default: editing[f.key]??""}))}
          onSave={handleSave} onCancel={()=>setMode(null)} />
      )}
      {mode===null && <AddButton onClick={()=>setMode("add")} label="Add Savings Plan" />}
    </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FUTURE PAYMENTS
// ─────────────────────────────────────────────────────────────────────────
const FREQ_OPTIONS = [
  {value:"yearly",    label:"Yearly"},
  {value:"halfyearly",label:"Half-Yearly"},
  {value:"quarterly", label:"Quarterly"},
];
const nextMonthDate = () => {
  const d = new Date(); d.setMonth(d.getMonth()+1);
  return d.toISOString().split("T")[0];
};

export function FuturePaymentsSection({payments,totalReserve,onAdd,onUpdate,onDelete}) {
  const [mode, setMode] = useState(null);
  const editing = typeof mode==="number" ? payments.find(x=>x.id===mode) : null;

  const FIELDS = [
    {key:"label",       label:"Payment Name",    required:true,                          placeholder:"e.g. Car Insurance"},
    {key:"totalAmount", label:"Total Amount (₹)",required:true, type:"number",           placeholder:"e.g. 12000"},
    {key:"frequency",   label:"Frequency",       required:true, type:"select", default:"yearly", options:FREQ_OPTIONS},
    {key:"nextDate",    label:"Next Due Date",   required:true, type:"date",   default:nextMonthDate()},
    {key:"note",        label:"Note (optional)",                                          placeholder:"e.g. LIC Policy"},
  ];

  const handleSave = (vals) => {
    const item = {
      label:vals.label, totalAmount:parseFloat(vals.totalAmount)||0,
      frequency:vals.frequency, nextDate:vals.nextDate, note:vals.note,
    };
    if(editing) onUpdate(mode, item); else onAdd(item);
    setMode(null);
  };

  const freqLabel  = (f) => ({yearly:"Yearly",halfyearly:"Half-Yearly",quarterly:"Quarterly"}[f]||f);
  const daysUntil  = (ds) => Math.max(0, Math.round((new Date(ds+"T00:00:00")-new Date())/(1000*60*60*24)));

  return (
    <SectionCard icon="📅" title="Future Payment Reserve" color={C.purple}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <p style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600,margin:0}}>Total Monthly Reserve</p>
        <p style={{fontSize:17,fontWeight:700,color:C.purple,fontFamily:"Georgia,serif",margin:0}}>{fmt(totalReserve)}</p>
      </div>
      <p style={{fontSize:11,color:C.muted,marginBottom:8,lineHeight:1.4}}>
        Save monthly so annual/quarterly bills don't surprise you.
      </p>

      {payments.map(p => {
        const monthly = calcMonthlyReserve(p);
        const days    = daysUntil(p.nextDate);
        const months  = Math.max(1, Math.round(days/30));
        const urgency = days<30?C.red:days<90?C.amber:C.purple;
        return (
          <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.bg}`,gap:8}}>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:12,fontWeight:700,color:C.ink,margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.label}</p>
              <p style={{fontSize:10,color:C.muted,margin:"1px 0 4px"}}>
                {fmt(p.totalAmount)} · {freqLabel(p.frequency)} · {days}d ({months}mo){p.note ? ` · ${p.note}` : ""}
              </p>
              <span style={{display:"inline-block",background:`${urgency}10`,border:`1px solid ${urgency}35`,borderRadius:99,padding:"1px 8px",fontSize:10,color:urgency,fontWeight:700}}>
                Save {fmt(monthly)}/mo
              </span>
            </div>
            <DotMenu onEdit={()=>setMode(p.id)} onDelete={()=>{if(window.confirm(`Delete "${p.label}"?`))onDelete(p.id);}} />
          </div>
        );
      })}

      {mode==="add" && (
        <InlineForm key="add" title="Add Future Payment" fields={FIELDS}
          onSave={handleSave} onCancel={()=>setMode(null)} />
      )}
      {editing && (
        <InlineForm key={mode} title="Edit Future Payment"
          fields={FIELDS.map(f=>({...f, default: editing[f.key]??f.default??""}))}
          onSave={handleSave} onCancel={()=>setMode(null)} />
      )}
      {mode===null && <AddButton onClick={()=>setMode("add")} label="Add Future Payment" />}
    </SectionCard>
  );
}
