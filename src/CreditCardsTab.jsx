// ─── CreditCardsTab.jsx — Simple & Clean Credit Card Manager ─────────────────
import { useState, useMemo } from "react";

const C = {
  ink:"#111827", muted:"#6B7280", border:"#E5E7EB", bg:"#F8FAFC",
  red:"#DC2626", green:"#16A34A", amber:"#D97706", blue:"#2563EB", purple:"#7C3AED",
};
const fmt = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const pct = (a,b) => b>0 ? Math.round((a/b)*100) : 0;

const utilColor = (p) => p<=30?C.green:p<=50?C.amber:C.red;
const utilLabel = (p) => p<=30?"Good 🟢":p<=50?"Moderate 🟡":"High 🔴";
const utilBg    = (p) => p<=30?"#F0FDF4":p<=50?"#FFFBEB":"#FFF1F2";

const daysUntil = (ds) => {
  if(!ds) return 999;
  const now=new Date(); now.setHours(0,0,0,0);
  const due=new Date(ds); due.setHours(0,0,0,0);
  return Math.round((due-now)/(1000*60*60*24));
};

// Bank colors
const BANK_COLORS = {
  "HDFC":"#004C8F","SBI":"#2D5FA8","ICICI":"#F37021","Axis":"#97144D",
  "Kotak":"#E31E24","Yes":"#00529B","Citi":"#003B70","Amex":"#016FD0",
  "IDFC":"#E31837","AU":"#F8C300","IndusInd":"#1B4F8A","RBL":"#C8102E","Other":"#6B7280",
};
const bankColor = (name="") => {
  const k = Object.keys(BANK_COLORS).find(k=>name.toUpperCase().includes(k.toUpperCase()));
  return k ? BANK_COLORS[k] : BANK_COLORS.Other;
};

// Card benefits database
const CARD_DB = {
  "hdfc regalia":      { rewards:"4 pts/₹150", bestFor:["Travel","Dining","International"], lounge:true,  tip:"Best for travel — lounge access + international rewards" },
  "hdfc millennia":    { rewards:"5% on Amazon/Flipkart", bestFor:["Online Shopping","Food"], lounge:false, tip:"Best for online shopping and food delivery" },
  "hdfc moneyback":    { rewards:"2 pts/₹150", bestFor:["Shopping","Groceries"], lounge:false, tip:"Good everyday rewards card" },
  "hdfc diners black": { rewards:"5 pts/₹150", bestFor:["Travel","Dining"], lounge:true, tip:"Premium travel card with unlimited lounge" },
  "sbi simplyclick":   { rewards:"10X on Amazon", bestFor:["Amazon","Online Shopping"], lounge:false, tip:"Best for Amazon — 10X points on every purchase" },
  "sbi simplysave":    { rewards:"10X on groceries", bestFor:["Groceries","Dining"], lounge:false, tip:"Best for daily groceries and dining" },
  "sbi cashback":      { rewards:"5% cashback online", bestFor:["Online Shopping"], lounge:false, tip:"Flat 5% cashback on all online spends" },
  "sbi elite":         { rewards:"5 pts/₹100", bestFor:["Travel","Dining"], lounge:true, tip:"Premium lifestyle card" },
  "icici amazon pay":  { rewards:"5% on Amazon Prime", bestFor:["Amazon","Food"], lounge:false, tip:"Best for Amazon Prime members — 5% back" },
  "icici coral":       { rewards:"2 pts/₹100", bestFor:["Movies","Dining"], lounge:true, tip:"Good for movies and dining" },
  "icici hpcl":        { rewards:"4% on fuel", bestFor:["Fuel"], lounge:false, tip:"Best fuel card — saves surcharge + 4% back" },
  "axis ace":          { rewards:"5% on GPay bills", bestFor:["Bills","Food"], lounge:false, tip:"Best for utility bills via Google Pay" },
  "axis flipkart":     { rewards:"5% on Flipkart", bestFor:["Flipkart","Online Shopping"], lounge:false, tip:"Best for Flipkart purchases" },
  "axis magnus":       { rewards:"12 pts/₹200", bestFor:["Travel","International"], lounge:true, tip:"Best travel rewards — high earn rate" },
  "axis vistara":      { rewards:"Club Vistara pts", bestFor:["Travel","Flights"], lounge:true, tip:"Best for Vistara flights" },
  "kotak 811":         { rewards:"2X online", bestFor:["Online Shopping"], lounge:false, tip:"Good starter online card" },
  "amex gold":         { rewards:"1 MR/₹50", bestFor:["Dining","Travel"], lounge:true, tip:"Best for dining rewards" },
  "indusind iconia":   { rewards:"1.5 pts/₹100", bestFor:["Dining","Movies"], lounge:true, tip:"Good lifestyle card" },
};

