// ─── CreditCardsTab.jsx — Smart Credit Card Manager + Best Use Guide ──────────
import { useState, useMemo } from "react";

const C = {
  ink:"#111827", muted:"#6B7280", border:"#E5E7EB", bg:"#F8FAFC",
  red:"#DC2626", green:"#16A34A", amber:"#D97706", blue:"#2563EB", purple:"#7C3AED",
};
const fmt  = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const pct  = (a,b) => b>0 ? Math.round((a/b)*100) : 0;
const utilColor = (p) => p<=30?C.green:p<=50?C.amber:C.red;
const utilLabel = (p) => p<=30?"Excellent":p<=50?"Moderate":p>75?"Critical":"High";
const utilBg    = (p) => p<=30?"#F0FDF4":p<=50?"#FFFBEB":"#FFF1F2";
const daysUntil = (ds) => {
  if(!ds) return null;
  const now=new Date(); now.setHours(0,0,0,0);
  const due=new Date(ds); due.setHours(0,0,0,0);
  return Math.round((due-now)/(1000*60*60*24));
};
const calcInterest = (o,apr) => o&&apr ? Math.round(o*(apr/100/12)) : 0;

// Bank brand colors
const BANK_COLORS = {
  "HDFC":"#004C8F","SBI":"#2D5FA8","ICICI":"#F37021","Axis":"#97144D",
  "Kotak":"#E31E24","Yes":"#00529B","Citi":"#003B70","Amex":"#016FD0",
  "IDFC":"#E31837","AU":"#F8C300","IndusInd":"#1B4F8A","RBL":"#C8102E",
  "Other":"#6B7280",
};
const bankColor = (name="") => {
  const k = Object.keys(BANK_COLORS).find(k=>name.toUpperCase().includes(k.toUpperCase()));
  return k ? BANK_COLORS[k] : BANK_COLORS.Other;
};

// ── Card benefits database — auto-fills when user adds card ──────────────────
const CARD_BENEFITS = {
  // HDFC
  "hdfc regalia":       { bestFor:["Travel","Dining","International"], rewards:"4 pts/₹150", lounge:true,  fuelWaiver:false, topCategory:"Travel",    tip:"Best for airport lounge + international spends" },
  "hdfc millennia":     { bestFor:["Online Shopping","Food","Amazon"], rewards:"5% cashback on Amazon/Flipkart", lounge:false, fuelWaiver:false, topCategory:"Online Shopping", tip:"Best for online shopping and food delivery" },
  "hdfc moneyback":     { bestFor:["Shopping","Groceries"],            rewards:"2 pts/₹150", lounge:false, fuelWaiver:false, topCategory:"Shopping",  tip:"Good everyday card for shopping" },
  "hdfc diners black":  { bestFor:["Travel","Dining","Golf"],          rewards:"5 pts/₹150", lounge:true,  fuelWaiver:false, topCategory:"Travel",    tip:"Premium travel + unlimited lounge access" },
  // SBI
  "sbi simplyclick":    { bestFor:["Amazon","Online","Cleartrip"],     rewards:"10X on Amazon/Cleartrip", lounge:false, fuelWaiver:false, topCategory:"Online Shopping", tip:"Best card for Amazon purchases — 10X points" },
  "sbi simplysave":     { bestFor:["Groceries","Movies","Dining"],     rewards:"10X on groceries/dining", lounge:false, fuelWaiver:false, topCategory:"Groceries",      tip:"Best for daily groceries and dining" },
  "sbi cashback":       { bestFor:["Online Shopping","Bills"],         rewards:"5% cashback online", lounge:false, fuelWaiver:false, topCategory:"Online Shopping",    tip:"Flat 5% cashback on all online spends" },
  "sbi elite":          { bestFor:["Travel","Dining","Movies"],        rewards:"5 pts/₹100", lounge:true, fuelWaiver:false, topCategory:"Travel",     tip:"Premium lifestyle card with lounge access" },
  // ICICI
  "icici amazon pay":   { bestFor:["Amazon","Prime","Food"],           rewards:"5% on Amazon Prime", lounge:false, fuelWaiver:false, topCategory:"Amazon",         tip:"Best for Amazon — 5% back on Prime purchases" },
  "icici coral":        { bestFor:["Movies","Dining","Groceries"],     rewards:"2 pts/₹100", lounge:true, fuelWaiver:false, topCategory:"Entertainment",  tip:"Good for movies and dining rewards" },
  "icici hpcl":         { bestFor:["Fuel","Bills"],                    rewards:"4% on fuel", lounge:false, fuelWaiver:true, topCategory:"Fuel",           tip:"Best fuel card — saves on surcharge + 4% back" },
  "icici emeralde":     { bestFor:["Travel","International","Dining"], rewards:"6 pts/₹100", lounge:true, fuelWaiver:false, topCategory:"Travel",         tip:"Super premium travel card" },
  // Axis
  "axis ace":           { bestFor:["Bills","Food","Recharge"],         rewards:"5% on GPay bills", lounge:false, fuelWaiver:false, topCategory:"Bills",          tip:"Best for utility bills — 5% via Google Pay" },
  "axis flipkart":      { bestFor:["Flipkart","Myntra","Food"],        rewards:"5% on Flipkart", lounge:false, fuelWaiver:false, topCategory:"Online Shopping", tip:"Best for Flipkart — flat 5% back" },
  "axis magnus":        { bestFor:["Travel","International","Dining"], rewards:"12 pts/₹200 (travel)", lounge:true, fuelWaiver:false, topCategory:"Travel",  tip:"Best travel rewards card — high earn rate" },
  "axis vistara":       { bestFor:["Travel","Vistara","Hotels"],       rewards:"Club Vistara points", lounge:true, fuelWaiver:false, topCategory:"Travel",    tip:"Best for Vistara flights + CV points" },
  // Kotak
  "kotak 811":          { bestFor:["Online","Shopping"],               rewards:"2X on online spends", lounge:false, fuelWaiver:false, topCategory:"Online Shopping", tip:"Good starter card for online shopping" },
  "kotak league":       { bestFor:["Shopping","Dining"],               rewards:"8X on weekend dining", lounge:false, fuelWaiver:false, topCategory:"Dining",  tip:"Best for weekend dining — 8X points" },
  // Amex
  "amex gold":          { bestFor:["Dining","Shopping","Travel"],      rewards:"1 MR point/₹50", lounge:true, fuelWaiver:false, topCategory:"Dining",        tip:"Best for dining — Amex membership rewards" },
  "amex platinum":      { bestFor:["Travel","Hotels","Dining"],        rewards:"Platinum benefits", lounge:true, fuelWaiver:false, topCategory:"Travel",       tip:"Ultra premium — best travel card globally" },
  // IndusInd
  "indusind iconia":    { bestFor:["Dining","Movies","Travel"],        rewards:"1.5 pts/₹100", lounge:true, fuelWaiver:false, topCategory:"Dining",         tip:"Good lifestyle card for dining and movies" },
  "indusind platinum":  { bestFor:["Shopping","Dining"],               rewards:"1 pt/₹100", lounge:false, fuelWaiver:false, topCategory:"Shopping",        tip:"Simple rewards on all spends" },
};

