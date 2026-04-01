// ─── App.jsx — Full financial planning integration ─────────────────────
import { useState, useMemo, useRef, useEffect } from "react";
import InsightCard      from "./InsightCard";
import SpendingChart, { TrendChart, CategoryHistoryChart } from "./SpendingChart";
import { useStreak }    from "./useStreak";
import { useAppData, currentMonthKey, monthKeyToLabel, getActiveMonthKeys } from "./useAppData";
import BudgetDashboard, { MonthCloseReport } from "./BudgetDashboard";
import { IncomeSources, FixedExpensesSection, SavingsSection, FuturePaymentsSection } from "./FinancialPlan";
import LoansTab         from "./LoansTab";
import CategoryBudgets, { BudgetAlertWidget } from "./CategoryBudgets";
import SettingsPanel    from "./SettingsPanel";
import { calcLoanTotals } from "./useAppData";

const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const getGreeting = (name) => {
  const h = new Date().getHours();
  const t = h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  return name ? `${t}, ${name}` : t;
};
const groupByDate = (expenses) => {
  const groups = {}; const order = [];
  const today = new Date().toISOString().split("T")[0];
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  const yestStr = yest.toISOString().split("T")[0];
  [...expenses].reverse().forEach(e => {
    const d = e.date.split("T")[0];
    const l = d===today?"Today":d===yestStr?"Yesterday":new Date(d).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"});
    if(!groups[l]){ groups[l]=[]; order.push(l); }
    groups[l].push(e);
  });
  return order.map(label => ({
    dateLabel: label,
    items: groups[label],
    dayTotal: groups[label].reduce((s,e)=>s+e.amount,0),
  }));
};

// Daily expense categories (shown in log form)
const VARIABLE_CATS = [{name:"Food",icon:"🍽"},{name:"Travel",icon:"🚗"},{name:"Coffee",icon:"☕"},{name:"Grocery",icon:"🛒"},{name:"Medical",icon:"💊"},{name:"Entertainment",icon:"🎬"},{name:"Other",icon:"💸"}];
// Recurring/fixed categories (used in edit modal + recurring tab)
const RECURRING_CATS = [{name:"Rent",icon:"🏠"},{name:"EMI/Loan",icon:"🏦"},{name:"Electricity",icon:"⚡"},{name:"Internet",icon:"📶"},{name:"Mobile",icon:"📱"},{name:"Insurance",icon:"🛡"},{name:"Subscription",icon:"📺"},{name:"Gym",icon:"💪"},{name:"School Fees",icon:"🎓"},{name:"Maintenance",icon:"🔧"},{name:"Water",icon:"💧"}];
// ALL categories combined — used in EditModal so any expense can be edited correctly
const ALL_CATS = [...VARIABLE_CATS, ...RECURRING_CATS];
const NOTE_PLACEHOLDER = {Food:"e.g. Lunch at Zomato",Travel:"e.g. Auto to office",Coffee:"e.g. Starbucks coffee",Grocery:"e.g. Vegetables from market",Medical:"e.g. Pharmacy medicines",Entertainment:"e.g. Movie tickets",Other:"e.g. Misc expense"};
const FIXED_ICONS   = {Rent:"🏠",Electricity:"⚡",Water:"💧",Internet:"📶","EMI/Loan":"🏦",Insurance:"🛡",Maintenance:"🔧","School Fees":"🎓",Mobile:"📱",Subscription:"📺",Gym:"💪"};
const ICONS         = {...Object.fromEntries(ALL_CATS.map(c=>[c.name,c.icon])), ...FIXED_ICONS};
const C = {ink:"#111827",muted:"#6B7280",border:"#E5E7EB",bg:"#F8FAFC",red:"#DC2626",green:"#16A34A",amber:"#D97706",blue:"#2563EB",purple:"#7C3AED"};

// Responsive CSS injected once into <head> equivalent via a style tag in the app shell
const APP_CSS = `
  /* ── Reset ── */
  html, body { margin:0; padding:0; height:100%; overflow:hidden; background:#F8FAFC; }
  #root { height:100%; }

  /* ── App shell — fills entire screen edge to edge ── */
  .mc-app {
    display:flex; flex-direction:column;
    position:fixed; inset:0;
    background:#F8FAFC;
    overflow:hidden;
  }

  /* ── Body row (sidebar + main) ── */
  .mc-body { display:flex; flex:1; min-height:0; overflow:hidden; }

  /* ── Main content area ── */
  .mc-main {
    flex:1; min-width:0;
    display:flex; flex-direction:column;
    overflow:hidden;
  }

  /* ── Scrollable content ── */
  .mc-scroll {
    flex:1;
    overflow-y:auto;
    overflow-x:hidden;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior:contain;
  }

  /* ── Content padding ── */
  .mc-content {
    padding:16px 16px 16px;
    max-width:960px;
    width:100%;
    margin:0 auto;
    box-sizing:border-box;
  }

  /* ── Mobile bottom nav — safe area aware ── */
  .mc-bnav {
    flex-shrink:0;
    background:#fff;
    border-top:1px solid #E5E7EB;
    padding-bottom:env(safe-area-inset-bottom, 0px);
  }
  .mc-bnav-inner {
    display:flex;
    height:56px;
    align-items:stretch;
  }
  .mc-bnav-item:active { opacity:0.7; }

  /* ── Sidebar ── */
  .mc-sidebar {
    width:220px; min-width:220px; background:#1E293B;
    display:flex; flex-direction:column;
    overflow-y:auto; flex-shrink:0;
    height:100%;
  }
  @media(max-width:900px){ .mc-sidebar { width:180px; min-width:180px; } }

  /* ── Mobile header safe area ── */
  .mc-mobile-header {
    flex-shrink:0;
    padding-top:env(safe-area-inset-top, 0px);
  }

  /* ── Grid helpers ── */
  .mc-plan-top  { display:grid; grid-template-columns:1fr; gap:0; }
  .mc-plan-full { width:100%; }
  @media(min-width:768px){ .mc-plan-top { grid-template-columns:1fr 1fr; gap:12px; } }

  .mc-expense-row { display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #F8FAFC; gap:8px; }
  .mc-expense-row:last-child { border-bottom:none; }

  /* ── Hide scrollbars ── */
  ::-webkit-scrollbar { display:none; }
  * { scrollbar-width:none; }

  /* ── Animations ── */
  @keyframes fadeUp  { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  @keyframes slideIn { from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:translateX(0)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

  /* ── Dark mode ── */
  [data-theme="dark"] html,
  [data-theme="dark"] body,
  [data-theme="dark"] #root { background:#0F172A; }
  [data-theme="dark"] .mc-app { background:#0F172A; }
  [data-theme="dark"] .mc-bnav { background:#1E293B; border-color:#334155; }
  [data-theme="dark"] .mc-content { color:#E2E8F0; }
  [data-theme="dark"] .mc-summary-card { background:#1E293B !important; border-color:#334155 !important; }
  [data-theme="dark"] .mc-dark-card    { background:#1E293B !important; border-color:#334155 !important; color:#E2E8F0 !important; }
  [data-theme="dark"] input, [data-theme="dark"] select, [data-theme="dark"] textarea {
    background:#1E293B !important; color:#E2E8F0 !important; border-color:#334155 !important;
  }
  [data-theme="dark"] input::placeholder { color:#475569 !important; }
`;

// Dark mode — persisted in localStorage, applied via data-theme on <html>
const DM_KEY = "mc_dark_mode";
function initDarkMode() {
  const saved = localStorage.getItem(DM_KEY);
  if (saved === "1") document.documentElement.setAttribute("data-theme","dark");
  return saved === "1";
}
function applyDarkMode(on) {
  if (on) { document.documentElement.setAttribute("data-theme","dark"); localStorage.setItem(DM_KEY,"1"); }
  else     { document.documentElement.removeAttribute("data-theme");    localStorage.setItem(DM_KEY,"0"); }
}

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

