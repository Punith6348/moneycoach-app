// ─── FinancialPlan.jsx — Compact, no extra space ─────────────────────────────
import { useState, useEffect, useRef } from "react";
import { calcMonthlyReserve } from "./useAppData";

const C = {ink:"#111827",muted:"#6B7280",border:"#E5E7EB",bg:"#F8FAFC",red:"#DC2626",green:"#16A34A",amber:"#D97706",blue:"#2563EB",purple:"#7C3AED"};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const Label = ({children}) => (
  <p style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:600,margin:"0 0 3px"}}>
    {children}
  </p>
);

// ── Section card — auto height, no overflow hidden ────────────────────────────
function SectionCard({icon, title, color, total, totalLabel, children}) {
  return (
    <div style={{
      background:"#fff", borderRadius:12,
      border:`1px solid ${C.border}`,
      boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
      marginBottom:10,
    }}>
      {/* Header */}
      <div style={{
        background:`${color}0D`, borderBottom:`1px solid ${color}20`,
        padding:"9px 14px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div style={{display:"flex", alignItems:"center", gap:7}}>
          <span style={{fontSize:14}}>{icon}</span>
          <p style={{fontWeight:700, fontSize:13, color:C.ink, margin:0}}>{title}</p>
        </div>
        {total !== undefined && (
          <p style={{margin:0, fontSize:14, fontWeight:700, color, fontFamily:"Georgia,serif"}}>
            {fmt(total)}
          </p>
        )}
      </div>
      {/* Body — auto height */}
      <div style={{padding:"8px 14px 10px"}}>
        {children}
      </div>
    </div>
  );
}

// ── 3-dot menu ────────────────────────────────────────────────────────────────
function DotMenu({onEdit, onDelete}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{position:"relative", flexShrink:0}}>
      <button onClick={()=>setOpen(p=>!p)} style={{
        width:26, height:26, borderRadius:6,
        border:`1px solid ${C.border}`, background: open?C.bg:"#fff",
        color:C.muted, cursor:"pointer", fontSize:15,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"inherit", lineHeight:1, padding:0,
      }}>⋮</button>
      {open && (
        <div style={{
          position:"fixed", zIndex:9999,
          background:"#fff", border:`1px solid ${C.border}`,
          borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,0.12)",
          minWidth:110, overflow:"hidden",
          // Position using JS — simple right-aligned
          right: "auto", top: "auto",
        }}
        ref={el => {
          if (el && ref.current) {
            const btn = ref.current.getBoundingClientRect();
            el.style.top  = `${btn.bottom + 4}px`;
            el.style.left = `${btn.right - el.offsetWidth}px`;
          }
        }}>
          <button onClick={()=>{setOpen(false);onEdit();}} style={{
            display:"block", width:"100%", padding:"9px 14px",
            textAlign:"left", background:"none", border:"none",
            fontSize:13, color:C.ink, cursor:"pointer", fontFamily:"inherit",
          }}
          onMouseEnter={e=>e.currentTarget.style.background=C.bg}
          onMouseLeave={e=>e.currentTarget.style.background="none"}>
            ✏️ Edit
          </button>
          <div style={{height:1, background:C.border, margin:"0 8px"}}/>
          <button onClick={()=>{setOpen(false);onDelete();}} style={{
            display:"block", width:"100%", padding:"9px 14px",
            textAlign:"left", background:"none", border:"none",
            fontSize:13, color:C.red, cursor:"pointer", fontFamily:"inherit",
          }}
          onMouseEnter={e=>e.currentTarget.style.background="#FFF1F2"}
          onMouseLeave={e=>e.currentTarget.style.background="none"}>
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Item row — last item has no border ────────────────────────────────────────
function ItemRow({label, amount, sublabel, color, onEdit, onDelete, isLast}) {
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"7px 0",
      borderBottom: isLast ? "none" : `1px solid ${C.border}22`,
      gap:8,
    }}>
      <div style={{flex:1, minWidth:0}}>
        <p style={{fontSize:13, fontWeight:600, color:C.ink, margin:0,
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{label}</p>
        {sublabel && (
          <p style={{fontSize:10, color:C.muted, margin:"1px 0 0", lineHeight:1.3}}>{sublabel}</p>
        )}
      </div>
      <div style={{display:"flex", alignItems:"center", gap:8, flexShrink:0}}>
        <p style={{margin:0, fontSize:13, fontWeight:700, color, fontFamily:"Georgia,serif"}}>
          {fmt(amount)}
        </p>
        <DotMenu onEdit={onEdit} onDelete={onDelete}/>
      </div>
    </div>
  );
}

// ── Add button ────────────────────────────────────────────────────────────────
function AddButton({onClick, label}) {
  return (
    <button onClick={onClick} style={{
      marginTop:6, width:"100%", padding:"7px",
      borderRadius:8, border:`1.5px dashed ${C.border}`,
      background:"transparent", color:C.muted,
      fontSize:12, fontFamily:"inherit",
      cursor:"pointer", fontWeight:600,
      display:"block",
    }}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.ink;e.currentTarget.style.color=C.ink;}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
      + {label}
    </button>
  );
}

// ── Inline form ───────────────────────────────────────────────────────────────
function InlineForm({fields, onSave, onCancel, title}) {
  const init = Object.fromEntries(fields.map(f => {
    if (f.default !== undefined && f.default !== "") return [f.key, f.default];
    if (f.type === "select" && f.options?.length) return [f.key, f.options[0].value];
    return [f.key, f.default ?? ""];
  }));
  const [vals, setVals] = useState(init);
  const [tried, setTried] = useState(false);
  const set = (k,v) => setVals(p=>({...p,[k]:v}));
  const canSave = !fields.some(f => f.required && !String(vals[f.key]).trim());

  const inputStyle = (k, required) => ({
    width:"100%", marginTop:3, padding:"8px 10px", borderRadius:8,
    border:`1.5px solid ${tried&&required&&!String(vals[k]).trim()?C.red:C.border}`,
    fontFamily:"inherit", fontSize:16,
    background:"#fff", outline:"none", boxSizing:"border-box",
  });

  return (
    <div style={{
      background:C.bg, borderRadius:10, padding:"12px 14px",
      marginTop:8, border:`1px solid ${C.border}`,
    }}>
      <p style={{fontSize:13, fontWeight:700, color:C.ink, margin:"0 0 10px"}}>{title}</p>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(160px,100%),1fr))", gap:8}}>
        {fields.map(f => (
          <div key={f.key}>
            <Label>{f.label}{f.required?" *":""}</Label>
            {f.type==="select" ? (
              <select value={vals[f.key]} onChange={e=>set(f.key,e.target.value)} style={inputStyle(f.key,f.required)}>
                {f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type==="date" ? (
              <input type="date" value={vals[f.key]} onChange={e=>set(f.key,e.target.value)} style={inputStyle(f.key,f.required)}/>
            ) : (
              <input type={f.type||"text"} value={vals[f.key]} onChange={e=>set(f.key,e.target.value)}
                placeholder={f.placeholder||""} style={inputStyle(f.key,f.required)}/>
            )}
            {tried&&f.required&&!String(vals[f.key]).trim()&&(
              <p style={{margin:"2px 0 0",fontSize:10,color:C.red}}>Required</p>
            )}
          </div>
        ))}
      </div>
      <div style={{display:"flex", gap:8, marginTop:12}}>
        <button onClick={onCancel} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"#fff",color:C.muted,fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>{setTried(true);if(canSave)onSave(vals);}} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:canSave?C.ink:"#D1D5DB",color:canSave?"#fff":"#9CA3AF",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:canSave?"pointer":"default"}}>Save ✓</button>
      </div>
    </div>
  );
}