// Get card benefits by matching name
const getCardBenefits = (name="", bank="") => {
  const key = `${bank} ${name}`.toLowerCase().trim();
  // Try exact match first
  if (CARD_BENEFITS[key]) return CARD_BENEFITS[key];
  // Try partial match
  const found = Object.keys(CARD_BENEFITS).find(k =>
    key.includes(k) || k.includes(name.toLowerCase())
  );
  return found ? CARD_BENEFITS[found] : null;
};

// All spend categories
const SPEND_CATS = [
  { key:"online",   label:"Online Shopping", icon:"🛒", desc:"Amazon, Flipkart, Myntra" },
  { key:"travel",   label:"Travel",          icon:"✈️", desc:"Flights, hotels, trips" },
  { key:"food",     label:"Food & Dining",   icon:"🍕", desc:"Swiggy, Zomato, restaurants" },
  { key:"fuel",     label:"Fuel",            icon:"⛽", desc:"Petrol, diesel" },
  { key:"grocery",  label:"Groceries",       icon:"🥬", desc:"Big Basket, supermarket" },
  { key:"bills",    label:"Bills & Recharge",icon:"💡", desc:"Electricity, mobile, OTT" },
  { key:"medical",  label:"Medical",         icon:"💊", desc:"Pharmacy, hospital" },
  { key:"movies",   label:"Movies & Fun",    icon:"🎬", desc:"BookMyShow, entertainment" },
  { key:"intl",     label:"International",   icon:"🌍", desc:"Foreign currency spends" },
];

// Match card benefits to category
const cardScoreForCategory = (benefits, catKey) => {
  if (!benefits) return 0;
  const bf = benefits.bestFor.join(" ").toLowerCase();
  const catMap = {
    online:  ["online","amazon","flipkart","shopping","myntra","cleartrip"],
    travel:  ["travel","flights","hotel","miles","vistara","lounge","international"],
    food:    ["food","dining","swiggy","zomato","restaurant"],
    fuel:    ["fuel","petrol","hpcl"],
    grocery: ["groceries","grocery","bigbasket","supermarket"],
    bills:   ["bills","recharge","utilities","electricity","gpay"],
    medical: ["medical","pharmacy","health"],
    movies:  ["movies","entertainment","bookmyshow"],
    intl:    ["international","foreign","global"],
  };
  const keywords = catMap[catKey] || [];
  let score = keywords.filter(k => bf.includes(k)).length;
  if (benefits.topCategory?.toLowerCase().includes(catKey)) score += 3;
  if (benefits.lounge && catKey==="travel") score += 2;
  if (benefits.fuelWaiver && catKey==="fuel") score += 3;
  return score;
};

