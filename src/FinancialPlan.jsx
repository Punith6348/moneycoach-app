// ─── FinancialPlan.jsx — Income, Fixed, Savings, Future Payments tabs ────
// Save to: moneycoach-app/src/FinancialPlan.jsx

import { useState } from "react";
import { calcMonthlyReserve, monthKeyToLabel } from "./useAppData";

const C = {ink:"#1C1917",muted:"#78716C",border:"#E7E5E0",bg:"#F7F5F0",red:"#DC2626",green:"#16A34A",amber:"#D97706",blue:"#2563EB",purple:"#7C3AED"};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;

const Label = ({children}) => <p style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"1.1px",fontWeight:600,margin:0}}>{children}</p>;

function SectionCard({icon, title, color, children}) {
  return (
    <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:16}}>
      <div style={{background:color+"18",borderBottom:`1px solid ${color}33`,padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>{icon}</span>
        <p style={{fontWeight:700,fontSize:15,color:C.ink,margin:0}}>{title}</p>
      </div>
      <div style={{padding:18}}>{children}</div>
    </div>
  );
}

function ItemRow({label, amount, sublabel, color="#DC2626", onEdit, onDelete}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.bg}`}}>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:13,fontWeight:600,color:C.ink,margin:0}}>{label}</p>
        {sublabel && <p style={{fontSize:11,color:C.muted,marginTop:2}}>{sublabel}</p>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <span style={{fontSize:14,fontWeight:700,color,fontFamily:"Georgia,serif"}}>{fmt(amount)}</span>
        <button onClick={onEdit} style={{background:"#F0F9FF",border:"1px solid #BAE6FD",borderRadius:6,padding:"3px 9px",fontSize:11,color:"#0284C7",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Edit</button>
        <button onClick={onDelete} style={{background:"#FFF1F2",border:"1px solid #FCA5A5",borderRadius:6,padding:"3px 9px",fontSize:11,color:C.red,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Del</button>
      </div>
    </div>
  );
}

function AddButton({onClick, label}) {
  return (
    <button onClick={onClick} style={{marginTop:12,width:"100%",padding:"10px",borderRadius:10,border:`1.5px dashed ${C.border}`,background:"transparent",color:C.muted,fontSize:13,fontFamily:"inherit",cursor:"pointer",fontWeight:600,transition:"all 0.15s"}}
      onMouseEnter={e=>{e.target.style.borderColor=C.ink;e.target.style.color=C.ink;}}
      onMouseLeave={e=>{e.target.style.borderColor=C.border;e.target.style.color=C.muted;}}>
      + {label}
    </button>
  );
}

// ── Generic inline form ───────────────────────────────────────────────────
function InlineForm({fields, onSave, onCancel, title}) {
  const init = Object.fromEntries(fields.map(f=>[f.key, f.default||""]));
  const [vals, setVals] = useState(init);
  const set = (k,v) => setVals(p=>({...p,[k]:v}));
  const save = () => {
    const required = fields.filter(f=>f.required);
    if(required.some(f=>!vals[f.key])) return;
    onSave(vals);
  };
  return (
    <div style={{background:C.bg,borderRadius:12,padding:16,marginTop:12,border:`1px solid ${C.border}`}}>
      <p style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:12}}>{title}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
        {fields.map(f=>(
          <div key={f.key}>
            <Label>{f.label}{f.required?" *":""}</Label>
            {f.type==="select" ? (
              <select value={vals[f.key]} onChange={e=>set(f.key,e.target.value)}
                style={{width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:13,background:"#fff",outline:"none"}}>
                {f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type==="date" ? (
              <input type="date" value={vals[f.key]} onChange={e=>set(f.key,e.target.value)}
                style={{width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:13,background:"#fff",outline:"none"}} />
            ) : (
              <input type={f.type||"text"} value={vals[f.key]}
                onChange={e=>set(f.key,f.type==="number"?e.target.value:e.target.value)}
                placeholder={f.placeholder||""}
                style={{width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:13,background:"#fff",outline:"none"}} />
            )}
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginTop:14}}>
        <button onClick={onCancel} style={{flex:1,padding:"9px",borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",color:C.muted,fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <button onClick={save} style={{flex:2,padding:"9px",borderRadius:10,border:"none",background:C.ink,color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save ✓</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// INCOME SOURCES
// ─────────────────────────────────────────────────────────────────────────
const INCOME_LABELS = ["Salary","Freelance","Rental Income","Business Income","Other Income"];

export function IncomeSources({sources, totalIncome, onAdd, onUpdate, onDelete}) {
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);

  const FIELDS = [
    {key:"label",label:"Source",required:true,type:"select",options:INCOME_LABELS.map(l=>({value:l,label:l}))},
    {key:"amount",label:"Monthly Amount (₹)",required:true,type:"number",placeholder:"e.g. 50000"},
    {key:"note",label:"Note (optional)",placeholder:"e.g. Net salary"},
  ];

  const handleSave = (vals) => {
    const item = {label:vals.label, amount:parseFloat(vals.amount)||0, note:vals.note};
    if(editId) { onUpdate(editId,item); setEditId(null); }
    else { onAdd(item); }
    setShowForm(false);
  };

  const editing = editId ? sources.find(s=>s.id===editId) : null;

  return (
    <SectionCard icon="💰" title="Income Sources" color={C.green}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <Label>Total Monthly Income</Label>
        <p style={{fontSize:22,fontWeight:700,color:C.green,fontFamily:"Georgia,serif",margin:0}}>{fmt(totalIncome)}</p>
      </div>
      {sources.map(s=>(
        <ItemRow key={s.id} label={s.label} amount={s.amount} sublabel={s.note} color={C.green}
          onEdit={()=>{setEditId(s.id);setShowForm(false);}} onDelete={()=>onDelete(s.id)} />
      ))}
      {showForm && !editId && (
        <InlineForm title="Add Income Source" fields={FIELDS}
          onSave={handleSave} onCancel={()=>setShowForm(false)} />
      )}
      {editId && editing && (
        <InlineForm title="Edit Income Source"
          fields={FIELDS.map(f=>({...f,default:editing[f.key]||""}))}
          onSave={handleSave} onCancel={()=>setEditId(null)} />
      )}
      {!showForm && !editId && <AddButton onClick={()=>setShowForm(true)} label="Add Income Source" />}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FIXED EXPENSES
// ─────────────────────────────────────────────────────────────────────────
const FIXED_LABELS = ["Rent","Electricity","Water","Internet","EMI/Loan","Maintenance","Groceries (estimate)","Other Fixed"];

export function FixedExpensesSection({items, totalFixed, onAdd, onUpdate, onDelete}) {
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);

  const FIELDS = [
    {key:"label",label:"Expense",required:true,type:"select",options:FIXED_LABELS.map(l=>({value:l,label:l}))},
    {key:"amount",label:"Monthly Amount (₹)",required:true,type:"number",placeholder:"e.g. 12000"},
    {key:"note",label:"Note (optional)",placeholder:"e.g. Flat rent"},
  ];

  const handleSave = (vals) => {
    const item = {label:vals.label, amount:parseFloat(vals.amount)||0, note:vals.note};
    if(editId) { onUpdate(editId,item); setEditId(null); }
    else onAdd(item);
    setShowForm(false);
  };

  const editing = editId ? items.find(x=>x.id===editId) : null;

  return (
    <SectionCard icon="🏠" title="Fixed Monthly Expenses" color={C.red}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <Label>Total Fixed</Label>
        <p style={{fontSize:22,fontWeight:700,color:C.red,fontFamily:"Georgia,serif",margin:0}}>{fmt(totalFixed)}</p>
      </div>
      {items.map(x=>(
        <ItemRow key={x.id} label={x.label} amount={x.amount} sublabel={x.note} color={C.red}
          onEdit={()=>{setEditId(x.id);setShowForm(false);}} onDelete={()=>onDelete(x.id)} />
      ))}
      {showForm && !editId && <InlineForm title="Add Fixed Expense" fields={FIELDS} onSave={handleSave} onCancel={()=>setShowForm(false)} />}
      {editId && editing && <InlineForm title="Edit Fixed Expense" fields={FIELDS.map(f=>({...f,default:editing[f.key]||""}))} onSave={handleSave} onCancel={()=>setEditId(null)} />}
      {!showForm && !editId && <AddButton onClick={()=>setShowForm(true)} label="Add Fixed Expense" />}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SAVINGS / INVESTMENTS
// ─────────────────────────────────────────────────────────────────────────
const SAVINGS_LABELS = ["Mutual Fund SIP","Recurring Deposit","Emergency Fund","Retirement","PPF","NPS","Other Savings"];

export function SavingsSection({plans, totalSavings, onAdd, onUpdate, onDelete}) {
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);

  const FIELDS = [
    {key:"label",label:"Type",required:true,type:"select",options:SAVINGS_LABELS.map(l=>({value:l,label:l}))},
    {key:"amount",label:"Monthly Amount (₹)",required:true,type:"number",placeholder:"e.g. 5000"},
    {key:"note",label:"Note (optional)",placeholder:"e.g. HDFC Flexi Cap"},
  ];

  const handleSave = (vals) => {
    const item = {label:vals.label, amount:parseFloat(vals.amount)||0, note:vals.note};
    if(editId) { onUpdate(editId,item); setEditId(null); }
    else onAdd(item);
    setShowForm(false);
  };

  const editing = editId ? plans.find(x=>x.id===editId) : null;

  return (
    <SectionCard icon="📈" title="Savings & Investments" color={C.blue}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <Label>Total Monthly Savings</Label>
        <p style={{fontSize:22,fontWeight:700,color:C.blue,fontFamily:"Georgia,serif",margin:0}}>{fmt(totalSavings)}</p>
      </div>
      {plans.map(x=>(
        <ItemRow key={x.id} label={x.label} amount={x.amount} sublabel={x.note} color={C.blue}
          onEdit={()=>{setEditId(x.id);setShowForm(false);}} onDelete={()=>onDelete(x.id)} />
      ))}
      {showForm && !editId && <InlineForm title="Add Savings Plan" fields={FIELDS} onSave={handleSave} onCancel={()=>setShowForm(false)} />}
      {editId && editing && <InlineForm title="Edit Savings Plan" fields={FIELDS.map(f=>({...f,default:editing[f.key]||""}))} onSave={handleSave} onCancel={()=>setEditId(null)} />}
      {!showForm && !editId && <AddButton onClick={()=>setShowForm(true)} label="Add Savings Plan" />}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FUTURE PAYMENTS
// ─────────────────────────────────────────────────────────────────────────
const FREQ_OPTIONS = [
  {value:"yearly",label:"Yearly"},
  {value:"halfyearly",label:"Half-Yearly"},
  {value:"quarterly",label:"Quarterly"},
];

export function FuturePaymentsSection({payments, totalReserve, onAdd, onUpdate, onDelete}) {
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);

  const FIELDS = [
    {key:"label",label:"Payment Name",required:true,placeholder:"e.g. Car Insurance"},
    {key:"totalAmount",label:"Total Amount (₹)",required:true,type:"number",placeholder:"e.g. 12000"},
    {key:"frequency",label:"Frequency",required:true,type:"select",default:"yearly",options:FREQ_OPTIONS},
    {key:"nextDate",label:"Next Due Date",required:true,type:"date",default:new Date(new Date().setMonth(new Date().getMonth()+1)).toISOString().split("T")[0]},
    {key:"note",label:"Note (optional)",placeholder:"e.g. LIC Policy"},
  ];

  const handleSave = (vals) => {
    const item = {label:vals.label, totalAmount:parseFloat(vals.totalAmount)||0, frequency:vals.frequency, nextDate:vals.nextDate, note:vals.note};
    if(editId) { onUpdate(editId,item); setEditId(null); }
    else onAdd(item);
    setShowForm(false);
  };

  const editing = editId ? payments.find(x=>x.id===editId) : null;

  const freqLabel = (f) => ({yearly:"Yearly",halfyearly:"Half-Yearly",quarterly:"Quarterly"}[f]||f);

  const daysUntil = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    return Math.max(0, Math.round(diff/(1000*60*60*24)));
  };

  return (
    <SectionCard icon="📅" title="Future Payment Reserve" color={C.purple}>
      <p style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.6}}>
        Set aside money monthly so big annual/quarterly bills don't surprise you.
      </p>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <Label>Total Monthly Reserve</Label>
        <p style={{fontSize:22,fontWeight:700,color:C.purple,fontFamily:"Georgia,serif",margin:0}}>{fmt(totalReserve)}</p>
      </div>
      {payments.map(p => {
        const monthly = calcMonthlyReserve(p);
        const days    = daysUntil(p.nextDate);
        const months  = Math.max(1,Math.round(days/30));
        return (
          <div key={p.id} style={{padding:"12px 0",borderBottom:`1px solid ${C.bg}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:700,color:C.ink,margin:0}}>{p.label}</p>
                <p style={{fontSize:11,color:C.muted,marginTop:3}}>
                  {fmt(p.totalAmount)} · {freqLabel(p.frequency)} · due in {days} days ({months} months)
                  {p.note && ` · ${p.note}`}
                </p>
                {/* Reserve pill */}
                <div style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:6,background:`${C.purple}12`,border:`1px solid ${C.purple}44`,borderRadius:99,padding:"3px 10px"}}>
                  <span style={{fontSize:12,color:C.purple,fontWeight:700}}>Save {fmt(monthly)}/month</span>
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:8,marginTop:2}}>
                <button onClick={()=>{setEditId(p.id);setShowForm(false);}} style={{background:"#F0F9FF",border:"1px solid #BAE6FD",borderRadius:6,padding:"3px 9px",fontSize:11,color:"#0284C7",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Edit</button>
                <button onClick={()=>onDelete(p.id)} style={{background:"#FFF1F2",border:"1px solid #FCA5A5",borderRadius:6,padding:"3px 9px",fontSize:11,color:C.red,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Del</button>
              </div>
            </div>
          </div>
        );
      })}
      {showForm && !editId && <InlineForm title="Add Future Payment" fields={FIELDS} onSave={handleSave} onCancel={()=>setShowForm(false)} />}
      {editId && editing && <InlineForm title="Edit Future Payment" fields={FIELDS.map(f=>({...f,default:editing[f.key]||f.default||""}))} onSave={handleSave} onCancel={()=>setEditId(null)} />}
      {!showForm && !editId && <AddButton onClick={()=>setShowForm(true)} label="Add Future Payment" />}
    </SectionCard>
  );
}