const getCardInfo = (name="", bank="") => {
  const key = `${bank} ${name}`.toLowerCase().trim();
  if(CARD_DB[key]) return CARD_DB[key];
  const found = Object.keys(CARD_DB).find(k => key.includes(k) || k.includes(name.toLowerCase().trim()));
  return found ? CARD_DB[found] : null;
};

const SPEND_CATS = [
  { key:"online",  label:"Online Shopping", icon:"🛒" },
  { key:"travel",  label:"Travel",          icon:"✈️" },
  { key:"food",    label:"Food & Dining",   icon:"🍕" },
  { key:"fuel",    label:"Fuel",            icon:"⛽" },
  { key:"grocery", label:"Groceries",       icon:"🥬" },
  { key:"bills",   label:"Bills",           icon:"💡" },
];

const catScore = (info, catKey) => {
  if(!info) return 0;
  const bf = info.bestFor.join(" ").toLowerCase();
  const map = {
    online: ["online","amazon","flipkart","shopping"],
    travel: ["travel","flights","hotel","lounge"],
    food:   ["food","dining","swiggy","zomato"],
    fuel:   ["fuel","petrol","hpcl"],
    grocery:["groceries","grocery"],
    bills:  ["bills","recharge","utilities"],
  };
  return (map[catKey]||[]).filter(k=>bf.includes(k)).length + (info.lounge&&catKey==="travel"?2:0);
};