// ── INCOME SOURCES ────────────────────────────────────────────────────────────
export function IncomeSources({sources, totalIncome, onAdd, onUpdate, onDelete}) {
  const [mode, setMode] = useState(null);
  const editing = typeof mode==="number" ? sources.find(x=>x.id===mode) : null;
  const FIELDS = [
    {key:"label",  label:"Source",            required:true,              placeholder:"e.g. Salary"},
    {key:"amount", label:"Monthly Amount (₹)",required:true, type:"number",placeholder:"e.g. 50000"},
    {key:"note",   label:"Note (optional)",                               placeholder:"e.g. After tax"},
  ];
  const handleSave = (vals) => {
    const item = {label:vals.label, amount:parseFloat(vals.amount)||0, note:vals.note};
    if(editing) onUpdate(mode,item); else onAdd(item);
    setMode(null);
  };
  return (
    <div id="plan-income">
      <SectionCard icon="💰" title="Income Sources" color={C.green} total={totalIncome}>
        {sources.map((s,i)=>(
          <ItemRow key={s.id} label={s.label} amount={s.amount} sublabel={s.note}
            color={C.green} isLast={i===sources.length-1 && mode===null}
            onEdit={()=>setMode(s.id)}
            onDelete={()=>{if(window.confirm(`Delete "${s.label}"?`))onDelete(s.id);}}/>
        ))}
        {mode==="add" && <InlineForm key="add" title="Add Income Source" fields={FIELDS} onSave={handleSave} onCancel={()=>setMode(null)}/>}
        {editing    && <InlineForm key={mode} title="Edit Income Source" fields={FIELDS.map(f=>({...f,default:editing[f.key]??""}))} onSave={handleSave} onCancel={()=>setMode(null)}/>}
        {mode===null && <AddButton onClick={()=>setMode("add")} label="Add Income Source"/>}
      </SectionCard>
    </div>
  );
}