// ─── SETUP CHECKLIST ─────────────────────────────────────────────────────────
// Shows on Dashboard until all 3 items are complete OR user dismisses it.
// Dismissed state stored in localStorage so it persists across sessions.
function SetupChecklist({ totalIncome, fixedExpenses, savingsPlans, onNavigate }) {
  const DISMISS_KEY = "mc_setup_dismissed";
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISS_KEY));

  const items = [
    { id:"income",  done: totalIncome > 0,           label:"Add your income",       tab:"plan",   section:"plan-income"  },
    { id:"fixed",   done: fixedExpenses.length > 0,  label:"Add fixed bills",       tab:"plan",   section:"plan-fixed"   },
    { id:"savings", done: savingsPlans.length > 0,   label:"Add savings or SIP",    tab:"plan",   section:"plan-savings"  },
  ];
  const doneCount = items.filter(i => i.done).length;
  const allDone   = doneCount === items.length;

  // Auto-dismiss once all done
  if (allDone && !dismissed) {
    localStorage.setItem(DISMISS_KEY, "1");
    return null;
  }
  if (dismissed) return null;

  const dismiss = () => { localStorage.setItem(DISMISS_KEY, "1"); setDismissed(true); };

  return (
    <div style={{
      background:"#fff", borderRadius:12, border:`1px solid ${C.border}`,
      boxShadow:"0 1px 3px rgba(0,0,0,0.05)", marginBottom:12, overflow:"hidden",
    }}>
      <div style={{
        padding:"10px 14px", borderBottom:`1px solid ${C.bg}`,
        background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div>
          <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.ink }}>
            🚀 Complete your setup
          </p>
          <p style={{ margin:"1px 0 0", fontSize:10, color:C.muted }}>
            {doneCount} of {items.length} done · Tap any item to go there
          </p>
        </div>
        <button onClick={dismiss}
          style={{ background:"none", border:"none", fontSize:16, cursor:"pointer", color:C.muted, padding:4 }}>
          ✕
        </button>
      </div>
      <div style={{ padding:"8px 14px 10px" }}>
        {items.map((item, i) => (
          <div key={item.id}
            onClick={() => !item.done && onNavigate && onNavigate(item.tab, item.section)}
            style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"7px 0",
              borderBottom: i < items.length-1 ? `1px solid ${C.bg}` : "none",
              cursor: item.done ? "default" : "pointer",
              opacity: item.done ? 0.7 : 1,
            }}>
            <span style={{
              width:20, height:20, borderRadius:99, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background: item.done ? C.green : "#E5E7EB",
              fontSize:11, fontWeight:700,
              color: item.done ? "#fff" : C.muted,
            }}>
              {item.done ? "✓" : (i + 1)}
            </span>
            <p style={{
              margin:0, fontSize:12, fontWeight: item.done ? 400 : 600,
              color: item.done ? C.muted : C.ink,
              textDecoration: item.done ? "line-through" : "none",
            }}>
              {item.label}
            </p>
            {!item.done && (
              <span style={{ marginLeft:"auto", fontSize:11, color:C.blue, fontWeight:600 }}>
                Go →
              </span>
            )}
          </div>
        ))}
      </div>
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

// ─── MONTH SELECTOR ───────────────────────────────────────────────────────────
function MonthSelector({selectedMonth,onChange,allExpenses}) {
  const keys=getActiveMonthKeys(allExpenses), cur=currentMonthKey();
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
      <select value={selectedMonth} onChange={e=>onChange(e.target.value)}
        style={{padding:"7px 30px 7px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:600,color:C.ink,cursor:"pointer",outline:"none"}}>
        {keys.map(k=><option key={k} value={k}>{monthKeyToLabel(k)}{k===cur?" (Current)":""}</option>)}
      </select>
      {selectedMonth===cur
        ? <span style={{fontSize:11,background:"#F0FDF4",color:C.green,border:"1px solid #86EFAC",borderRadius:99,padding:"4px 10px",fontWeight:600}}>📅 This Month</span>
        : <span style={{fontSize:11,color:C.muted}}>Viewing past data · read-only</span>}
    </div>
  );
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditModal({expense,monthKey,onSave,onClose}) {
  const [amount,setAmount]=useState(String(expense.amount));
  const [label,setLabel]=useState(expense.label);
  const [note,setNote]=useState(expense.note||"");
  const existingDate=expense.date.split("T")[0];
  const [date,setDate]=useState(existingDate);
  const save=()=>{
    const v=parseFloat(amount);
    if(!v||v<=0) return;
    const origTime=expense.date.includes("T")?expense.date.split("T")[1]:"00:00:00.000Z";
    const newDate=`${date}T${origTime}`;
    onSave(monthKey,expense.id,{amount:v,label,note:note.trim(),date:newDate});
    onClose();
  };
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0"}}>
      <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"20px 20px 32px",width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,0.18)",maxHeight:"92vh",overflowY:"auto"}}>
        {/* Handle bar */}
        <div style={{width:36,height:4,borderRadius:99,background:"#E5E7EB",margin:"0 auto 16px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontSize:16,fontWeight:700,color:C.ink,margin:0}}>Edit Expense</p>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.muted}}>✕</button>
        </div>
        <Label>Amount (₹) *</Label>
        <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} autoFocus
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"Georgia,serif",fontSize:20,background:C.bg,outline:"none",marginTop:6,marginBottom:12,boxSizing:"border-box"}} />
        <Label>Category</Label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6,marginBottom:12}}>
          {ALL_CATS.map(c=><button key={c.name} onClick={()=>setLabel(c.name)} style={{padding:"5px 11px",borderRadius:99,border:`1.5px solid ${label===c.name?C.ink:C.border}`,background:label===c.name?C.ink:"#fff",color:label===c.name?"#fff":C.ink,fontSize:11,fontFamily:"inherit",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{c.icon} {c.name}</button>)}
        </div>
        <Label>Date *</Label>
        <input type="date" value={date} max={new Date().toISOString().split("T")[0]}
          onChange={e=>setDate(e.target.value)}
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:14,background:C.bg,outline:"none",marginTop:6,marginBottom:12,boxSizing:"border-box"}} />
        <Label>Note (optional)</Label>
        <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note"
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:14,background:C.bg,outline:"none",marginTop:6,marginBottom:16,boxSizing:"border-box"}} />
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:12,borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",color:C.muted,fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} style={{flex:2,padding:12,borderRadius:10,border:"none",background:C.ink,color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save Changes ✓</button>
        </div>
      </div>
    </div>
  );
}