// ── Add/Edit Form — Simple 4 fields only ─────────────────────────────────────
function CardForm({ card, onSave, onCancel }) {
  const [bank,        setBank]        = useState(card?.bank        || "");
  const [name,        setName]        = useState(card?.name        || "");
  const [limit,       setLimit]       = useState(card?.limit       || "");
  const [outstanding, setOutstanding] = useState(card?.outstanding || "");
  const [dueDate,     setDueDate]     = useState(card?.dueDate     || "");
  const [emiAmount,   setEmiAmount]   = useState(card?.emiAmount   || "");

  const info = useMemo(()=>getCardInfo(name,bank),[name,bank]);

  const inp = {
    width:"100%", padding:"12px", borderRadius:10,
    border:`1.5px solid ${C.border}`, fontFamily:"inherit",
    fontSize:16, outline:"none", boxSizing:"border-box", color:C.ink,
  };

  const save = () => {
    if(!bank.trim()||!name.trim()||!limit||!dueDate) return;
    onSave({
      bank:        bank.trim(),
      name:        name.trim(),
      limit:       parseFloat(limit)||0,
      outstanding: parseFloat(outstanding)||0,
      dueDate,
      emiAmount:   parseFloat(emiAmount)||0,
      info,
    });
  };

  return (
    <div style={{ background:"#fff", borderRadius:16, padding:18,
      border:`1px solid ${C.border}`, boxShadow:"0 2px 16px rgba(0,0,0,0.08)", marginBottom:16 }}>
      <p style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:C.ink }}>
        {card?"✏️ Edit Card":"💳 Add Credit Card"}
      </p>

      {/* Bank */}
      <p style={{ margin:"0 0 5px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Bank Name *</p>
      <input value={bank} onChange={e=>setBank(e.target.value)}
        placeholder="e.g. HDFC, SBI, Axis, ICICI"
        style={{...inp, marginBottom:12}}/>

      {/* Card Name */}
      <p style={{ margin:"0 0 5px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Card Name *</p>
      <input value={name} onChange={e=>setName(e.target.value)}
        placeholder="e.g. Regalia, SimplyCLICK, ACE"
        style={{...inp, marginBottom: info?8:12}}/>

      {/* Auto-detected */}
      {info && (
        <div style={{ padding:"9px 12px", borderRadius:10, background:"#F0FDF4",
          border:"1px solid #86EFAC", marginBottom:12 }}>
          <p style={{ margin:0, fontSize:12, color:C.green, fontWeight:700 }}>
            ✅ Card recognised — benefits auto-loaded!
          </p>
          <p style={{ margin:"3px 0 0", fontSize:12, color:C.ink }}>
            🎁 {info.rewards} · Best: {info.bestFor.slice(0,2).join(", ")}
          </p>
        </div>
      )}

      {/* Credit Limit */}
      <p style={{ margin:"0 0 5px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Credit Limit (₹) *</p>
      <input type="number" value={limit} onChange={e=>setLimit(e.target.value)}
        placeholder="e.g. 100000"
        style={{...inp, marginBottom:12}}/>

      {/* Outstanding */}
      <p style={{ margin:"0 0 5px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Current Outstanding (₹)</p>
      <p style={{ margin:"0 0 5px", fontSize:11, color:C.muted }}>How much you owe right now on this card</p>
      <input type="number" value={outstanding} onChange={e=>setOutstanding(e.target.value)}
        placeholder="e.g. 25000 (0 if fully paid)"
        style={{...inp, marginBottom:12}}/>

      {/* EMI Amount */}
      <p style={{ margin:"0 0 5px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>EMI on this card (₹)</p>
      <p style={{ margin:"0 0 5px", fontSize:11, color:C.muted }}>Any active EMI running on this card (e.g. phone, laptop)</p>
      <input type="number" value={emiAmount} onChange={e=>setEmiAmount(e.target.value)}
        placeholder="e.g. 3000 (leave 0 if none)"
        style={{...inp, marginBottom:12}}/>

      {/* Due Date */}
      <p style={{ margin:"0 0 5px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Payment Due Date *</p>
      <p style={{ margin:"0 0 5px", fontSize:11, color:C.muted }}>When is your next payment due?</p>
      <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
        style={{...inp, marginBottom:16}}/>

      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onCancel} style={{ flex:1, padding:"12px", borderRadius:10,
          border:`1px solid ${C.border}`, background:"#fff", color:C.muted,
          fontFamily:"inherit", fontSize:14, cursor:"pointer" }}>Cancel</button>
        <button onClick={save}
          disabled={!bank.trim()||!name.trim()||!limit||!dueDate}
          style={{ flex:2, padding:"12px", borderRadius:10, border:"none",
            background:!bank.trim()||!name.trim()||!limit||!dueDate?"#E5E7EB":C.ink,
            color:!bank.trim()||!name.trim()||!limit||!dueDate?C.muted:"#fff",
            fontFamily:"inherit", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          {card?"Save Changes ✓":"Add Card ✓"}
        </button>
      </div>
    </div>
  );
}

// ── Single Card View ──────────────────────────────────────────────────────────
function CardView({ card, onEdit, onDelete }) {
  const util   = pct(card.outstanding, card.limit);
  const days   = daysUntil(card.dueDate);
  const bColor = bankColor(card.bank||card.name);
  const info   = card.info || getCardInfo(card.name, card.bank);

  return (
    <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${C.border}`,
      overflow:"hidden", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>

      {/* Colored top bar */}
      <div style={{ background:`linear-gradient(135deg,${bColor},${bColor}BB)`, padding:"14px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.7)", letterSpacing:"1px", textTransform:"uppercase" }}>{card.bank}</p>
            <p style={{ margin:"2px 0 0", fontSize:17, fontWeight:800, color:"#fff" }}>{card.name}</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onEdit} style={{ padding:"5px 12px", borderRadius:8,
              border:"1px solid rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.15)",
              color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:600 }}>
              Edit
            </button>
            <button onClick={onDelete} style={{ padding:"5px 12px", borderRadius:8,
              border:"1px solid rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.15)",
              color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:600 }}>
              Delete
            </button>
          </div>
        </div>

        {/* 3 numbers */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
          {[
            { label:"LIMIT",     value:fmt(card.limit) },
            { label:"OWED",      value:fmt(card.outstanding) },
            { label:"AVAILABLE", value:fmt(card.limit-card.outstanding) },
          ].map(s=>(
            <div key={s.label} style={{ background:"rgba(255,255,255,0.12)", borderRadius:10, padding:"8px 10px" }}>
              <p style={{ margin:0, fontSize:9, color:"rgba(255,255,255,0.6)", textTransform:"uppercase" }}>{s.label}</p>
              <p style={{ margin:"2px 0 0", fontSize:14, fontWeight:700, color:"#fff", fontFamily:"Georgia,serif" }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"14px 16px" }}>

        {/* Utilization */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
            <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.ink }}>Credit Used</p>
            <span style={{ fontSize:12, fontWeight:700, padding:"2px 10px", borderRadius:99,
              color:utilColor(util), background:utilBg(util) }}>
              {util}% — {utilLabel(util)}
            </span>
          </div>
          <div style={{ height:8, borderRadius:99, background:"#F1F5F9", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${Math.min(util,100)}%`,
              background:utilColor(util), borderRadius:99, transition:"width 0.6s" }}/>
          </div>
          <p style={{ margin:"5px 0 0", fontSize:11, color:C.muted }}>
            {util<=30?"✅ Below 30% — great for your credit score":
             util<=50?"⚠️ Try to pay down to below 30%":
             "🔴 Above 50% — pay down to protect your credit score"}
          </p>
        </div>

        {/* Due date + EMI */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <div style={{ padding:"10px 12px", borderRadius:12,
            background:days<=3?"#FFF1F2":days<=7?"#FFFBEB":"#F0FDF4",
            border:`1px solid ${days<=3?"#FECACA":days<=7?"#FDE68A":"#86EFAC"}` }}>
            <p style={{ margin:0, fontSize:10, color:C.muted, textTransform:"uppercase", fontWeight:700 }}>Payment Due</p>
            <p style={{ margin:"4px 0 2px", fontSize:16, fontWeight:800,
              color:days<=3?C.red:days<=7?C.amber:C.green, fontFamily:"Georgia,serif" }}>
              {days<=0?"Overdue!":days===0?"Today!":days<=3?`${days} days ⚠️`:`${days} days`}
            </p>
            <p style={{ margin:0, fontSize:11, color:C.muted }}>
              {new Date(card.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
            </p>
          </div>
          <div style={{ padding:"10px 12px", borderRadius:12,
            background: card.emiAmount>0?"#FFF7ED":"#F8FAFC",
            border:`1px solid ${card.emiAmount>0?"#FED7AA":C.border}` }}>
            <p style={{ margin:0, fontSize:10, color:C.muted, textTransform:"uppercase", fontWeight:700 }}>EMI on Card</p>
            <p style={{ margin:"4px 0 2px", fontSize:16, fontWeight:800,
              color:card.emiAmount>0?C.amber:C.muted, fontFamily:"Georgia,serif" }}>
              {card.emiAmount>0?fmt(card.emiAmount)+"/mo":"None"}
            </p>
            <p style={{ margin:0, fontSize:11, color:C.muted }}>
              {card.emiAmount>0?"Active EMI running":"No EMI this card"}
            </p>
          </div>
        </div>

        {/* Pay full vs pay outstanding warning */}
        {card.outstanding > 0 && (
          <div style={{ padding:"12px 14px", borderRadius:12, background:"#EFF6FF",
            border:"1px solid #BFDBFE", marginBottom:12 }}>
            <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:700, color:"#1D4ED8" }}>
              💡 Always pay the full outstanding — not just minimum
            </p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ textAlign:"center", flex:1 }}>
                <p style={{ margin:0, fontSize:10, color:C.muted }}>Full Payment</p>
                <p style={{ margin:"2px 0", fontSize:15, fontWeight:800, color:C.green,
                  fontFamily:"Georgia,serif" }}>{fmt(card.outstanding)}</p>
                <p style={{ margin:0, fontSize:10, color:C.green, fontWeight:700 }}>₹0 interest ✅</p>
              </div>
              <p style={{ margin:0, fontSize:18, color:C.muted }}>vs</p>
              <div style={{ textAlign:"center", flex:1 }}>
                <p style={{ margin:0, fontSize:10, color:C.muted }}>Minimum Only</p>
                <p style={{ margin:"2px 0", fontSize:15, fontWeight:800, color:C.red,
                  fontFamily:"Georgia,serif" }}>₹{Math.round(card.outstanding*0.05).toLocaleString("en-IN")}</p>
                <p style={{ margin:0, fontSize:10, color:C.red, fontWeight:700 }}>36% interest! ❌</p>
              </div>
            </div>
          </div>
        )}

        {/* Card benefits */}
        {info && (
          <div style={{ padding:"10px 12px", borderRadius:12, background:C.bg,
            border:`1px solid ${C.border}` }}>
            <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:700, color:C.ink }}>
              ✨ Card Benefits
            </p>
            <p style={{ margin:"0 0 3px", fontSize:12, color:C.ink }}>
              🎁 Rewards: <strong>{info.rewards}</strong>
            </p>
            <p style={{ margin:"0 0 3px", fontSize:12, color:C.ink }}>
              ✅ Best for: <strong>{info.bestFor.join(", ")}</strong>
            </p>
            {info.lounge && (
              <p style={{ margin:"0 0 3px", fontSize:12, color:C.ink }}>
                🛫 Airport lounge access included
              </p>
            )}
            <p style={{ margin:"5px 0 0", fontSize:11, color:"#5B21B6", fontWeight:600 }}>
              💡 {info.tip}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Smart Guide ───────────────────────────────────────────────────────────────
function SmartGuide({ cards }) {
  const [selected, setSelected] = useState(null);
  const [amount,   setAmount]   = useState("");
  const [cat,      setCat]      = useState("online");
  const [result,   setResult]   = useState(null);
  const [tab,      setTab]      = useState("guide"); // guide | advisor

  const guide = useMemo(()=>
    SPEND_CATS.map(sc=>{
      const ranked = cards.map(c=>{
        const info  = c.info||getCardInfo(c.name,c.bank);
        const score = catScore(info,sc.key);
        return {...c,info,score};
      }).filter(c=>c.score>0).sort((a,b)=>b.score-a.score);
      return {...sc, best:ranked[0]||null, all:ranked};
    }).filter(s=>s.best)
  ,[cards]);

  const advise = () => {
    if(!amount) return;
    const amt = parseFloat(amount);
    const ranked = cards.map(c=>{
      const info     = c.info||getCardInfo(c.name,c.bank);
      const score    = catScore(info,cat)*10;
      const newUtil  = pct(c.outstanding+amt,c.limit);
      const days     = daysUntil(c.dueDate);
      const canPay   = (c.limit-c.outstanding)>=amt;
      let s = score;
      if(!canPay)    s -= 100;
      if(newUtil>75) s -= 30;
      if(days<=3)    s -= 20;
      return {...c,info,newUtil,days,canPay,finalScore:s};
    }).sort((a,b)=>b.finalScore-a.finalScore);
    setResult({amt,cat,ranked});
  };

  return (
    <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${C.border}`,
      overflow:"hidden", marginBottom:14 }}>
      <div style={{ background:"linear-gradient(135deg,#7C3AED,#4F46E5)", padding:"14px 16px" }}>
        <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#fff" }}>🧠 Smart Card Guide</p>
        <p style={{ margin:"2px 0 0", fontSize:11, color:"rgba(255,255,255,0.75)" }}>
          Know which card to use and when
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
        borderBottom:`1px solid ${C.border}` }}>
        {[
          { k:"guide",   l:"Best by Category" },
          { k:"advisor", l:"What should I use?" },
        ].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            padding:"11px", border:"none",
            background:tab===t.k?"#F5F3FF":"#fff",
            color:tab===t.k?"#7C3AED":C.muted,
            fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer",
            borderBottom:tab===t.k?"2.5px solid #7C3AED":"none",
          }}>{t.l}</button>
        ))}
      </div>

      <div style={{ padding:"14px 16px" }}>

        {/* Best by category */}
        {tab==="guide" && (
          <>
            <p style={{ margin:"0 0 12px", fontSize:12, color:C.muted }}>
              Tap a category to see which of your cards to use
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {guide.map(g=>(
                <div key={g.key} onClick={()=>setSelected(selected?.key===g.key?null:g)}
                  style={{ borderRadius:12, padding:"10px 10px",
                    border:`2px solid ${selected?.key===g.key?"#7C3AED":C.border}`,
                    background:selected?.key===g.key?"#F5F3FF":"#fff",
                    cursor:"pointer", textAlign:"center" }}>
                  <p style={{ margin:"0 0 4px", fontSize:22 }}>{g.icon}</p>
                  <p style={{ margin:"0 0 3px", fontSize:11, fontWeight:700, color:C.ink }}>{g.label}</p>
                  <p style={{ margin:0, fontSize:10, color:bankColor(g.best.bank), fontWeight:700,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {g.best.bank} {g.best.name}
                  </p>
                </div>
              ))}
            </div>

            {/* Expanded detail */}
            {selected && (
              <div style={{ marginTop:12, padding:"12px", borderRadius:12,
                background:"#F5F3FF", border:"1px solid #DDD6FE" }}>
                <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:700, color:"#5B21B6" }}>
                  {selected.icon} {selected.label} — Your best cards:
                </p>
                {selected.all.map((c,i)=>{
                  const bc = bankColor(c.bank);
                  return (
                    <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"10px 12px", borderRadius:10, marginBottom:6,
                      background:i===0?"#fff":"rgba(255,255,255,0.6)",
                      border:`1.5px solid ${i===0?"#7C3AED":"transparent"}` }}>
                      <div style={{ width:34,height:34,borderRadius:8,flexShrink:0,
                        background:bc,display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <span style={{ fontSize:14 }}>{i===0?"🥇":i===1?"🥈":"🥉"}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.ink }}>
                            {c.bank} {c.name}
                          </p>
                          {i===0&&<span style={{ fontSize:9, background:"#7C3AED", color:"#fff",
                            padding:"1px 6px", borderRadius:99, fontWeight:700 }}>USE THIS</span>}
                        </div>
                        <p style={{ margin:"2px 0 0", fontSize:11, color:C.muted }}>
                          {c.info?.rewards||"Good rewards"}
                        </p>
                        {i===0&&c.info?.tip&&(
                          <p style={{ margin:"2px 0 0", fontSize:11, color:"#5B21B6", fontWeight:600 }}>
                            💡 {c.info.tip}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {guide.length===0 && (
              <div style={{ textAlign:"center", padding:"20px", color:C.muted }}>
                <p style={{ fontSize:24, margin:"0 0 8px" }}>🤔</p>
                <p style={{ fontSize:13, margin:0 }}>Add more cards to see category recommendations</p>
              </div>
            )}
          </>
        )}

        {/* Purchase advisor */}
        {tab==="advisor" && (
          <>
            <p style={{ margin:"0 0 12px", fontSize:12, color:C.muted }}>
              Tell us what you're buying — we'll pick the best card instantly
            </p>
            <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>
              I'm buying something for
            </p>
            <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
              {SPEND_CATS.map(sc=>(
                <button key={sc.key} onClick={()=>setCat(sc.key)} style={{
                  padding:"7px 12px", borderRadius:99, border:"none",
                  background:cat===sc.key?"#7C3AED":C.bg,
                  color:cat===sc.key?"#fff":C.muted,
                  fontFamily:"inherit", fontSize:12, fontWeight:700,
                  cursor:"pointer", border:`1.5px solid ${cat===sc.key?"#7C3AED":C.border}`,
                }}>
                  {sc.icon} {sc.label}
                </button>
              ))}
            </div>

            <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>
              Amount (₹)
            </p>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                placeholder="How much are you spending?"
                style={{ flex:1, padding:"12px", borderRadius:10,
                  border:`1.5px solid ${C.border}`, fontFamily:"inherit",
                  fontSize:14, outline:"none" }}/>
              <button onClick={advise} disabled={!amount}
                style={{ padding:"12px 16px", borderRadius:10, border:"none",
                  background:amount?"#7C3AED":"#E5E7EB",
                  color:amount?"#fff":C.muted,
                  fontFamily:"inherit", fontSize:14, fontWeight:700,
                  cursor:amount?"pointer":"default" }}>
                Go →
              </button>
            </div>

            {result && (
              <div>
                <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:700, color:C.ink }}>
                  {SPEND_CATS.find(s=>s.key===result.cat)?.icon} For {SPEND_CATS.find(s=>s.key===result.cat)?.label} · {fmt(result.amt)}:
                </p>
                {result.ranked.map((c,i)=>{
                  const bc = bankColor(c.bank);
                  return (
                    <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12,
                      padding:"12px", borderRadius:12, marginBottom:8,
                      background:i===0?"#F5F3FF":"#fff",
                      border:`1.5px solid ${i===0?"#7C3AED":C.border}`,
                      opacity:c.canPay?1:0.5 }}>
                      <div style={{ width:38,height:38,borderRadius:10,flexShrink:0,
                        background:bc,display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <span style={{ fontSize:18 }}>{i===0?"🥇":i===1?"🥈":"🥉"}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.ink }}>
                            {c.bank} {c.name}
                          </p>
                          {i===0&&<span style={{ fontSize:10, background:"#7C3AED",
                            color:"#fff", padding:"2px 8px", borderRadius:99, fontWeight:700 }}>
                            USE THIS
                          </span>}
                          {!c.canPay&&<span style={{ fontSize:10, background:"#FFF1F2",
                            color:C.red, padding:"2px 8px", borderRadius:99,
                            border:"1px solid #FECACA", fontWeight:700 }}>
                            Limit exceeded
                          </span>}
                        </div>
                        <p style={{ margin:"2px 0 0", fontSize:12, color:C.muted }}>
                          {c.info?.rewards||"Standard rewards"}
                        </p>
                        {i===0&&c.info?.tip&&(
                          <p style={{ margin:"2px 0 0", fontSize:11, color:"#5B21B6", fontWeight:600 }}>
                            💡 {c.info.tip}
                          </p>
                        )}
                        <div style={{ display:"flex", gap:12, marginTop:4 }}>
                          <span style={{ fontSize:11, color:utilColor(c.newUtil), fontWeight:600 }}>
                            Util after: {c.newUtil}%
                          </span>
                          <span style={{ fontSize:11, fontWeight:600,
                            color:c.days<=3?C.red:c.days<=7?C.amber:C.green }}>
                            Due in: {c.days}d
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {result.ranked.length===0&&(
                  <p style={{ fontSize:13, color:C.muted, textAlign:"center", padding:"12px" }}>
                    Add more cards to get recommendations
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function CreditCardsTab({ cards=[], onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [view,     setView]     = useState("cards");

  const totalLimit = cards.reduce((s,c)=>s+c.limit,0);
  const totalOwed  = cards.reduce((s,c)=>s+c.outstanding,0);
  const totalEmi   = cards.reduce((s,c)=>s+(c.emiAmount||0),0);
  const totalUtil  = pct(totalOwed,totalLimit);

  const save = (data) => {
    if(editCard){ onUpdate(editCard.id,data); setEditCard(null); }
    else        { onAdd(data); setShowForm(false); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:14 }}>
        <div>
          <h2 style={{ margin:"0 0 2px", fontSize:17, fontWeight:700, color:C.ink,
            fontFamily:"Georgia,serif" }}>💳 Credit Cards</h2>
          <p style={{ margin:0, fontSize:11, color:C.muted }}>
            {cards.length} card{cards.length!==1?"s":""} · Smart usage guide
          </p>
        </div>
        {!showForm&&!editCard&&(
          <button onClick={()=>setShowForm(true)} style={{ padding:"9px 18px",
            borderRadius:10, border:"none", background:C.ink, color:"#fff",
            fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            + Add
          </button>
        )}
      </div>

      {/* Form */}
      {(showForm||editCard)&&(
        <CardForm card={editCard} onSave={save}
          onCancel={()=>{ setShowForm(false); setEditCard(null); }}/>
      )}

      {/* View toggle */}
      {cards.length>0&&!showForm&&!editCard&&(
        <div style={{ display:"flex", background:C.bg, borderRadius:12, padding:4,
          marginBottom:14, border:`1px solid ${C.border}` }}>
          {[
            { k:"cards", l:"💳 My Cards" },
            { k:"guide", l:"🧠 Smart Guide" },
          ].map(t=>(
            <button key={t.k} onClick={()=>setView(t.k)} style={{
              flex:1, padding:"9px", borderRadius:9, border:"none",
              background:view===t.k?"#fff":"transparent",
              color:view===t.k?C.ink:C.muted,
              fontFamily:"inherit", fontSize:13, fontWeight:view===t.k?700:500,
              cursor:"pointer",
              boxShadow:view===t.k?"0 1px 4px rgba(0,0,0,0.08)":"none",
            }}>{t.l}</button>
          ))}
        </div>
      )}

      {/* Smart Guide */}
      {view==="guide"&&cards.length>0&&<SmartGuide cards={cards}/>}

      {/* Cards */}
      {view==="cards"&&(
        <>
          {/* Summary */}
          {cards.length>0&&(
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
                {[
                  { label:"Total Limit", value:fmt(totalLimit), color:C.blue },
                  { label:"Total Owed",  value:fmt(totalOwed),  color:utilColor(totalUtil) },
                  { label:"Total EMI",   value:totalEmi>0?fmt(totalEmi)+"/mo":"None", color:C.amber },
                ].map(s=>(
                  <div key={s.label} style={{ background:"#fff", borderRadius:11,
                    border:`1px solid ${C.border}`, padding:"10px 12px",
                    boxShadow:"0 1px 2px rgba(0,0,0,0.04)" }}>
                    <p style={{ margin:0, fontSize:9, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"0.7px", fontWeight:700 }}>{s.label}</p>
                    <p style={{ margin:"3px 0 0", fontSize:14, fontWeight:700, color:s.color,
                      fontFamily:"Georgia,serif" }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Overall utilization */}
              <div style={{ background:"#fff", borderRadius:12, padding:"12px 14px",
                border:`1px solid ${C.border}`, marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.ink }}>
                    Overall Utilization
                  </p>
                  <span style={{ fontSize:12, fontWeight:700, color:utilColor(totalUtil),
                    background:utilBg(totalUtil), padding:"2px 10px", borderRadius:99 }}>
                    {totalUtil}% — {utilLabel(totalUtil)}
                  </span>
                </div>
                <div style={{ height:8, borderRadius:99, background:"#F1F5F9", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min(totalUtil,100)}%`,
                    background:utilColor(totalUtil), borderRadius:99, transition:"width 0.6s" }}/>
                </div>
              </div>
            </>
          )}

          {/* Empty */}
          {cards.length===0&&!showForm&&(
            <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:14,
              padding:"28px 20px", textAlign:"center" }}>
              <p style={{ fontSize:40, margin:"0 0 10px" }}>💳</p>
              <p style={{ fontSize:15, fontWeight:700, color:C.ink, margin:"0 0 6px" }}>
                Add your credit cards
              </p>
              <p style={{ fontSize:12, color:C.muted, margin:"0 0 18px", lineHeight:1.6 }}>
                Get smart advice on which card to use for each purchase, track utilization and due dates
              </p>
              <button onClick={()=>setShowForm(true)} style={{ padding:"12px 28px",
                borderRadius:10, border:"none", background:C.blue, color:"#fff",
                fontFamily:"inherit", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                + Add First Card
              </button>
            </div>
          )}

          {/* Card list */}
          {cards.map(card=>(
            <CardView key={card.id} card={card}
              onEdit={()=>setEditCard(card)}
              onDelete={()=>{ if(window.confirm(`Delete ${card.bank} ${card.name}?`)) onDelete(card.id); }}
            />
          ))}

          {/* Tips */}
          {cards.length>0&&(
            <div style={{ padding:"12px 14px", borderRadius:12,
              background:"#F5F3FF", border:"1px solid #DDD6FE", marginTop:4 }}>
              <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:"#5B21B6" }}>
                📊 Credit Score Tips
              </p>
              {[
                "Keep utilization below 30% for a healthy credit score",
                "Always pay full outstanding — minimum only = 36% interest",
                "Never miss due dates — one late payment drops score badly",
                "Don't close old cards — credit history length matters",
              ].map((t,i)=>(
                <p key={i} style={{ margin:"0 0 3px", fontSize:11, color:"#6D28D9", lineHeight:1.5 }}>• {t}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