// ── FIXED EXPENSES ────────────────────────────────────────────────────────────
const FIXED_LABELS = [
  "Rent","Electricity","Water Bill","Internet","Mobile","Insurance",
  "School Fees","Maintenance","OTT/Streaming","Gym","Petrol",
  "House Help","Groceries (estimate)","Other Fixed",
];

export function FixedExpensesSection({items, totalFixed, onAdd, onUpdate, onDelete}) {
  const [mode, setMode] = useState(null);
  const editing = typeof mode==="number" ? items.find(x=>x.id===mode) : null;
  const FIELDS = [
    {key:"label",  label:"Expense",            required:true, type:"select", options:FIXED_LABELS.map(l=>({value:l,label:l}))},
    {key:"amount", label:"Monthly Amount (₹)", required:true, type:"number", placeholder:"e.g. 12000"},
    {key:"note",   label:"Note (optional)",                                  placeholder:"e.g. Flat rent"},
  ];
  const handleSave = (vals) => {
    const item = {label:vals.label, amount:parseFloat(vals.amount)||0, note:vals.note};
    if(editing) onUpdate(mode,item); else onAdd(item);
    setMode(null);
  };
  return (
    <div id="plan-fixed">
      <SectionCard icon="🏠" title="Fixed Monthly Expenses" color={C.red} total={totalFixed}>
        {items.map((x,i)=>(
          <ItemRow key={x.id} label={x.label} amount={x.amount} sublabel={x.note}
            color={C.red} isLast={i===items.length-1 && mode===null}
            onEdit={()=>setMode(x.id)}
            onDelete={()=>{if(window.confirm(`Delete "${x.label}"?`))onDelete(x.id);}}/>
        ))}
        {mode==="add" && <InlineForm key="add" title="Add Fixed Expense" fields={FIELDS} onSave={handleSave} onCancel={()=>setMode(null)}/>}
        {editing    && <InlineForm key={mode} title="Edit Fixed Expense" fields={FIELDS.map(f=>({...f,default:editing[f.key]??""}))} onSave={handleSave} onCancel={()=>setMode(null)}/>}
        {mode===null && <AddButton onClick={()=>setMode("add")} label="Add Fixed Expense"/>}
      </SectionCard>
    </div>
  );
}

// ── SAVINGS ───────────────────────────────────────────────────────────────────
const SAVINGS_LABELS = ["Mutual Fund SIP","Recurring Deposit","Emergency Fund","Retirement","PPF","NPS","Other Savings"];

export function SavingsSection({plans, totalSavings, onAdd, onUpdate, onDelete}) {
  const [mode, setMode] = useState(null);
  const editing = typeof mode==="number" ? plans.find(x=>x.id===mode) : null;
  const FIELDS = [
    {key:"label",  label:"Type",               required:true, type:"select", options:SAVINGS_LABELS.map(l=>({value:l,label:l}))},
    {key:"amount", label:"Monthly Amount (₹)", required:true, type:"number", placeholder:"e.g. 5000"},
    {key:"note",   label:"Note (optional)",                                  placeholder:"e.g. HDFC Flexi Cap"},
  ];
  const handleSave = (vals) => {
    const item = {label:vals.label, amount:parseFloat(vals.amount)||0, note:vals.note};
    if(editing) onUpdate(mode,item); else onAdd(item);
    setMode(null);
  };
  return (
    <div id="plan-savings">
      <SectionCard icon="📈" title="Savings & Investments" color={C.blue} total={totalSavings}>
        {plans.map((x,i)=>(
          <ItemRow key={x.id} label={x.label} amount={x.amount} sublabel={x.note}
            color={C.blue} isLast={i===plans.length-1 && mode===null}
            onEdit={()=>setMode(x.id)}
            onDelete={()=>{if(window.confirm(`Delete "${x.label}"?`))onDelete(x.id);}}/>
        ))}
        {mode==="add" && <InlineForm key="add" title="Add Savings Plan" fields={FIELDS} onSave={handleSave} onCancel={()=>setMode(null)}/>}
        {editing    && <InlineForm key={mode} title="Edit Savings Plan" fields={FIELDS.map(f=>({...f,default:editing[f.key]??""}))} onSave={handleSave} onCancel={()=>setMode(null)}/>}
        {mode===null && <AddButton onClick={()=>setMode("add")} label="Add Savings Plan"/>}
      </SectionCard>
    </div>
  );
}