// ─── 3-DOT MENU ───────────────────────────────────────────────────────────────
function ExpenseDotMenu({onEdit, onDelete}) {
  const [open, setOpen]   = useState(false);
  const [pos,  setPos]    = useState({top:0, right:0});
  const btnRef            = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (btnRef.current && !btnRef.current.closest('[data-dotmenu]')?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("touchstart", close); };
  }, [open]);

  const toggle = (e) => {
    e.stopPropagation();
    if (!open) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(p => !p);
  };

  return (
    <div data-dotmenu="1" style={{position:"relative",flexShrink:0}}>
      <button ref={btnRef} onClick={toggle}
        style={{background:open?"#F3F4F6":"none",
                border:`1px solid ${open?"#D1D5DB":"transparent"}`,
                cursor:"pointer",padding:"5px 10px",borderRadius:8,
                fontSize:14,color:C.muted,lineHeight:1,fontFamily:"inherit"}}>
        ···
      </button>
      {open&&(
        <div style={{
          position:"fixed", top:pos.top, right:pos.right,
          background:"#fff", borderRadius:10,
          border:`1px solid ${C.border}`,
          boxShadow:"0 8px 24px rgba(0,0,0,0.14)",
          zIndex:9999, minWidth:130, overflow:"hidden",
        }}>
          <button onClick={e=>{e.stopPropagation();setOpen(false);onEdit();}}
            style={{display:"flex",alignItems:"center",gap:8,width:"100%",
                    padding:"11px 16px",background:"none",border:"none",
                    textAlign:"left",fontSize:13,cursor:"pointer",
                    color:C.ink,fontFamily:"inherit"}}
            onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            ✏️ Edit
          </button>
          <div style={{height:1,background:"#F3F4F6"}}/>
          <button onClick={e=>{e.stopPropagation();setOpen(false);onDelete();}}
            style={{display:"flex",alignItems:"center",gap:8,width:"100%",
                    padding:"11px 16px",background:"none",border:"none",
                    textAlign:"left",fontSize:13,cursor:"pointer",
                    color:C.red,fontFamily:"inherit"}}
            onMouseEnter={e=>e.currentTarget.style.background="#FFF1F2"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── EXPENSE LIST ─────────────────────────────────────────────────────────────
function ExpenseList({expenses, monthKey, onEdit, onDelete, isCurrentMonth}) {
  const [editingExp, setEditingExp] = useState(null);
  const grouped = useMemo(() => groupByDate(expenses), [expenses]);
  if (!expenses.length) return (
    <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,textAlign:"center",padding:"40px 20px"}}>
      <p style={{fontSize:32,margin:"0 0 8px"}}>📋</p>
      <p style={{color:C.muted,fontSize:13,margin:0}}>No expenses logged{isCurrentMonth?" yet":""} for this month.</p>
    </div>
  );
  return (
    <>
      {editingExp&&<EditModal expense={editingExp} monthKey={monthKey} onSave={onEdit} onClose={()=>setEditingExp(null)}/>}
      {grouped.map(({dateLabel,items,dayTotal})=>(
        <div key={dateLabel} style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px"}}>{dateLabel}</p>
            <p style={{margin:0,fontSize:11,fontWeight:600,color:C.ink,fontFamily:"Georgia,serif"}}>−{fmt(dayTotal)}</p>
          </div>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            {items.map((e,i)=>{
              const icon=ICONS[e.label]||"💸";
              return (
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<items.length-1?`1px solid ${C.bg}`:"none"}}>
                  <div style={{width:32,height:32,borderRadius:8,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{margin:0,fontSize:13,fontWeight:600,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.label}</p>
                    {e.note&&<p style={{margin:0,fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.note}</p>}
                    {e.auto&&<p style={{margin:0,fontSize:9,color:C.blue}}>🔁 auto-logged</p>}
                  </div>
                  <p style={{margin:0,fontSize:14,fontWeight:700,color:C.red,fontFamily:"Georgia,serif",flexShrink:0}}>{fmt(e.amount)}</p>
                  {isCurrentMonth&&<ExpenseDotMenu onEdit={()=>setEditingExp(e)} onDelete={()=>{if(window.confirm(`Delete ₹${e.amount} ${e.label}?`))onDelete(monthKey,e.id);}}/>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

// ─── DATE FILTER ──────────────────────────────────────────────────────────────
function DateFilter({ expenses, onFiltered, monthKey }) {
  const today   = new Date().toISOString().split("T")[0];
  const yest    = new Date(); yest.setDate(yest.getDate()-1);
  const yestStr = yest.toISOString().split("T")[0];

  // Smart default on mount
  const initMode = expenses.some(e=>e.date.startsWith(today)) ? "today" : "custom";
  const initDate = initMode==="today" ? today :
    ([...new Set(expenses.map(e=>e.date.split("T")[0]))].sort((a,b)=>b.localeCompare(a))[0] || today);

  // ── ALL hooks declared here, before any conditional or return ──
  const [mode,    setMode]    = useState(initMode);
  const [selDate, setSelDate] = useState(initDate);
  const [calOpen, setCalOpen] = useState(false);
  const calRef                = useRef(null);

  const datesWithData = useMemo(()=>
    new Set(expenses.map(e=>e.date.split("T")[0])), [expenses]);

  // Pre-compute calendar grid data
  const [calYear, calMon] = monthKey.split("-").map(Number);
  const calFirstDay    = new Date(calYear,calMon-1,1).getDay();
  const calDaysInMonth = new Date(calYear,calMon,0).getDate();
  const calCells       = useMemo(()=>{
    const cells = [...Array(calFirstDay).fill(null),
                   ...Array.from({length:calDaysInMonth},(_,i)=>i+1)];
    while(cells.length%7!==0) cells.push(null);
    const weeks=[];
    for(let i=0;i<cells.length;i+=7) weeks.push(cells.slice(i,i+7));
    return weeks;
  }, [monthKey]);

  const showingLabel =
    mode==="today"     ? "Today" :
    mode==="yesterday" ? "Yesterday" :
    new Date(selDate+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"});

  useEffect(()=>{
    if      (mode==="today")     onFiltered(expenses.filter(e=>e.date.startsWith(today)));
    else if (mode==="yesterday") onFiltered(expenses.filter(e=>e.date.startsWith(yestStr)));
    else                         onFiltered(expenses.filter(e=>e.date.startsWith(selDate)));
  }, [mode, selDate, expenses]);

  useEffect(()=>{
    if (!calOpen) return;
    const h=(e)=>{ if(calRef.current&&!calRef.current.contains(e.target)) setCalOpen(false); };
    document.addEventListener("mousedown",h);
    document.addEventListener("touchstart",h);
    return()=>{ document.removeEventListener("mousedown",h); document.removeEventListener("touchstart",h); };
  },[calOpen]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{marginBottom:14}}>
      {/* 3 buttons */}
      <div style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
        <button onClick={()=>{setMode("today");setCalOpen(false);}} style={{
          padding:"8px 18px",borderRadius:99,fontSize:13,fontWeight:700,
          cursor:"pointer",fontFamily:"inherit",border:"none",transition:"all 0.12s",
          background:mode==="today"?C.ink:C.bg, color:mode==="today"?"#fff":C.muted,
        }}>Today</button>

        <button onClick={()=>{setMode("yesterday");setCalOpen(false);}} style={{
          padding:"8px 18px",borderRadius:99,fontSize:13,fontWeight:700,
          cursor:"pointer",fontFamily:"inherit",border:"none",transition:"all 0.12s",
          background:mode==="yesterday"?C.ink:C.bg, color:mode==="yesterday"?"#fff":C.muted,
        }}>Yesterday</button>

        {/* Calendar popup button */}
        <div ref={calRef} style={{position:"relative",marginLeft:"auto"}}>
          <button onClick={()=>setCalOpen(p=>!p)} style={{
            padding:"8px 14px",borderRadius:99,fontSize:13,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",border:"none",transition:"all 0.12s",
            display:"flex",alignItems:"center",gap:5,
            background:mode==="custom"?C.ink:C.bg,
            color:mode==="custom"?"#fff":C.muted,
          }}>
            <span>📅</span>
            <span style={{fontSize:12}}>{mode==="custom"?showingLabel:"Pick"}</span>
          </button>

          {calOpen&&(
            <div style={{
              position:"absolute",right:0,top:"calc(100% + 6px)",zIndex:9999,
              background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,
              boxShadow:"0 8px 32px rgba(0,0,0,0.14)",padding:"12px",width:256,
            }}>
              <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:C.ink,textAlign:"center"}}>
                {new Date(calYear,calMon-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"})}
              </p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
                {["S","M","T","W","T","F","S"].map((d,i)=>(
                  <p key={i} style={{margin:0,textAlign:"center",fontSize:9,fontWeight:700,color:C.muted}}>{d}</p>
                ))}
              </div>
              {calCells.map((week,wi)=>(
                <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
                  {week.map((d,di)=>{
                    if(!d) return <div key={di}/>;
                    const ds  = `${monthKey}-${String(d).padStart(2,"0")}`;
                    const has = datesWithData.has(ds);
                    const isSel = ds===selDate&&mode==="custom";
                    const isTod = ds===today;
                    const isFut = ds>today;
                    return (
                      <button key={di} onClick={()=>{
                        if(isFut||!has) return;
                        setSelDate(ds); setMode("custom"); setCalOpen(false);
                      }} style={{
                        position:"relative",padding:"7px 0",borderRadius:7,border:"none",
                        textAlign:"center",fontFamily:"inherit",fontSize:11,fontWeight:has?700:400,
                        background:isSel?"#111827":isTod?"#EFF6FF":"transparent",
                        color:isSel?"#fff":isFut?"#E5E7EB":has?C.ink:"#D1D5DB",
                        cursor:isFut||!has?"default":"pointer",
                      }}>
                        {d}
                        {has&&!isSel&&(
                          <span style={{position:"absolute",bottom:1,left:"50%",
                            transform:"translateX(-50%)",width:3,height:3,
                            borderRadius:"50%",background:"#2563EB",display:"block"}}/>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
              <p style={{margin:"8px 0 0",fontSize:9,color:C.muted,textAlign:"center"}}>
                Bold = has expenses · tap to view
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Showing label */}
      <p style={{margin:0,fontSize:11,color:C.muted}}>
        Showing: <strong style={{color:C.ink}}>{showingLabel}</strong>
      </p>
    </div>
  );
}

// ─── FILTERED EXPENSE LIST ────────────────────────────────────────────────────
function FilteredExpenseList({ expenses, monthKey, onEdit, onDelete, isCurrentMonth }) {
  const [filtered, setFiltered] = useState(expenses);
  useEffect(() => { setFiltered(expenses.filter(e=>e.date.startsWith(new Date().toISOString().split("T")[0]))); }, [expenses]);
  return (
    <>
      <DateFilter expenses={expenses} onFiltered={(f) => setFiltered(f)} monthKey={monthKey}/>
      <ExpenseList expenses={filtered} monthKey={monthKey}
        onEdit={onEdit} onDelete={onDelete} isCurrentMonth={isCurrentMonth}/>
    </>
  );
}

function LogExpenseForm({onAdd, disabled, currentExpenses=[], dailyLimit=0}) {
  const [amount,setAmount]=useState("");
  const [label,setLabel]=useState("Food");
  const [note,setNote]=useState("");
  const [err,setErr]=useState("");
  const [saved,setSaved]=useState(false);

  const todayStr   = new Date().toISOString().split("T")[0];
  const todaySpent = currentExpenses.filter(e=>e.date.startsWith(todayStr)).reduce((s,e)=>s+e.amount,0);
  const limitLeft  = dailyLimit>0?dailyLimit-todaySpent:null;
  const overLimit  = limitLeft!==null&&limitLeft<0;

  const submit=()=>{
    if(disabled) return;
    const v=parseFloat(amount);
    if(!v||v<=0||!isFinite(v)){setErr("Enter a valid amount greater than ₹0");return;}
    if(v>10000000){setErr("Amount seems unusually large — please check");return;}
    setErr("");
    onAdd({amount:v,label,note:note.trim()});
    setAmount("");
    setNote("");
    setSaved(true);
    setTimeout(()=>setSaved(false), 1500);
  };

  const chip=(cat)=><button key={cat.name} onClick={()=>!disabled&&setLabel(cat.name)} disabled={disabled}
    style={{padding:"5px 11px",borderRadius:99,border:`1.5px solid ${label===cat.name?C.ink:C.border}`,background:label===cat.name?C.ink:"#fff",color:label===cat.name?"#fff":C.ink,fontSize:11,fontFamily:"inherit",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",opacity:disabled?0.5:1}}>
    {cat.icon} {cat.name}</button>;

  return (
    <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",padding:18,opacity:disabled?0.65:1}}>
      <p style={{fontSize:15,fontWeight:700,color:C.ink,margin:"0 0 14px"}}>+ Log Daily Expense</p>
      {disabled&&<div style={{marginBottom:10,padding:"7px 11px",borderRadius:8,background:"#FFFBEB",border:"1px solid #FCD34D",fontSize:12,color:C.amber}}>⚠️ Switch to current month to add expenses.</div>}
      <Label>Amount (₹) *</Label>
      <input type="number" value={amount} min="0.01" step="any"
        onChange={e=>{setAmount(e.target.value);if(err)setErr("");}}
        placeholder="e.g. 250" disabled={disabled}
        onKeyDown={e=>e.key==="Enter"&&submit()}
        style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${err?C.red:C.border}`,fontFamily:"Georgia,serif",fontSize:20,background:C.bg,outline:"none",marginTop:6,marginBottom:err?4:12,boxSizing:"border-box"}} />
      {err&&<p style={{margin:"0 0 10px",fontSize:11,color:C.red,fontWeight:600}}>{err}</p>}
      <Label>Category</Label>
      <p style={{fontSize:11,color:C.muted,margin:"2px 0 6px"}}>For fixed bills like Rent or EMI, use the <strong>Plan tab</strong>.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{VARIABLE_CATS.map(chip)}</div>
      <Label>Note (optional)</Label>
      <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder={NOTE_PLACEHOLDER[label]||"e.g. Misc expense"} disabled={disabled}
        style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:14,background:C.bg,outline:"none",marginTop:6,marginBottom:10,boxSizing:"border-box"}} />
      {!disabled&&dailyLimit>0&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 11px",borderRadius:8,marginBottom:10,background:overLimit?"#FFF1F2":todaySpent>0?"#F0FDF4":C.bg,border:`1px solid ${overLimit?"#FECACA":todaySpent>0?"#86EFAC":C.border}`}}>
          <p style={{margin:0,fontSize:11,color:C.muted,fontWeight:500}}>{overLimit?"⚠ Over daily limit":"Today spent"}</p>
          <p style={{margin:0,fontSize:12,fontWeight:700,fontFamily:"Georgia,serif",color:overLimit?C.red:todaySpent>0?C.green:C.muted}}>
            {fmt(todaySpent)}<span style={{fontSize:10,fontWeight:400,color:C.muted,marginLeft:4}}>/ {fmt(dailyLimit)}</span>
          </p>
        </div>
      )}
      <button onClick={()=>{submit();}} disabled={disabled}
        style={{width:"100%",padding:"10px",borderRadius:10,
                background:saved?"#16A34A":C.ink,
                color:"#fff",border:"none",fontSize:14,fontFamily:"inherit",
                fontWeight:700,cursor:"pointer",opacity:disabled?0.5:1,
                transition:"background 0.2s"}}>
        {saved ? "✓ Saved!" : "Save Expense ✓"}
      </button>
    </div>
  );
}

// ─── ANNUAL SUMMARY ───────────────────────────────────────────────────────────
function AnnualSummary({ allExpenses, totalIncome, totalSavings }) {
  const now  = new Date();
  const year = now.getFullYear();

  // Build monthly data for current year
  const months = useMemo(() => {
    const result = [];
    for (let m = 1; m <= 12; m++) {
      const key   = `${year}-${String(m).padStart(2,"0")}`;
      const exps  = allExpenses[key] || [];
      const spent = exps.reduce((s,e)=>s+e.amount, 0);
      const label = new Date(year,m-1,1).toLocaleDateString("en-IN",{month:"short"});
      const isPast   = m < now.getMonth()+1;
      const isCurrent= m === now.getMonth()+1;
      result.push({ key, label, spent:Math.round(spent), count:exps.length, isPast, isCurrent, m });
    }
    return result;
  }, [allExpenses, year]);

  const activeMonths = months.filter(m=>(m.isPast||m.isCurrent)&&m.spent>0);
  const totalSpent   = activeMonths.reduce((s,m)=>s+m.spent, 0);
  const totalIncomeSoFar = totalIncome * activeMonths.length;
  const totalSavedSoFar  = totalSavings * activeMonths.length;
  const netBalance   = totalIncomeSoFar - totalSpent - totalSavedSoFar;
  const avgMonthly   = activeMonths.length > 0 ? Math.round(totalSpent/activeMonths.length) : 0;
  const bestMonth    = activeMonths.length > 0 ? activeMonths.reduce((a,b)=>a.spent<b.spent?a:b) : null;
  const worstMonth   = activeMonths.length > 0 ? activeMonths.reduce((a,b)=>a.spent>b.spent?a:b) : null;
  const maxSpent     = Math.max(...months.map(m=>m.spent), 1);

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:16}}>
        <h2 style={{margin:"0 0 2px",fontSize:17,fontWeight:700,color:C.ink,fontFamily:"Georgia,serif"}}>
          {year} Annual Summary
        </h2>
        <p style={{margin:0,fontSize:11,color:C.muted}}>
          {activeMonths.length} month{activeMonths.length!==1?"s":""} tracked so far
        </p>
      </div>

      {/* Top 4 stats */}
      {activeMonths.length > 0 ? (
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[
              {label:"Total Spent",     value:fmt(totalSpent),        color:C.red,    icon:"💸"},
              {label:"Avg / Month",     value:fmt(avgMonthly),        color:C.amber,  icon:"📅"},
              {label:"Income (est.)",   value:fmt(totalIncomeSoFar),  color:C.green,  icon:"💰"},
              {label:"Net Balance",     value:netBalance>=0?fmt(netBalance):`−${fmt(Math.abs(netBalance))}`,
                                        color:netBalance>=0?C.green:C.red, icon:"⚖️"},
            ].map(t=>(
              <div key={t.label} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,
                                         padding:"11px 13px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                  <span style={{fontSize:13}}>{t.icon}</span>
                  <p style={{margin:0,fontSize:9,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px"}}>{t.label}</p>
                </div>
                <p style={{margin:0,fontSize:16,fontWeight:700,color:t.color,fontFamily:"Georgia,serif"}}>{t.value}</p>
              </div>
            ))}
          </div>

          {/* Best / Worst month */}
          {bestMonth && worstMonth && bestMonth.key !== worstMonth.key && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              <div style={{background:"#F0FDF4",borderRadius:11,border:"1px solid #86EFAC",padding:"10px 12px"}}>
                <p style={{margin:0,fontSize:9,color:C.green,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px"}}>Best Month 🏆</p>
                <p style={{margin:"3px 0 0",fontSize:15,fontWeight:700,color:C.ink}}>{bestMonth.label}</p>
                <p style={{margin:"1px 0 0",fontSize:12,color:C.green,fontFamily:"Georgia,serif",fontWeight:700}}>{fmt(bestMonth.spent)}</p>
              </div>
              <div style={{background:"#FFF1F2",borderRadius:11,border:"1px solid #FECACA",padding:"10px 12px"}}>
                <p style={{margin:0,fontSize:9,color:C.red,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px"}}>Highest Spend 📈</p>
                <p style={{margin:"3px 0 0",fontSize:15,fontWeight:700,color:C.ink}}>{worstMonth.label}</p>
                <p style={{margin:"1px 0 0",fontSize:12,color:C.red,fontFamily:"Georgia,serif",fontWeight:700}}>{fmt(worstMonth.spent)}</p>
              </div>
            </div>
          )}

          {/* Monthly bar chart */}
          <div style={{background:"#fff",borderRadius:13,border:`1px solid ${C.border}`,
                       boxShadow:"0 1px 3px rgba(0,0,0,0.05)",padding:"12px 14px",marginBottom:12}}>
            <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.ink}}>Monthly Breakdown</p>
            <div style={{display:"flex",alignItems:"flex-end",gap:4,height:80}}>
              {months.map(m=>{
                const barH  = m.spent>0 ? Math.max(Math.round((m.spent/maxSpent)*72),4) : 0;
                const color = m.isCurrent ? C.blue : m.isPast && m.spent>0 ? "#94A3B8" : "#E5E7EB";
                return (
                  <div key={m.key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <p style={{margin:0,fontSize:7,color:m.isCurrent?C.ink:C.muted,fontWeight:m.isCurrent?700:400,whiteSpace:"nowrap"}}>
                      {m.spent>0?`₹${Math.round(m.spent/1000)}k`:""}
                    </p>
                    <div style={{width:"100%",height:m.spent>0?barH:2,background:color,borderRadius:"3px 3px 0 0",transition:"height 0.4s"}}/>
                    <p style={{margin:0,fontSize:8,color:m.isCurrent?C.ink:C.muted,fontWeight:m.isCurrent?700:400}}>{m.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month-by-month list */}
          <div style={{background:"#fff",borderRadius:13,border:`1px solid ${C.border}`,
                       boxShadow:"0 1px 3px rgba(0,0,0,0.05)",overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bg}`}}>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:C.ink}}>Month-by-Month</p>
            </div>
            {months.filter(m=>m.isPast||m.isCurrent).map((m,i,arr)=>{
              const pct = totalIncome>0 ? Math.round((m.spent/totalIncome)*100) : 0;
              return (
                <div key={m.key} style={{
                  display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                  borderBottom:i<arr.length-1?`1px solid ${C.bg}`:"none",
                  background:m.isCurrent?"#FAFAFA":"transparent",
                }}>
                  <div style={{width:36,flexShrink:0}}>
                    <p style={{margin:0,fontSize:12,fontWeight:m.isCurrent?700:600,color:C.ink}}>{m.label}</p>
                    {m.isCurrent&&<p style={{margin:0,fontSize:8,color:C.blue,fontWeight:600}}>Current</p>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{height:4,borderRadius:99,background:C.bg,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:99,width:`${Math.min(pct,100)}%`,
                                   background:m.isCurrent?C.blue:"#94A3B8",transition:"width 0.4s"}}/>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {m.spent>0
                      ? <p style={{margin:0,fontSize:13,fontWeight:700,color:m.isCurrent?C.ink:C.muted,fontFamily:"Georgia,serif"}}>{fmt(m.spent)}</p>
                      : <p style={{margin:0,fontSize:11,color:C.muted}}>—</p>
                    }
                    {m.count>0&&<p style={{margin:0,fontSize:9,color:C.muted}}>{m.count} txn{m.count!==1?"s":""}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{background:"#fff",borderRadius:13,border:`1px solid ${C.border}`,
                     textAlign:"center",padding:"48px 20px"}}>
          <p style={{fontSize:36,margin:"0 0 10px"}}>🗓</p>
          <p style={{color:C.ink,fontSize:14,fontWeight:600,margin:"0 0 6px"}}>No data for {year} yet</p>
          <p style={{color:C.muted,fontSize:12,margin:0}}>Start logging expenses to see your annual summary here.</p>
        </div>
      )}
    </div>
  );
}

// ─── RECURRING EXPENSES TAB ───────────────────────────────────────────────
function RecurringTab({ recurringExpenses, allExpenses, onAdd, onUpdate, onDelete, onToggle, showToast }) {
  const CATS = [
    {name:"Rent",          icon:"🏠"},
    {name:"EMI/Loan",      icon:"🏦"},
    {name:"Electricity",   icon:"⚡"},
    {name:"Internet",      icon:"📶"},
    {name:"Mobile",        icon:"📱"},
    {name:"Insurance",     icon:"🛡"},
    {name:"Subscription",  icon:"📺"},
    {name:"Gym",           icon:"💪"},
    {name:"School Fees",   icon:"🎓"},
    {name:"Maintenance",   icon:"🔧"},
    {name:"Water",         icon:"💧"},
    {name:"Other",         icon:"💸"},
  ];
  const DAYS = Array.from({length:28},(_,i)=>i+1);

  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [fLabel,   setFLabel]   = useState("");
  const [fCat,     setFCat]     = useState("Rent");
  const [fAmt,     setFAmt]     = useState("");
  const [fDay,     setFDay]     = useState(1);
  const [fNote,    setFNote]    = useState("");

  const ordinal = (d) => { const s=["th","st","nd","rd"]; const v=d%100; return d+(s[(v-20)%10]||s[v]||s[0]); };
  const inp2 = { width:"100%", padding:"9px 11px", borderRadius:8, border:`1px solid ${C.border}`, fontFamily:"inherit", fontSize:13, background:"#fff", outline:"none", boxSizing:"border-box" };

  const openNew  = () => { setFLabel(""); setFCat("Rent"); setFAmt(""); setFDay(1); setFNote(""); setEditId(null); setShowForm(true); };
  const openEdit = (r) => { setFLabel(r.label); setFCat(r.category); setFAmt(String(r.amount)); setFDay(r.dayOfMonth); setFNote(r.note||""); setEditId(r.id); setShowForm(true); };
  const cancel   = () => { setShowForm(false); setEditId(null); };

  const save = () => {
    const v = parseFloat(fAmt);
    if (!fLabel.trim() || !v || v <= 0) return;
    const data = { label:fLabel.trim(), category:fCat, amount:v, dayOfMonth:fDay, note:fNote.trim() };
    if (editId !== null) { onUpdate(editId, data); showToast("Recurring updated ✓"); }
    else                 { onAdd(data);            showToast("Recurring saved ✓"); }
    cancel();
  };

  const monthlyTotal = recurringExpenses.filter(r=>r.active).reduce((s,r)=>s+r.amount, 0);
  const curMonthKey  = currentMonthKey();

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14}}>
        <div>
          <h2 style={{margin:"0 0 2px", fontSize:17, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif"}}>Recurring Expenses</h2>
          <p style={{margin:0, fontSize:11, color:C.muted}}>
            Auto-logged monthly · {recurringExpenses.filter(r=>r.active).length} active
            {monthlyTotal > 0 && ` · ${fmt(monthlyTotal)}/month`}
          </p>
        </div>
        {!showForm && (
          <button onClick={openNew} style={{
            padding:"7px 14px", borderRadius:9, border:"none",
            background:C.ink, color:"#fff", fontSize:12, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit", flexShrink:0,
          }}>+ Add</button>
        )}
      </div>

      {/* Empty state banner */}
      {recurringExpenses.length === 0 && !showForm && (
        <div style={{background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:11, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"flex-start", gap:10}}>
          <span style={{fontSize:20, flexShrink:0}}>🔁</span>
          <p style={{margin:0, fontSize:12, color:C.ink, lineHeight:1.6}}>
            Add expenses that repeat every month — Netflix, gym, electricity. They'll be <strong>auto-logged</strong> on the day you set, so you never have to enter them manually.
          </p>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div style={{background:"#fff", borderRadius:13, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16, marginBottom:14}}>
          <p style={{margin:"0 0 14px", fontSize:14, fontWeight:700, color:C.ink}}>
            {editId !== null ? "✏️ Edit Recurring" : "🔁 New Recurring Expense"}
          </p>
          <p style={{margin:"0 0 4px", fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.9px"}}>Label *</p>
          <input value={fLabel} onChange={e=>setFLabel(e.target.value)} placeholder="e.g. Netflix, Gym, Electricity"
            style={{...inp2, marginBottom:12}} />

          <p style={{margin:"0 0 6px", fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.9px"}}>Category</p>
          <div style={{display:"flex", flexWrap:"wrap", gap:5, marginBottom:12}}>
            {CATS.map(c=>(
              <button key={c.name} onClick={()=>setFCat(c.name)} style={{
                padding:"4px 10px", borderRadius:99, fontSize:11, fontWeight:600,
                cursor:"pointer", fontFamily:"inherit",
                border:`1.5px solid ${fCat===c.name?C.ink:C.border}`,
                background:fCat===c.name?C.ink:"#fff",
                color:fCat===c.name?"#fff":C.ink,
              }}>{c.icon} {c.name}</button>
            ))}
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
            <div>
              <p style={{margin:"0 0 4px", fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.9px"}}>Amount (₹) *</p>
              <input type="number" value={fAmt} onChange={e=>setFAmt(e.target.value)} placeholder="e.g. 649" style={inp2} />
            </div>
            <div>
              <p style={{margin:"0 0 4px", fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.9px"}}>Day of Month</p>
              <select value={fDay} onChange={e=>setFDay(Number(e.target.value))} style={inp2}>
                {DAYS.map(d=><option key={d} value={d}>{ordinal(d)} of every month</option>)}
              </select>
            </div>
          </div>

          <p style={{margin:"0 0 4px", fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.9px"}}>Note (optional)</p>
          <input value={fNote} onChange={e=>setFNote(e.target.value)} placeholder="e.g. Hotstar annual plan"
            style={{...inp2, marginBottom:14}} />

          <div style={{display:"flex", gap:9}}>
            <button onClick={cancel} style={{flex:1, padding:"9px", borderRadius:9, border:`1px solid ${C.border}`, background:"#fff", color:C.muted, fontFamily:"inherit", fontSize:13, cursor:"pointer"}}>Cancel</button>
            <button onClick={save}   style={{flex:2, padding:"9px", borderRadius:9, border:"none", background:C.ink, color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer"}}>
              {editId !== null ? "Save Changes ✓" : "Add Recurring ✓"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {recurringExpenses.length > 0 && (
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {recurringExpenses.map(r => {
            const cat        = CATS.find(c=>c.name===r.category) || {icon:"💸"};
            const autoLogged = (allExpenses[curMonthKey]||[]).some(e=>e.recurringId===r.id);
            return (
              <div key={r.id} style={{
                background:"#fff", borderRadius:12, border:`1px solid ${C.border}`,
                boxShadow:"0 1px 2px rgba(0,0,0,0.04)", padding:"11px 14px",
                opacity: r.active ? 1 : 0.55,
              }}>
                <div style={{display:"flex", alignItems:"center", gap:10}}>
                  <div style={{width:36, height:36, borderRadius:9, flexShrink:0, fontSize:18,
                               background:`${C.blue}10`, border:`1px solid ${C.blue}20`,
                               display:"flex", alignItems:"center", justifyContent:"center"}}>
                    {cat.icon}
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:2}}>
                      <p style={{margin:0, fontSize:13, fontWeight:700, color:C.ink}}>{r.label}</p>
                      {autoLogged && (
                        <span style={{fontSize:9, fontWeight:700, color:C.green, background:"#F0FDF4", border:"1px solid #86EFAC", borderRadius:99, padding:"1px 7px"}}>✓ logged this month</span>
                      )}
                      {!r.active && (
                        <span style={{fontSize:9, color:C.muted, background:C.bg, border:`1px solid ${C.border}`, borderRadius:99, padding:"1px 7px"}}>paused</span>
                      )}
                    </div>
                    <p style={{margin:0, fontSize:10, color:C.muted}}>
                      {r.category} · {fmt(r.amount)}/month · {ordinal(r.dayOfMonth)} of month{r.note?` · ${r.note}`:""}
                    </p>
                  </div>
                  <p style={{margin:0, fontSize:15, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", flexShrink:0}}>
                    {fmt(r.amount)}
                  </p>
                </div>
                <div style={{display:"flex", gap:6, marginTop:9, paddingTop:9, borderTop:`1px solid ${C.bg}`}}>
                  <button onClick={()=>onToggle(r.id)} style={{flex:1, padding:"5px 0", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", border:`1px solid ${C.border}`, background:r.active?"#FFFBEB":"#F0FDF4", color:r.active?C.amber:C.green}}>
                    {r.active ? "⏸ Pause" : "▶ Resume"}
                  </button>
                  <button onClick={()=>openEdit(r)} style={{flex:1, padding:"5px 0", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", border:`1px solid ${C.border}`, background:"#fff", color:C.ink}}>
                    ✏ Edit
                  </button>
                  <button onClick={()=>{ if(window.confirm(`Delete "${r.label}"?`)) onDelete(r.id); }} style={{flex:1, padding:"5px 0", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", border:"1px solid #FECACA", background:"#FFF1F2", color:C.red}}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
function DashboardScreen(props) {
  const {
    name, totalIncome, totalFixed, totalSavings, totalReserve, remaining, dailyLimit,
    thisMonthSpent, budgetForMonth,
    lastMonthKey, lastMonthSpent, lastMonthSaved, lastMonthBudget,
    smartSuggestions,
    incomeSources, fixedExpenses, savingsPlans, futurePayments,
    loans,
    categoryBudgets, setCategoryBudget,
    recurringExpenses, addRecurring, updateRecurring, deleteRecurring, toggleRecurring, autoLogRecurring,
    allExpenses, checkIns,
    addIncomeSource, updateIncomeSource, deleteIncomeSource,
    addFixedExpense,  updateFixedExpense,  deleteFixedExpense,
    addSavingsPlan,   updateSavingsPlan,   deleteSavingsPlan,
    addFuturePayment, updateFuturePayment, deleteFuturePayment,
    addExpense, editExpense, deleteExpense, addCheckIn, resetAll,
    addLoan, updateLoan, deleteLoan,
    updateName,
    firebaseUser, isGuest, onSignOut,
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

  // ── All tabs ──────────────────────────────────────────────────────────────
  const TABS = [
    { key:"budget",    icon:"📊", label:"Dashboard" },
    { key:"plan",      icon:"🗂",  label:"Plan"      },
    { key:"home",      icon:"🏠",  label:"Expenses"  },
    { key:"loans",     icon:"🏦",  label:"Loans"     },
    { key:"annual",    icon:"🗓",  label:"Annual"    },
    { key:"recurring", icon:"🔁",  label:"Recurring" },
    { key:"catbudget", icon:"🎯",  label:"Budgets"   },
    { key:"charts",    icon:"📈",  label:"Charts"    },
    { key:"insight",   icon:"💡",  label:"Insights"  },
  ];
  const PRIMARY_TABS = TABS.slice(0, 4);
  const MORE_TABS    = TABS.slice(4);
  const moreActive   = MORE_TABS.some(t => t.key === tab);

  // Two-step reset: first tap shows warning, second tap executes
  const [resetArmed, setResetArmed] = useState(false);
  const handleReset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      // Auto-disarm after 4 seconds
      setTimeout(() => setResetArmed(false), 4000);
    } else {
      setResetArmed(false);
      resetAll();
    }
  };

  const [moreOpen,     setMoreOpen]     = useState(false);
  const [isMobile,     setIsMobile]     = useState(() => window.innerWidth <= 640);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode,     setDarkMode]     = useState(() => initDarkMode());

  const toggleDark = (on) => { applyDarkMode(on); setDarkMode(on); };

  // Inject APP_CSS into <head> once — guaranteed to work unlike JSX <style>
  useEffect(() => {
    const el = document.createElement("style");
    el.setAttribute("data-mc", "1");
    el.textContent = APP_CSS;
    // Remove any previous injection to avoid duplicates on HMR
    document.head.querySelectorAll("[data-mc]").forEach(n => n.remove());
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  // Track viewport width for mobile/desktop switching
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-log any due recurring expenses once on mount
  useEffect(() => { autoLogRecurring(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const MonthBar=()=><MonthSelector selectedMonth={selectedMonth} onChange={setSelectedMonth} allExpenses={allExpenses}/>;

  // ── Shared inline style tokens ─────────────────────────────────────────
  const NAV_BG      = "#1E293B";
  const NAV_HEIGHT  = 48;
  const NAV_BORDER  = "1px solid rgba(255,255,255,0.12)";

  return (
    <div className="mc-app">
      <style>{APP_CSS}</style>{/* fallback for environments where useEffect head injection isn't immediate */}

      {/* ── Toast ── */}
      {toast && (
        <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",
                     background:C.ink,color:"#fff",padding:"9px 20px",borderRadius:99,
                     fontSize:13,zIndex:9999,whiteSpace:"nowrap",
                     boxShadow:"0 4px 20px rgba(0,0,0,0.18)",animation:"fadeUp 0.2s ease"}}>
          {toast}
        </div>
      )}

      {/* ── Settings Panel ── */}
      {showSettings && (
        <SettingsPanel
          name={name}
          onClose={() => setShowSettings(false)}
          onResetAll={resetAll}
          onNameChange={n => { updateName(n); setShowSettings(false); showToast("Name updated ✓"); }}
          darkMode={darkMode}
          onToggleDark={toggleDark}
          firebaseUser={firebaseUser}
          isGuest={isGuest}
          onSignOut={onSignOut}
        />
      )}

      {/* ══════════════ MOBILE MORE OVERLAY ══════════════ */}
      {isMobile && moreOpen && (
        <>
          {/* Backdrop */}
          <div onClick={()=>setMoreOpen(false)}
            style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(0,0,0,0.3)"}} />
          {/* Dropdown */}
          <div style={{
            position:"fixed", bottom:NAV_HEIGHT, left:0, right:0, zIndex:10000,
            background:"#1E293B", borderTop:"1px solid rgba(255,255,255,0.12)",
            borderRadius:"16px 16px 0 0", padding:"12px 0 10px",
            boxShadow:"0 -8px 32px rgba(0,0,0,0.5)", animation:"slideUp 0.2s ease",
          }}>
            <p style={{margin:"0 16px 8px",fontSize:9,color:"#57534E",
                       textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>
              More sections
            </p>
            {MORE_TABS.map(({key,icon,label}) => (
              <button key={key}
                onClick={()=>{ setTab(key); setMoreOpen(false); }}
                style={{
                  display:"flex", alignItems:"center", gap:12,
                  width:"100%", padding:"13px 20px", border:"none",
                  background: tab===key ? "rgba(255,255,255,0.09)" : "transparent",
                  color: tab===key ? "#F8FAFC" : "#A8A29E",
                  fontSize:15, fontFamily:"inherit",
                  fontWeight: tab===key ? 700 : 400,
                  cursor:"pointer", textAlign:"left",
                }}>
                <span style={{fontSize:20}}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mc-body">

        {/* ════════ SIDEBAR — desktop + tablet only ════════ */}
        {!isMobile && (
          <aside className="mc-sidebar">
            <div style={{padding:"20px 18px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
              <p style={{margin:0,fontSize:9,color:"#57534E",textTransform:"uppercase",
                         letterSpacing:"1.4px",fontWeight:700,marginBottom:4}}>Money Coach</p>
              <p style={{margin:0,fontSize:11,color:"#CBD5E1",lineHeight:1.4}}>
                {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"})}
              </p>
            </div>
            <nav style={{flex:1,padding:"10px 8px"}}>
              {TABS.map(({key,icon,label}) => {
                const active = tab === key;
                return (
                  <button key={key} onClick={()=>setTab(key)}
                    style={{
                      display:"flex",alignItems:"center",gap:10,
                      width:"100%",padding:"10px 12px",marginBottom:2,
                      borderRadius:9,border:"none",
                      background:active?"rgba(255,255,255,0.12)":"transparent",
                      borderLeft:`3px solid ${active?"#93C5FD":"transparent"}`,
                      color:active?"#F1F5F9":"#94A3B8",
                      fontSize:13,fontFamily:"inherit",fontWeight:active?700:400,
                      cursor:"pointer",textAlign:"left",
                      transition:"background 0.15s,color 0.15s",
                    }}
                    onMouseEnter={e=>{if(!active){e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="#E2E8F0";}}}
                    onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#6B7280";}}}
                  >
                    <span style={{fontSize:16,width:20,textAlign:"center",flexShrink:0}}>{icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
            {streak > 0 && (
              <div style={{padding:"12px 18px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:16}}>🔥</span>
                  <div>
                    <p style={{margin:0,fontSize:11,fontWeight:700,color:"#FCD34D"}}>{streak} day streak</p>
                    <p style={{margin:0,fontSize:9,color:"#6B7280"}}>Keep it up!</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* ════════ MAIN AREA ════════ */}
        <div className="mc-main">

          {/* ── MOBILE HEADER ── */}
          {isMobile && (
            <header style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              gap:6,
              paddingTop:`calc(env(safe-area-inset-top, 0px) + 6px)`,
              paddingBottom:"6px",
              paddingLeft:"12px",
              paddingRight:"12px",
              flexShrink:0,
              background:"#fff", borderBottom:"1px solid #E5E7EB",
              position:"sticky", top:0, zIndex:100,
            }}>
              <div>
                <p style={{margin:0,fontSize:9,color:"#6B7280",fontWeight:500,marginBottom:1,
                           textTransform:"uppercase",letterSpacing:"0.8px"}}>
                  {new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
                </p>
                <p style={{margin:0,fontSize:14,fontWeight:700,color:"#111827",fontFamily:"Georgia,serif",lineHeight:1.15}}>
                  {getGreeting(name)} 👋
                </p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                {streak > 0 && (
                  <div style={{display:"flex",alignItems:"center",gap:3,
                               background:"#FFF7ED",border:"1px solid #FDBA74",
                               borderRadius:99,padding:"2px 7px"}}>
                    <span style={{fontSize:11}}>🔥</span>
                    <span style={{fontSize:10,fontWeight:700,color:"#EA580C"}}>{streak}</span>
                  </div>
                )}
                <button onClick={() => setShowSettings(true)}
                  style={{
                    background:"none", border:`1px solid ${C.border}`,
                    borderRadius:7, padding:"4px 9px", fontSize:16,
                    color:C.muted, cursor:"pointer", lineHeight:1,
                    flexShrink:0,
                  }}
                  title="Settings">
                  ⚙️
                </button>
              </div>
            </header>
          )}

          {/* ── DESKTOP HEADER ── */}
          {!isMobile && (
            <header style={{
              display:"flex", background:"#fff", borderBottom:`1px solid ${C.border}`,
              padding:"11px 18px", justifyContent:"space-between", alignItems:"center",
              position:"sticky", top:0, zIndex:100,
            }}>
              <div>
                <p style={{margin:0,fontSize:11,color:C.muted,textTransform:"uppercase",
                           letterSpacing:"1.1px",fontWeight:600,marginBottom:2}}>
                  {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"})}
                </p>
                <h1 style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:"Georgia,serif",margin:0}}>
                  {getGreeting(name)} 👋
                </h1>
              </div>
              <button onClick={() => setShowSettings(true)}
                style={{
                  background:"none", border:`1px solid ${C.border}`,
                  borderRadius:8, padding:"6px 14px", fontSize:14,
                  color:C.muted, cursor:"pointer", lineHeight:1,
                  display:"flex", alignItems:"center", gap:6,
                }}
                title="Settings">
                ⚙️ <span style={{fontSize:12,fontWeight:600}}>Settings</span>
              </button>
            </header>
          )}

          {/* ── SCROLLABLE PAGE CONTENT ── */}
          <div className="mc-scroll">
            <div className="mc-content" style={{paddingBottom: isMobile ? `calc(${NAV_HEIGHT + 16}px + env(safe-area-inset-bottom, 0px))` : "40px"}}>
              <div style={{animation:"slideIn 0.18s ease"}}>

              {/* ══ BUDGET DASHBOARD ══ */}
                {tab==="budget"&&(
                  <>
                    <p style={{fontSize:11,color:C.muted,marginBottom:10,lineHeight:1.5}}>
                      Financial overview · {new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})}
                    </p>
                    <SetupChecklist
                      totalIncome={totalIncome}
                      fixedExpenses={fixedExpenses}
                      savingsPlans={savingsPlans}
                      onNavigate={(t, s) => {
                        setTab(t);
                        if (s) setTimeout(() => {
                          const el = document.getElementById(s);
                          if (el) { el.scrollIntoView({behavior:"smooth",block:"start"}); el.classList.add("mc-section-flash"); setTimeout(()=>el.classList.remove("mc-section-flash"),1200); }
                        }, 120);
                      }}
                    />
                    <BudgetAlertWidget
                      categoryBudgets={categoryBudgets}
                      currentExpenses={currentExpenses}
                      onNavigate={setTab}
                    />
                    <MonthCloseReport
                      allExpenses={allExpenses}
                      totalIncome={totalIncome}
                      totalFixed={totalFixed}
                      totalSavings={totalSavings}
                      totalReserve={totalReserve}
                      categoryBudgets={categoryBudgets}
                    />
                    <BudgetDashboard
                      totalIncome={totalIncome} totalFixed={totalFixed}
                      totalSavings={totalSavings} totalReserve={totalReserve}
                      remaining={remaining} dailyLimit={dailyLimit}
                      thisMonthSpent={thisMonthSpent} budgetForMonth={budgetForMonth}
                      lastMonthKey={lastMonthKey} lastMonthSpent={lastMonthSpent}
                      lastMonthSaved={lastMonthSaved} lastMonthBudget={lastMonthBudget}
                      incomeSources={incomeSources} fixedExpenses={fixedExpenses}
                      savingsPlans={savingsPlans} futurePayments={futurePayments}
                      currentExpenses={currentExpenses}
                      loans={loans}
                      categoryBudgets={categoryBudgets}
                      onNavigate={(targetTab, sectionId) => {
                        setTab(targetTab);
                        if (sectionId) {
                          setTimeout(() => {
                            const el = document.getElementById(sectionId);
                            if (!el) return;
                            el.scrollIntoView({ behavior:"smooth", block:"start" });
                            el.classList.add("mc-section-flash");
                            setTimeout(() => el.classList.remove("mc-section-flash"), 1200);
                          }, 120);
                        }
                      }}
                    />
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
                <IncomeSources sources={incomeSources} totalIncome={totalIncome}
                  onAdd={src=>{if(!src.amount||src.amount<=0){showToast("⚠ Enter a valid amount");return;}addIncomeSource(src);showToast("Income source saved ✓");}}
                  onUpdate={(id,upd)=>{updateIncomeSource(id,upd);showToast("Income updated ✓");}}
                  onDelete={deleteIncomeSource}/>
              </div>
              <div>
                <SavingsSection plans={savingsPlans} totalSavings={totalSavings}
                  onAdd={p=>{addSavingsPlan(p);showToast("Savings plan saved ✓");}}
                  onUpdate={(id,upd)=>{updateSavingsPlan(id,upd);showToast("Savings updated ✓");}}
                  onDelete={deleteSavingsPlan}/>
              </div>
            </div>
            {/* Full-width below: Fixed Expenses + Future Payments */}
            <div className="mc-plan-full">
              <FixedExpensesSection items={fixedExpenses} totalFixed={totalFixed}
                onAdd={item=>{addFixedExpense(item);showToast("Fixed expense saved ✓");}}
                onUpdate={(id,upd)=>{updateFixedExpense(id,upd);showToast("Fixed expense updated ✓");}}
                onDelete={deleteFixedExpense}/>
              <FuturePaymentsSection payments={futurePayments} totalReserve={totalReserve}
                onAdd={p=>{addFuturePayment(p);showToast("Future payment saved ✓");}}
                onUpdate={(id,upd)=>{updateFuturePayment(id,upd);showToast("Future payment updated ✓");}}
                onDelete={deleteFuturePayment}/>
            </div>

            {/* ── Budget Summary Row ── */}
            {totalIncome > 0 && (
              <div style={{
                background:"linear-gradient(135deg,#1E293B,#334155)",
                borderRadius:14, padding:"14px 16px", marginTop:4,
              }}>
                <p style={{margin:"0 0 10px",fontSize:9,color:"#94A3B8",
                           textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>
                  Monthly Budget Flow
                </p>
                <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:4}}>
                  {[
                    {label:"Income",  value:fmt(totalIncome),  color:"#6EE7B7"},
                    {label:"Fixed",   value:fmt(totalFixed),   color:"#FCA5A5", prefix:"−"},
                    {label:"Savings", value:fmt(totalSavings), color:"#93C5FD", prefix:"−"},
                    {label:"Reserve", value:fmt(totalReserve), color:"#FCD34D", prefix:"−", hide:totalReserve===0},
                    {label:"Daily Budget", value:dailyLimit>0?`${fmt(dailyLimit)}/day`:"₹0", color:"#fff", isResult:true},
                  ].filter(t=>!t.hide).map((t,i,arr)=>(
                    <div key={t.label} style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{
                        padding:"6px 10px", borderRadius:8,
                        background: t.isResult ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                        border:`1px solid ${t.isResult?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.08)"}`,
                      }}>
                        <p style={{margin:0,fontSize:8,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.6px"}}>{t.label}</p>
                        <p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:t.color,fontFamily:"Georgia,serif"}}>
                          {t.prefix}{t.value}
                        </p>
                      </div>
                      {i < arr.length-1 && (
                        <span style={{fontSize:12,color:"#475569",fontWeight:700}}>→</span>
                      )}
                    </div>
                  ))}
                </div>
                {remaining < 0 && (
                  <p style={{margin:"8px 0 0",fontSize:11,color:"#FCA5A5"}}>
                    ⚠ Commitments exceed income by {fmt(Math.abs(remaining))} — review your fixed expenses or savings.
                  </p>
                )}
              </div>
            )}
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
              <div>
                <LogExpenseForm onAdd={handleAdd} disabled={!isCurrentMonth}
                  currentExpenses={currentExpenses} dailyLimit={dailyLimit}/>
              </div>
              <FilteredExpenseList
                expenses={expenses}
                monthKey={selectedMonth}
                onEdit={editExpense}
                onDelete={deleteExpense}
                isCurrentMonth={isCurrentMonth}
              />
            </div>
          </>
        )}

        {/* Check-In tab removed — Fix #1 */}

        {/* ══ LOANS ══ */}
        {tab==="loans"&&(
          <LoansTab
            loans={loans}
            onAdd={addLoan}
            onUpdate={updateLoan}
            onDelete={deleteLoan}
          />
        )}


        {/* ══ ANNUAL SUMMARY ══ */}
        {tab==="annual"&&(
          <AnnualSummary allExpenses={allExpenses} totalIncome={totalIncome} totalSavings={totalSavings}/>
        )}

        {/* ══ RECURRING EXPENSES ══ */}
        {tab==="recurring"&&(
          <RecurringTab
            recurringExpenses={recurringExpenses||[]}
            allExpenses={allExpenses}
            onAdd={addRecurring}
            onUpdate={updateRecurring}
            onDelete={deleteRecurring}
            onToggle={toggleRecurring}
            showToast={showToast}
          />
        )}

        {/* ══ CATEGORY BUDGETS ══ */}
        {tab==="catbudget"&&(
          <CategoryBudgets
            categoryBudgets={categoryBudgets}
            setCategoryBudget={setCategoryBudget}
            allExpenses={allExpenses}
          />
        )}

        {/* ══ CHARTS ══ */}
        {tab==="charts"&&(()=>{
          const totalSpent    = expenses.reduce((s,e)=>s+e.amount,0);
          const txCount       = expenses.length;
          const daysWithSpend = new Set(expenses.map(e=>e.date.split("T")[0])).size;
          const avgDaily      = daysWithSpend>0?Math.round(totalSpent/daysWithSpend):0;
          return (
            <>
              <MonthBar/>
              {/* Stats strip — only when data exists */}
              {totalSpent > 0 && (
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
                  {[
                    {label:"Total Spent",   value:fmt(totalSpent), color:"#DC2626"},
                    {label:"Avg/Spend Day", value:fmt(avgDaily),   color:"#D97706"},
                    {label:"Transactions",  value:String(txCount), color:"#2563EB"},
                  ].map(s=>(
                    <div key={s.label} style={{background:"#fff",borderRadius:11,
                      border:`1px solid ${C.border}`,padding:"9px 11px",
                      boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
                      <p style={{margin:0,fontSize:8,color:C.muted,textTransform:"uppercase",
                                 letterSpacing:"0.7px",fontWeight:700}}>{s.label}</p>
                      <p style={{margin:"3px 0 0",fontSize:15,fontWeight:700,color:s.color,
                                 fontFamily:"Georgia,serif"}}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
              <TrendChart allExpenses={allExpenses} monthlyIncome={totalIncome}/>
              <CategoryHistoryChart allExpenses={allExpenses}/>
              <SpendingChart expenses={expenses} monthlyIncome={totalIncome}/>
            </>
          );
        })()}

        {/* ══ INSIGHTS (unified hub) ══ */}
        {tab==="insight"&&(()=>{
          const [y,m] = selectedMonth.split("-").map(Number);
          const prevDate = new Date(y, m-2, 1);
          const prevKey  = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,"0")}`;
          const prevExp  = allExpenses[prevKey] || [];
          return (
            <InsightCard
              monthlyIncome={totalIncome}
              expenses={expenses}
              prevMonthExpenses={prevExp}
              totalFixed={totalFixed}
              totalSavings={totalSavings}
              totalReserve={totalReserve}
              loans={loans}
              allExpenses={allExpenses}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              showDetails={true}
              smartSuggestions={smartSuggestions}
              onNavigate={(targetTab) => setTab(targetTab)}
            />
          );
        })()}

              </div>{/* /slideIn */}
            </div>{/* /mc-content */}
          </div>{/* /mc-scroll */}

          {/* ════════ MOBILE BOTTOM NAV ════════ */}
          {isMobile && (
            <nav style={{
              position:"fixed", bottom:0, left:0, right:0,
              zIndex:9999,
              display:"flex",
              flexDirection:"column",
              background:NAV_BG,
              borderTop:NAV_BORDER,
              paddingBottom:"env(safe-area-inset-bottom, 0px)",
            }}>
              <div style={{ display:"flex", height:`${NAV_HEIGHT}px` }}>
              {PRIMARY_TABS.map(({key,icon,label}) => {
                const active = tab === key;
                return (
                  <button key={key}
                    onClick={()=>{ setTab(key); setMoreOpen(false); }}
                    style={{
                      flex:1, display:"flex", flexDirection:"column",
                      alignItems:"center", justifyContent:"center", gap:2,
                      border:"none", cursor:"pointer", padding:"3px 1px",
                      fontFamily:"inherit", minWidth:0,
                      background: active ? "rgba(255,255,255,0.12)" : "transparent",
                      borderTop: active ? "2px solid #93C5FD" : "2px solid transparent",
                      WebkitTapHighlightColor:"transparent",
                    }}>
                    <span style={{
                      fontSize:19, lineHeight:1,
                      opacity: active ? 1 : 0.75,
                    }}>{icon}</span>
                    <span style={{
                      fontSize:8, fontWeight:600, lineHeight:1,
                      maxWidth:50, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                      color: active ? "#fff" : "rgba(255,255,255,0.7)",
                    }}>{label}</span>
                  </button>
                );
              })}
              {/* More button */}
              <button
                onClick={()=>setMoreOpen(p=>!p)}
                style={{
                  flex:1, display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", gap:2,
                  border:"none", cursor:"pointer", padding:"3px 1px",
                  fontFamily:"inherit", minWidth:0,
                  background: moreActive ? "rgba(255,255,255,0.12)" : "transparent",
                  borderTop: moreActive ? "2px solid #93C5FD" : "2px solid transparent",
                  WebkitTapHighlightColor:"transparent",
                }}>
                <span style={{
                  fontSize:19, lineHeight:1,
                  opacity: moreActive ? 1 : 0.75,
                  color:"#fff",
                }}>
                  {moreActive ? TABS.find(t=>t.key===tab)?.icon : "···"}
                </span>
                <span style={{
                  fontSize:8, fontWeight:600, lineHeight:1,
                  color: moreActive ? "#fff" : "rgba(255,255,255,0.7)",
                }}>
                  {moreActive ? TABS.find(t=>t.key===tab)?.label : "More"}
                </span>
              </button>
              </div>{/* /nav inner */}
            </nav>
          )}

        </div>{/* /mc-main */}
      </div>{/* /mc-body */}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────
export default function App({ firebaseUser = null, isGuest = false, onSignOut = null }) {
  const appData = useAppData(firebaseUser);
  if(appData.screen==="onboarding") return <OnboardingScreen onComplete={appData.completeOnboarding}/>;
  return <DashboardScreen {...appData} firebaseUser={firebaseUser} isGuest={isGuest} onSignOut={onSignOut}/>;
}
