// ─── App.jsx — Full financial planning integration ─────────────────────
import { useState, useMemo, useRef, useEffect, Component, memo } from "react";
import InsightCard      from "./InsightCard";
import SpendingChart, { TrendChart, CategoryHistoryChart } from "./SpendingChart";
import { useStreak }    from "./useStreak";
import { useAppData, currentMonthKey, monthKeyToLabel, getActiveMonthKeys } from "./useAppData";
import BudgetDashboard, { MonthCloseReport } from "./BudgetDashboard";
import { IncomeSources, FixedExpensesSection, SavingsSection, FuturePaymentsSection } from "./FinancialPlan";
import LoansTab         from "./LoansTab";
import CreditCardsTab   from "./CreditCardsTab";
import CategoryBudgets, { BudgetAlertWidget } from "./CategoryBudgets";
import SettingsPanel    from "./SettingsPanel";
import { calcLoanTotals } from "./useAppData";

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError:false, error:null }; }
  static getDerivedStateFromError(e) { return { hasError:true, error:e }; }
  componentDidCatch(e, info) { console.error("App crash:", e, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:"100vh", background:"#0F172A", display:"flex",
          alignItems:"center", justifyContent:"center", padding:24,
          fontFamily:"-apple-system,sans-serif" }}>
          <div style={{ textAlign:"center", maxWidth:320 }}>
            <p style={{ fontSize:40, margin:"0 0 12px" }}>⚠️</p>
            <p style={{ fontSize:16, fontWeight:700, color:"#F1F5F9", margin:"0 0 8px" }}>
              Something went wrong
            </p>
            <p style={{ fontSize:13, color:"#64748B", margin:"0 0 20px", lineHeight:1.5 }}>
              {this.state.error?.message || "Unexpected error"}
            </p>
            <button onClick={()=>{localStorage.removeItem("moneyCoachData_v3");window.location.reload();}}
              style={{ padding:"12px 24px", borderRadius:10, border:"none",
                background:"#2563EB", color:"#fff", fontFamily:"inherit",
                fontSize:14, fontWeight:700, cursor:"pointer",
                display:"block", width:"100%", marginBottom:8 }}>
              🔄 Clear Data & Reload
            </button>
            <button onClick={()=>this.setState({hasError:false,error:null})}
              style={{ padding:"10px 24px", borderRadius:10,
                border:"1px solid #334155", background:"transparent",
                color:"#64748B", fontFamily:"inherit",
                fontSize:13, cursor:"pointer", width:"100%" }}>
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const getGreeting = (name) => {
  const h = new Date().getHours();
  const t = h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  return name ? `${t}, ${name}` : t;
};

