// ─── App.jsx — Full financial planning integration ─────────────────────
import { useState, useMemo, useRef, useEffect } from "react";
import InsightCard      from "./InsightCard";
import SpendingChart    from "./SpendingChart";
import { useStreak }    from "./useStreak";
import { useAppData, currentMonthKey, monthKeyToLabel, getActiveMonthKeys } from "./useAppData";
import BudgetDashboard  from "./BudgetDashboard";
import { IncomeSources, FixedExpensesSection, SavingsSection, FuturePaymentsSection } from "./FinancialPlan";

const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const getGreeting = (name) => {
  const h = new Date().getHours();
  const t = h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  return name ? `${t}, ${name}` : t;
};
const groupByDate = (expenses) => {
  const groups = {}; const today = new Date().toISOString().split("T")[0];
  const yest = new Date(); yest.setDate(yest.getDate()-1); const yestStr = yest.toISOString().split("T")[0];
  [...expenses].reverse().forEach(e => {
    const d = e.date.split("T")[0];
    const l = d===today?"Today":d===yestStr?"Yesterday":new Date(d).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"});
    if(!groups[l]) groups[l]=[];
    groups[l].push(e);
  });
  return groups;
};

// Fix #2: Only variable/daily categories in the log form.
// Fixed expenses are managed exclusively in the Plan tab.
const VARIABLE_CATS = [{name:"Food",icon:"🍽"},{name:"Travel",icon:"🚗"},{name:"Coffee",icon:"☕"},{name:"Grocery",icon:"🛒"},{name:"Medical",icon:"💊"},{name:"Entertainment",icon:"🎬"},{name:"Other",icon:"💸"}];
const NOTE_PLACEHOLDER = {Food:"e.g. Lunch at Zomato",Travel:"e.g. Auto to office",Coffee:"e.g. Starbucks coffee",Grocery:"e.g. Vegetables from market",Medical:"e.g. Pharmacy medicines",Entertainment:"e.g. Movie tickets",Other:"e.g. Misc expense"};
// ICONS keeps fixed cats too so existing logged entries render correctly
const FIXED_ICONS   = {Rent:"🏠",Electricity:"⚡",Water:"💧",Internet:"📶","EMI/Loan":"🏦",Insurance:"🛡",Maintenance:"🔧","School Fees":"🎓"};
const ICONS         = {...Object.fromEntries(VARIABLE_CATS.map(c=>[c.name,c.icon])), ...FIXED_ICONS};
const C = {ink:"#1C1917",muted:"#78716C",border:"#E7E5E0",bg:"#F7F5F0",red:"#DC2626",green:"#16A34A",amber:"#D97706",blue:"#2563EB",purple:"#7C3AED"};

// Responsive CSS injected once into <head> equivalent via a style tag in the app shell
const APP_CSS = `
  /* Plan tab: 2-col desktop, 1-col mobile */
  .mc-plan-top  { display:grid; grid-template-columns:1fr; gap:0; }
  .mc-plan-full { width:100%; }
  @media(min-width:768px){
    .mc-plan-top { grid-template-columns:1fr 1fr; gap:12px; }
  }
  /* Expense rows: compact */
  .mc-expense-row { display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #F7F5F0; gap:8px; }
  .mc-expense-row:last-child { border-bottom:none; }
  /* Scrollable tabs — hide scrollbar */
  .mc-tabs::-webkit-scrollbar { display:none; }
`;

// ─── SHARED UI ────────────────────────────────────────────────────────────
const Label = ({children}) => <p style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"1.1px",fontWeight:600,margin:0}}>{children}</p>;
function ProgressBar({pct}) {
  const color = pct<60?C.green:pct<85?C.amber:C.red;
  return <div style={{height:6,borderRadius:99,background:C.border,marginTop:10,overflow:"hidden"}}><div style={{height:"100%",borderRadius:99,width:`${Math.min(pct,100)}%`,background:color,transition:"width 0.5s"}} /></div>;
}
function StreakBadge({streak}) {
  if(!streak) return null;
  return <div style={{display:"flex",alignItems:"center",gap:4,background:"#FFF7ED",border:"1px solid #FDBA74",borderRadius:99,padding:"4px 10px"}}><span style={{fontSize:14}}>🔥</span><span style={{fontSize:12,fontWeight:700,color:"#EA580C"}}>{streak}</span></div>;
}

