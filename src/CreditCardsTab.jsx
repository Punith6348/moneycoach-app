// ─── CreditCardsTab.jsx — Smart Credit Card Manager ──────────────────────────
import { useState } from "react";

const C = {
  ink:"#111827", muted:"#6B7280", border:"#E5E7EB", bg:"#F8FAFC",
  red:"#DC2626", green:"#16A34A", amber:"#D97706", blue:"#2563EB", purple:"#7C3AED",
};
const fmt  = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const pct  = (a,b) => b>0 ? Math.round((a/b)*100) : 0;

// Utilization color
const utilColor = (p) => p<=30 ? C.green : p<=50 ? C.amber : C.red;
const utilLabel = (p) => p<=30 ? "Excellent" : p<=50 ? "Moderate" : p>75 ? "Critical" : "High";
const utilBg    = (p) => p<=30 ? "#F0FDF4" : p<=50 ? "#FFFBEB" : "#FFF1F2";

// Days until date
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const now   = new Date(); now.setHours(0,0,0,0);
  const due   = new Date(dateStr); due.setHours(0,0,0,0);
  return Math.round((due-now)/(1000*60*60*24));
};

// Monthly interest if only minimum paid
const calcInterest = (outstanding, apr) => {
  if (!outstanding || !apr) return 0;
  return Math.round(outstanding * (apr/100/12));
};