// Smart insight for greeting
const getSmartInsight = (remaining, totalIncome, thisMonthSpent, dailyLimit, streak) => {
  if (totalIncome === 0) return null;
  const pctSpent = totalIncome > 0 ? Math.round((thisMonthSpent/totalIncome)*100) : 0;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysPassed = now.getDate();
  const dayPct = Math.round((daysPassed/daysInMonth)*100);

  if (remaining < 0) return { text:`Over budget by ₹${Math.abs(remaining).toLocaleString("en-IN")} this month`, color:"#DC2626" };
  if (pctSpent > dayPct + 15) return { text:`Spending ahead of pace — ₹${dailyLimit.toLocaleString("en-IN")}/day limit`, color:"#D97706" };
  if (streak >= 3) return { text:`🔥 ${streak}-day logging streak! Keep it up`, color:"#EA580C" };
  if (pctSpent <= dayPct - 15) return { text:`On track to save ₹${remaining.toLocaleString("en-IN")} this month 🎯`, color:"#16A34A" };
  return { text:`₹${dailyLimit.toLocaleString("en-IN")}/day available to spend`, color:"#6B7280" };
};
const groupByDate = (expenses) => {
  const groups = {}; const order = [];
  const today = new Date().toISOString().split("T")[0];
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  const yestStr = yest.toISOString().split("T")[0];
  [...expenses].filter(e=>e.date).reverse().forEach(e => {
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
  html, body { margin:0; padding:0; height:100%; overflow:hidden; background:#F8FAFC; touch-action:pan-y; }
  #root { height:100%; }
  button, a, input, select, textarea { touch-action: manipulation; }

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
    overflow-y:scroll;
    overflow-x:hidden;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior:contain;
    touch-action:pan-y;
  }

  /* ── Content padding (sides use safe-area for landscape iPhone notch) ── */
  .mc-content {
    padding: 16px max(16px, env(safe-area-inset-right, 0px)) 16px max(16px, env(safe-area-inset-left, 0px));
    max-width:960px;
    width:100%;
    margin:0 auto;
    box-sizing:border-box;
    overflow-x:hidden;
    overflow-wrap:break-word;
    word-break:break-word;
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
  .mc-plan-top  { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .mc-plan-full { width:100%; }
  @media(max-width:600px){ .mc-plan-top { grid-template-columns:1fr; gap:0; } }

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

// Dark mode — auto based on time: 7pm–7am = dark, 7am–7pm = light
function isDarkHour() {
  const h = new Date().getHours();
  return h >= 19 || h < 7;
}
function applyDarkMode(on) {
  if (on) document.documentElement.setAttribute("data-theme","dark");
  else    document.documentElement.removeAttribute("data-theme");
}
function initDarkMode() {
  const on = isDarkHour();
  applyDarkMode(on);
  return on;
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


// ─── ONBOARDING — 5 step setup ───────────────────────────────────────────────
function OnboardingScreen({onComplete, defaultName=""}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(defaultName || "");

  // Step 2 — Income
  const [sources, setSources] = useState([
    {id:1,  label:"Salary",         amount:"", active:false, icon:"💼"},
    {id:2,  label:"Freelance",      amount:"", active:false, icon:"💻"},
    {id:3,  label:"Rental Income",  amount:"", active:false, icon:"🏘"},
    {id:4,  label:"Business",       amount:"", active:false, icon:"🏪"},
    {id:5,  label:"Part-time Job",  amount:"", active:false, icon:"⏰"},
    {id:6,  label:"Pension",        amount:"", active:false, icon:"👴"},
  ]);

  // Step 3 — Fixed Bills (common ones pre-listed with toggles)
  const [bills, setBills] = useState([
    {id:1,  label:"Rent",           amount:"", active:false, icon:"🏠"},
    {id:2,  label:"Home Loan EMI",  amount:"", active:false, icon:"🏦"},
    {id:3,  label:"Car Loan EMI",   amount:"", active:false, icon:"🚗"},
    {id:4,  label:"Electricity",    amount:"", active:false, icon:"⚡"},
    {id:5,  label:"Internet",       amount:"", active:false, icon:"📶"},
    {id:6,  label:"Mobile",         amount:"", active:false, icon:"📱"},
    {id:7,  label:"Insurance",      amount:"", active:false, icon:"🛡"},
    {id:8,  label:"School Fees",    amount:"", active:false, icon:"🎓"},
    {id:9,  label:"Maintenance",    amount:"", active:false, icon:"🔧"},
    {id:10, label:"Water Bill",     amount:"", active:false, icon:"💧"},
    {id:11, label:"OTT/Streaming",  amount:"", active:false, icon:"📺"},
    {id:12, label:"Gym",            amount:"", active:false, icon:"💪"},
    {id:13, label:"Petrol",         amount:"", active:false, icon:"⛽"},
    {id:14, label:"House Help",     amount:"", active:false, icon:"🧹"},
  ]);

  // Step 4 — Savings
  const [savings, setSavings] = useState([
    {id:1, label:"Mutual Fund SIP", amount:"", active:false, icon:"📈"},
    {id:2, label:"Emergency Fund",  amount:"", active:false, icon:"🛟"},
    {id:3, label:"Recurring Deposit",amount:"",active:false, icon:"🏦"},
    {id:4, label:"PPF / NPS",       amount:"", active:false, icon:"🏛"},
  ]);

  // Step 5 — Loans
  const [loans, setLoans] = useState([
    {id:1, label:"Home Loan",     emi:"", active:false, icon:"🏠"},
    {id:2, label:"Car Loan",      emi:"", active:false, icon:"🚗"},
    {id:3, label:"Personal Loan", emi:"", active:false, icon:"💳"},
    {id:4, label:"Education Loan",emi:"", active:false, icon:"🎓"},
  ]);

  const INCOME_LABELS = ["Salary","Freelance","Rental Income","Business Income","Part-time","Other"];
  const totalIncome  = sources.filter(s=>s.active).reduce((t,s)=>t+(parseFloat(s.amount)||0),0);
  const totalBills   = bills.filter(b=>b.active).reduce((t,b)=>t+(parseFloat(b.amount)||0),0);
  const totalSavings = savings.filter(s=>s.active).reduce((t,s)=>t+(parseFloat(s.amount)||0),0);
  const totalLoans   = loans.filter(l=>l.active).reduce((t,l)=>t+(parseFloat(l.emi)||0),0);
  const leftover     = totalIncome - totalBills - totalSavings - totalLoans;

  const STEPS = ["👋 Nickname","💰 Income","🏠 Bills","📈 Savings","🏦 Loans"];

  const inp = {
    padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`,
    fontFamily:"Georgia,serif", fontSize:16, outline:"none",
    boxSizing:"border-box", background:"#fff", width:"100%",
  };

  const go = () => {
    onComplete({
      name: name.trim(),
      incomeSources: sources.filter(s=>s.active&&parseFloat(s.amount)>0)
        .map(s=>({label:s.label, amount:parseFloat(s.amount)||0})),
      fixedExpenses: bills.filter(b=>b.active&&parseFloat(b.amount)>0)
        .map(b=>({label:b.label, amount:parseFloat(b.amount)||0})),
      savingsPlans: savings.filter(s=>s.active&&parseFloat(s.amount)>0)
        .map(s=>({label:s.label, amount:parseFloat(s.amount)||0})),
      loanEmis: loans.filter(l=>l.active&&parseFloat(l.emi)>0)
        .map(l=>({name:l.label, emi:parseFloat(l.emi)||0})),
    });
  };

  // Inline toggle+input row — NOT a component to avoid remount on state change
  const toggleRow = (item, amtKey, placeholder, onToggle, onAmt) => (
    <div key={item.id} style={{ marginBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10,
        padding:"11px 12px", borderRadius:10,
        background:item.active?"#EFF6FF":"#F8FAFC",
        border:`1.5px solid ${item.active?C.blue:C.border}`,
        cursor:"pointer", WebkitTapHighlightColor:"transparent" }}
        onClick={onToggle}>
        <span style={{ fontSize:18, flexShrink:0 }}>{item.icon}</span>
        <p style={{ margin:0, fontSize:13, fontWeight:600,
          color:item.active?C.blue:C.ink, flex:1 }}>{item.label}</p>
        <div style={{ width:22, height:22, borderRadius:99, flexShrink:0,
          background:item.active?C.blue:"#E5E7EB",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          {item.active && <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>}
        </div>
      </div>
      {item.active && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6,
          paddingLeft:12, paddingBottom:4 }}
          onClick={e=>e.stopPropagation()}
          onTouchEnd={e=>e.stopPropagation()}>
          <span style={{ fontSize:12, color:C.muted, flexShrink:0 }}>₹</span>
          <input
            type="number" inputMode="numeric"
            value={item[amtKey]}
            onChange={e=>onAmt(e.target.value)}
            placeholder={placeholder}
            style={{...inp, flex:1, fontSize:16}}
          />
          <span style={{ fontSize:12, color:C.muted, flexShrink:0 }}>/mo</span>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      position:"fixed", inset:0,
      background:"linear-gradient(160deg,#0F172A,#1E293B)",
      overflowY:"scroll", overflowX:"hidden",
      WebkitOverflowScrolling:"touch",
      touchAction:"pan-y",
      paddingTop:"env(safe-area-inset-top, 20px)",
      paddingBottom:"env(safe-area-inset-bottom, 20px)",
      paddingLeft:"max(16px, env(safe-area-inset-left, 16px))",
      paddingRight:"max(16px, env(safe-area-inset-right, 16px))",
    }}>
      <div style={{ width:"100%", maxWidth:440, margin:"0 auto" }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:44, marginBottom:6 }}>💰</div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#F1F5F9",
            fontFamily:"Georgia,serif", margin:0 }}>Money Coach</h1>
          <p style={{ margin:"4px 0 0", fontSize:12, color:"#64748B" }}>
            Let's set up your financial profile
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
          gap:4, marginBottom:16, flexWrap:"wrap" }}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:4,
                padding:"4px 10px", borderRadius:99,
                background:step===i+1?"#2563EB":step>i+1?"#16A34A22":"#1E293B",
                border:`1px solid ${step===i+1?"#60A5FA":step>i+1?"#16A34A":"#334155"}` }}>
                <span style={{ fontSize:10, color:step>i+1?"#16A34A":step===i+1?"#fff":"#475569",
                  fontWeight:700 }}>
                  {step>i+1?"✓":s}
                </span>
              </div>
              {i<STEPS.length-1&&<div style={{ width:10, height:1, background:"#334155" }}/>}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background:"#fff", borderRadius:20, padding:"20px",
          boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>

          {/* ── Step 1: Welcome ── */}
          {step===1 && (
            <>
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>👋</div>
                <p style={{ fontSize:20, fontWeight:700, color:C.ink, margin:"0 0 6px" }}>
                  {name ? `Welcome, ${name}!` : "Welcome!"}
                </p>
              </div>
              {name ? (
                <p style={{ fontSize:13, color:C.muted, margin:"0 0 20px", lineHeight:1.5, textAlign:"center" }}>
                  We'll use <strong>{name}</strong> for your dashboard greeting.
                  You can update it anytime in Settings → Edit Profile.
                </p>
              ) : (
                <>
                  <p style={{ fontSize:13, color:C.muted, margin:"0 0 10px" }}>
                    What should we call you? <span style={{ color:"#9CA3AF", fontSize:12 }}>(optional)</span>
                  </p>
                  <input
                    value={name} onChange={e=>setName(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&setStep(2)}
                    placeholder="e.g. Puni, Puneeth…"
                    autoFocus
                    style={{...inp, fontFamily:"inherit", fontSize:16, marginBottom:6, width:"100%"}}
                  />
                  <p style={{ fontSize:11, color:C.muted, margin:"0 0 16px" }}>
                    Used for "Good morning, Puni 👋" — change anytime in Settings.
                  </p>
                </>
              )}
              <button onClick={()=>setStep(2)} style={{ width:"100%", padding:13,
                borderRadius:12, background:C.ink, color:"#fff", border:"none",
                fontSize:15, fontFamily:"inherit", fontWeight:700, cursor:"pointer" }}>
                Get Started →
              </button>
            </>
          )}

          {/* ── Step 2: Income ── */}
          {step===2 && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <button onClick={()=>setStep(1)} style={{ background:"none", border:"none",
                  cursor:"pointer", fontSize:18, color:C.muted, padding:0 }}>←</button>
                <p style={{ fontSize:17, fontWeight:700, color:C.ink, margin:0 }}>
                  💰 Monthly Income
                </p>
              </div>
              <p style={{ fontSize:12, color:C.muted, margin:"0 0 6px" }}>
                Select all that apply and enter amounts
              </p>
              <p style={{ fontSize:10, color:C.red, fontWeight:600, margin:"0 0 14px", textTransform:"uppercase", letterSpacing:"0.5px" }}>
                ⚠ Required — at least one income source
              </p>

              {sources.map(s=>(
                <div key={s.id} style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"9px 12px", borderRadius:10,
                    background:s.active?"#F0FDF4":"#F8FAFC",
                    border:`1.5px solid ${s.active?C.green:C.border}`,
                    cursor:"pointer" }}
                    onClick={()=>setSources(p=>p.map(x=>x.id===s.id?{...x,active:!x.active}:x))}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{s.icon||"💰"}</span>
                    <p style={{ margin:0, fontSize:13, fontWeight:600,
                      color:s.active?C.green:C.ink, flex:1 }}>{s.label}</p>
                    <div style={{ width:22, height:22, borderRadius:99, flexShrink:0,
                      background:s.active?C.green:"#E5E7EB",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {s.active&&<span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>}
                    </div>
                  </div>
                  {s.active && (
                    <div style={{ display:"flex", alignItems:"center", gap:8,
                      marginTop:6, paddingLeft:12 }}>
                      <span style={{ fontSize:12, color:C.muted }}>₹</span>
                      <input type="number" value={s.amount}
                        onChange={e=>setSources(p=>p.map(x=>x.id===s.id?{...x,amount:e.target.value}:x))}
                        placeholder="Monthly amount"
                        style={{...inp, flex:1}}
                        onClick={e=>e.stopPropagation()}
                      />
                      <span style={{ fontSize:12, color:C.muted }}>/month</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Add custom source */}
              <button onClick={()=>setSources(p=>[...p,{id:Date.now(),label:"Other Income",amount:"",active:true}])}
                style={{ width:"100%", padding:"8px", borderRadius:10,
                  border:`1.5px dashed ${C.border}`, background:"transparent",
                  color:C.muted, fontSize:12, fontFamily:"inherit", cursor:"pointer",
                  fontWeight:600, marginBottom:12 }}>
                + Add another income source
              </button>

              {totalIncome>0 && (
                <div style={{ background:"#F0FDF4", borderRadius:10, padding:"10px 12px",
                  marginBottom:12, display:"flex", justifyContent:"space-between",
                  border:"1px solid #86EFAC" }}>
                  <span style={{ fontSize:13, color:C.green, fontWeight:600 }}>Total Income</span>
                  <span style={{ fontSize:16, fontWeight:700, color:C.green,
                    fontFamily:"Georgia,serif" }}>{fmt(totalIncome)}</span>
                </div>
              )}
              <button onClick={()=>setStep(3)} disabled={totalIncome===0}
                style={{ width:"100%", padding:13, borderRadius:12, border:"none",
                  background:totalIncome>0?C.ink:"#E5E7EB",
                  color:totalIncome>0?"#fff":C.muted,
                  fontSize:15, fontFamily:"inherit", fontWeight:700,
                  cursor:totalIncome>0?"pointer":"default" }}>
                Next → Fixed Bills
              </button>
            </>
          )}

          {/* ── Step 3: Fixed Bills ── */}
          {step===3 && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <button onClick={()=>setStep(2)} style={{ background:"none", border:"none",
                  cursor:"pointer", fontSize:18, color:C.muted, padding:0 }}>←</button>
                <p style={{ fontSize:17, fontWeight:700, color:C.ink, margin:0 }}>
                  🏠 Fixed Monthly Bills
                </p>
              </div>
              <p style={{ fontSize:12, color:C.muted, margin:"0 0 6px" }}>
                Tap to select bills you pay every month
              </p>

              {bills.map(b=>
                toggleRow(b, "amount", "e.g. 15000",
                  ()=>setBills(p=>p.map(x=>x.id===b.id?{...x,active:!x.active}:x)),
                  v=>setBills(p=>p.map(x=>x.id===b.id?{...x,amount:v}:x))
                )
              )}

              {totalBills>0 && (
                <div style={{ background:"#FFF7ED", borderRadius:10, padding:"10px 12px",
                  marginBottom:12, border:"1px solid #FED7AA" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:12, color:C.muted }}>Total Bills</span>
                    <span style={{ fontSize:14, fontWeight:700, color:C.red,
                      fontFamily:"Georgia,serif" }}>{fmt(totalBills)}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:C.muted }}>After Bills</span>
                    <span style={{ fontSize:14, fontWeight:700,
                      color:totalIncome-totalBills>0?C.green:C.red,
                      fontFamily:"Georgia,serif" }}>{fmt(totalIncome-totalBills)}</span>
                  </div>
                </div>
              )}

              <button onClick={()=>setStep(4)} style={{ width:"100%", padding:13,
                borderRadius:12, background:C.ink, color:"#fff", border:"none",
                fontSize:15, fontFamily:"inherit", fontWeight:700, cursor:"pointer",
                marginBottom:8 }}>
                Next → Savings
              </button>
              <button onClick={()=>setStep(4)} style={{ width:"100%", padding:"10px",
                borderRadius:12, border:"none", background:"transparent",
                color:C.muted, fontSize:13, fontFamily:"inherit", cursor:"pointer",
                fontWeight:600 }}>
                ⟳ Skip & Add Later
              </button>
            </>
          )}

          {/* ── Step 4: Savings ── */}
          {step===4 && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <button onClick={()=>setStep(3)} style={{ background:"none", border:"none",
                  cursor:"pointer", fontSize:18, color:C.muted, padding:0 }}>←</button>
                <p style={{ fontSize:17, fontWeight:700, color:C.ink, margin:0 }}>
                  📈 Savings & Investments
                </p>
              </div>
              <p style={{ fontSize:12, color:C.muted, margin:"0 0 6px" }}>
                Monthly SIPs, RDs or any savings you do
              </p>

              {savings.map(s=>
                toggleRow(s, "amount", "e.g. 5000",
                  ()=>setSavings(p=>p.map(x=>x.id===s.id?{...x,active:!x.active}:x)),
                  v=>setSavings(p=>p.map(x=>x.id===s.id?{...x,amount:v}:x))
                )
              )}

              {totalSavings>0 && (
                <div style={{ background:"#EFF6FF", borderRadius:10, padding:"10px 12px",
                  marginBottom:12, border:"1px solid #BFDBFE" }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:C.muted }}>Monthly Savings</span>
                    <span style={{ fontSize:14, fontWeight:700, color:C.blue,
                      fontFamily:"Georgia,serif" }}>{fmt(totalSavings)}</span>
                  </div>
                </div>
              )}

              <button onClick={()=>setStep(5)} style={{ width:"100%", padding:13,
                borderRadius:12, background:C.ink, color:"#fff", border:"none",
                fontSize:15, fontFamily:"inherit", fontWeight:700, cursor:"pointer",
                marginBottom:8 }}>
                Next → Loans & EMIs
              </button>
              <button onClick={()=>setStep(5)} style={{ width:"100%", padding:"10px",
                borderRadius:12, border:"none", background:"transparent",
                color:C.muted, fontSize:13, fontFamily:"inherit", cursor:"pointer",
                fontWeight:600 }}>
                ⟳ Skip & Add Later
              </button>
            </>
          )}

          {/* ── Step 5: Loans ── */}
          {step===5 && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <button onClick={()=>setStep(4)} style={{ background:"none", border:"none",
                  cursor:"pointer", fontSize:18, color:C.muted, padding:0 }}>←</button>
                <p style={{ fontSize:17, fontWeight:700, color:C.ink, margin:0 }}>
                  🏦 Loans & EMIs
                </p>
              </div>
              <p style={{ fontSize:12, color:C.muted, margin:"0 0 6px" }}>
                Any active loan EMIs you pay monthly
              </p>

              {loans.map(l=>
                toggleRow(l, "emi", "Monthly EMI amount",
                  ()=>setLoans(p=>p.map(x=>x.id===l.id?{...x,active:!x.active}:x)),
                  v=>setLoans(p=>p.map(x=>x.id===l.id?{...x,emi:v}:x))
                )
              )}

              {/* Final budget summary */}
              {totalIncome>0 && (
                <div style={{ background:"#F8FAFC", borderRadius:12, padding:"12px 14px",
                  marginBottom:14, border:`1px solid ${C.border}` }}>
                  <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:C.ink }}>
                    📊 Your Monthly Budget
                  </p>
                  {[
                    {label:"Income",  value:fmt(totalIncome),  color:C.green},
                    {label:"Bills",   value:`− ${fmt(totalBills)}`,  color:C.red},
                    {label:"Savings", value:`− ${fmt(totalSavings)}`, color:C.blue},
                    {label:"Loans",   value:`− ${fmt(totalLoans)}`,  color:C.purple},
                  ].map(r=>(
                    <div key={r.label} style={{ display:"flex", justifyContent:"space-between",
                      marginBottom:4 }}>
                      <span style={{ fontSize:12, color:C.muted }}>{r.label}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:r.color,
                        fontFamily:"Georgia,serif" }}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ height:1, background:C.border, margin:"8px 0" }}/>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>
                      Available to spend
                    </span>
                    <span style={{ fontSize:16, fontWeight:800,
                      color:leftover>0?C.green:C.red, fontFamily:"Georgia,serif" }}>
                      {leftover>=0?fmt(leftover):`−${fmt(Math.abs(leftover))}`}
                    </span>
                  </div>
                  {leftover < 0 && (
                    <div style={{ marginTop:8, padding:"8px 10px", borderRadius:8,
                      background:"#FEF2F2", border:"1px solid #FCA5A5" }}>
                      <p style={{ margin:0, fontSize:11, color:C.red, fontWeight:600 }}>
                        ⚠ Your bills/savings/loans exceed your income. You may want to review the amounts above before continuing.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button onClick={go} style={{ width:"100%", padding:14,
                borderRadius:12, background:"linear-gradient(135deg,#2563EB,#1D4ED8)",
                color:"#fff", border:"none", fontSize:15, fontFamily:"inherit",
                fontWeight:800, cursor:"pointer",
                boxShadow:"0 4px 16px rgba(37,99,235,0.4)", marginBottom:8 }}>
                🚀 Start Tracking!
              </button>
              <button onClick={go} style={{ width:"100%", padding:"10px",
                borderRadius:12, border:"none", background:"transparent",
                color:C.muted, fontSize:13, fontFamily:"inherit", cursor:"pointer",
                fontWeight:600 }}>
                ⟳ Skip & Finish Setup
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign:"center", marginTop:12, fontSize:11, color:"#334155" }}>
          Free forever · Your data is private &amp; secure
        </p>
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
  const existingDate=(expense.date||new Date().toISOString()).split("T")[0];
  const [date,setDate]=useState(existingDate);
  const save=()=>{
    const v=parseFloat(amount);
    if(!v||v<=0) return;
    const origTime=(expense.date||new Date().toISOString()).includes("T")?(expense.date||new Date().toISOString()).split("T")[1]:"00:00:00.000Z";
    const newDate=`${date}T${origTime}`;
    onSave(monthKey,expense.id,{amount:v,label,note:note.trim(),date:newDate});
    onClose();
  };
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0"}}>
      <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"20px 20px 0",paddingBottom:"calc(env(safe-area-inset-bottom, 0px) + 24px)",width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,0.18)",maxHeight:"92dvh",overflowY:"auto"}}>
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
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:16,background:C.bg,outline:"none",marginTop:6,marginBottom:12,boxSizing:"border-box"}} />
        <Label>Note (optional)</Label>
        <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note" maxLength={120}
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:16,background:C.bg,outline:"none",marginTop:6,marginBottom:16,boxSizing:"border-box"}} />
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
  const initMode = expenses.some(e=>e.date?.startsWith(today)) ? "today" : "custom";
  const initDate = initMode==="today" ? today :
    ([...new Set(expenses.filter(e=>e.date).map(e=>e.date.split("T")[0]))].sort((a,b)=>b.localeCompare(a))[0] || today);

  // ── ALL hooks declared here, before any conditional or return ──
  const [mode,    setMode]    = useState(initMode);
  const [selDate, setSelDate] = useState(initDate);
  const [calOpen, setCalOpen] = useState(false);
  const calRef                = useRef(null);

  const datesWithData = useMemo(()=>
    new Set(expenses.filter(e=>e.date).map(e=>e.date.split("T")[0])), [expenses]);

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
    if      (mode==="today")     onFiltered(expenses.filter(e=>e.date?.startsWith(today)));
    else if (mode==="yesterday") onFiltered(expenses.filter(e=>e.date?.startsWith(yestStr)));
    else                         onFiltered(expenses.filter(e=>e.date?.startsWith(selDate)));
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
  useEffect(() => { setFiltered(expenses.filter(e=>e.date?.startsWith(new Date().toISOString().split("T")[0]))); }, [expenses]);
  return (
    <>
      <DateFilter expenses={expenses} onFiltered={(f) => setFiltered(f)} monthKey={monthKey}/>
      <ExpenseList expenses={filtered} monthKey={monthKey}
        onEdit={onEdit} onDelete={onDelete} isCurrentMonth={isCurrentMonth}/>
    </>
  );
}

// ─── AMOUNT INPUT — isolated to prevent cursor jumping on parent re-render ────
function AmountInput({ value, onChange, onEnter, disabled, hasError }) {
  return (
    <input
      type="number"
      value={value}
      min="0.01"
      step="any"
      onChange={e => onChange(e.target.value)}
      placeholder="e.g. 250"
      disabled={disabled}
      onKeyDown={e => e.key === "Enter" && onEnter()}
      style={{
        width:"100%", padding:"10px 12px", borderRadius:8,
        border:`1.5px solid ${hasError ? "#DC2626" : "#E5E7EB"}`,
        fontFamily:"Georgia,serif", fontSize:20, background:"#F8FAFC",
        outline:"none", marginTop:6, marginBottom: hasError ? 4 : 12,
        boxSizing:"border-box",
      }}
    />
  );
}

function LogExpenseForm({onAdd, disabled, currentExpenses=[], dailyLimit=0}) {
  const [amount,setAmount]=useState("");
  const [label,setLabel]=useState("Food");
  const [note,setNote]=useState("");
  const [err,setErr]=useState("");
  const [saved,setSaved]=useState(false);

  const todayStr   = new Date().toISOString().split("T")[0];
  const todaySpent = currentExpenses.filter(e=>e.date?.startsWith(todayStr)).reduce((s,e)=>s+e.amount,0);
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
      <AmountInput
        value={amount}
        onChange={v => { setAmount(v); if(err) setErr(""); }}
        onEnter={submit}
        disabled={disabled}
        hasError={!!err}
      />
      {err&&<p style={{margin:"0 0 10px",fontSize:11,color:C.red,fontWeight:600}}>{err}</p>}
      <Label>Category</Label>
      <p style={{fontSize:11,color:C.muted,margin:"2px 0 6px"}}>For fixed bills like Rent or EMI, use the <strong>Plan tab</strong>.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{VARIABLE_CATS.map(chip)}</div>
      <Label>Note (optional)</Label>
      <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder={NOTE_PLACEHOLDER[label]||"e.g. Misc expense"} disabled={disabled} maxLength={120}
        style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:"inherit",fontSize:16,background:C.bg,outline:"none",marginTop:6,marginBottom:10,boxSizing:"border-box"}} />
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
function RecurringTab({
  recurringExpenses, allExpenses,
  onAdd, onUpdate, onDelete, onToggle, showToast,
  incomeSources=[], fixedExpenses=[], loans=[],
  onUpdateIncomeSource, onUpdateFixedExpense,
}) {
  const CATS = [
    {name:"Rent",icon:"🏠"},{name:"EMI/Loan",icon:"🏦"},{name:"Electricity",icon:"⚡"},
    {name:"Internet",icon:"📶"},{name:"Mobile",icon:"📱"},{name:"Insurance",icon:"🛡"},
    {name:"Subscription",icon:"📺"},{name:"Gym",icon:"💪"},{name:"School Fees",icon:"🎓"},
    {name:"Maintenance",icon:"🔧"},{name:"Water",icon:"💧"},{name:"Other",icon:"💸"},
  ];
  const DAYS = Array.from({length:28},(_,i)=>i+1);

  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [fLabel,   setFLabel]   = useState("");
  const [fCat,     setFCat]     = useState("Rent");
  const [fAmt,     setFAmt]     = useState("");
  const [fDay,     setFDay]     = useState(1);
  const [fNote,    setFNote]    = useState("");
  // Inline edit for carry-forward items
  const [editingCF, setEditingCF] = useState(null); // {type, id, amount}

  const ordinal = (d) => { const s=["th","st","nd","rd"]; const v=d%100; return d+(s[(v-20)%10]||s[v]||s[0]); };
  const inp2 = { width:"100%", padding:"9px 11px", borderRadius:8, border:`1px solid ${C.border}`, fontFamily:"inherit", fontSize:16, background:"#fff", outline:"none", boxSizing:"border-box" };

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

  const saveCFEdit = () => {
    if (!editingCF) return;
    const v = parseFloat(editingCF.amount);
    if (!v || v <= 0) return;
    if (editingCF.type === "income") onUpdateIncomeSource(editingCF.id, { amount: v });
    if (editingCF.type === "fixed")  onUpdateFixedExpense(editingCF.id, { amount: v });
    showToast("Amount updated ✓");
    setEditingCF(null);
  };

  const curMonthKey  = currentMonthKey();
  const monthlyRecurring = recurringExpenses.filter(r=>r.active).reduce((s,r)=>s+r.amount, 0);
  const monthlyFixed     = fixedExpenses.reduce((s,f)=>s+f.amount, 0);
  const monthlyIncome    = incomeSources.reduce((s,i)=>s+i.amount, 0);
  const monthlyLoans     = loans.reduce((s,l)=>s+(l.emi||0), 0);

  // Inline row render — NOT a sub-component to prevent remount/cursor jump
  const cfRow = (icon, label, amount, sublabel, type, id, onEditAmount) => {
    const isEditing = editingCF?.type === type && editingCF?.id === id;
    return (
      <div key={`${type}-${id}`} style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 14px", background:"#fff", borderRadius:12,
        border:`1px solid ${C.border}`, marginBottom:8,
        boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0 }}>
          <span style={{ fontSize:22, flexShrink:0 }}>{icon}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.ink,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</p>
            {sublabel && <p style={{ margin:"2px 0 0", fontSize:10, color:C.muted }}>{sublabel}</p>}
          </div>
        </div>
        {isEditing ? (
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <input
              autoFocus type="number"
              value={editingCF.amount}
              onChange={e=>setEditingCF(p=>({...p, amount:e.target.value}))}
              onKeyDown={e=>{ if(e.key==="Enter") saveCFEdit(); if(e.key==="Escape") setEditingCF(null); }}
              style={{ width:90, padding:"5px 8px", borderRadius:7, border:`1.5px solid ${C.blue}`,
                outline:"none", fontFamily:"inherit", fontSize:13, textAlign:"right" }}
            />
            <button onClick={saveCFEdit} style={{
              padding:"5px 10px", borderRadius:7, border:"none",
              background:C.blue, color:"#fff", cursor:"pointer",
              fontFamily:"inherit", fontSize:12, fontWeight:700,
            }}>✓</button>
            <button onClick={()=>setEditingCF(null)} style={{
              padding:"5px 8px", borderRadius:7, border:`1px solid ${C.border}`,
              background:"#fff", color:C.muted, cursor:"pointer",
              fontFamily:"inherit", fontSize:12,
            }}>✕</button>
          </div>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.ink,
              fontFamily:"Georgia,serif" }}>{fmt(amount)}</p>
            {onEditAmount && (
              <button onClick={()=>setEditingCF({type, id, amount:String(amount)})} style={{
                padding:"4px 8px", borderRadius:7, border:`1px solid ${C.border}`,
                background:C.bg, cursor:"pointer", fontFamily:"inherit",
                fontSize:11, color:C.muted, fontWeight:600,
              }}>Edit</button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper function to render a category section with consistent styling
  const categorySection = (icon, title, total, totalLabel, items, emptyMessage, isBuiltIn=true) => {
    const hasItems = items && items.length > 0;
    const bgColor = {
      "💰": "#F0FDF4",
      "🏠": "#FEF3C7",
      "🏦": "#EDE9FE",
      "🔁": "#EFF6FF"
    }[icon] || "#F8FAFC";
    const borderColor = {
      "💰": "#86EFAC",
      "🏠": "#FCD34D",
      "🏦": "#D8B4FE",
      "🔁": "#BFDBFE"
    }[icon] || C.border;

    return (
      <div style={{marginBottom:16}}>
        {/* Category header */}
        <div style={{
          background:bgColor, border:`1px solid ${borderColor}`,
          borderRadius:11, padding:"10px 14px", marginBottom:10,
          display:"flex", justifyContent:"space-between", alignItems:"center"
        }}>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <span style={{fontSize:18}}>{icon}</span>
            <div>
              <p style={{margin:0, fontSize:12, fontWeight:700, color:C.ink}}>{title}</p>
              <p style={{margin:"1px 0 0", fontSize:10, color:C.muted}}>
                {totalLabel}
              </p>
            </div>
          </div>
          <p style={{margin:0, fontSize:14, fontWeight:800, color:C.ink, fontFamily:"Georgia,serif"}}>
            {fmt(total)}
          </p>
        </div>

        {/* Items or empty state */}
        {hasItems ? (
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {items}
          </div>
        ) : (
          <div style={{
            background:"#fff", border:`1px solid ${C.border}`, borderRadius:11,
            padding:"16px 14px", textAlign:"center"
          }}>
            <p style={{margin:0, fontSize:11, color:C.muted, fontStyle:"italic"}}>
              {emptyMessage}
            </p>
          </div>
        )}
        {!isBuiltIn && (
          <p style={{margin:"6px 0 0", fontSize:9, color:C.muted, fontStyle:"italic"}}>
            * Edit in the respective tab
          </p>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16}}>
        <div>
          <h2 style={{margin:"0 0 2px", fontSize:17, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif"}}>
            Recurring & Monthly
          </h2>
          <p style={{margin:0, fontSize:11, color:C.muted}}>
            All auto-carry commitments organized by category
          </p>
        </div>
        {!showForm && (
          <button onClick={openNew} style={{
            padding:"7px 14px", borderRadius:9, border:"none",
            background:C.ink, color:"#fff", fontSize:12, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit", flexShrink:0,
          }}>+ Add Recurring</button>
        )}
      </div>

      {/* ── INCOME SOURCES ── */}
      {categorySection(
        "💰",
        "Income Sources",
        monthlyIncome,
        "Total monthly income",
        incomeSources.length > 0 ? incomeSources.map(src =>
          cfRow("💰", src.label||src.name||"Income", src.amount,
            "Monthly income · auto carry-forward",
            "income", src.id, onUpdateIncomeSource)
        ) : null,
        "No income sources yet",
        true
      )}

      {/* ── FIXED EXPENSES ── */}
      {categorySection(
        "🏠",
        "Fixed Expenses",
        monthlyFixed,
        "Total fixed monthly expenses",
        fixedExpenses.length > 0 ? fixedExpenses.map(exp =>
          cfRow("🏠", exp.label||exp.name||"Fixed", exp.amount,
            "Fixed monthly · auto carry-forward",
            "fixed", exp.id, onUpdateFixedExpense)
        ) : null,
        "No fixed expenses yet",
        true
      )}

      {/* ── LOANS / EMI ── */}
      {categorySection(
        "🏦",
        "Loans & EMIs",
        monthlyLoans,
        "Total monthly EMI payments",
        loans.length > 0 ? loans.map(loan =>
          cfRow("🏦", loan.name||"Loan", loan.manualEmi||loan.emi||0,
            "EMI · auto carry-forward",
            "loan", loan.id, null)
        ) : null,
        "No active loans yet",
        true
      )}

      {/* ── CUSTOM RECURRING EXPENSES ── */}
      <div>
        {/* Category header */}
        <div style={{
          background:"#EFF6FF", border:"1px solid #BFDBFE",
          borderRadius:11, padding:"10px 14px", marginBottom:10,
          display:"flex", justifyContent:"space-between", alignItems:"center"
        }}>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <span style={{fontSize:18}}>🔁</span>
            <div>
              <p style={{margin:0, fontSize:12, fontWeight:700, color:C.ink}}>Custom Recurring</p>
              <p style={{margin:"1px 0 0", fontSize:10, color:C.muted}}>
                One-time additions
              </p>
            </div>
          </div>
          <p style={{margin:0, fontSize:14, fontWeight:800, color:C.ink, fontFamily:"Georgia,serif"}}>
            {fmt(monthlyRecurring)}
          </p>
        </div>

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

        {/* Empty state with helpful info */}
        {recurringExpenses.length === 0 && !showForm && (
          <div style={{background:"#fff", border:`1px solid ${C.border}`, borderRadius:11, padding:"16px 14px", textAlign:"center", marginBottom:10}}>
            <p style={{margin:"0 0 8px", fontSize:11, color:C.ink, fontWeight:600}}>
              No custom recurring expenses yet
            </p>
            <p style={{margin:0, fontSize:10, color:C.muted, lineHeight:1.5}}>
              Add expenses that repeat monthly — Netflix, gym memberships, subscriptions. They'll be auto-logged on the day you set.
            </p>
          </div>
        )}

        {/* Custom recurring list */}
        {recurringExpenses.length > 0 && (
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {recurringExpenses.map(r => {
              const autoLogged = (allExpenses[curMonthKey]||[]).some(e=>e.recurringId===r.id);
              const ICONS = {Rent:"🏠","EMI/Loan":"🏦",Electricity:"⚡",Internet:"📶",Mobile:"📱",Insurance:"🛡",Subscription:"📺",Gym:"💪","School Fees":"🎓",Maintenance:"🔧",Water:"💧",Other:"💸"};
              const icon = ICONS[r.category] || "🔁";
              return (
                <div key={r.id} style={{
                  display:"flex", alignItems:"center", gap:12,
                  padding:"12px 14px", background:"#fff", borderRadius:12,
                  border:`1px solid ${r.active ? C.border : "#F3F4F6"}`,
                  opacity: r.active ? 1 : 0.6,
                  boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  <span style={{fontSize:22, flexShrink:0}}>{icon}</span>
                  <div style={{flex:1, minWidth:0}}>
                    <p style={{margin:0, fontSize:13, fontWeight:700, color:C.ink,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{r.label}</p>
                    <p style={{margin:"2px 0 0", fontSize:10, color:C.muted}}>
                      {ordinal(r.dayOfMonth)} of month
                      {autoLogged ? " · ✅ logged this month" : " · ⏳ pending"}
                    </p>
                  </div>
                  <p style={{margin:0, fontSize:14, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", flexShrink:0}}>
                    {fmt(r.amount)}
                  </p>
                  <div style={{display:"flex", gap:6, flexShrink:0}}>
                    <button onClick={()=>openEdit(r)} style={{padding:"4px 8px", borderRadius:7, border:`1px solid ${C.border}`, background:C.bg, cursor:"pointer", fontFamily:"inherit", fontSize:11, color:C.muted}}>Edit</button>
                    <button onClick={()=>{onToggle(r.id); showToast(r.active?"Paused ✓":"Resumed ✓");}}
                      style={{padding:"4px 8px", borderRadius:7, border:`1px solid ${C.border}`, background:r.active?"#FFF7ED":"#F0FDF4", cursor:"pointer", fontFamily:"inherit", fontSize:11, color:r.active?C.amber:C.green}}>
                      {r.active?"Pause":"Resume"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly total summary */}
      {(incomeSources.length > 0 || fixedExpenses.length > 0 || loans.length > 0 || recurringExpenses.length > 0) && (
        <div style={{marginTop:16, padding:"12px 14px", borderRadius:12,
          background:"#F0FDF4", border:"1px solid #86EFAC"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <p style={{margin:0, fontSize:12, fontWeight:700, color:C.green}}>
              💰 Total Monthly Commitments
            </p>
            <p style={{margin:0, fontSize:15, fontWeight:800, color:C.green, fontFamily:"Georgia,serif"}}>
              {fmt(monthlyFixed + monthlyLoans + monthlyRecurring)}
            </p>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginTop:8}}>
            {monthlyFixed > 0 && (
              <div style={{background:"rgba(255,255,255,0.5)", borderRadius:8, padding:"6px 10px", textAlign:"center"}}>
                <p style={{margin:0, fontSize:9, color:C.muted}}>Fixed Bills</p>
                <p style={{margin:"2px 0 0", fontSize:12, fontWeight:700, color:C.red, fontFamily:"Georgia,serif"}}>{fmt(monthlyFixed)}</p>
              </div>
            )}
            {monthlyLoans > 0 && (
              <div style={{background:"rgba(255,255,255,0.5)", borderRadius:8, padding:"6px 10px", textAlign:"center"}}>
                <p style={{margin:0, fontSize:9, color:C.muted}}>EMI Payments</p>
                <p style={{margin:"2px 0 0", fontSize:12, fontWeight:700, color:C.purple, fontFamily:"Georgia,serif"}}>{fmt(monthlyLoans)}</p>
              </div>
            )}
            {monthlyRecurring > 0 && (
              <div style={{background:"rgba(255,255,255,0.5)", borderRadius:8, padding:"6px 10px", textAlign:"center"}}>
                <p style={{margin:0, fontSize:9, color:C.muted}}>Custom Recurring</p>
                <p style={{margin:"2px 0 0", fontSize:12, fontWeight:700, color:C.blue, fontFamily:"Georgia,serif"}}>{fmt(monthlyRecurring)}</p>
              </div>
            )}
            {monthlyIncome > 0 && (
              <div style={{background:"rgba(255,255,255,0.5)", borderRadius:8, padding:"6px 10px", textAlign:"center"}}>
                <p style={{margin:0, fontSize:9, color:C.muted}}>Total Income</p>
                <p style={{margin:"2px 0 0", fontSize:12, fontWeight:700, color:"#059669", fontFamily:"Georgia,serif"}}>{fmt(monthlyIncome)}</p>
              </div>
            )}
          </div>
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
    creditCards, addCreditCard, updateCreditCard, deleteCreditCard,
    updateName,
    firebaseUser, isGuest, onSignOut, onDeleteAccount,
    syncError,
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
    { key:"cards",     icon:"💳",  label:"Cards"     },
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
  const [salaryDismissed, setSalaryDismissed] = useState(false);

  // Auto dark mode — re-check every minute, switches at 7am / 7pm
  useEffect(() => {
    const tick = () => { const on = isDarkHour(); applyDarkMode(on); setDarkMode(on); };
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

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

  // Auto-log any due recurring expenses on mount and whenever the month rolls over
  const currentMk = currentMonthKey();
  useEffect(() => { autoLogRecurring(); }, [currentMk]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthBarJsx = <MonthSelector selectedMonth={selectedMonth} onChange={setSelectedMonth} allExpenses={allExpenses}/>;

  // ── Shared inline style tokens ─────────────────────────────────────────
  const NAV_BG      = "#1E293B";
  const NAV_HEIGHT  = 48;
  const NAV_BORDER  = "1px solid rgba(255,255,255,0.12)";

  return (
    <div className="mc-app">
      <style>{APP_CSS}</style>{/* fallback for environments where useEffect head injection isn't immediate */}

      {/* ── Sync error banner ── */}
      {syncError && (
        <div style={{position:"fixed",top:0,left:0,right:0,
                     background:"#B45309",color:"#fff",
                     paddingTop:"calc(env(safe-area-inset-top, 0px) + 8px)",
                     paddingBottom:"8px",paddingLeft:"16px",paddingRight:"16px",
                     fontSize:12,zIndex:9998,textAlign:"center",
                     boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}>
          ⚠️ {syncError}
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{position:"fixed",top:syncError?"calc(env(safe-area-inset-top, 0px) + 52px)":"calc(env(safe-area-inset-top, 0px) + 12px)",left:"50%",transform:"translateX(-50%)",
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
          firebaseUser={firebaseUser}
          isGuest={isGuest}
          onSignOut={onSignOut}
          onDeleteAccount={onDeleteAccount}
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
                <p style={{margin:0,fontSize:14,fontWeight:700,color:"#111827",fontFamily:"Georgia,serif",lineHeight:1.15,
                           overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"60vw"}}>
                  {tab==="budget" ? `${getGreeting(name || firebaseUser?.displayName)} 👋` : (TABS.find(t=>t.key===tab)?.label || "Money Coach")}
                </p>
                {tab==="budget" && (() => {
                  try {
                    const insight = getSmartInsight(remaining||0, totalIncome||0, thisMonthSpent||0, dailyLimit||0, streak||0);
                    return insight ? (
                      <p style={{margin:"2px 0 0",fontSize:10,color:insight.color,fontWeight:600,lineHeight:1.3}}>
                        {insight.text}
                      </p>
                    ) : null;
                  } catch(e) { return null; }
                })()}
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
                  {tab==="budget"
                    ? new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"})
                    : (TABS.find(t=>t.key===tab)?.label || "Money Coach")}
                </p>
                <h1 style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:"Georgia,serif",margin:0}}>
                  {tab==="budget" ? `${getGreeting(name || firebaseUser?.displayName)} 👋` : new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"})}
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
                    {/* ── SALARY DAY MODE ── */}
                    {(() => {
                      const today = new Date().getDate();
                      const isSalaryDay = today === 1 || today <= 5 || today >= 28;
                      if (!isSalaryDay || salaryDismissed || totalIncome === 0) return null;
                      const lastMonthDate = new Date();
                      lastMonthDate.setDate(1);
                      lastMonthDate.setMonth(lastMonthDate.getMonth()-1);
                      const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()+1).padStart(2,"0")}`;
                      const lastMonthSpent = (allExpenses[lastMonthKey]||[]).reduce((s,e)=>s+(e.amount||0),0);
                      const lastMonthSaved = budgetForMonth - lastMonthSpent;
                      return (
                        <div style={{ marginBottom:12, borderRadius:14, overflow:"hidden",
                          background:"linear-gradient(135deg,#1E3A5F,#1E293B)",
                          border:"1px solid rgba(37,99,235,0.3)" }}>
                          <div style={{ padding:"14px 16px" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                              <div>
                                <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#60A5FA" }}>🎉 New Month — Fresh Budget!</p>
                                <p style={{ margin:"2px 0 0", fontSize:11, color:"#64748B" }}>Your monthly reset is ready</p>
                              </div>
                              <button onClick={()=>setSalaryDismissed(true)} style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:18, padding:0, lineHeight:1 }}>✕</button>
                            </div>
                            {lastMonthSpent > 0 && (
                              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                                {[
                                  { label:"Last Month Spent", value:fmt(lastMonthSpent), color:"#F87171" },
                                  { label:lastMonthSaved>=0?"Saved":"Overspent", value:fmt(Math.abs(lastMonthSaved)), color:lastMonthSaved>=0?"#86EFAC":"#F87171" },
                                  { label:"This Month Budget", value:fmt(budgetForMonth), color:"#6EE7B7" },
                                ].map(s=>(
                                  <div key={s.label} style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:8, padding:"8px 6px", textAlign:"center" }}>
                                    <p style={{ margin:0, fontSize:9, color:"#64748B", textTransform:"uppercase" }}>{s.label}</p>
                                    <p style={{ margin:"2px 0 0", fontSize:13, fontWeight:700, color:s.color, fontFamily:"Georgia,serif" }}>{s.value}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ display:"flex", gap:8, marginTop:10 }}>
                              <button onClick={()=>setTab("plan")} style={{ flex:1, padding:"8px", borderRadius:8, border:"1px solid rgba(37,99,235,0.3)", background:"rgba(37,99,235,0.1)", color:"#60A5FA", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}>📋 Review Plan</button>
                              <button onClick={()=>{ setSalaryDismissed(true); setTab("home"); }} style={{ flex:1, padding:"8px", borderRadius:8, border:"none", background:"#2563EB", color:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}>💸 Start Logging</button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

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
            {/* 2-col grid: Left = Income + Fixed, Right = Savings + Future */}
            <div className="mc-plan-top">
              <div>
                <IncomeSources sources={incomeSources} totalIncome={totalIncome}
                  onAdd={src=>{if(!src.amount||src.amount<=0){showToast("⚠ Enter a valid amount");return;}addIncomeSource(src);showToast("Income source saved ✓");}}
                  onUpdate={(id,upd)=>{updateIncomeSource(id,upd);showToast("Income updated ✓");}}
                  onDelete={deleteIncomeSource}/>
                <FixedExpensesSection items={fixedExpenses} totalFixed={totalFixed}
                  onAdd={item=>{addFixedExpense(item);showToast("Fixed expense saved ✓");}}
                  onUpdate={(id,upd)=>{updateFixedExpense(id,upd);showToast("Fixed expense updated ✓");}}
                  onDelete={deleteFixedExpense}/>
              </div>
              <div>
                <SavingsSection plans={savingsPlans} totalSavings={totalSavings}
                  onAdd={p=>{addSavingsPlan(p);showToast("Savings plan saved ✓");}}
                  onUpdate={(id,upd)=>{updateSavingsPlan(id,upd);showToast("Savings updated ✓");}}
                  onDelete={deleteSavingsPlan}/>
                <FuturePaymentsSection payments={futurePayments} totalReserve={totalReserve}
                  onAdd={p=>{addFuturePayment(p);showToast("Future payment saved ✓");}}
                  onUpdate={(id,upd)=>{updateFuturePayment(id,upd);showToast("Future payment updated ✓");}}
                  onDelete={deleteFuturePayment}/>
              </div>
            </div>

            {/* ── Budget Summary Row ── */}
            {totalIncome > 0 && (() => {
              const loanEmi = loans.reduce((s,l)=>s+(l.emi||0),0);
              const items = [
                {label:"Income",   value:fmt(totalIncome),           color:"#6EE7B7"},
                {label:"Fixed",    value:fmt(totalFixed),            color:"#FCA5A5", prefix:"−"},
                {label:"Savings",  value:fmt(totalSavings),          color:"#93C5FD", prefix:"−"},
                {label:"EMI",      value:fmt(loanEmi),               color:"#C4B5FD", prefix:"−", hide:loanEmi===0},
                {label:"Reserve",  value:fmt(Math.round(totalReserve)), color:"#FCD34D", prefix:"−", hide:totalReserve===0},
                {label:"Left/day", value:dailyLimit>0?`${fmt(dailyLimit)}/day`:"₹0", color:"#fff", isResult:true},
              ].filter(t=>!t.hide);
              return (
                <div style={{
                  background:"linear-gradient(135deg,#1E293B,#334155)",
                  borderRadius:14, padding:"14px 16px", marginTop:4,
                }}>
                  <p style={{margin:"0 0 10px",fontSize:9,color:"#94A3B8",
                             textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>
                    Monthly Budget Flow
                  </p>
                  <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:4}}>
                    {items.map((t,i,arr)=>(
                      <div key={t.label} style={{display:"flex",alignItems:"center",gap:4}}>
                        <div style={{
                          padding:"6px 10px", borderRadius:8,
                          background: t.isResult?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.06)",
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
                      ⚠ Commitments exceed income by {fmt(Math.abs(remaining))} — review your plan.
                    </p>
                  )}
                </div>
              );
            })()}
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

            {monthBarJsx}
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:14}}>
              <div>
                <LogExpenseForm
                  key="log-expense-form"
                  onAdd={handleAdd}
                  disabled={!isCurrentMonth}
                  currentExpenses={currentExpenses}
                  dailyLimit={dailyLimit}
                />
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
          <>
            {loans.length === 0 && (
              <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:14,
                padding:"28px 20px", textAlign:"center", marginBottom:14 }}>
                <p style={{ fontSize:36, margin:"0 0 8px" }}>🏦</p>
                <p style={{ fontSize:15, fontWeight:700, color:C.ink, margin:"0 0 6px" }}>No loans added yet</p>
                <p style={{ fontSize:12, color:C.muted, margin:"0 0 16px", lineHeight:1.6 }}>
                  Track your home loan, car loan or personal loan — see exact EMI, outstanding balance and interest saved by prepaying
                </p>
              </div>
            )}
            <LoansTab
              loans={loans}
              onAdd={addLoan}
              onUpdate={updateLoan}
              onDelete={deleteLoan}
            />
          </>
        )}

        {/* ══ CREDIT CARDS ══ */}
        {tab==="cards"&&(
          <CreditCardsTab
            cards={creditCards||[]}
            onAdd={addCreditCard}
            onUpdate={updateCreditCard}
            onDelete={deleteCreditCard}
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
            incomeSources={incomeSources||[]}
            fixedExpenses={fixedExpenses||[]}
            loans={loans||[]}
            onUpdateIncomeSource={updateIncomeSource}
            onUpdateFixedExpense={updateFixedExpense}
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
          const curKey        = currentMonthKey();
          const isCurrentMon  = selectedMonth === curKey;
          const isCompleted   = selectedMonth < curKey; // only past months are "completed"

          // Selected month data only
          const selExp        = allExpenses[selectedMonth] || [];
          const totalSpent    = selExp.reduce((s,e)=>s+e.amount,0);
          const txCount       = selExp.length;
          const daysWithSpend = new Set(selExp.filter(e=>e.date).map(e=>e.date.split("T")[0])).size;
          const avgDaily      = daysWithSpend>0?Math.round(totalSpent/daysWithSpend):0;

          // Summary for selected month — only if completed
          const mSaved  = budgetForMonth - totalSpent;
          const saved   = mSaved >= 0;
          const pctSpent = budgetForMonth>0 ? Math.min(Math.round((totalSpent/budgetForMonth)*100),100) : 0;
          const pctLeft  = Math.max(0, 100-pctSpent);
          const mLabel   = new Date(selectedMonth+"-15").toLocaleDateString("en-IN",{month:"long",year:"numeric"});

          return (
            <>
              {monthBarJsx}

              {/* Stats strip — selected month only */}
              {totalSpent > 0 ? (
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:12}}>
                  {[
                    {label:"Total Spent",   value:fmt(totalSpent), color:"#DC2626"},
                    {label:"Avg/Spend Day", value:fmt(avgDaily),   color:"#D97706"},
                    {label:"Transactions",  value:String(txCount), color:"#2563EB"},
                  ].map(s=>(
                    <div key={s.label} style={{background:"#fff",borderRadius:11,
                      border:`1px solid ${C.border}`,padding:"9px 8px",minWidth:0,
                      boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
                      <p style={{margin:0,fontSize:8,color:C.muted,textTransform:"uppercase",
                                 letterSpacing:"0.5px",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</p>
                      <p style={{margin:"3px 0 0",fontSize:13,fontWeight:700,color:s.color,
                                 fontFamily:"Georgia,serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,
                  padding:"20px",textAlign:"center",marginBottom:12}}>
                  <p style={{fontSize:24,margin:"0 0 6px"}}>📊</p>
                  <p style={{fontSize:13,color:C.muted,margin:0}}>
                    No expenses logged for {mLabel}
                  </p>
                </div>
              )}

              {/* Charts — use selected month expenses */}
              <TrendChart allExpenses={allExpenses} monthlyIncome={totalIncome}/>
              <CategoryHistoryChart allExpenses={allExpenses}/>
              <SpendingChart expenses={selExp} monthlyIncome={totalIncome}/>

              {/* ── Month Summary — ONLY for completed months ── */}
              {isCompleted && totalSpent > 0 && (
                <div style={{marginTop:8}}>
                  <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:C.muted,
                    textTransform:"uppercase",letterSpacing:"0.8px"}}>
                    📅 {mLabel} Summary
                  </p>
                  <div style={{
                    background:"#fff", borderRadius:14, padding:"14px 16px",
                    border:`1px solid ${C.border}`,
                    boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
                  }}>
                    {/* Badge */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <p style={{margin:0,fontSize:13,fontWeight:700,color:C.ink}}>{mLabel}</p>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:99,fontWeight:700,
                        background:saved?"#F0FDF4":"#FFF1F2",
                        color:saved?C.green:C.red}}>
                        {saved ? `Saved ${fmt(mSaved)}` : `Over ${fmt(Math.abs(mSaved))}`}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{height:8,borderRadius:99,background:"#F1F5F9",overflow:"hidden",marginBottom:8}}>
                      <div style={{display:"flex",height:"100%"}}>
                        <div style={{width:`${pctSpent}%`,background:saved?C.amber:C.red,borderRadius:"99px 0 0 99px",transition:"width 0.5s"}}/>
                        <div style={{width:`${pctLeft}%`,background:C.green,borderRadius:"0 99px 99px 0",transition:"width 0.5s"}}/>
                      </div>
                    </div>
                    {/* Formula: Income − Spent = Remaining */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-around",
                      padding:"8px",background:C.bg,borderRadius:10}}>
                      <div style={{textAlign:"center"}}>
                        <p style={{margin:0,fontSize:9,color:C.muted}}>INCOME</p>
                        <p style={{margin:0,fontSize:13,fontWeight:700,color:C.green,fontFamily:"Georgia,serif"}}>{fmt(budgetForMonth)}</p>
                      </div>
                      <p style={{margin:0,fontSize:18,color:C.muted,fontWeight:300}}>−</p>
                      <div style={{textAlign:"center"}}>
                        <p style={{margin:0,fontSize:9,color:C.muted}}>SPENT</p>
                        <p style={{margin:0,fontSize:13,fontWeight:700,color:C.red,fontFamily:"Georgia,serif"}}>{fmt(totalSpent)}</p>
                      </div>
                      <p style={{margin:0,fontSize:18,color:C.muted,fontWeight:300}}>=</p>
                      <div style={{textAlign:"center"}}>
                        <p style={{margin:0,fontSize:9,color:C.muted}}>REMAINING</p>
                        <p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"Georgia,serif",
                          color:saved?C.green:C.red}}>
                          {saved ? fmt(mSaved) : `−${fmt(Math.abs(mSaved))}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Current month — no summary shown */}
              {isCurrentMon && (
                <div style={{marginTop:8,padding:"10px 14px",borderRadius:10,
                  background:"#EFF6FF",border:"1px solid #BFDBFE"}}>
                  <p style={{margin:0,fontSize:12,color:"#1D4ED8"}}>
                    📊 Month in progress — summary will appear once April ends
                  </p>
                </div>
              )}
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

          {/* ════════ FLOATING QUICK-ADD BUTTON ════════ */}
          {isMobile && tab !== "home" && tab !== "plan" && (
            <button
              onClick={() => setTab("home")}
              style={{
                position:"fixed",
                right:16,
                bottom:`calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 12px)`,
                zIndex:9990,
                width:52, height:52,
                borderRadius:16,
                background:"linear-gradient(135deg,#1E293B,#334155)",
                border:"1px solid rgba(255,255,255,0.1)",
                boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
                color:"#fff", fontSize:22,
                cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}
              title="Log Expense"
            >
              💸
            </button>
          )}

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
function AppInner({ firebaseUser = null, isGuest = false, onSignOut = null, onDeleteAccount = null }) {
  const appData = useAppData(firebaseUser);
  if (appData.screen === "onboarding") {
    // Pre-fill name from Sign in with Apple / Google so users don't have to
    // re-enter information already provided by the identity provider.
    return (
      <OnboardingScreen
        onComplete={appData.completeOnboarding}
        defaultName={firebaseUser?.displayName || ""}
      />
    );
  }
  return (
    <DashboardScreen
      {...appData}
      firebaseUser={firebaseUser}
      isGuest={isGuest}
      onSignOut={onSignOut}
      onDeleteAccount={onDeleteAccount}
    />
  );
}

export default function App(props) {
  return (
    <ErrorBoundary>
      <AppInner {...props}/>
    </ErrorBoundary>
  );
}