// ── FUTURE PAYMENTS ───────────────────────────────────────────────────────────
const FREQ_OPTIONS = [
  {value:"yearly",label:"Yearly"},
  {value:"halfyearly",label:"Half-Yearly"},
  {value:"quarterly",label:"Quarterly"},
];
const nextMonthDate = () => {
  const d=new Date(); d.setMonth(d.getMonth()+1);
  return d.toISOString().split("T")[0];
};

export function FuturePaymentsSection({payments, totalReserve, onAdd, onUpdate, onDelete}) {
  const [mode, setMode] = useState(null);
  const editing = typeof mode==="number" ? payments.find(x=>x.id===mode) : null;
  const FIELDS = [
    {key:"label",       label:"Payment Name",     required:true,                         placeholder:"e.g. Car Insurance"},
    {key:"totalAmount", label:"Total Amount (₹)", required:true, type:"number",          placeholder:"e.g. 12000"},
    {key:"frequency",   label:"Frequency",        required:true, type:"select", default:"yearly", options:FREQ_OPTIONS},
    {key:"nextDate",    label:"Next Due Date",    required:true, type:"date",   default:nextMonthDate()},
    {key:"note",        label:"Note (optional)",                                         placeholder:"e.g. LIC Policy"},
  ];
  const handleSave = (vals) => {
    const item = {label:vals.label, totalAmount:parseFloat(vals.totalAmount)||0, frequency:vals.frequency, nextDate:vals.nextDate, note:vals.note};
    if(editing) onUpdate(mode,item); else onAdd(item);
    setMode(null);
  };
  const freqLabel = (f) => ({yearly:"Yearly",halfyearly:"Half-Yearly",quarterly:"Quarterly"}[f]||f);
  const daysUntil = (ds) => Math.max(0, Math.round((new Date(ds+"T00:00:00")-new Date())/(1000*60*60*24)));

  return (
    <SectionCard icon="📅" title="Future Payment Reserve" color={C.purple} total={totalReserve}>
      {payments.map((p,i)=>{
        const monthly = calcMonthlyReserve(p);
        const days    = daysUntil(p.nextDate);
        const urgency = days<30?C.red:days<90?C.amber:C.purple;
        const isLast  = i===payments.length-1 && mode===null;
        return (
          <div key={p.id} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"7px 0",
            borderBottom: isLast ? "none" : `1px solid ${C.border}22`,
            gap:8,
          }}>
            <div style={{flex:1, minWidth:0}}>
              <p style={{fontSize:13, fontWeight:700, color:C.ink, margin:0,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{p.label}</p>
              <div style={{display:"flex", alignItems:"center", gap:6, marginTop:3, flexWrap:"wrap"}}>
                <p style={{fontSize:10, color:C.muted, margin:0}}>
                  {fmt(p.totalAmount)} · {freqLabel(p.frequency)} · {days}d away
                  {p.note ? ` · ${p.note}` : ""}
                </p>
                <span style={{
                  background:`${urgency}10`, border:`1px solid ${urgency}30`,
                  borderRadius:99, padding:"1px 7px",
                  fontSize:10, color:urgency, fontWeight:700,
                }}>
                  {fmt(monthly)}/mo
                </span>
              </div>
            </div>
            <DotMenu
              onEdit={()=>setMode(p.id)}
              onDelete={()=>{if(window.confirm(`Delete "${p.label}"?`))onDelete(p.id);}}
            />
          </div>
        );
      })}
      {mode==="add" && <InlineForm key="add" title="Add Future Payment" fields={FIELDS} onSave={handleSave} onCancel={()=>setMode(null)}/>}
      {editing    && <InlineForm key={mode} title="Edit Future Payment" fields={FIELDS.map(f=>({...f,default:editing[f.key]??f.default??""}))} onSave={handleSave} onCancel={()=>setMode(null)}/>}
      {mode===null && <AddButton onClick={()=>setMode("add")} label="Add Future Payment"/>}
    </SectionCard>
  );
}