// ─── MONTH SELECTOR ───────────────────────────────────────────────────────
function MonthSelector({selectedMonth,onChange,allExpenses}) {
  const keys=getActiveMonthKeys(allExpenses), cur=currentMonthKey();
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
      <select value={selectedMonth} onChange={e=>onChange(e.target.value)}
        style={{padding:"7px 30px 7px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,background:`#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378716C' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`,fontFamily:"inherit",fontSize:13,fontWeight:600,color:C.ink,cursor:"pointer",outline:"none",appearance:"none"}}>
        {keys.map(k=><option key={k} value={k}>{monthKeyToLabel(k)}{k===cur?" (Current)":""}</option>)}
      </select>
      {selectedMonth===cur
        ? <span style={{fontSize:11,background:"#F0FDF4",color:C.green,border:"1px solid #86EFAC",borderRadius:99,padding:"4px 10px",fontWeight:600}}>📅 This Month</span>
        : <span style={{fontSize:11,color:C.muted}}>Viewing past data · read-only</span>}
    </div>
  );
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────
function EditModal({expense,monthKey,onSave,onClose}) {
  const [amount,setAmount]=useState(String(expense.amount));
  const [label,setLabel]=useState(expense.label);
  const [note,setNote]=useState(expense.note||"");
  const save=()=>{const v=parseFloat(amount);if(!v||v<=0)return;onSave(monthKey,expense.id,{amount:v,label,note:note.trim()});onClose();};
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:420,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontSize:16,fontWeight:700,color:C.ink,margin:0}}>Edit Expense</p>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.muted}}>✕</button>
        </div>
        <Label>Amount (₹) *</Label>
        <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} autoFocus
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:20,fontFamily:"Georgia,serif",background:C.bg,outline:"none",marginTop:6,marginBottom:12,boxSizing:"border-box"}} />
        <Label>Category</Label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6,marginBottom:12}}>
          {VARIABLE_CATS.map(c=><button key={c.name} onClick={()=>setLabel(c.name)} style={{padding:"5px 11px",borderRadius:99,border:`1.5px solid ${label===c.name?C.ink:C.border}`,background:label===c.name?C.ink:"#fff",color:label===c.name?"#fff":C.ink,fontSize:11,fontFamily:"inherit",fontWeight:600,cursor:"pointer"}}>{c.icon} {c.name}</button>)}
        </div>
        <Label>Note (optional)</Label>
        <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note"
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:14,background:C.bg,outline:"none",marginTop:6,marginBottom:14,boxSizing:"border-box"}} />
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:11,borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",color:C.muted,fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} style={{flex:2,padding:11,borderRadius:10,border:"none",background:C.ink,color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save Changes ✓</button>
        </div>
      </div>
    </div>
  );
}

