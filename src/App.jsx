// ─── App.jsx — Full financial planning integration ─────────────────────
import { useState, useMemo, useRef, useEffect } from "react";
import InsightCard      from "./InsightCard";
import SpendingChart, { TrendChart } from "./SpendingChart";
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
const C = {ink:"#111827",muted:"#6B7280",border:"#E5E7EB",bg:"#F8FAFC",red:"#DC2626",green:"#16A34A",amber:"#D97706",blue:"#2563EB",purple:"#7C3AED"};

// Responsive CSS injected once into <head> equivalent via a style tag in the app shell
const APP_CSS = `
  .mc-app  { display:flex; flex-direction:column; min-height:100vh; background:#F8FAFC; }
  .mc-body { display:flex; flex:1; min-height:0; }
  .mc-main { flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden; }
  .mc-scroll { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; }
  .mc-content { padding:18px 18px 24px; max-width:960px; width:100%; margin:0 auto; }

  .mc-sidebar {
    width:220px; min-width:220px; background:#1E293B;
    display:flex; flex-direction:column;
    position:sticky; top:0; height:100vh;
    overflow-y:auto; flex-shrink:0;
  }
  @media(max-width:900px){ .mc-sidebar { width:180px; min-width:180px; } }

  .mc-plan-top  { display:grid; grid-template-columns:1fr; gap:0; }
  .mc-plan-full { width:100%; }
  @media(min-width:768px){ .mc-plan-top { grid-template-columns:1fr 1fr; gap:12px; } }

  .mc-expense-row { display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #F8FAFC; gap:8px; }
  .mc-expense-row:last-child { border-bottom:none; }
  ::-webkit-scrollbar { display:none; }
  * { scrollbar-width:none; }

  @keyframes fadeUp  { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  @keyframes slideIn { from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:translateX(0)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

  .mc-bnav-item:active { opacity:0.7; }
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

// ─── QUICK-ADD TEMPLATES ──────────────────────────────────────────────────────
// Derives top 5 most-repeated expense entries from the last 60 days.
// Shows as tappable chips above the log form — pre-fills form on tap.
function QuickAddTemplates({ allExpenses, onQuickAdd, disabled }) {
  const templates = useMemo(() => {
    const now     = new Date();
    const cutoff  = new Date(now - 60 * 24 * 60 * 60 * 1000);
    const counts  = {};
    Object.values(allExpenses).flat().forEach(e => {
      if (new Date(e.date) < cutoff) return;
      if (!e.note) return; // only entries with a note are useful as templates
      const key = `${e.label}||${e.note}||${e.amount}`;
      counts[key] = (counts[key] || { label:e.label, note:e.note, amount:e.amount, count:0 });
      counts[key].count++;
    });
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allExpenses]);

  if (templates.length === 0 || disabled) return null;

  const ICONS = { Food:"🍽",Travel:"🚗",Coffee:"☕",Grocery:"🛒",Medical:"💊",Entertainment:"🎬",Other:"💸" };

  return (
    <div style={{ marginBottom:10 }}>
      <p style={{ margin:"0 0 6px", fontSize:9, color:C.muted, fontWeight:700,
                  textTransform:"uppercase", letterSpacing:"0.8px" }}>
        Quick Add
      </p>
      <div style={{ display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none", paddingBottom:2 }}>
        {templates.map((t, i) => (
          <button key={i}
            onClick={() => onQuickAdd({ amount:t.amount, label:t.label, note:t.note })}
            style={{
              flexShrink:0, display:"flex", alignItems:"center", gap:5,
              padding:"5px 10px", borderRadius:99,
              border:`1.5px solid ${C.border}`, background:"#fff",
              cursor:"pointer", fontFamily:"inherit",
              transition:"border-color 0.12s, background 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.ink; e.currentTarget.style.background=C.bg; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background="#fff"; }}
            title={`Add ${t.label} · ${t.note} · ₹${t.amount}`}
          >
            <span style={{ fontSize:13 }}>{ICONS[t.label] || "💸"}</span>
            <span style={{ fontSize:11, fontWeight:600, color:C.ink }}>
              {t.note.length > 14 ? t.note.slice(0,13)+"…" : t.note}
            </span>
            <span style={{ fontSize:10, color:C.muted, fontFamily:"Georgia,serif" }}>
              ₹{Math.round(t.amount).toLocaleString("en-IN")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
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
  const [amount,setAmount] = useState(String(expense.amount));
  const [label,setLabel]   = useState(expense.label);
  const [note,setNote]     = useState(expense.note||"");
  // Preserve the time portion; only let user change the date part
  const existingDate = expense.date.split("T")[0];
  const [date,setDate]     = useState(existingDate);

  const save = () => {
    const v = parseFloat(amount);
    if (!v || v <= 0) return;
    // Reconstruct ISO string: keep original time, replace date portion
    const origTime = expense.date.includes("T") ? expense.date.split("T")[1] : "00:00:00.000Z";
    const newDate  = `${date}T${origTime}`;
    onSave(monthKey, expense.id, { amount:v, label, note:note.trim(), date:newDate });
    onClose();
  };

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:420,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontSize:16,fontWeight:700,color:C.ink,margin:0}}>Edit Expense</p>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.muted}}>✕</button>
        </div>
        <Label>Amount (₹) *</Label>
        <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} autoFocus
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"Georgia,serif",fontSize:20,background:C.bg,outline:"none",marginTop:6,marginBottom:12,boxSizing:"border-box"}} />
        <Label>Category</Label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6,marginBottom:12}}>
          {VARIABLE_CATS.map(c=><button key={c.name} onClick={()=>setLabel(c.name)} style={{padding:"5px 11px",borderRadius:99,border:`1.5px solid ${label===c.name?C.ink:C.border}`,background:label===c.name?C.ink:"#fff",color:label===c.name?"#fff":C.ink,fontSize:11,fontFamily:"inherit",fontWeight:600,cursor:"pointer"}}>{c.icon} {c.name}</button>)}
        </div>
        <Label>Date *</Label>
        <input type="date" value={date} max={new Date().toISOString().split("T")[0]}
          onChange={e=>setDate(e.target.value)}
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:14,background:C.bg,outline:"none",marginTop:6,marginBottom:12,boxSizing:"border-box"}} />
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

  const [mode,       setMode]       = useState("today");
  const [pickedDate, setPickedDate] = useState(todayStr);
  const [editTarget, setEditTarget] = useState(null);
  const dateInputRef = useRef(null);   // ← ref to trigger native date picker

  const activeDate =
    mode === "today"     ? todayStr :
    mode === "yesterday" ? yesterdayStr :
    pickedDate;

  const filtered = useMemo(
    () => expenses.filter(e => e.date.split("T")[0] === activeDate),
    [expenses, activeDate]
  );
  const dayTotal = filtered.reduce((s,e) => s+e.amount, 0);

  const allDates = [...new Set(expenses.map(e=>e.date.split("T")[0]))].sort();
  // If no expenses, allow picking any date in the last 90 days
  const fallbackMin = (() => { const d=new Date(); d.setDate(d.getDate()-90); return d.toISOString().split("T")[0]; })();
  const minDate  = allDates[0] || fallbackMin;

  const dateLabel =
    activeDate === todayStr     ? "Today" :
    activeDate === yesterdayStr ? "Yesterday" :
    new Date(activeDate + "T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});

  // Active state style for pills
  const pill = (active) => ({
    padding:"6px 13px", borderRadius:99, cursor:"pointer",
    fontFamily:"inherit", fontSize:11, fontWeight:600,
    border:`1.5px solid ${active ? C.ink : C.border}`,
    background: active ? C.ink : "#fff",
    color: active ? "#fff" : C.muted,
    transition:"all 0.12s", whiteSpace:"nowrap", flexShrink:0,
  });

  return (
    <>
      {editTarget && (
        <EditModal expense={editTarget} monthKey={monthKey}
          onSave={onEdit} onClose={()=>setEditTarget(null)} />
      )}

      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",overflow:"hidden"}}>

        {/* ── Header: title + date filter pills ── */}
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.bg}`}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:8}}>
            <div>
              <p style={{margin:0,fontSize:14,fontWeight:700,color:C.ink}}>Expense History</p>
              <p style={{margin:"2px 0 0",fontSize:10,color:C.muted}}>
                {dateLabel}
                {dayTotal > 0 && (
                  <> · <span style={{color:C.red,fontWeight:700}}>{fmt(dayTotal)}</span> total</>
                )}
              </p>
            </div>
          </div>
          {/* Pills row — scrollable on mobile */}
          <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2}}>
            <button style={pill(mode==="today")}    onClick={()=>setMode("today")}>Today</button>
            <button style={pill(mode==="yesterday")} onClick={()=>setMode("yesterday")}>Yesterday</button>
            {/* Pick date — button triggers hidden input via ref */}
            <button style={pill(mode==="pick")}
              onClick={() => {
                // Show the native date picker programmatically
                if (dateInputRef.current) {
                  dateInputRef.current.showPicker
                    ? dateInputRef.current.showPicker()
                    : dateInputRef.current.click();
                }
              }}>
              {mode === "pick"
                ? `📅 ${new Date(pickedDate + "T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"})}`
                : "📅 Pick Date"}
            </button>
            {/* Hidden native date input — positioned off-screen but reachable */}
            <input
              ref={dateInputRef}
              type="date"
              value={pickedDate}
              min={minDate}
              max={todayStr}
              onChange={e => { if(e.target.value){ setPickedDate(e.target.value); setMode("pick"); }}}
              style={{position:"absolute",opacity:0,width:0,height:0,pointerEvents:"none"}}
            />
          </div>
        </div>

        {/* ── Transaction rows ── */}
        <div style={{padding:"0 14px"}}>
          {filtered.length === 0 ? (
            <div style={{textAlign:"center",padding:"28px 0"}}>
              <p style={{fontSize:26,margin:"0 0 6px"}}>📭</p>
              <p style={{color:C.muted,fontSize:13,margin:0}}>
                No expenses recorded on {dateLabel.toLowerCase()}.
              </p>
            </div>
          ) : (
            filtered.slice().reverse().map((e, i) => {
              const timeStr = new Date(e.date).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
              return (
                <div key={e.id}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",
                          borderBottom: i<filtered.length-1?`1px solid ${C.bg}`:"none"}}>
                  {/* Icon bubble */}
                  <div style={{width:34,height:34,borderRadius:9,background:C.bg,
                               display:"flex",alignItems:"center",justifyContent:"center",
                               fontSize:16,flexShrink:0}}>
                    {ICONS[e.label]||"💸"}
                  </div>
                  {/* Name + note */}
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{margin:0,fontSize:12,fontWeight:600,color:C.ink,
                               overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {e.label}
                      {e.note && <span style={{fontWeight:400,color:C.muted}}> · {e.note}</span>}
                    </p>
                    <p style={{margin:0,fontSize:10,color:C.muted}}>{timeStr}</p>
                  </div>
                  {/* Amount + menu */}
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.red,fontFamily:"Georgia,serif"}}>
                      {fmt(e.amount)}
                    </span>
                    {isCurrentMonth && (
                      <ExpenseDotMenu
                        onEdit={()=>setEditTarget(e)}
                        onDelete={()=>{ if(window.confirm("Delete this expense?")) onDelete(monthKey,e.id); }} />
                    )}
                  </div>
                </div>
              );
            })
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
function LogExpenseForm({onAdd, disabled, currentExpenses=[], dailyLimit=0}) {
  const [amount,setAmount]=useState("");
  const [label,setLabel]=useState("Food");
  const [note,setNote]=useState("");
  const [err,setErr]=useState("");

  // Today's running total
  const todayStr   = new Date().toISOString().split("T")[0];
  const todaySpent = currentExpenses
    .filter(e => e.date.startsWith(todayStr))
    .reduce((s,e) => s+e.amount, 0);
  const limitLeft  = dailyLimit > 0 ? dailyLimit - todaySpent : null;
  const overLimit  = limitLeft !== null && limitLeft < 0;

  const submit=()=>{
    if(disabled) return;
    const v=parseFloat(amount);
    if(!v || v<=0 || !isFinite(v)) { setErr("Enter a valid amount greater than ₹0"); return; }
    if(v>10000000) { setErr("Amount seems unusually large — please check"); return; }
    setErr("");
    onAdd({amount:v,label,note:note.trim()});
    setAmount("");
    setNote("");
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
        style={{width:"100%",padding:"10px 12px",borderRadius:8,
          border:`1.5px solid ${err?C.red:C.border}`,
          fontFamily:"Georgia,serif",fontSize:20,background:C.bg,outline:"none",marginTop:6,marginBottom:err?4:12,boxSizing:"border-box"}} />
      {err&&<p style={{margin:"0 0 10px",fontSize:11,color:C.red,fontWeight:600}}>{err}</p>}
      <Label>Category</Label>
      <p style={{fontSize:11,color:C.muted,margin:"2px 0 6px"}}>For fixed bills like Rent or EMI, use the <strong>Plan tab</strong>.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{VARIABLE_CATS.map(chip)}</div>
      <Label>Note (optional)</Label>
      <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder={NOTE_PLACEHOLDER[label]||"e.g. Misc expense"} disabled={disabled}
        style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:14,background:C.bg,outline:"none",marginTop:6,marginBottom:10,boxSizing:"border-box"}} />

      {/* Today's spend indicator — only when current month and daily limit is set */}
      {!disabled && dailyLimit > 0 && (
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"8px 11px", borderRadius:8, marginBottom:10,
          background: overLimit ? "#FFF1F2" : todaySpent > 0 ? "#F0FDF4" : C.bg,
          border: `1px solid ${overLimit ? "#FECACA" : todaySpent > 0 ? "#86EFAC" : C.border}`,
        }}>
          <p style={{margin:0,fontSize:11,color:C.muted,fontWeight:500}}>
            {overLimit ? "⚠ Over daily limit" : "Today spent"}
          </p>
          <p style={{margin:0,fontSize:12,fontWeight:700,fontFamily:"Georgia,serif",
            color: overLimit ? C.red : todaySpent > 0 ? C.green : C.muted}}>
            {fmt(todaySpent)}
            <span style={{fontSize:10,fontWeight:400,color:C.muted,marginLeft:4}}>
              / {fmt(dailyLimit)}
            </span>
          </p>
        </div>
      )}

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
    { key:"recurring", icon:"🔁",  label:"Recurring" },
    { key:"catbudget", icon:"🎯",  label:"Budgets"   },
    { key:"charts",    icon:"📈",  label:"Charts"    },
    { key:"insight",   icon:"💡",  label:"Insights"  },
  ];
  const PRIMARY_TABS = TABS.slice(0, 4);   // Dashboard Plan Expenses Loans
  const MORE_TABS    = TABS.slice(4);      // Recurring Budgets Charts Insights
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
              gap:6, padding:"6px 12px", flexShrink:0,
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
            <div className="mc-content" style={{paddingBottom: isMobile ? `${NAV_HEIGHT + 16}px` : "40px"}}>
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
                  onAdd={src=>{addIncomeSource(src);showToast("Income source saved ✓");}}
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
                <QuickAddTemplates
                  allExpenses={allExpenses}
                  disabled={!isCurrentMonth}
                  onQuickAdd={({amount,label,note}) => {
                    handleAdd({amount,label,note});
                  }}
                />
                <LogExpenseForm onAdd={handleAdd} disabled={!isCurrentMonth}
                  currentExpenses={currentExpenses} dailyLimit={dailyLimit}/>
              </div>
              <ExpenseList expenses={expenses} monthKey={selectedMonth} onEdit={editExpense} onDelete={deleteExpense} isCurrentMonth={isCurrentMonth}/>
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

        {/* ══ RECURRING EXPENSES ══ */}
        {tab==="recurring"&&(()=>{
          const CATS = [{name:"Food",icon:"🍽"},{name:"Travel",icon:"🚗"},{name:"Coffee",icon:"☕"},{name:"Grocery",icon:"🛒"},{name:"Medical",icon:"💊"},{name:"Entertainment",icon:"🎬"},{name:"Other",icon:"💸"}];
          const DAYS = Array.from({length:28},(_,i)=>i+1);
          const [showForm, setShowForm] = useState(false);
          const [editId,   setEditId]   = useState(null);
          const [fLabel,   setFLabel]   = useState("");
          const [fCat,     setFCat]     = useState("Food");
          const [fAmt,     setFAmt]     = useState("");
          const [fDay,     setFDay]     = useState(1);
          const [fNote,    setFNote]    = useState("");

          const openNew = () => { setFLabel(""); setFCat("Food"); setFAmt(""); setFDay(1); setFNote(""); setEditId(null); setShowForm(true); };
          const openEdit = (r) => { setFLabel(r.label); setFCat(r.category); setFAmt(String(r.amount)); setFDay(r.dayOfMonth); setFNote(r.note||""); setEditId(r.id); setShowForm(true); };
          const cancel = () => { setShowForm(false); setEditId(null); };

          const save = () => {
            const v = parseFloat(fAmt);
            if (!fLabel.trim() || !v || v <= 0) return;
            const data = { label:fLabel.trim(), category:fCat, amount:v, dayOfMonth:fDay, note:fNote.trim() };
            if (editId !== null) { updateRecurring(editId, data); showToast("Recurring updated ✓"); }
            else                 { addRecurring(data);            showToast("Recurring saved ✓"); }
            cancel();
          };

          const monthlyTotal = (recurringExpenses||[]).filter(r=>r.active).reduce((s,r)=>s+r.amount,0);
          const ordinal = (d) => { const s=["th","st","nd","rd"]; const v=d%100; return d+(s[(v-20)%10]||s[v]||s[0]); };

          const inp2 = { width:"100%", padding:"9px 11px", borderRadius:8, border:`1px solid ${C.border}`, fontFamily:"inherit", fontSize:13, background:"#fff", outline:"none", boxSizing:"border-box" };

          return (
            <div>
              {/* Header */}
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14}}>
                <div>
                  <h2 style={{margin:"0 0 2px", fontSize:17, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif"}}>Recurring Expenses</h2>
                  <p style={{margin:0, fontSize:11, color:C.muted}}>
                    Auto-logged monthly · {(recurringExpenses||[]).filter(r=>r.active).length} active
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

              {/* How it works banner — shown when empty */}
              {(recurringExpenses||[]).length === 0 && !showForm && (
                <div style={{background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:11, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"flex-start", gap:10}}>
                  <span style={{fontSize:20, flexShrink:0}}>🔁</span>
                  <p style={{margin:0, fontSize:12, color:C.ink, lineHeight:1.6}}>
                    Add expenses that repeat every month — Netflix, gym, electricity. They'll be <strong>auto-logged</strong> on the day you set, so you don't have to enter them manually.
                  </p>
                </div>
              )}

              {/* Add/Edit Form */}
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
                        padding:"4px 10px", borderRadius:99, fontSize:11, fontWeight:600, cursor:"pointer",
                        fontFamily:"inherit", border:`1.5px solid ${fCat===c.name?C.ink:C.border}`,
                        background:fCat===c.name?C.ink:"#fff", color:fCat===c.name?"#fff":C.ink,
                      }}>{c.icon} {c.name}</button>
                    ))}
                  </div>

                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
                    <div>
                      <p style={{margin:"0 0 4px", fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.9px"}}>Amount (₹) *</p>
                      <input type="number" value={fAmt} onChange={e=>setFAmt(e.target.value)} placeholder="e.g. 649"
                        style={inp2} />
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

              {/* Recurring list */}
              {(recurringExpenses||[]).length > 0 && (
                <div style={{display:"flex", flexDirection:"column", gap:8}}>
                  {(recurringExpenses||[]).map(r => {
                    const cat = CATS.find(c=>c.name===r.category)||{icon:"💸"};
                    const autoLogged = (allExpenses[currentMonthKey()]||[]).some(e=>e.recurringId===r.id);
                    return (
                      <div key={r.id} style={{
                        background:"#fff", borderRadius:12, border:`1px solid ${C.border}`,
                        boxShadow:"0 1px 2px rgba(0,0,0,0.04)", padding:"11px 14px",
                        opacity: r.active ? 1 : 0.55,
                      }}>
                        <div style={{display:"flex", alignItems:"center", gap:10}}>
                          {/* Icon */}
                          <div style={{width:36, height:36, borderRadius:9, flexShrink:0, fontSize:18,
                                       background:`${C.blue}10`, border:`1px solid ${C.blue}20`,
                                       display:"flex", alignItems:"center", justifyContent:"center"}}>
                            {cat.icon}
                          </div>
                          {/* Info */}
                          <div style={{flex:1, minWidth:0}}>
                            <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:2}}>
                              <p style={{margin:0, fontSize:13, fontWeight:700, color:C.ink}}>{r.label}</p>
                              {autoLogged && (
                                <span style={{fontSize:9, fontWeight:700, color:C.green, background:"#F0FDF4", border:"1px solid #86EFAC", borderRadius:99, padding:"1px 7px"}}>
                                  ✓ logged this month
                                </span>
                              )}
                              {!r.active && (
                                <span style={{fontSize:9, color:C.muted, background:C.bg, border:`1px solid ${C.border}`, borderRadius:99, padding:"1px 7px"}}>
                                  paused
                                </span>
                              )}
                            </div>
                            <p style={{margin:0, fontSize:10, color:C.muted}}>
                              {r.category} · {fmt(r.amount)}/month · {ordinal(r.dayOfMonth)}
                              {r.note && ` · ${r.note}`}
                            </p>
                          </div>
                          {/* Amount */}
                          <p style={{margin:0, fontSize:15, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", flexShrink:0}}>
                            {fmt(r.amount)}
                          </p>
                        </div>
                        {/* Actions */}
                        <div style={{display:"flex", gap:6, marginTop:9, paddingTop:9, borderTop:`1px solid ${C.bg}`}}>
                          <button onClick={()=>toggleRecurring(r.id)} style={{
                            flex:1, padding:"5px 0", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer",
                            fontFamily:"inherit", border:`1px solid ${C.border}`,
                            background: r.active ? "#FFFBEB" : "#F0FDF4",
                            color: r.active ? C.amber : C.green,
                          }}>
                            {r.active ? "⏸ Pause" : "▶ Resume"}
                          </button>
                          <button onClick={()=>openEdit(r)} style={{
                            flex:1, padding:"5px 0", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer",
                            fontFamily:"inherit", border:`1px solid ${C.border}`, background:"#fff", color:C.ink,
                          }}>✏ Edit</button>
                          <button onClick={()=>{ if(window.confirm(`Delete "${r.label}"?`)) deleteRecurring(r.id); }} style={{
                            flex:1, padding:"5px 0", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer",
                            fontFamily:"inherit", border:"1px solid #FECACA", background:"#FFF1F2", color:C.red,
                          }}>🗑 Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ══ CATEGORY BUDGETS ══ */}
        {tab==="catbudget"&&(
          <CategoryBudgets
            categoryBudgets={categoryBudgets}
            setCategoryBudget={setCategoryBudget}
            allExpenses={allExpenses}
          />
        )}

        {/* ══ CHARTS ══ */}
        {tab==="charts"&&(
          <>
            <MonthBar/>
            <TrendChart allExpenses={allExpenses} monthlyIncome={totalIncome}/>
            <SpendingChart expenses={expenses} monthlyIncome={totalIncome}/>
          </>
        )}

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
            />
          );
        })()}

              </div>{/* /slideIn */}
            </div>{/* /mc-content */}
          </div>{/* /mc-scroll */}

          {/* ════════ MOBILE BOTTOM NAV — fully inline, no CSS class dependency ════════ */}
          {isMobile && (
            <nav style={{
              position:"fixed", bottom:0, left:0, right:0,
              zIndex:9999,
              display:"flex",
              background:NAV_BG,
              borderTop:NAV_BORDER,
              height:`${NAV_HEIGHT}px`,
            }}>
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
            </nav>
          )}

        </div>{/* /mc-main */}
      </div>{/* /mc-body */}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const appData = useAppData();
  if(appData.screen==="onboarding") return <OnboardingScreen onComplete={appData.completeOnboarding}/>;
  return <DashboardScreen {...appData}/>;
}
