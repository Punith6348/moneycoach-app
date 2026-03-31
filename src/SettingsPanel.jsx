// ─── SettingsPanel.jsx — Simple, clean, mobile-first ─────────────────────────
import { useState } from "react";

const C = {
  ink:"#111827", muted:"#6B7280", border:"#E5E7EB",
  bg:"#F8FAFC", red:"#DC2626", green:"#16A34A", blue:"#2563EB",
};
const STORAGE_KEY = "moneyCoachData_v3";

export default function SettingsPanel({
  name, onClose, onResetAll, onNameChange,
  darkMode=false, onToggleDark,
  firebaseUser=null, isGuest=false, onSignOut=null,
}) {
  const [resetArmed,  setResetArmed]  = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName,   setDraftName]   = useState(name||"");

  const handleReset = () => {
    if (!resetArmed) { setResetArmed(true); return; }
    onResetAll(); onClose();
  };

  const saveNameEdit = () => {
    onNameChange(draftName.trim());
    setEditingName(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"fixed", inset:0, zIndex:1000,
        background:"rgba(0,0,0,0.4)",
      }}/>

      {/* Bottom sheet panel */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:1001,
        background:"#fff",
        borderRadius:"20px 20px 0 0",
        boxShadow:"0 -8px 40px rgba(0,0,0,0.15)",
        maxHeight:"88vh",
        display:"flex", flexDirection:"column",
        paddingBottom:"env(safe-area-inset-bottom, 0px)",
        animation:"slideUpSheet 0.25s ease",
      }}>
        <style>{`
          @keyframes slideUpSheet {
            from { transform:translateY(100%); }
            to   { transform:translateY(0); }
          }
        `}</style>

        {/* Handle */}
        <div style={{ padding:"12px 0 0", display:"flex", justifyContent:"center", flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:99, background:"#E5E7EB" }}/>
        </div>

        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"12px 20px 14px", borderBottom:`1px solid ${C.border}`, flexShrink:0,
        }}>
          <p style={{ margin:0, fontSize:17, fontWeight:700, color:C.ink }}>Settings</p>
          <button onClick={onClose} style={{
            background:"#F3F4F6", border:"none", borderRadius:99,
            width:30, height:30, cursor:"pointer", fontSize:16,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:C.muted,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px 0 16px" }}>

          {/* ── ACCOUNT ── */}
          <Section label="Account"/>

          {/* User info */}
          <div style={{ margin:"0 16px 4px", padding:"14px 16px", borderRadius:14, background:C.bg, border:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{
                width:44, height:44, borderRadius:99,
                background:"linear-gradient(135deg,#1E40AF,#06B6D4)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:18, color:"#fff", flexShrink:0,
                overflow:"hidden",
              }}>
                {firebaseUser?.photoURL
                  ? <img src={firebaseUser.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  : (firebaseUser ? "👤" : "👤")}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {firebaseUser?.displayName || name || "Guest User"}
                </p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {firebaseUser?.email || firebaseUser?.phoneNumber || "Not signed in"}
                </p>
              </div>
              {/* Cloud sync badge */}
              <div style={{
                padding:"3px 8px", borderRadius:99, flexShrink:0,
                background: firebaseUser ? "#F0FDF4" : "#FFFBEB",
                border: `1px solid ${firebaseUser ? "#86EFAC" : "#FCD34D"}`,
              }}>
                <p style={{ margin:0, fontSize:10, fontWeight:700, color: firebaseUser ? C.green : "#D97706" }}>
                  {firebaseUser ? "☁ Synced" : "Local"}
                </p>
              </div>
            </div>
          </div>

          {/* Name edit */}
          <Row icon="✏️" label="Display Name" onTap={()=>{ setDraftName(name||""); setEditingName(true); }}>
            <p style={{ margin:0, fontSize:12, color:C.muted }}>{name||"Set name"}</p>
          </Row>

          {/* Sign out / Sign in */}
          {firebaseUser ? (
            <Row icon="🚪" label="Sign Out" danger onTap={async()=>{ onClose(); onSignOut && await onSignOut(); }}/>
          ) : isGuest ? (
            <Row icon="🔑" label="Sign In to Sync Data" highlight onTap={()=>{ onClose(); onSignOut && onSignOut(); }}/>
          ) : null}

          {/* ── PREFERENCES ── */}
          <Section label="Preferences"/>

          {/* Dark mode */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"13px 20px", borderBottom:`1px solid ${C.bg}`,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:20 }}>🌙</span>
              <p style={{ margin:0, fontSize:14, fontWeight:600, color:C.ink }}>Dark Mode</p>
            </div>
            <button onClick={()=>onToggleDark&&onToggleDark(!darkMode)} style={{
              width:48, height:26, borderRadius:99, border:"none", cursor:"pointer",
              background: darkMode ? C.blue : "#D1D5DB",
              position:"relative", transition:"background 0.2s", flexShrink:0,
            }}>
              <div style={{
                position:"absolute", top:3, left: darkMode ? 25 : 3,
                width:20, height:20, borderRadius:99, background:"#fff",
                transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
              }}/>
            </button>
          </div>

          {/* ── DANGER ZONE ── */}
          <Section label="Danger Zone"/>

          <Row
            icon="🗑"
            label={resetArmed ? "Tap again to confirm delete" : "Reset All Data"}
            sublabel={resetArmed ? "⚠ This cannot be undone" : "Delete all expenses and settings"}
            danger={resetArmed}
            onTap={handleReset}
          />

          {resetArmed && (
            <button onClick={()=>setResetArmed(false)} style={{
              display:"block", margin:"4px 16px 0", padding:"10px",
              width:"calc(100% - 32px)", borderRadius:10,
              border:`1px solid ${C.border}`, background:"#fff",
              cursor:"pointer", fontFamily:"inherit", fontSize:13, color:C.muted,
            }}>
              Cancel
            </button>
          )}

          {/* App version */}
          <p style={{ textAlign:"center", fontSize:11, color:"#D1D5DB", margin:"24px 0 0" }}>
            Money Coach · v1.0.0
          </p>

        </div>
      </div>

      {/* Name edit modal */}
      {editingName && (
        <div onClick={()=>setEditingName(false)} style={{
          position:"fixed", inset:0, zIndex:1100,
          background:"rgba(0,0,0,0.5)",
          display:"flex", alignItems:"flex-end", justifyContent:"center",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#fff", borderRadius:"20px 20px 0 0",
            padding:"24px 20px 32px", width:"100%", maxWidth:480,
            paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 24px)",
          }}>
            <p style={{ margin:"0 0 16px", fontSize:16, fontWeight:700, color:C.ink }}>
              Change Display Name
            </p>
            <input
              autoFocus
              value={draftName}
              onChange={e=>setDraftName(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") saveNameEdit(); if(e.key==="Escape") setEditingName(false); }}
              placeholder="Your name"
              style={{
                width:"100%", padding:"13px 14px", borderRadius:12,
                border:`1.5px solid ${C.blue}`, outline:"none",
                fontFamily:"inherit", fontSize:15, color:C.ink,
                boxSizing:"border-box", marginBottom:12,
              }}
            />
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setEditingName(false)} style={{
                flex:1, padding:"13px", borderRadius:12, border:`1px solid ${C.border}`,
                background:"#fff", cursor:"pointer", fontFamily:"inherit",
                fontSize:14, color:C.muted, fontWeight:600,
              }}>Cancel</button>
              <button onClick={saveNameEdit} style={{
                flex:2, padding:"13px", borderRadius:12, border:"none",
                background:C.ink, cursor:"pointer", fontFamily:"inherit",
                fontSize:14, color:"#fff", fontWeight:700,
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function Section({ label }) {
  return (
    <p style={{
      margin:"20px 20px 6px", fontSize:11, fontWeight:700,
      color:C.muted, textTransform:"uppercase", letterSpacing:"0.9px",
    }}>{label}</p>
  );
}

// ── Tappable row ──────────────────────────────────────────────────────────────
function Row({ icon, label, sublabel, onTap, danger, highlight, children }) {
  return (
    <button onClick={onTap} style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      width:"100%", padding:"13px 20px",
      background:"none", border:"none", borderBottom:`1px solid ${C.bg}`,
      cursor:"pointer", fontFamily:"inherit", textAlign:"left",
      WebkitTapHighlightColor:"transparent",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
        <div>
          <p style={{ margin:0, fontSize:14, fontWeight:600, color: danger?"#DC2626" : highlight?C.blue : C.ink }}>
            {label}
          </p>
          {sublabel && <p style={{ margin:"2px 0 0", fontSize:11, color:C.muted }}>{sublabel}</p>}
        </div>
      </div>
      {children || <span style={{ fontSize:16, color:"#D1D5DB" }}>›</span>}
    </button>
  );
}