// Bank colors
const BANK_COLORS = {
  "HDFC":   "#004C8F", "SBI":    "#2D5FA8", "ICICI":  "#F37021",
  "Axis":   "#97144D", "Kotak":  "#E31E24", "Yes":    "#00529B",
  "Citi":   "#003B70", "Amex":   "#016FD0", "IDFC":   "#E31837",
  "AU":     "#F8C300", "Other":  "#6B7280",
};
const bankColor = (name="") => {
  const key = Object.keys(BANK_COLORS).find(k => name.toUpperCase().includes(k.toUpperCase()));
  return key ? BANK_COLORS[key] : BANK_COLORS.Other;
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
    color:       card?.color       || "#2563EB",
  });

  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const inp = {
    width:"100%", padding:"10px 12px", borderRadius:10,
    border:`1.5px solid ${C.border}`, fontFamily:"inherit",
    fontSize:14, outline:"none", boxSizing:"border-box",
    background:"#fff", color:C.ink,
  };

  const save = () => {
    if (!form.name.trim() || !form.limit || !form.dueDate) return;
    onSave({
      name:        form.name.trim(),
      bank:        form.bank.trim(),
      limit:       parseFloat(form.limit)||0,
      outstanding: parseFloat(form.outstanding)||0,
      minDue:      parseFloat(form.minDue)||0,
      dueDate:     form.dueDate,
      apr:         parseFloat(form.apr)||36,
      rewardRate:  form.rewardRate.trim(),
      bestFor:     form.bestFor.trim(),
      color:       bankColor(form.bank||form.name),
    });
  };

  return (
    <div style={{ background:"#fff", borderRadius:16, padding:16,
      border:`1px solid ${C.border}`, boxShadow:"0 2px 12px rgba(0,0,0,0.08)",
      marginBottom:16 }}>
      <p style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:C.ink }}>
        {card ? "✏️ Edit Card" : "💳 Add Credit Card"}
      </p>

      {/* Card Name + Bank */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Card Name *</p>
          <input value={form.name} onChange={e=>set("name",e.target.value)}
            placeholder="e.g. Regalia, SimplyCLICK" style={inp}/>
        </div>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Bank *</p>
          <input value={form.bank} onChange={e=>set("bank",e.target.value)}
            placeholder="e.g. HDFC, SBI, Axis" style={inp}/>
        </div>
      </div>

      {/* Limit + Outstanding */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Credit Limit (₹) *</p>
          <input type="number" value={form.limit} onChange={e=>set("limit",e.target.value)}
            placeholder="e.g. 100000" style={inp}/>
        </div>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Outstanding (₹)</p>
          <input type="number" value={form.outstanding} onChange={e=>set("outstanding",e.target.value)}
            placeholder="Current balance" style={inp}/>
        </div>
      </div>

      {/* Min Due + Due Date */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Minimum Due (₹)</p>
          <input type="number" value={form.minDue} onChange={e=>set("minDue",e.target.value)}
            placeholder="Min payment" style={inp}/>
        </div>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Due Date *</p>
          <input type="date" value={form.dueDate} onChange={e=>set("dueDate",e.target.value)} style={inp}/>
        </div>
      </div>

      {/* APR + Reward Rate */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Interest Rate (APR %)</p>
          <input type="number" value={form.apr} onChange={e=>set("apr",e.target.value)}
            placeholder="e.g. 36" style={inp}/>
        </div>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Reward Rate</p>
          <input value={form.rewardRate} onChange={e=>set("rewardRate",e.target.value)}
            placeholder="e.g. 4pts/₹150" style={inp}/>
        </div>
      </div>

      {/* Best For */}
      <div style={{ marginBottom:14 }}>
        <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Best Used For</p>
        <input value={form.bestFor} onChange={e=>set("bestFor",e.target.value)}
          placeholder="e.g. Amazon, Swiggy, Travel, Fuel" style={inp}/>
      </div>

      {/* Buttons */}
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onCancel} style={{ flex:1, padding:"11px", borderRadius:10,
          border:`1px solid ${C.border}`, background:"#fff", color:C.muted,
          fontFamily:"inherit", fontSize:14, cursor:"pointer" }}>
          Cancel
        </button>
        <button onClick={save} style={{ flex:2, padding:"11px", borderRadius:10,
          border:"none", background:C.ink, color:"#fff",
          fontFamily:"inherit", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          {card ? "Save Changes ✓" : "Add Card ✓"}
        </button>
      </div>
    </div>
  );
}

// ── Card Detail View ──────────────────────────────────────────────────────────
function CardDetail({ card, onEdit, onDelete, onClose }) {
  const util     = pct(card.outstanding, card.limit);
  const uColor   = utilColor(util);
  const days     = daysUntil(card.dueDate);
  const interest = calcInterest(card.outstanding, card.apr);
  const bColor   = bankColor(card.bank||card.name);

  return (
    <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${C.border}`,
      boxShadow:"0 4px 20px rgba(0,0,0,0.1)", overflow:"hidden", marginBottom:14 }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, ${bColor}, ${bColor}CC)`,
        padding:"16px 16px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.7)",
              textTransform:"uppercase", letterSpacing:"1px" }}>{card.bank}</p>
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
          <div>
            <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.6)" }}>LIMIT</p>
            <p style={{ margin:0, fontSize:16, fontWeight:700, color:"#fff",
              fontFamily:"Georgia,serif" }}>{fmt(card.limit)}</p>
          </div>
          <div>
            <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.6)" }}>OUTSTANDING</p>
            <p style={{ margin:0, fontSize:16, fontWeight:700, color:"#fff",
              fontFamily:"Georgia,serif" }}>{fmt(card.outstanding)}</p>
          </div>
          <div>
            <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.6)" }}>AVAILABLE</p>
            <p style={{ margin:0, fontSize:16, fontWeight:700, color:"#fff",
              fontFamily:"Georgia,serif" }}>{fmt(card.limit - card.outstanding)}</p>
          </div>
        </div>
      </div>

      <div style={{ padding:"14px 16px" }}>
        {/* Utilization bar */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.ink }}>Credit Utilization</p>
            <span style={{ fontSize:12, fontWeight:700, color:uColor,
              background:utilBg(util), padding:"1px 8px", borderRadius:99 }}>
              {util}% — {utilLabel(util)}
            </span>
          </div>
          <div style={{ height:8, borderRadius:99, background:"#F1F5F9", overflow:"hidden" }}>
            <div style={{ width:`${Math.min(util,100)}%`, height:"100%",
              background:uColor, borderRadius:99, transition:"width 0.5s" }}/>
          </div>
          <p style={{ margin:"4px 0 0", fontSize:11, color:C.muted }}>
            {util<=30 ? "✅ Great! Below 30% keeps your credit score healthy" :
             util<=50 ? "⚠️ Try to pay down to below 30% for better credit score" :
             "🔴 High utilization hurts your credit score — pay down soon!"}
          </p>
        </div>

        {/* Due date + interest warning */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <div style={{ padding:"10px 12px", borderRadius:12,
            background: days<=3?"#FFF1F2":days<=7?"#FFFBEB":"#F0FDF4",
            border:`1px solid ${days<=3?"#FECACA":days<=7?"#FDE68A":"#86EFAC"}` }}>
            <p style={{ margin:0, fontSize:10, color:C.muted, textTransform:"uppercase" }}>Due Date</p>
            <p style={{ margin:"3px 0 0", fontSize:15, fontWeight:700,
              color:days<=3?C.red:days<=7?C.amber:C.green, fontFamily:"Georgia,serif" }}>
              {days===0?"Today!":days<0?`${Math.abs(days)}d overdue`:`${days} days`}
            </p>
            <p style={{ margin:"2px 0 0", fontSize:10, color:C.muted }}>
              {new Date(card.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
            </p>
          </div>
          <div style={{ padding:"10px 12px", borderRadius:12,
            background:"#FFF7ED", border:"1px solid #FED7AA" }}>
            <p style={{ margin:0, fontSize:10, color:C.muted, textTransform:"uppercase" }}>
              Interest if min paid
            </p>
            <p style={{ margin:"3px 0 0", fontSize:15, fontWeight:700,
              color:C.amber, fontFamily:"Georgia,serif" }}>
              {fmt(interest)}/mo
            </p>
            <p style={{ margin:"2px 0 0", fontSize:10, color:C.muted }}>{card.apr}% APR</p>
          </div>
        </div>

        {/* Pay full vs minimum */}
        {card.outstanding > 0 && (
          <div style={{ padding:"12px 14px", borderRadius:12,
            background:"#EFF6FF", border:"1px solid #BFDBFE", marginBottom:12 }}>
            <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:"#1D4ED8" }}>
              💡 Payment Comparison
            </p>
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ flex:1, background:"#FFF1F2", borderRadius:10, padding:"8px 10px",
                border:"1px solid #FECACA" }}>
                <p style={{ margin:0, fontSize:10, color:C.red, fontWeight:700 }}>Pay Minimum</p>
                <p style={{ margin:"2px 0", fontSize:13, fontWeight:700, color:C.ink,
                  fontFamily:"Georgia,serif" }}>{fmt(card.minDue||0)}</p>
                <p style={{ margin:0, fontSize:10, color:C.red }}>
                  +{fmt(interest)} interest!
                </p>
              </div>
              <div style={{ display:"flex", alignItems:"center" }}>
                <p style={{ margin:0, fontSize:18, color:C.muted }}>vs</p>
              </div>
              <div style={{ flex:1, background:"#F0FDF4", borderRadius:10, padding:"8px 10px",
                border:"1px solid #86EFAC" }}>
                <p style={{ margin:0, fontSize:10, color:C.green, fontWeight:700 }}>Pay Full</p>
                <p style={{ margin:"2px 0", fontSize:13, fontWeight:700, color:C.ink,
                  fontFamily:"Georgia,serif" }}>{fmt(card.outstanding)}</p>
                <p style={{ margin:0, fontSize:10, color:C.green }}>₹0 interest ✅</p>
              </div>
            </div>
          </div>
        )}

        {/* Reward rate + best for */}
        {(card.rewardRate || card.bestFor) && (
          <div style={{ padding:"10px 12px", borderRadius:12,
            background:C.bg, border:`1px solid ${C.border}` }}>
            {card.rewardRate && (
              <p style={{ margin:"0 0 4px", fontSize:12, color:C.ink }}>
                🎁 <strong>Rewards:</strong> {card.rewardRate}
              </p>
            )}
            {card.bestFor && (
              <p style={{ margin:0, fontSize:12, color:C.ink }}>
                ✨ <strong>Best for:</strong> {card.bestFor}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Purchase Advisor ──────────────────────────────────────────────────────────
function PurchaseAdvisor({ cards }) {
  const [amount,   setAmount]   = useState("");
  const [category, setCategory] = useState("Shopping");
  const [result,   setResult]   = useState(null);

  const CATS = ["Shopping","Food","Travel","Fuel","Entertainment","Medical","Groceries","Other"];

  const advise = () => {
    if (!amount || cards.length === 0) return;
    const amt = parseFloat(amount);

    const ranked = cards.map(card => {
      const newUtil     = pct(card.outstanding + amt, card.limit);
      const days        = daysUntil(card.dueDate);
      const available   = card.limit - card.outstanding;
      const canAfford   = available >= amt;

      // Score — lower is better for display ranking
      let score = 0;
      if (!canAfford) score += 1000; // Can't afford — rank last
      if (newUtil > 75) score += 100;
      else if (newUtil > 50) score += 50;
      else if (newUtil > 30) score += 20;
      if (days <= 3) score += 30;
      else if (days <= 7) score += 10;

      // Check if card is best for this category
      const bestForMatch = card.bestFor?.toLowerCase().includes(category.toLowerCase());
      if (bestForMatch) score -= 40;

      return { ...card, newUtil, days, canAfford, score, bestForMatch };
    }).sort((a,b) => a.score - b.score);

    setResult(ranked);
  };

  return (
    <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${C.border}`,
      boxShadow:"0 2px 8px rgba(0,0,0,0.05)", marginBottom:14, overflow:"hidden" }}>
      <div style={{ background:"linear-gradient(135deg,#7C3AED,#6D28D9)",
        padding:"12px 16px" }}>
        <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#fff" }}>
          🎯 Which Card Should I Use?
        </p>
        <p style={{ margin:"2px 0 0", fontSize:11, color:"rgba(255,255,255,0.7)" }}>
          Enter purchase details to get the best card recommendation
        </p>
      </div>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div>
            <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted,
              textTransform:"uppercase" }}>Amount (₹)</p>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
              placeholder="e.g. 15000"
              style={{ width:"100%", padding:"10px 12px", borderRadius:10,
                border:`1.5px solid ${C.border}`, fontFamily:"inherit",
                fontSize:14, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div>
            <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:C.muted,
              textTransform:"uppercase" }}>Category</p>
            <select value={category} onChange={e=>setCategory(e.target.value)}
              style={{ width:"100%", padding:"10px 12px", borderRadius:10,
                border:`1.5px solid ${C.border}`, fontFamily:"inherit",
                fontSize:14, outline:"none", boxSizing:"border-box",
                background:"#fff", color:C.ink }}>
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button onClick={advise} disabled={!amount||cards.length===0}
          style={{ width:"100%", padding:"12px", borderRadius:10, border:"none",
            background: !amount||cards.length===0?"#E5E7EB":"#7C3AED",
            color: !amount||cards.length===0?C.muted:"#fff",
            fontFamily:"inherit", fontSize:14, fontWeight:700,
            cursor: !amount||cards.length===0?"default":"pointer" }}>
          Find Best Card →
        </button>

        {/* Results */}
        {result && (
          <div style={{ marginTop:14 }}>
            {result.map((card, i) => {
              const bColor = bankColor(card.bank||card.name);
              return (
                <div key={card.id} style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"10px 12px", borderRadius:12, marginBottom:8,
                  background: i===0?"#F5F3FF":"#fff",
                  border:`1.5px solid ${i===0?"#7C3AED":C.border}`,
                  opacity: card.canAfford?1:0.5 }}>
                  <div style={{ width:36, height:36, borderRadius:8, flexShrink:0,
                    background:bColor, display:"flex", alignItems:"center",
                    justifyContent:"center" }}>
                    <p style={{ margin:0, fontSize:10, fontWeight:800, color:"#fff" }}>
                      {i===0?"🥇":i===1?"🥈":"🥉"}
                    </p>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.ink }}>
                        {card.bank} {card.name}
                      </p>
                      {i===0 && <span style={{ fontSize:10, background:"#7C3AED",
                        color:"#fff", padding:"1px 7px", borderRadius:99, fontWeight:700 }}>
                        Best Choice
                      </span>}
                      {card.bestForMatch && <span style={{ fontSize:10, background:"#F0FDF4",
                        color:C.green, padding:"1px 7px", borderRadius:99,
                        border:`1px solid #86EFAC`, fontWeight:700 }}>
                        ✓ Great for {category}
                      </span>}
                    </div>
                    <div style={{ display:"flex", gap:10, marginTop:3, flexWrap:"wrap" }}>
                      <p style={{ margin:0, fontSize:11, color:utilColor(card.newUtil) }}>
                        Util: {card.newUtil}%
                      </p>
                      <p style={{ margin:0, fontSize:11,
                        color:card.days<=3?C.red:card.days<=7?C.amber:C.green }}>
                        Due: {card.days}d
                      </p>
                      <p style={{ margin:0, fontSize:11, color:C.muted }}>
                        Avail: {fmt(card.limit-card.outstanding)}
                      </p>
                      {!card.canAfford && <p style={{ margin:0, fontSize:11, color:C.red,
                        fontWeight:700 }}>Insufficient limit!</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            <p style={{ margin:"4px 0 0", fontSize:11, color:C.muted, textAlign:"center" }}>
              💡 Ranked by: rewards match + utilization impact + due date
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export default function CreditCardsTab({ cards=[], onAdd, onUpdate, onDelete }) {
  const [showForm,  setShowForm]  = useState(false);
  const [editCard,  setEditCard]  = useState(null);
  const [expandId,  setExpandId]  = useState(null);

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
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:14 }}>
        <div>
          <h2 style={{ margin:"0 0 2px", fontSize:17, fontWeight:700, color:C.ink,
            fontFamily:"Georgia,serif" }}>💳 Credit Cards</h2>
          <p style={{ margin:0, fontSize:11, color:C.muted }}>
            {cards.length} card{cards.length!==1?"s":""} · Smart spend advisor
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

      {/* Add/Edit form */}
      {(showForm || editCard) && (
        <CardForm
          card={editCard}
          onSave={handleSave}
          onCancel={()=>{ setShowForm(false); setEditCard(null); }}
        />
      )}

      {/* Summary strip */}
      {cards.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
          {[
            { label:"Total Limit",    value:fmt(totalLimit),       color:C.blue   },
            { label:"Total Used",     value:fmt(totalOutstanding), color:utilColor(totalUtil) },
            { label:"Min Due Total",  value:fmt(totalMinDue),      color:C.amber  },
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
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.ink }}>
              Overall Credit Utilization
            </p>
            <span style={{ fontSize:12, fontWeight:700, color:utilColor(totalUtil),
              background:utilBg(totalUtil), padding:"2px 8px", borderRadius:99 }}>
              {totalUtil}% — {utilLabel(totalUtil)}
            </span>
          </div>
          <div style={{ height:8, borderRadius:99, background:"#F1F5F9", overflow:"hidden" }}>
            <div style={{ width:`${Math.min(totalUtil,100)}%`, height:"100%",
              background:utilColor(totalUtil), borderRadius:99, transition:"width 0.5s" }}/>
          </div>
          <p style={{ margin:"6px 0 0", fontSize:11, color:C.muted }}>
            {totalUtil<=30?"✅ Excellent! Your credit score is in good shape.":
             totalUtil<=50?"⚠️ Moderate. Try to bring utilization below 30%.":
             "🔴 High utilization! Pay down balances to protect your credit score."}
          </p>
        </div>
      )}

      {/* Purchase Advisor */}
      {cards.length >= 2 && (
        <PurchaseAdvisor cards={cards}/>
      )}

      {/* Card list */}
      {cards.length === 0 && !showForm ? (
        <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:14,
          padding:"20px 16px", textAlign:"center" }}>
          <p style={{ fontSize:32, margin:"0 0 8px" }}>💳</p>
          <p style={{ fontSize:14, fontWeight:700, color:C.ink, margin:"0 0 4px" }}>
            No cards added yet
          </p>
          <p style={{ fontSize:12, color:C.muted, margin:"0 0 14px", lineHeight:1.5 }}>
            Add your credit cards to track utilization,{"\n"}
            get smart spend advice and due date alerts
          </p>
          <button onClick={()=>setShowForm(true)} style={{ padding:"10px 24px",
            borderRadius:10, border:"none", background:C.blue, color:"#fff",
            fontFamily:"inherit", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            + Add First Card
          </button>
        </div>
      ) : (
        <div>
          {cards.map(card => {
            const isExpanded = expandId === card.id;
            const util = pct(card.outstanding, card.limit);
            const days = daysUntil(card.dueDate);
            const bColor = bankColor(card.bank||card.name);

            if (isExpanded) return (
              <div key={card.id}>
                <CardDetail
                  card={card}
                  onEdit={()=>{ setEditCard(card); setExpandId(null); }}
                  onDelete={()=>{ if(window.confirm(`Delete ${card.name}?`)) { onDelete(card.id); setExpandId(null); } }}
                  onClose={()=>setExpandId(null)}
                />
                <button onClick={()=>setExpandId(null)} style={{ width:"100%",
                  padding:"8px", borderRadius:10, border:`1px solid ${C.border}`,
                  background:"#fff", color:C.muted, fontFamily:"inherit",
                  fontSize:12, cursor:"pointer", marginTop:-10, marginBottom:10 }}>
                  ↑ Collapse
                </button>
              </div>
            );

            return (
              <div key={card.id} onClick={()=>setExpandId(card.id)}
                style={{ background:"#fff", borderRadius:14, border:`1px solid ${C.border}`,
                  boxShadow:"0 1px 4px rgba(0,0,0,0.05)", marginBottom:10,
                  cursor:"pointer", overflow:"hidden" }}>
                {/* Card top bar */}
                <div style={{ height:4, background:bColor }}/>
                <div style={{ padding:"12px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center",
                    justifyContent:"space-between", marginBottom:8 }}>
                    <div>
                      <p style={{ margin:0, fontSize:9, color:C.muted,
                        textTransform:"uppercase", letterSpacing:"0.8px" }}>{card.bank}</p>
                      <p style={{ margin:"1px 0 0", fontSize:14, fontWeight:700,
                        color:C.ink }}>{card.name}</p>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ margin:0, fontSize:9, color:C.muted }}>Outstanding</p>
                      <p style={{ margin:0, fontSize:15, fontWeight:700, color:C.ink,
                        fontFamily:"Georgia,serif" }}>{fmt(card.outstanding)}</p>
                    </div>
                  </div>

                  {/* Util bar */}
                  <div style={{ height:6, borderRadius:99, background:"#F1F5F9",
                    overflow:"hidden", marginBottom:6 }}>
                    <div style={{ width:`${Math.min(util,100)}%`, height:"100%",
                      background:utilColor(util), borderRadius:99 }}/>
                  </div>

                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center" }}>
                    <div style={{ display:"flex", gap:10 }}>
                      <span style={{ fontSize:11, color:utilColor(util), fontWeight:600 }}>
                        {util}% used
                      </span>
                      <span style={{ fontSize:11, color:C.muted }}>
                        {fmt(card.limit-card.outstanding)} available
                      </span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700,
                      color:days<=3?C.red:days<=7?C.amber:C.green }}>
                      {days<=0?"Overdue!":days<=3?`Due in ${days}d ⚠️`:days<=7?`Due in ${days}d`:`Due in ${days}d`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Credit score tips */}
      {cards.length > 0 && (
        <div style={{ marginTop:8, padding:"12px 14px", borderRadius:12,
          background:"#F5F3FF", border:"1px solid #DDD6FE" }}>
          <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:"#5B21B6" }}>
            📊 Credit Score Tips
          </p>
          {[
            "Keep total utilization below 30% for best credit score",
            "Always pay full outstanding — not just minimum due",
            "Never miss payment due dates — late payment = score drop",
            "Don't close old cards — age of credit history matters",
            "Avoid applying for multiple cards at once",
          ].map((tip,i)=>(
            <p key={i} style={{ margin:"0 0 4px", fontSize:11, color:"#6D28D9",
              lineHeight:1.5 }}>
              • {tip}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