// ── Add/Edit Form ─────────────────────────────────────────────────────────────
function CardForm({ card, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:        card?.name        || "",
    bank:        card?.bank        || "",
    limit:       card?.limit       || "",
    outstanding: card?.outstanding || "",
    minDue:      card?.minDue      || "",
    dueDate:     card?.dueDate     || "",
    apr:         card?.apr         || "36",
    rewardRate:  card?.rewardRate  || "",
    bestFor:     card?.bestFor     || "",
  });

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  // Auto-fill benefits when bank+name typed
  const autoBenefits = useMemo(()=>
    getCardBenefits(form.name, form.bank), [form.name, form.bank]
  );

  const inp = { width:"100%", padding:"10px 12px", borderRadius:10,
    border:`1.5px solid ${C.border}`, fontFamily:"inherit", fontSize:14,
    outline:"none", boxSizing:"border-box", background:"#fff", color:C.ink };

  const save = () => {
    if (!form.name.trim() || !form.limit || !form.dueDate) return;
    const benefits = getCardBenefits(form.name, form.bank);
    onSave({
      name:        form.name.trim(),
      bank:        form.bank.trim(),
      limit:       parseFloat(form.limit)||0,
      outstanding: parseFloat(form.outstanding)||0,
      minDue:      parseFloat(form.minDue)||0,
      dueDate:     form.dueDate,
      apr:         parseFloat(form.apr)||36,
      rewardRate:  benefits?.rewards || form.rewardRate.trim(),
      bestFor:     benefits?.bestFor?.join(", ") || form.bestFor.trim(),
      benefits:    benefits,
      color:       bankColor(form.bank||form.name),
    });
  };

  return (
    <div style={{ background:"#fff", borderRadius:16, padding:16,
      border:`1px solid ${C.border}`, boxShadow:"0 2px 12px rgba(0,0,0,0.08)", marginBottom:16 }}>
      <p style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:C.ink }}>
        {card ? "✏️ Edit Card" : "💳 Add Credit Card"}
      </p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Bank *</p>
          <input value={form.bank} onChange={e=>set("bank",e.target.value)}
            placeholder="e.g. HDFC, SBI, Axis" style={inp}/>
        </div>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Card Name *</p>
          <input value={form.name} onChange={e=>set("name",e.target.value)}
            placeholder="e.g. Regalia, SimplyCLICK" style={inp}/>
        </div>
      </div>

      {/* Auto-detected benefits preview */}
      {autoBenefits && (
        <div style={{ padding:"10px 12px", borderRadius:10, background:"#F0FDF4",
          border:"1px solid #86EFAC", marginBottom:10 }}>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.green }}>
            ✅ Card recognised! Benefits auto-filled:
          </p>
          <p style={{ margin:"0 0 2px", fontSize:12, color:C.ink }}>
            🎁 {autoBenefits.rewards}
          </p>
          <p style={{ margin:0, fontSize:12, color:C.ink }}>
            ✨ Best for: {autoBenefits.bestFor.join(", ")}
          </p>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Credit Limit (₹) *</p>
          <input type="number" value={form.limit} onChange={e=>set("limit",e.target.value)} placeholder="e.g. 100000" style={inp}/>
        </div>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Outstanding (₹)</p>
          <input type="number" value={form.outstanding} onChange={e=>set("outstanding",e.target.value)} placeholder="Current balance" style={inp}/>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Minimum Due (₹)</p>
          <input type="number" value={form.minDue} onChange={e=>set("minDue",e.target.value)} placeholder="Min payment" style={inp}/>
        </div>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Due Date *</p>
          <input type="date" value={form.dueDate} onChange={e=>set("dueDate",e.target.value)} style={inp}/>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Interest Rate (APR %)</p>
          <input type="number" value={form.apr} onChange={e=>set("apr",e.target.value)} placeholder="e.g. 36" style={inp}/>
        </div>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Reward Rate</p>
          <input value={autoBenefits?.rewards||form.rewardRate} onChange={e=>set("rewardRate",e.target.value)}
            placeholder="e.g. 4pts/₹150" style={{...inp, background:autoBenefits?"#F8FAFC":"#fff"}}/>
        </div>
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onCancel} style={{ flex:1, padding:"11px", borderRadius:10,
          border:`1px solid ${C.border}`, background:"#fff", color:C.muted,
          fontFamily:"inherit", fontSize:14, cursor:"pointer" }}>Cancel</button>
        <button onClick={save} style={{ flex:2, padding:"11px", borderRadius:10,
          border:"none", background:C.ink, color:"#fff",
          fontFamily:"inherit", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          {card ? "Save Changes ✓" : "Add Card ✓"}
        </button>
      </div>
    </div>
  );
}

