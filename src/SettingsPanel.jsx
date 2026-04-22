// ─── SettingsPanel.jsx ───────────────────────────────────────────────────────
import { useState } from "react";

const C = {
  ink:"#111827", muted:"#6B7280", border:"#E5E7EB",
  bg:"#F8FAFC", red:"#DC2626", green:"#16A34A", blue:"#2563EB",
};

export default function SettingsPanel({
  name, onClose, onResetAll, onNameChange,
  darkMode=false, onToggleDark,
  firebaseUser=null, isGuest=false, onSignOut=null,
  onLoadTestData=null, onDeleteAccount=null,
}) {
  const [showResetModal,   setShowResetModal]   = useState(false);
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [deleteConfirmText,setDeleteConfirmText]= useState("");
  const [deleting,         setDeleting]         = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName,   setDraftName]   = useState(name||"");

  const saveNameEdit = () => {
    if (draftName.trim()) onNameChange(draftName.trim());
    setEditingName(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"fixed", inset:0, zIndex:1000,
        background:"rgba(0,0,0,0.4)",
      }}/>

      {/* Bottom sheet */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:1001,
        background:"#fff", borderRadius:"20px 20px 0 0",
        boxShadow:"0 -8px 40px rgba(0,0,0,0.15)",
        maxHeight:"90vh", display:"flex", flexDirection:"column",
        paddingBottom:"env(safe-area-inset-bottom, 0px)",
        animation:"slideUpSheet 0.25s ease",
      }}>
        <style>{`@keyframes slideUpSheet { from{transform:translateY(100%)} to{transform:translateY(0)} }`}</style>

        {/* Handle + header */}
        <div style={{ flexShrink:0 }}>
          <div style={{ padding:"12px 0 0", display:"flex", justifyContent:"center" }}>
            <div style={{ width:36, height:4, borderRadius:99, background:"#E5E7EB" }}/>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px 14px", borderBottom:`1px solid ${C.border}` }}>
            <p style={{ margin:0, fontSize:17, fontWeight:700, color:C.ink }}>Settings</p>
            <button onClick={onClose} style={{ background:"#F3F4F6", border:"none", borderRadius:99, width:30, height:30, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted }}>✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 0 24px" }}>

          {/* ── Profile card ── */}
          <div style={{ margin:"0 16px 4px", padding:"16px", borderRadius:14, background:C.bg, border:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {/* Avatar */}
              <div style={{
                width:48, height:48, borderRadius:99, flexShrink:0,
                background:"linear-gradient(135deg,#1E40AF,#06B6D4)",
                display:"flex", alignItems:"center", justifyContent:"center",
                overflow:"hidden", fontSize:20,
              }}>
                {firebaseUser?.photoURL
                  ? <img src={firebaseUser.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  : "👤"}
              </div>
              {/* Name + email */}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:15, fontWeight:700, color:C.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {name || firebaseUser?.displayName || "Set your nickname"}
                </p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {firebaseUser?.email || firebaseUser?.phoneNumber || "Guest"}
                </p>
              </div>
              {/* Sync badge */}
              <div style={{ padding:"3px 9px", borderRadius:99, flexShrink:0, background: firebaseUser?"#F0FDF4":"#FFFBEB", border:`1px solid ${firebaseUser?"#86EFAC":"#FCD34D"}` }}>
                <p style={{ margin:0, fontSize:10, fontWeight:700, color: firebaseUser?C.green:"#D97706" }}>
                  {firebaseUser ? "☁ Synced" : "Local"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Nickname ── */}
          <Row icon="😊" label="Nickname" sublabel="Shown on your dashboard" onTap={()=>{ setDraftName(name||""); setEditingName(true); }}>
            <p style={{ margin:0, fontSize:12, color:C.muted, maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name||"Add nickname"}</p>
          </Row>

          {/* ── Dark mode ── */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:`1px solid ${C.bg}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:20 }}>🌙</span>
              <p style={{ margin:0, fontSize:14, fontWeight:600, color:C.ink }}>Dark Mode</p>
            </div>
            <button onClick={()=>onToggleDark&&onToggleDark(!darkMode)} style={{
              width:48, height:26, borderRadius:99, border:"none", cursor:"pointer",
              background: darkMode?C.blue:"#D1D5DB", position:"relative", transition:"background 0.2s",
            }}>
              <div style={{ position:"absolute", top:3, left:darkMode?25:3, width:20, height:20, borderRadius:99, background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
            </button>
          </div>

          {/* ── Load Test Data ── */}
          {onLoadTestData && (
            <Row
              icon="🧪"
              label="Load Test Data"
              sublabel="Fill app with realistic dummy data for testing"
              highlight
              onTap={()=>{ onLoadTestData(); onClose(); }}
            />
          )}

          {/* ── Reset ── */}
          <Row
            icon="🗑"
            label="Reset All Data"
            sublabel="Delete all your data permanently"
            danger
            onTap={() => setShowResetModal(true)}
          />

          {/* ── Delete Account — only for signed-in users ── */}
          {firebaseUser && onDeleteAccount && (
            <Row
              icon="⚠️"
              label="Delete Account"
              sublabel="Permanently delete your account and all data"
              danger
              onTap={() => { setDeleteConfirmText(""); setShowDeleteModal(true); }}
            />
          )}

          {/* ── Sign out — always at bottom ── */}
          <div style={{ marginTop:16, borderTop:`1px solid ${C.border}`, paddingTop:8 }}>
            {firebaseUser ? (
              <Row icon="🚪" label="Sign Out" sublabel={firebaseUser.email||firebaseUser.phoneNumber} danger onTap={async()=>{ onClose(); onSignOut&&await onSignOut(); }}/>
            ) : isGuest ? (
              <Row icon="🔑" label="Sign In to Sync Data" sublabel="Keep your data safe across devices" highlight onTap={()=>{ onClose(); onSignOut&&onSignOut(); }}/>
            ) : null}
          </div>

          <p style={{ textAlign:"center", fontSize:11, color:"#D1D5DB", margin:"20px 0 0" }}>
            Money Coach · v1.0.0
          </p>

        </div>
      </div>

      {/* ── Nickname edit modal ── */}
      {editingName && (
        <div onClick={()=>setEditingName(false)} style={{ position:"fixed", inset:0, zIndex:1100, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end" }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#fff", borderRadius:"20px 20px 0 0",
            padding:"24px 20px", width:"100%",
            paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 24px)",
          }}>
            <p style={{ margin:"0 0 4px", fontSize:17, fontWeight:700, color:C.ink }}>Set Nickname</p>
            <p style={{ margin:"0 0 16px", fontSize:12, color:C.muted }}>This name shows on your dashboard greeting</p>
            <input
              autoFocus value={draftName}
              onChange={e=>setDraftName(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter")saveNameEdit(); if(e.key==="Escape")setEditingName(false); }}
              placeholder="e.g. Puneeth"
              style={{ width:"100%", padding:"13px 14px", borderRadius:12, border:`1.5px solid ${C.blue}`, outline:"none", fontFamily:"inherit", fontSize:16, color:C.ink, boxSizing:"border-box", marginBottom:12 }}
            />
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setEditingName(false)} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${C.border}`, background:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:14, color:C.muted, fontWeight:600 }}>Cancel</button>
              <button onClick={saveNameEdit} style={{ flex:2, padding:"13px", borderRadius:12, border:"none", background:C.ink, cursor:"pointer", fontFamily:"inherit", fontSize:14, color:"#fff", fontWeight:700 }}>Save Nickname</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account confirmation modal ── */}
      {showDeleteModal && (
        <div onClick={()=>setShowDeleteModal(false)} style={{ position:"fixed", inset:0, zIndex:1100, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"flex-end" }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#fff", borderRadius:"20px 20px 0 0",
            padding:"24px 20px", width:"100%",
            paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 24px)",
          }}>
            <p style={{ margin:"0 0 4px", fontSize:17, fontWeight:700, color:C.red }}>⚠️ Delete Account?</p>
            <p style={{ margin:"0 0 6px", fontSize:13, color:C.ink, lineHeight:1.5 }}>
              This will <strong>permanently delete</strong> your account and all your data — expenses, plans, loans, and settings.
            </p>
            <p style={{ margin:"0 0 16px", fontSize:12, color:C.muted }}>
              This cannot be undone. Type <strong>DELETE</strong> below to confirm.
            </p>
            <input
              autoFocus
              value={deleteConfirmText}
              onChange={e=>setDeleteConfirmText(e.target.value.toUpperCase())}
              placeholder="Type DELETE to confirm"
              style={{ width:"100%", padding:"12px 14px", borderRadius:10,
                border:`1.5px solid ${C.red}`, outline:"none",
                fontFamily:"inherit", fontSize:15, color:C.ink,
                boxSizing:"border-box", marginBottom:16,
                letterSpacing:"1px", fontWeight:600,
              }}
            />
            <div style={{ display:"flex", gap:10 }}>
              <button
                onClick={()=>setShowDeleteModal(false)}
                style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${C.border}`,
                  background:"#fff", cursor:"pointer", fontFamily:"inherit",
                  fontSize:14, color:C.muted, fontWeight:600 }}>
                Cancel
              </button>
              <button
                disabled={deleteConfirmText !== "DELETE" || deleting}
                onClick={async () => {
                  if (deleteConfirmText !== "DELETE") return;
                  setDeleting(true);
                  try {
                    await onDeleteAccount();
                  } catch(e) {
                    console.error("Delete account failed:", e);
                  }
                  setDeleting(false);
                  setShowDeleteModal(false);
                  onClose();
                }}
                style={{ flex:2, padding:"13px", borderRadius:12, border:"none",
                  background: deleteConfirmText === "DELETE" && !deleting ? C.red : "#D1D5DB",
                  cursor: deleteConfirmText === "DELETE" && !deleting ? "pointer" : "not-allowed",
                  fontFamily:"inherit", fontSize:14, color:"#fff", fontWeight:700,
                  transition:"background 0.2s" }}>
                {deleting ? "Deleting..." : "Yes, Delete My Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset confirmation modal ── */}
      {showResetModal && (
        <div onClick={()=>setShowResetModal(false)} style={{ position:"fixed", inset:0, zIndex:1100, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end" }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#fff", borderRadius:"20px 20px 0 0",
            padding:"24px 20px", width:"100%",
            paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 24px)",
          }}>
            <p style={{ margin:"0 0 4px", fontSize:17, fontWeight:700, color:C.red }}>🗑 Reset All Data?</p>
            <p style={{ margin:"0 0 20px", fontSize:13, color:C.muted }}>This will permanently delete all your expenses, plans, loans, and settings. This cannot be undone.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowResetModal(false)} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${C.border}`, background:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:14, color:C.muted, fontWeight:600 }}>Cancel</button>
              <button onClick={()=>{ setShowResetModal(false); onResetAll(); onClose(); }} style={{ flex:2, padding:"13px", borderRadius:12, border:"none", background:C.red, cursor:"pointer", fontFamily:"inherit", fontSize:14, color:"#fff", fontWeight:700 }}>Yes, Delete Everything</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ icon, label, sublabel, onTap, danger, highlight, children }) {
  return (
    <button onClick={onTap} style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      width:"100%", padding:"13px 20px", background:"none", border:"none",
      borderBottom:`1px solid ${C.bg}`, cursor:"pointer", fontFamily:"inherit",
      textAlign:"left", WebkitTapHighlightColor:"transparent",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
        <div>
          <p style={{ margin:0, fontSize:14, fontWeight:600, color:danger?"#DC2626":highlight?C.blue:C.ink }}>{label}</p>
          {sublabel&&<p style={{ margin:"2px 0 0", fontSize:11, color:C.muted }}>{sublabel}</p>}
        </div>
      </div>
      {children||<span style={{ fontSize:16, color:"#D1D5DB" }}>›</span>}
    </button>
  );
}