// ─── 3-DOT MENU (reused in expense list) ─────────────────────────────────
function ExpenseDotMenu({onEdit, onDelete}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);
  return (
    <div ref={ref} style={{position:"relative",flexShrink:0}}>
      <button onClick={()=>setOpen(p=>!p)}
        style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:open?C.bg:"#fff",color:C.muted,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",lineHeight:1}}
        title="Options">⋮</button>
      {open && (
        <div style={{position:"absolute",right:0,top:32,zIndex:50,background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",minWidth:110,overflow:"hidden"}}>
          <button onClick={()=>{setOpen(false);onEdit();}}
            style={{display:"block",width:"100%",padding:"10px 14px",textAlign:"left",background:"none",border:"none",fontSize:13,color:C.ink,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}
            onMouseEnter={e=>e.target.style.background=C.bg} onMouseLeave={e=>e.target.style.background="none"}>
            ✏️ Edit</button>
          <div style={{height:1,background:C.border,margin:"0 8px"}} />
          <button onClick={()=>{setOpen(false);onDelete();}}
            style={{display:"block",width:"100%",padding:"10px 14px",textAlign:"left",background:"none",border:"none",fontSize:13,color:C.red,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}
            onMouseEnter={e=>e.target.style.background="#FFF1F2"} onMouseLeave={e=>e.target.style.background="none"}>
            🗑 Delete</button>
        </div>
      )}
    </div>
  );
}

// ─── DATE-FILTERED EXPENSE LIST ──────────────────────────────────────────
function ExpenseList({expenses, monthKey, onEdit, onDelete, isCurrentMonth}) {
  const todayStr     = new Date().toISOString().split("T")[0];
  const yesterdayStr = (() => { const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().split("T")[0]; })();

  // mode: "today" | "yesterday" | "pick"
  // pickedDate: "YYYY-MM-DD" string
  const [mode,       setMode]       = useState("today");
  const [pickedDate, setPickedDate] = useState(todayStr);
  const [editTarget, setEditTarget] = useState(null);

  // Which date are we showing?
  const activeDate =
    mode === "today"     ? todayStr :
    mode === "yesterday" ? yesterdayStr :
    pickedDate;

  // Filter to that date only
  const filtered = useMemo(
    () => expenses.filter(e => e.date.split("T")[0] === activeDate),
    [expenses, activeDate]
  );
  const dayTotal = filtered.reduce((s,e) => s+e.amount, 0);

  // Label for the date pill
  const dateLabel =
    activeDate === todayStr     ? "Today" :
    activeDate === yesterdayStr ? "Yesterday" :
    new Date(activeDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});

  // All unique dates that have expenses (for the calendar min/max)
  const allDates = [...new Set(expenses.map(e=>e.date.split("T")[0]))].sort();
  const minDate  = allDates[0] || todayStr;

  return (
    <>
      {editTarget && (
        <EditModal expense={editTarget} monthKey={monthKey}
          onSave={onEdit} onClose={()=>setEditTarget(null)} />
      )}

      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",overflow:"hidden"}}>

        {/* ── Header row: title + date selector ── */}
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.bg}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
          <div>
            <p style={{margin:0,fontSize:14,fontWeight:700,color:C.ink}}>Expense History</p>
            {dayTotal > 0 && (
              <p style={{margin:0,fontSize:10,color:C.muted}}>
                {dateLabel} · <span style={{color:C.red,fontWeight:700}}>{fmt(dayTotal)}</span> total
              </p>
            )}
          </div>

          {/* Date selector pills */}
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            {[
              {key:"today",     label:"Today"},
              {key:"yesterday", label:"Yesterday"},
            ].map(opt => (
              <button key={opt.key} onClick={()=>setMode(opt.key)}
                style={{
                  padding:"5px 11px", borderRadius:99, cursor:"pointer",
                  fontFamily:"inherit", fontSize:11, fontWeight:600,
                  border:`1.5px solid ${mode===opt.key?C.ink:C.border}`,
                  background: mode===opt.key?C.ink:"#fff",
                  color: mode===opt.key?"#fff":C.muted,
                  transition:"all 0.12s",
                }}>
                {opt.label}
              </button>
            ))}

            {/* Calendar date picker — styled to match */}
            <label style={{position:"relative",cursor:"pointer"}}>
              <button
                onClick={()=>setMode("pick")}
                style={{
                  padding:"5px 11px", borderRadius:99, cursor:"pointer",
                  fontFamily:"inherit", fontSize:11, fontWeight:600,
                  border:`1.5px solid ${mode==="pick"?C.ink:C.border}`,
                  background: mode==="pick"?C.ink:"#fff",
                  color: mode==="pick"?"#fff":C.muted,
                  pointerEvents:"none",   // click handled by the label
                }}>
                {mode==="pick"
                  ? new Date(pickedDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})
                  : "📅 Pick date"}
              </button>
              <input type="date"
                value={pickedDate}
                min={minDate}
                max={todayStr}
                onChange={e=>{ setPickedDate(e.target.value); setMode("pick"); }}
                style={{
                  position:"absolute", inset:0, opacity:0,
                  cursor:"pointer", width:"100%",
                }} />
            </label>
          </div>
        </div>

        {/* ── Transaction rows ── */}
        <div style={{padding:"0 14px"}}>
          {filtered.length === 0 ? (
            <div style={{textAlign:"center",padding:"28px 0"}}>
              <p style={{fontSize:26,margin:"0 0 6px"}}>📭</p>
              <p style={{color:C.muted,fontSize:13,margin:0}}>No expenses on {dateLabel.toLowerCase()}.</p>
            </div>
          ) : (
            filtered.map((e, i) => (
              <div key={e.id} className="mc-expense-row"
                style={{borderBottom: i<filtered.length-1?`1px solid ${C.bg}`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                  <div style={{width:30,height:30,borderRadius:8,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                    {ICONS[e.label]||"💸"}
                  </div>
                  <div style={{minWidth:0,flex:1}}>
                    <p style={{fontSize:12,fontWeight:600,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",margin:0}}>
                      {e.label}{e.note?` · ${e.note}`:""}
                    </p>
                    <p style={{fontSize:10,color:C.muted,margin:0}}>
                      {new Date(e.date).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                    </p>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <span style={{fontSize:13,fontWeight:700,color:C.red,fontFamily:"Georgia,serif"}}>{fmt(e.amount)}</span>
                  {isCurrentMonth && (
                    <ExpenseDotMenu
                      onEdit={()=>setEditTarget(e)}
                      onDelete={()=>{ if(window.confirm("Delete this expense?")) onDelete(monthKey,e.id); }} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer: total for the day ── */}
        {filtered.length > 0 && (
          <div style={{padding:"9px 14px",borderTop:`1px solid ${C.bg}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{margin:0,fontSize:10,color:C.muted}}>{filtered.length} transaction{filtered.length!==1?"s":""} · {dateLabel}</p>
            <p style={{margin:0,fontSize:14,fontWeight:700,color:C.red,fontFamily:"Georgia,serif"}}>{fmt(dayTotal)}</p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── LOG EXPENSE FORM ─────────────────────────────────────────────────────
function LogExpenseForm({onAdd,disabled}) {
  const [amount,setAmount]=useState("");
  const [label,setLabel]=useState("Food");
  const [note,setNote]=useState("");
  const submit=()=>{const v=parseFloat(amount.replace(/,/g,""));if(!v||v<=0||disabled)return;onAdd({amount:v,label,note:note.trim()});setAmount("");setNote("");};
  const chip=(cat)=><button key={cat.name} onClick={()=>!disabled&&setLabel(cat.name)} disabled={disabled}
    style={{padding:"5px 11px",borderRadius:99,border:`1.5px solid ${label===cat.name?C.ink:C.border}`,background:label===cat.name?C.ink:"#fff",color:label===cat.name?"#fff":C.ink,fontSize:11,fontFamily:"inherit",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",opacity:disabled?0.5:1}}>
    {cat.icon} {cat.name}</button>;
  return (
    <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",padding:18,opacity:disabled?0.65:1}}>
      <p style={{fontSize:15,fontWeight:700,color:C.ink,margin:"0 0 14px"}}>+ Log Daily Expense</p>
      {disabled&&<div style={{marginBottom:10,padding:"7px 11px",borderRadius:8,background:"#FFFBEB",border:"1px solid #FCD34D",fontSize:12,color:C.amber}}>⚠️ Switch to current month to add expenses.</div>}
      <Label>Amount (₹) *</Label>
      <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 250" disabled={disabled}
        onKeyDown={e=>e.key==="Enter"&&submit()}
        style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"Georgia,serif",fontSize:20,background:C.bg,outline:"none",marginTop:6,marginBottom:12,boxSizing:"border-box"}} />
      {/* Fix #2: Only daily/variable categories — fixed expenses managed in Plan tab */}
      <Label>Category</Label>
      <p style={{fontSize:11,color:C.muted,margin:"2px 0 6px"}}>For fixed bills like Rent or EMI, use the <strong>Plan tab</strong>.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{VARIABLE_CATS.map(chip)}</div>
      <Label>Note (optional)</Label>
      <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder={NOTE_PLACEHOLDER[label]||"e.g. Misc expense"} disabled={disabled}
        style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:14,background:C.bg,outline:"none",marginTop:6,marginBottom:10,boxSizing:"border-box"}} />
      <button onClick={submit} disabled={disabled} style={{width:"100%",padding:"10px",borderRadius:10,background:C.ink,color:"#fff",border:"none",fontSize:14,fontFamily:"inherit",fontWeight:700,cursor:"pointer",opacity:disabled?0.5:1}}>Save Expense ✓</button>
    </div>
  );
}

// ─── ONBOARDING — multi-step ──────────────────────────────────────────────
function OnboardingScreen({onComplete}) {
  const [step,setStep]    = useState(1); // 1=name, 2=income sources
  const [name,setName]    = useState("");
  const [sources,setSources] = useState([{id:1,label:"Salary",amount:""}]);

  const addSource    = ()    => setSources(p=>[...p,{id:Date.now(),label:"Salary",amount:""}]);
  const removeSource = (id)  => setSources(p=>p.filter(s=>s.id!==id));
  const updateSource = (id,k,v) => setSources(p=>p.map(s=>s.id===id?{...s,[k]:v}:s));

  const INCOME_LABELS = ["Salary","Freelance","Rental Income","Business Income","Other Income"];

  const go = () => {
    const valid = sources.filter(s=>parseFloat(s.amount)>0);
    if(valid.length===0) return;
    onComplete({name:name.trim(), incomeSources:valid.map(s=>({...s,amount:parseFloat(s.amount)||0}))});
  };

  const totalPreview = sources.reduce((s,x)=>s+(parseFloat(x.amount)||0),0);

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:480}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:52,marginBottom:10}}>💰</div>
          <h1 style={{fontSize:28,fontWeight:700,color:C.ink,fontFamily:"Georgia,serif",letterSpacing:-1,margin:0}}>Money Coach</h1>
          <p style={{marginTop:8,color:C.muted,fontSize:14,lineHeight:1.7}}>Smart daily spending. Real financial planning.</p>
        </div>

        <div style={{background:"#fff",borderRadius:16,border:`1px solid ${C.border}`,padding:24}}>
          {step===1 && (<>
            <p style={{fontSize:16,fontWeight:700,color:C.ink,marginBottom:16}}>👋 Let's get started</p>
            <Label>Your Name (optional)</Label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your Name"
              style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:14,background:C.bg,outline:"none",marginTop:6,marginBottom:20,boxSizing:"border-box"}} />
            <button onClick={()=>setStep(2)} style={{width:"100%",padding:13,borderRadius:12,background:C.ink,color:"#fff",border:"none",fontSize:15,fontFamily:"inherit",fontWeight:700,cursor:"pointer"}}>Next → Add Income Sources</button>
          </>)}

          {step===2 && (<>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <button onClick={()=>setStep(1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted}}>←</button>
              <p style={{fontSize:16,fontWeight:700,color:C.ink,margin:0}}>💰 Your Income Sources</p>
            </div>
            <p style={{fontSize:13,color:C.muted,marginBottom:14,lineHeight:1.6}}>Add all monthly income. You can edit these anytime from the Plan tab.</p>
            {sources.map((s,i)=>(
              <div key={s.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:10,alignItems:"end"}}>
                <div>
                  {i===0&&<Label>Source</Label>}
                  <select value={s.label} onChange={e=>updateSource(s.id,"label",e.target.value)}
                    style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:13,background:"#fff",outline:"none",marginTop:i===0?4:0}}>
                    {INCOME_LABELS.map(l=><option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  {i===0&&<Label>Monthly Amount (₹)</Label>}
                  <input type="number" value={s.amount} onChange={e=>updateSource(s.id,"amount",e.target.value)} placeholder="e.g. 50000"
                    style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"Georgia,serif",fontSize:14,background:"#fff",outline:"none",marginTop:i===0?4:0,boxSizing:"border-box"}} />
                </div>
                <button onClick={()=>removeSource(s.id)} style={{padding:"9px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:"#fff",color:C.muted,cursor:"pointer",fontSize:14,alignSelf:"end"}}>✕</button>
              </div>
            ))}
            <button onClick={addSource} style={{width:"100%",padding:"9px",borderRadius:10,border:`1.5px dashed ${C.border}`,background:"transparent",color:C.muted,fontSize:13,fontFamily:"inherit",cursor:"pointer",fontWeight:600,marginBottom:16}}>+ Add Another Source</button>
            {totalPreview>0&&(
              <div style={{background:"#F0FDF4",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid #86EFAC"}}>
                <span style={{fontSize:13,color:C.green,fontWeight:600}}>Total Monthly Income</span>
                <span style={{fontSize:18,fontWeight:700,color:C.green,fontFamily:"Georgia,serif"}}>{fmt(totalPreview)}</span>
              </div>
            )}
            <button onClick={go} style={{width:"100%",padding:13,borderRadius:12,background:C.ink,color:"#fff",border:"none",fontSize:15,fontFamily:"inherit",fontWeight:700,cursor:"pointer"}}>Start Tracking →</button>
          </>)}
        </div>
        <p style={{textAlign:"center",marginTop:12,fontSize:12,color:C.muted}}>All data stays on your device.</p>
      </div>
    </div>
  );
}

// ─── SUMMARY STRIP ────────────────────────────────────────────────────────
function SummaryStrip({totalIncome,remaining,expenses,dailyLimit}) {
  const monthSpent = expenses.reduce((s,e)=>s+e.amount,0);
  const remColor   = remaining<0?C.red:remaining<totalIncome*0.1?C.amber:C.green;
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:16}}>
      {[
        {label:"Total Income",  value:fmt(totalIncome), color:C.green},
        {label:"Month Spent",   value:fmt(monthSpent),  color:C.red},
        {label:"Remaining",     value:remaining>=0?fmt(remaining):`−${fmt(remaining)}`, color:remColor},
        {label:"Daily Limit",   value:dailyLimit>0?fmt(dailyLimit):"₹0", color:C.ink},
      ].map(t=>(
        <div key={t.label} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,padding:"12px 14px"}}>
          <p style={{margin:0,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:600}}>{t.label}</p>
          <p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:t.color,fontFamily:"Georgia,serif"}}>{t.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
function DashboardScreen(props) {
  const {
    name, totalIncome, totalFixed, totalSavings, totalReserve, remaining, dailyLimit,
    incomeSources, fixedExpenses, savingsPlans, futurePayments,
    allExpenses, checkIns,
    addIncomeSource, updateIncomeSource, deleteIncomeSource,
    addFixedExpense,  updateFixedExpense,  deleteFixedExpense,
    addSavingsPlan,   updateSavingsPlan,   deleteSavingsPlan,
    addFuturePayment, updateFuturePayment, deleteFuturePayment,
    addExpense, editExpense, deleteExpense, addCheckIn, resetAll,
  } = props;

  const [selectedMonth,setSelectedMonth] = useState(currentMonthKey());
  const [toast,setToast]                 = useState(null);
  const [tab,setTab]                     = useState("budget");

  const isCurrentMonth  = selectedMonth===currentMonthKey();
  const expenses        = useMemo(()=>allExpenses[selectedMonth]||[],[allExpenses,selectedMonth]);
  const currentExpenses = useMemo(()=>allExpenses[currentMonthKey()]||[],[allExpenses]);

  const {streak,bestStreak,zeroDays,totalDays,todayCheckedIn,todaySpend,todayUnderBudget,recordZeroSpend,recordSpendDay}
    = useStreak(dailyLimit, currentExpenses, checkIns, addCheckIn);

  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(null),2500);};

  const handleAdd=({amount,label,note})=>{
    addExpense({id:Date.now(),amount,label,note,date:new Date().toISOString()});
    recordSpendDay();
    setSelectedMonth(currentMonthKey());
    showToast(`${fmt(amount)} saved under ${label} ✓`);
  };

  // Fix #1: Check-In tab removed — streak lives in Home tab
  const TABS=[
    {key:"budget",    label:"📊 Dashboard"},
    {key:"plan",      label:"🗂 Plan"},
    {key:"home",      label:"🏠 Expenses"},
    {key:"charts",    label:"🥧 Charts"},
    {key:"insight",   label:"💡 Insights"},
  ];

  const MonthBar=()=><MonthSelector selectedMonth={selectedMonth} onChange={setSelectedMonth} allExpenses={allExpenses}/>;

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column"}}>
      <style>{APP_CSS}</style>
      {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:C.ink,color:"#fff",padding:"9px 20px",borderRadius:99,fontSize:13,zIndex:9999,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.18)",animation:"fadeUp 0.2s ease"}}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
        {toast}</div>}

      {/* Nav */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"#fff",borderBottom:`1px solid ${C.border}`,width:"100%"}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"1.1px",fontWeight:600,marginBottom:3}}>
              {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"})}
            </p>
            <h1 style={{fontSize:17,fontWeight:700,color:C.ink,fontFamily:"Georgia,serif",margin:0}}>{getGreeting(name)} 👋</h1>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <StreakBadge streak={streak}/>
            <button onClick={()=>{if(window.confirm("Delete ALL data permanently?"))resetAll();}}
              style={{background:"#FFF1F2",border:"1px solid #FCA5A5",borderRadius:8,padding:"6px 12px",fontSize:12,color:C.red,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>🗑 Reset</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:"#fff",borderBottom:`1px solid ${C.border}`,width:"100%",overflowX:"auto",scrollbarWidth:"none"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",padding:"0 12px"}}>
          {TABS.map(({key,label})=>(
            <button key={key} onClick={()=>setTab(key)} style={{flex:"0 0 auto",padding:"12px 14px",background:"none",border:"none",borderBottom:`2.5px solid ${tab===key?C.ink:"transparent"}`,fontSize:12,fontFamily:"inherit",color:tab===key?C.ink:C.muted,cursor:"pointer",whiteSpace:"nowrap",fontWeight:tab===key?700:400,transition:"all 0.15s"}}>{label}</button>
          ))}
        </div>
      </div>

      <main style={{flex:1,width:"100%",maxWidth:1200,margin:"0 auto",padding:"20px 16px 80px"}}>

        {/* ══ BUDGET DASHBOARD ══ */}
        {tab==="budget"&&(
          <>
            <p style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.6}}>
              Financial overview for {new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})}.
            </p>
            <BudgetDashboard
              totalIncome={totalIncome} totalFixed={totalFixed}
              totalSavings={totalSavings} totalReserve={totalReserve}
              remaining={remaining} dailyLimit={dailyLimit}
              incomeSources={incomeSources} fixedExpenses={fixedExpenses}
              savingsPlans={savingsPlans} futurePayments={futurePayments}
              currentExpenses={currentExpenses} />
          </>
        )}

        {/* ══ PLAN ══ */}
        {tab==="plan"&&(
          <>
            <p style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.6}}>
              Define your income, fixed bills, savings, and future payments. These drive your daily spending limit.
            </p>
            {/* Top row: Income (left) + Savings (right) — 2-col on desktop */}
            <div className="mc-plan-top">
              <div>
                <IncomeSources sources={incomeSources} totalIncome={totalIncome} onAdd={addIncomeSource} onUpdate={updateIncomeSource} onDelete={deleteIncomeSource}/>
              </div>
              <div>
                <SavingsSection plans={savingsPlans} totalSavings={totalSavings} onAdd={addSavingsPlan} onUpdate={updateSavingsPlan} onDelete={deleteSavingsPlan}/>
              </div>
            </div>
            {/* Full-width below: Fixed Expenses + Future Payments */}
            <div className="mc-plan-full">
              <FixedExpensesSection items={fixedExpenses} totalFixed={totalFixed} onAdd={addFixedExpense} onUpdate={updateFixedExpense} onDelete={deleteFixedExpense}/>
              <FuturePaymentsSection payments={futurePayments} totalReserve={totalReserve} onAdd={addFuturePayment} onUpdate={updateFuturePayment} onDelete={deleteFuturePayment}/>
            </div>
          </>
        )}

        {/* ══ EXPENSES / HOME ══ */}
        {tab==="home"&&(
          <>
            <SummaryStrip totalIncome={totalIncome} remaining={remaining} expenses={currentExpenses} dailyLimit={dailyLimit}/>

            {/* Fix #1: Streak merged into Home tab */}
            {streak > 0 && (
              <div style={{marginBottom:14,background:"#FFF7ED",borderRadius:12,padding:"12px 16px",border:"1px solid #FDBA74",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:22}}>🔥</span>
                  <div>
                    <p style={{fontWeight:700,color:"#EA580C",fontSize:14,margin:0}}>{streak}-day streak!</p>
                    <p style={{color:"#D97706",fontSize:11,margin:"2px 0 0"}}>Best: {bestStreak} days · Zero-spend days: {zeroDays}</p>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:11,color:"#D97706",margin:0}}>Today spent</p>
                  <p style={{fontSize:16,fontWeight:700,color:todayUnderBudget?"#16A34A":"#DC2626",fontFamily:"Georgia,serif",margin:0}}>
                    {fmt(todaySpend)}
                  </p>
                </div>
              </div>
            )}
            {streak === 0 && (
              <div style={{marginBottom:14,background:"#F0FDF4",borderRadius:12,padding:"10px 14px",border:"1px solid #86EFAC",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>🌱</span>
                <p style={{fontSize:13,color:"#16A34A",margin:0,fontWeight:500}}>Log your first expense to start your streak!</p>
              </div>
            )}

            <MonthBar/>
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:14}}>
              <LogExpenseForm onAdd={handleAdd} disabled={!isCurrentMonth}/>
              <ExpenseList expenses={expenses} monthKey={selectedMonth} onEdit={editExpense} onDelete={deleteExpense} isCurrentMonth={isCurrentMonth}/>
            </div>
          </>
        )}

        {/* Check-In tab removed — Fix #1 */}

        {/* ══ CHARTS ══ */}
        {tab==="charts"&&(
          <>
            <MonthBar/>
            <SpendingChart expenses={expenses} monthlyIncome={totalIncome}/>
          </>
        )}

        {/* ══ INSIGHTS ══ */}
        {tab==="insight"&&(
          ()=>{
            // Derive previous month key for trend comparison
            const d = new Date(); d.setMonth(d.getMonth()-1);
            const prevKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
            const prevExp = allExpenses[prevKey] || [];
            return (
              <>
                <MonthBar/>
                <InsightCard monthlyIncome={totalIncome} expenses={expenses} prevMonthExpenses={prevExp} showDetails={true}/>
              </>
            );
          }
        )()}

      </main>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const appData = useAppData();
  if(appData.screen==="onboarding") return <OnboardingScreen onComplete={appData.completeOnboarding}/>;
  return <DashboardScreen {...appData}/>;
}