// ── Best Card Guide ───────────────────────────────────────────────────────────
function BestCardGuide({ cards }) {
  const [activeTab, setActiveTab] = useState("category");
  const [selectedCat, setSelectedCat] = useState(null);

  // For each category find best card
  const categoryGuide = useMemo(() => {
    return SPEND_CATS.map(cat => {
      const ranked = cards
        .map(card => {
          const benefits = card.benefits || getCardBenefits(card.name, card.bank);
          const score = cardScoreForCategory(benefits, cat.key);
          return { ...card, benefits, score };
        })
        .filter(c => c.score > 0)
        .sort((a,b) => b.score - a.score);
      return { ...cat, best: ranked[0]||null, others: ranked.slice(1) };
    }).filter(c => c.best);
  }, [cards]);

  // Purchase advisor
  const [amount, setAmount]   = useState("");
  const [buyFor, setBuyFor]   = useState("online");
  const [advice, setAdvice]   = useState(null);

  const getAdvice = () => {
    if (!amount) return;
    const amt = parseFloat(amount);
    const cat = SPEND_CATS.find(c=>c.key===buyFor);
    const ranked = cards.map(card => {
      const benefits = card.benefits || getCardBenefits(card.name, card.bank);
      const score    = cardScoreForCategory(benefits, buyFor);
      const newUtil  = pct(card.outstanding + amt, card.limit);
      const days     = daysUntil(card.dueDate);
      const canAfford = (card.limit - card.outstanding) >= amt;
      let finalScore = score * 10;
      if (!canAfford) finalScore -= 100;
      if (newUtil > 75) finalScore -= 30;
      if (days <= 3)    finalScore -= 20;
      return { ...card, benefits, score:finalScore, newUtil, days, canAfford };
    }).sort((a,b) => b.score - a.score);
    setAdvice({ cat, ranked, amt });
  };

  return (
    <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${C.border}`,
      overflow:"hidden", marginBottom:14 }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#7C3AED,#4F46E5)", padding:"14px 16px" }}>
        <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#fff" }}>
          🧠 Smart Card Guide
        </p>
        <p style={{ margin:"2px 0 0", fontSize:11, color:"rgba(255,255,255,0.75)" }}>
          Know which card to use and when
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
        {[
          { key:"category", label:"Best by Category" },
          { key:"advisor",  label:"Purchase Advisor" },
        ].map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{
            flex:1, padding:"10px", border:"none",
            background: activeTab===t.key?"#F5F3FF":"#fff",
            color: activeTab===t.key?"#7C3AED":C.muted,
            fontFamily:"inherit", fontSize:12, fontWeight:700,
            cursor:"pointer", borderBottom: activeTab===t.key?"2px solid #7C3AED":"none",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding:"14px 16px" }}>

        {/* ── CATEGORY GUIDE ── */}
        {activeTab==="category" && (
          <div>
            <p style={{ margin:"0 0 12px", fontSize:12, color:C.muted }}>
              Tap a category to see which card works best
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {categoryGuide.map(cat=>(
                <div key={cat.key}
                  onClick={()=>setSelectedCat(selectedCat?.key===cat.key?null:cat)}
                  style={{ borderRadius:12, border:`1.5px solid ${selectedCat?.key===cat.key?"#7C3AED":C.border}`,
                    background: selectedCat?.key===cat.key?"#F5F3FF":"#fff",
                    padding:"10px 12px", cursor:"pointer" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                    <span style={{ fontSize:20 }}>{cat.icon}</span>
                    <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.ink }}>{cat.label}</p>
                  </div>
                  <p style={{ margin:0, fontSize:11, fontWeight:700,
                    color:bankColor(cat.best.bank) }}>
                    {cat.best.bank} {cat.best.name}
                  </p>
                  <p style={{ margin:"2px 0 0", fontSize:10, color:C.muted,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {cat.best.benefits?.rewards || cat.best.rewardRate || "Best for "+cat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Expanded category detail */}
            {selectedCat && (
              <div style={{ marginTop:12, padding:"12px 14px", borderRadius:12,
                background:"#F5F3FF", border:"1px solid #DDD6FE" }}>
                <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:700, color:"#5B21B6" }}>
                  {selectedCat.icon} {selectedCat.label} — Best Cards
                </p>
                {[selectedCat.best, ...selectedCat.others].map((card,i)=>(
                  <div key={card.id} style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"8px 10px", borderRadius:10, marginBottom:6,
                    background:i===0?"#fff":"rgba(255,255,255,0.5)",
                    border:`1px solid ${i===0?"#7C3AED":"transparent"}` }}>
                    <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
                      background:bankColor(card.bank),
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <p style={{ margin:0, fontSize:13 }}>{i===0?"🥇":i===1?"🥈":"🥉"}</p>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.ink }}>
                        {card.bank} {card.name}
                        {i===0 && <span style={{ marginLeft:6, fontSize:9, background:"#7C3AED",
                          color:"#fff", padding:"1px 6px", borderRadius:99 }}>BEST</span>}
                      </p>
                      <p style={{ margin:"1px 0 0", fontSize:11, color:C.muted }}>
                        {card.benefits?.rewards || card.rewardRate || "Good rewards"}
                      </p>
                      {i===0 && card.benefits?.tip && (
                        <p style={{ margin:"2px 0 0", fontSize:11, color:"#5B21B6", fontWeight:600 }}>
                          💡 {card.benefits.tip}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PURCHASE ADVISOR ── */}
        {activeTab==="advisor" && (
          <div>
            <p style={{ margin:"0 0 12px", fontSize:12, color:C.muted }}>
              Tell us what you're buying — we'll pick the best card
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <div>
                <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Amount (₹)</p>
                <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10,
                    border:`1.5px solid ${C.border}`, fontFamily:"inherit",
                    fontSize:14, outline:"none", boxSizing:"border-box" }}/>
              </div>
              <div>
                <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Buying For</p>
                <select value={buyFor} onChange={e=>setBuyFor(e.target.value)}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10,
                    border:`1.5px solid ${C.border}`, fontFamily:"inherit",
                    fontSize:14, outline:"none", boxSizing:"border-box",
                    background:"#fff", color:C.ink }}>
                  {SPEND_CATS.map(c=><option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                </select>
              </div>
            </div>
            <button onClick={getAdvice} disabled={!amount}
              style={{ width:"100%", padding:"12px", borderRadius:10, border:"none",
                background:!amount?"#E5E7EB":"#7C3AED",
                color:!amount?C.muted:"#fff",
                fontFamily:"inherit", fontSize:14, fontWeight:700,
                cursor:!amount?"default":"pointer", marginBottom:12 }}>
              🎯 Find Best Card →
            </button>

            {advice && (
              <div>
                <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:700, color:C.ink }}>
                  {advice.cat.icon} For {advice.cat.label} — {fmt(advice.amt)}:
                </p>
                {advice.ranked.map((card,i)=>{
                  const bColor = bankColor(card.bank);
                  return (
                    <div key={card.id} style={{ display:"flex", alignItems:"center", gap:12,
                      padding:"10px 12px", borderRadius:12, marginBottom:8,
                      background:i===0?"#F5F3FF":"#fff",
                      border:`1.5px solid ${i===0?"#7C3AED":C.border}`,
                      opacity:card.canAfford?1:0.5 }}>
                      <div style={{ width:36, height:36, borderRadius:8, flexShrink:0,
                        background:bColor, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <p style={{ margin:0, fontSize:16 }}>{i===0?"🥇":i===1?"🥈":"🥉"}</p>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.ink }}>
                            {card.bank} {card.name}
                          </p>
                          {i===0 && <span style={{ fontSize:10, background:"#7C3AED",
                            color:"#fff", padding:"1px 7px", borderRadius:99 }}>Best Choice</span>}
                          {!card.canAfford && <span style={{ fontSize:10, background:"#FFF1F2",
                            color:C.red, padding:"1px 7px", borderRadius:99,
                            border:"1px solid #FECACA" }}>Limit exceeded</span>}
                        </div>
                        <p style={{ margin:"2px 0 0", fontSize:11, color:C.muted }}>
                          {card.benefits?.rewards || card.rewardRate || "Standard rewards"}
                        </p>
                        {i===0 && card.benefits?.tip && (
                          <p style={{ margin:"2px 0 0", fontSize:11, color:"#5B21B6", fontWeight:600 }}>
                            💡 {card.benefits.tip}
                          </p>
                        )}
                        <div style={{ display:"flex", gap:10, marginTop:3 }}>
                          <span style={{ fontSize:10, color:utilColor(card.newUtil) }}>
                            Util: {card.newUtil}%
                          </span>
                          <span style={{ fontSize:10, color:card.days<=3?C.red:card.days<=7?C.amber:C.green }}>
                            Due: {card.days}d
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {advice.ranked.length===0 && (
                  <p style={{ fontSize:13, color:C.muted, textAlign:"center" }}>
                    No matching cards found for this category
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card Detail ───────────────────────────────────────────────────────────────
function CardDetail({ card, onEdit, onDelete }) {
  const util     = pct(card.outstanding, card.limit);
  const days     = daysUntil(card.dueDate);
  const interest = calcInterest(card.outstanding, card.apr);
  const bColor   = bankColor(card.bank||card.name);
  const benefits = card.benefits || getCardBenefits(card.name, card.bank);

  return (
    <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${C.border}`,
      boxShadow:"0 4px 20px rgba(0,0,0,0.08)", overflow:"hidden", marginBottom:12 }}>
      {/* Card header */}
      <div style={{ background:`linear-gradient(135deg,${bColor},${bColor}CC)`, padding:"16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.7)", textTransform:"uppercase", letterSpacing:"1px" }}>{card.bank}</p>
            <p style={{ margin:"2px 0 0", fontSize:18, fontWeight:800, color:"#fff" }}>{card.name}</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onEdit} style={{ padding:"5px 10px", borderRadius:8,
              border:"1px solid rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.15)",
              color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:12 }}>Edit</button>
            <button onClick={onDelete} style={{ padding:"5px 10px", borderRadius:8,
              border:"1px solid rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.15)",
              color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:12 }}>Delete</button>
          </div>
        </div>
        <div style={{ display:"flex", gap:16, marginTop:12 }}>
          {[
            { label:"LIMIT",       value:fmt(card.limit) },
            { label:"OUTSTANDING", value:fmt(card.outstanding) },
            { label:"AVAILABLE",   value:fmt(card.limit-card.outstanding) },
          ].map(s=>(
            <div key={s.label}>
              <p style={{ margin:0, fontSize:9, color:"rgba(255,255,255,0.6)", textTransform:"uppercase" }}>{s.label}</p>
              <p style={{ margin:"2px 0 0", fontSize:15, fontWeight:700, color:"#fff", fontFamily:"Georgia,serif" }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"14px 16px" }}>
        {/* Utilization */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.ink }}>Credit Utilization</p>
            <span style={{ fontSize:12, fontWeight:700, color:utilColor(util),
              background:utilBg(util), padding:"1px 8px", borderRadius:99 }}>
              {util}% — {utilLabel(util)}
            </span>
          </div>
          <div style={{ height:8, borderRadius:99, background:"#F1F5F9", overflow:"hidden" }}>
            <div style={{ width:`${Math.min(util,100)}%`, height:"100%",
              background:utilColor(util), borderRadius:99, transition:"width 0.5s" }}/>
          </div>
          <p style={{ margin:"4px 0 0", fontSize:11, color:C.muted }}>
            {util<=30?"✅ Great! Below 30% is healthy for credit score":
             util<=50?"⚠️ Pay down to below 30% for better credit score":
             "🔴 High utilization — pay down soon to protect credit score"}
          </p>
        </div>

        {/* Due + Interest */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <div style={{ padding:"10px 12px", borderRadius:12,
            background:days<=3?"#FFF1F2":days<=7?"#FFFBEB":"#F0FDF4",
            border:`1px solid ${days<=3?"#FECACA":days<=7?"#FDE68A":"#86EFAC"}` }}>
            <p style={{ margin:0, fontSize:10, color:C.muted, textTransform:"uppercase" }}>Due Date</p>
            <p style={{ margin:"3px 0 0", fontSize:15, fontWeight:700, fontFamily:"Georgia,serif",
              color:days<=3?C.red:days<=7?C.amber:C.green }}>
              {days===0?"Today!":days<0?`${Math.abs(days)}d overdue`:`${days} days`}
            </p>
            <p style={{ margin:"2px 0 0", fontSize:10, color:C.muted }}>
              {new Date(card.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
            </p>
          </div>
          <div style={{ padding:"10px 12px", borderRadius:12, background:"#FFF7ED", border:"1px solid #FED7AA" }}>
            <p style={{ margin:0, fontSize:10, color:C.muted, textTransform:"uppercase" }}>Interest if min paid</p>
            <p style={{ margin:"3px 0 0", fontSize:15, fontWeight:700, color:C.amber, fontFamily:"Georgia,serif" }}>
              {fmt(interest)}/mo
            </p>
            <p style={{ margin:"2px 0 0", fontSize:10, color:C.muted }}>{card.apr}% APR</p>
          </div>
        </div>

        {/* Pay comparison */}
        {card.outstanding > 0 && (
          <div style={{ padding:"12px 14px", borderRadius:12, background:"#EFF6FF",
            border:"1px solid #BFDBFE", marginBottom:12 }}>
            <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:"#1D4ED8" }}>
              💡 Pay Full vs Minimum
            </p>
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ flex:1, background:"#FFF1F2", borderRadius:10, padding:"8px 10px", border:"1px solid #FECACA" }}>
                <p style={{ margin:0, fontSize:10, color:C.red, fontWeight:700 }}>Pay Minimum</p>
                <p style={{ margin:"2px 0", fontSize:13, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif" }}>{fmt(card.minDue||0)}</p>
                <p style={{ margin:0, fontSize:10, color:C.red }}>+{fmt(interest)} interest!</p>
              </div>
              <div style={{ display:"flex", alignItems:"center" }}>
                <p style={{ margin:0, fontSize:16, color:C.muted }}>vs</p>
              </div>
              <div style={{ flex:1, background:"#F0FDF4", borderRadius:10, padding:"8px 10px", border:"1px solid #86EFAC" }}>
                <p style={{ margin:0, fontSize:10, color:C.green, fontWeight:700 }}>Pay Full</p>
                <p style={{ margin:"2px 0", fontSize:13, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif" }}>{fmt(card.outstanding)}</p>
                <p style={{ margin:0, fontSize:10, color:C.green }}>₹0 interest ✅</p>
              </div>
            </div>
          </div>
        )}

        {/* Benefits */}
        {benefits && (
          <div style={{ padding:"10px 12px", borderRadius:12, background:C.bg, border:`1px solid ${C.border}` }}>
            <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:700, color:C.ink }}>Card Benefits</p>
            <p style={{ margin:"0 0 3px", fontSize:12, color:C.ink }}>🎁 {benefits.rewards}</p>
            <p style={{ margin:"0 0 3px", fontSize:12, color:C.ink }}>✨ Best for: {benefits.bestFor.join(", ")}</p>
            {benefits.lounge && <p style={{ margin:"0 0 3px", fontSize:12, color:C.ink }}>🛫 Airport lounge access included</p>}
            {benefits.fuelWaiver && <p style={{ margin:"0 0 3px", fontSize:12, color:C.ink }}>⛽ Fuel surcharge waiver</p>}
            {benefits.tip && <p style={{ margin:"4px 0 0", fontSize:11, color:"#5B21B6", fontWeight:600 }}>💡 {benefits.tip}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export default function CreditCardsTab({ cards=[], onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [expandId, setExpandId] = useState(null);
  const [view,     setView]     = useState("cards"); // "cards" | "guide"

  const totalLimit       = cards.reduce((s,c)=>s+c.limit,0);
  const totalOutstanding = cards.reduce((s,c)=>s+c.outstanding,0);
  const totalUtil        = pct(totalOutstanding, totalLimit);
  const totalMinDue      = cards.reduce((s,c)=>s+(c.minDue||0),0);

  const handleSave = (data) => {
    if (editCard) { onUpdate(editCard.id, data); setEditCard(null); }
    else          { onAdd(data); setShowForm(false); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div>
          <h2 style={{ margin:"0 0 2px", fontSize:17, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif" }}>
            💳 Credit Cards
          </h2>
          <p style={{ margin:0, fontSize:11, color:C.muted }}>
            {cards.length} card{cards.length!==1?"s":""} · Smart usage guide
          </p>
        </div>
        {!showForm && !editCard && (
          <button onClick={()=>setShowForm(true)} style={{ padding:"8px 16px",
            borderRadius:10, border:"none", background:C.ink, color:"#fff",
            fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            + Add Card
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showForm||editCard) && (
        <CardForm card={editCard} onSave={handleSave}
          onCancel={()=>{ setShowForm(false); setEditCard(null); }}/>
      )}

      {/* View Toggle */}
      {cards.length > 0 && !showForm && !editCard && (
        <div style={{ display:"flex", background:C.bg, borderRadius:12, padding:4,
          marginBottom:14, border:`1px solid ${C.border}` }}>
          {[
            { key:"cards", label:"💳 My Cards" },
            { key:"guide", label:"🧠 Smart Guide" },
          ].map(t=>(
            <button key={t.key} onClick={()=>setView(t.key)} style={{
              flex:1, padding:"8px", borderRadius:9, border:"none",
              background:view===t.key?"#fff":"transparent",
              color:view===t.key?C.ink:C.muted,
              fontFamily:"inherit", fontSize:13, fontWeight:view===t.key?700:500,
              cursor:"pointer",
              boxShadow:view===t.key?"0 1px 4px rgba(0,0,0,0.08)":"none",
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* Smart Guide */}
      {view==="guide" && cards.length > 0 && (
        <BestCardGuide cards={cards}/>
      )}

      {/* Cards View */}
      {view==="cards" && (
        <>
          {/* Summary strip */}
          {cards.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
              {[
                { label:"Total Limit",   value:fmt(totalLimit),       color:C.blue },
                { label:"Total Used",    value:fmt(totalOutstanding), color:utilColor(totalUtil) },
                { label:"Min Due Total", value:fmt(totalMinDue),      color:C.amber },
              ].map(s=>(
                <div key={s.label} style={{ background:"#fff", borderRadius:11,
                  border:`1px solid ${C.border}`, padding:"9px 11px",
                  boxShadow:"0 1px 2px rgba(0,0,0,0.04)" }}>
                  <p style={{ margin:0, fontSize:8, color:C.muted, textTransform:"uppercase",
                    letterSpacing:"0.7px", fontWeight:700 }}>{s.label}</p>
                  <p style={{ margin:"3px 0 0", fontSize:14, fontWeight:700, color:s.color,
                    fontFamily:"Georgia,serif" }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Overall utilization */}
          {cards.length > 0 && (
            <div style={{ background:"#fff", borderRadius:12, padding:"12px 14px",
              border:`1px solid ${C.border}`, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.ink }}>Overall Utilization</p>
                <span style={{ fontSize:12, fontWeight:700, color:utilColor(totalUtil),
                  background:utilBg(totalUtil), padding:"1px 8px", borderRadius:99 }}>
                  {totalUtil}% — {utilLabel(totalUtil)}
                </span>
              </div>
              <div style={{ height:8, borderRadius:99, background:"#F1F5F9", overflow:"hidden" }}>
                <div style={{ width:`${Math.min(totalUtil,100)}%`, height:"100%",
                  background:utilColor(totalUtil), borderRadius:99, transition:"width 0.5s" }}/>
              </div>
              <p style={{ margin:"5px 0 0", fontSize:11, color:C.muted }}>
                {totalUtil<=30?"✅ Excellent! Credit score healthy.":
                 totalUtil<=50?"⚠️ Moderate. Aim below 30% for better score.":
                 "🔴 High! Pay down balances to protect credit score."}
              </p>
            </div>
          )}

          {/* Empty state */}
          {cards.length === 0 && !showForm && (
            <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:14,
              padding:"24px 16px", textAlign:"center" }}>
              <p style={{ fontSize:36, margin:"0 0 8px" }}>💳</p>
              <p style={{ fontSize:14, fontWeight:700, color:C.ink, margin:"0 0 4px" }}>
                No cards added yet
              </p>
              <p style={{ fontSize:12, color:C.muted, margin:"0 0 16px", lineHeight:1.6 }}>
                Add your credit cards to get smart advice on which card to use for each purchase
              </p>
              <button onClick={()=>setShowForm(true)} style={{ padding:"11px 28px",
                borderRadius:10, border:"none", background:C.blue, color:"#fff",
                fontFamily:"inherit", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                + Add First Card
              </button>
            </div>
          )}

          {/* Card list */}
          {cards.map(card => {
            const isExpanded = expandId === card.id;
            const util  = pct(card.outstanding, card.limit);
            const days  = daysUntil(card.dueDate);
            const bColor = bankColor(card.bank||card.name);

            if (isExpanded) return (
              <div key={card.id}>
                <CardDetail card={card}
                  onEdit={()=>{ setEditCard(card); setExpandId(null); }}
                  onDelete={()=>{ if(window.confirm(`Delete ${card.bank} ${card.name}?`)) { onDelete(card.id); setExpandId(null); } }}
                />
                <button onClick={()=>setExpandId(null)} style={{ width:"100%",
                  padding:"8px", borderRadius:10, border:`1px solid ${C.border}`,
                  background:"#fff", color:C.muted, fontFamily:"inherit",
                  fontSize:12, cursor:"pointer", marginBottom:10 }}>
                  ↑ Collapse
                </button>
              </div>
            );

            return (
              <div key={card.id} onClick={()=>setExpandId(card.id)}
                style={{ background:"#fff", borderRadius:14, border:`1px solid ${C.border}`,
                  boxShadow:"0 1px 4px rgba(0,0,0,0.05)", marginBottom:10,
                  cursor:"pointer", overflow:"hidden" }}>
                <div style={{ height:4, background:bColor }}/>
                <div style={{ padding:"12px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center",
                    justifyContent:"space-between", marginBottom:8 }}>
                    <div>
                      <p style={{ margin:0, fontSize:9, color:C.muted,
                        textTransform:"uppercase", letterSpacing:"0.8px" }}>{card.bank}</p>
                      <p style={{ margin:"1px 0 0", fontSize:14, fontWeight:700, color:C.ink }}>
                        {card.name}
                      </p>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ margin:0, fontSize:9, color:C.muted }}>Outstanding</p>
                      <p style={{ margin:0, fontSize:15, fontWeight:700, color:C.ink,
                        fontFamily:"Georgia,serif" }}>{fmt(card.outstanding)}</p>
                    </div>
                  </div>
                  <div style={{ height:6, borderRadius:99, background:"#F1F5F9",
                    overflow:"hidden", marginBottom:6 }}>
                    <div style={{ width:`${Math.min(util,100)}%`, height:"100%",
                      background:utilColor(util), borderRadius:99 }}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", gap:10 }}>
                      <span style={{ fontSize:11, color:utilColor(util), fontWeight:600 }}>
                        {util}% used
                      </span>
                      <span style={{ fontSize:11, color:C.muted }}>
                        {fmt(card.limit-card.outstanding)} free
                      </span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700,
                      color:days<=3?C.red:days<=7?C.amber:C.green }}>
                      {days<=0?"Overdue!⚠️":days<=3?`Due ${days}d ⚠️`:days<=7?`Due ${days}d`:
                       `Due ${days}d`}
                    </span>
                  </div>
                  {/* Best for tags */}
                  {card.bestFor && (
                    <div style={{ display:"flex", gap:4, marginTop:6, flexWrap:"wrap" }}>
                      {card.bestFor.split(",").slice(0,3).map((b,i)=>(
                        <span key={i} style={{ fontSize:10, padding:"2px 7px", borderRadius:99,
                          background:`${bColor}15`, color:bColor, fontWeight:600,
                          border:`1px solid ${bColor}30` }}>
                          {b.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Credit Score Tips */}
      {cards.length > 0 && view==="cards" && (
        <div style={{ marginTop:8, padding:"12px 14px", borderRadius:12,
          background:"#F5F3FF", border:"1px solid #DDD6FE" }}>
          <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:"#5B21B6" }}>
            📊 Credit Score Tips
          </p>
          {[
            "Keep total utilization below 30% for best credit score",
            "Always pay full outstanding — not just minimum due",
            "Never miss due dates — late payment drops score badly",
            "Don't close old cards — credit history length matters",
          ].map((tip,i)=>(
            <p key={i} style={{ margin:"0 0 3px", fontSize:11, color:"#6D28D9", lineHeight:1.5 }}>
              • {tip}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
