// ─── SettingsPanel.jsx ───────────────────────────────────────────────────────
import { useState } from "react";

const C = {
  ink:"#111827", muted:"#6B7280", border:"#E5E7EB",
  bg:"#F8FAFC", red:"#DC2626", green:"#16A34A", blue:"#2563EB",
};

// z-indexes must be > 9999 (tab bar) so modals appear on top
const Z_SHEET   = 10000;
const Z_MODAL   = 10001;

function loadProfile() {
  try { return JSON.parse(localStorage.getItem("mc_profile") || "{}"); } catch { return {}; }
}
function saveProfile(p) {
  localStorage.setItem("mc_profile", JSON.stringify(p));
}

export default function SettingsPanel({
  name, onClose, onResetAll, onNameChange,
  darkMode=false, onToggleDark,
  firebaseUser=null, isGuest=false, onSignOut=null,
  onLoadTestData=null, onDeleteAccount=null,
}) {
  const [showResetModal,  setShowResetModal]  = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep,      setDeleteStep]      = useState(1);
  const [deletePassword,  setDeletePassword]  = useState("");
  const [deleteError,     setDeleteError]     = useState("");
  const [deleting,        setDeleting]        = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [draftName,   setDraftName]   = useState(name||"");

  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(loadProfile);
  const [profileDraft, setProfileDraft] = useState({});

  // Apple/Google users don't have "password" as providerId
  const isEmailUser = firebaseUser?.providerData?.[0]?.providerId === "password";

  const openDeleteModal = () => {
    setDeleteStep(1);
    setDeletePassword("");
    setDeleteError("");
    setDeleting(false);
    setShowDeleteModal(true);
  };
  const closeDeleteModal = () => setShowDeleteModal(false);

  const saveNameEdit = () => {
    if (draftName.trim()) onNameChange(draftName.trim());
    setEditingName(false);
  };

  const openProfile = () => {
    setProfileDraft({ ...loadProfile() });
    setShowProfile(true);
  };
  const saveProfileEdit = () => {
    const updated = { ...profile, ...profileDraft };
    saveProfile(updated);
    setProfile(updated);
    // If display name changed, update dashboard greeting too
    if (profileDraft.displayName !== undefined) {
      const n = profileDraft.displayName.trim();
      if (n) onNameChange(n);
    }
    setShowProfile(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"fixed", inset:0, zIndex:Z_SHEET - 1,
        background:"rgba(0,0,0,0.4)",
      }}/>

      {/* Bottom sheet */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:Z_SHEET,
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
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:15, fontWeight:700, color:C.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {name || firebaseUser?.displayName || "Set your name"}
                </p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {firebaseUser?.email || firebaseUser?.phoneNumber || "Guest"}
                </p>
              </div>
              <div style={{ padding:"3px 9px", borderRadius:99, flexShrink:0, background: firebaseUser?"#F0FDF4":"#FFFBEB", border:`1px solid ${firebaseUser?"#86EFAC":"#FCD34D"}` }}>
                <p style={{ margin:0, fontSize:10, fontWeight:700, color: firebaseUser?C.green:"#D97706" }}>
                  {firebaseUser ? "☁ Synced" : "Local"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Edit Profile ── */}
          <Row icon="👤" label="Edit Profile" sublabel="Display name, date of birth, gender & more" onTap={openProfile}/>

          {/* ── Nickname (display name on dashboard) ── */}
          <Row icon="😊" label="Display Name" sublabel="Shown on your dashboard greeting" onTap={()=>{ setDraftName(name||""); setEditingName(true); }}>
            <p style={{ margin:0, fontSize:12, color:C.muted, maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name||"Add name"}</p>
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
            <Row icon="🧪" label="Load Test Data" sublabel="Fill app with realistic dummy data for testing" highlight onTap={()=>{ onLoadTestData(); onClose(); }}/>
          )}

          {/* ── Reset ── */}
          <Row icon="🗑" label="Reset All Data" sublabel="Delete all your data permanently" danger onTap={() => setShowResetModal(true)}/>

          {/* ── Delete Account — only for signed-in users ── */}
          {firebaseUser && onDeleteAccount && (
            <Row icon="⚠️" label="Delete Account" sublabel="Permanently delete your account and all data" danger onTap={openDeleteModal}/>
          )}

          {/* ── Sign out ── */}
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

      {/* ── Display Name edit modal ── */}
      {editingName && (
        <div onClick={()=>setEditingName(false)} style={{ position:"fixed", inset:0, zIndex:Z_MODAL, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end" }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#fff", borderRadius:"20px 20px 0 0",
            padding:"24px 20px", width:"100%",
            paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 24px)",
          }}>
            <p style={{ margin:"0 0 4px", fontSize:17, fontWeight:700, color:C.ink }}>Display Name</p>
            <p style={{ margin:"0 0 16px", fontSize:12, color:C.muted }}>Used for the greeting "Good morning, [name] 👋"</p>
            <input
              autoFocus value={draftName}
              onChange={e=>setDraftName(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter")saveNameEdit(); if(e.key==="Escape")setEditingName(false); }}
              placeholder="e.g. Puneeth"
              style={{ width:"100%", padding:"13px 14px", borderRadius:12, border:`1.5px solid ${C.blue}`, outline:"none", fontFamily:"inherit", fontSize:16, color:C.ink, boxSizing:"border-box", marginBottom:12 }}
            />
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setEditingName(false)} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${C.border}`, background:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:14, color:C.muted, fontWeight:600 }}>Cancel</button>
              <button onClick={saveNameEdit} style={{ flex:2, padding:"13px", borderRadius:12, border:"none", background:C.ink, cursor:"pointer", fontFamily:"inherit", fontSize:14, color:"#fff", fontWeight:700 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Profile modal ── */}
      {showProfile && (
        <div onClick={()=>setShowProfile(false)} style={{ position:"fixed", inset:0, zIndex:Z_MODAL, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end" }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#fff", borderRadius:"20px 20px 0 0",
            padding:"24px 20px", width:"100%",
            paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 24px)",
            maxHeight:"80vh", overflowY:"auto",
          }}>
            <p style={{ margin:"0 0 4px", fontSize:17, fontWeight:700, color:C.ink }}>Edit Profile</p>
            <p style={{ margin:"0 0 18px", fontSize:12, color:C.muted }}>All fields are optional</p>

            <ProfileField label="Display Name" placeholder="Name shown on dashboard"
              value={profileDraft.displayName ?? (name || firebaseUser?.displayName || "")}
              onChange={v=>setProfileDraft(p=>({...p,displayName:v}))}/>

            <ProfileField label="Date of Birth" type="date" placeholder=""
              value={profileDraft.dob ?? profile.dob ?? ""}
              onChange={v=>setProfileDraft(p=>({...p,dob:v}))}/>

            <ProfileSelect label="Gender"
              value={profileDraft.gender ?? profile.gender ?? ""}
              onChange={v=>setProfileDraft(p=>({...p,gender:v}))}
              options={["Male","Female","Non-binary","Prefer not to say"]}/>

            <ProfileSelect label="Marital Status"
              value={profileDraft.marital ?? profile.marital ?? ""}
              onChange={v=>setProfileDraft(p=>({...p,marital:v}))}
              options={["Single","Married","Divorced","Widowed","Prefer not to say"]}/>

            <ProfileSelect label="Education"
              value={profileDraft.education ?? profile.education ?? ""}
              onChange={v=>setProfileDraft(p=>({...p,education:v}))}
              options={["High School","Diploma","Bachelor's","Master's","PhD","Other","Prefer not to say"]}/>

            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={()=>setShowProfile(false)} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${C.border}`, background:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:14, color:C.muted, fontWeight:600 }}>Cancel</button>
              <button onClick={saveProfileEdit} style={{ flex:2, padding:"13px", borderRadius:12, border:"none", background:C.ink, cursor:"pointer", fontFamily:"inherit", fontSize:14, color:"#fff", fontWeight:700 }}>Save Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account modal — Step 1: Warning ── */}
      {showDeleteModal && deleteStep === 1 && (
        <div onClick={closeDeleteModal} style={{ position:"fixed", inset:0, zIndex:Z_MODAL, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"flex-end" }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#fff", borderRadius:"20px 20px 0 0",
            padding:"24px 20px", width:"100%",
            paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 24px)",
          }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
              <div style={{ width:56, height:56, borderRadius:99, background:"#FEF2F2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>⚠️</div>
            </div>
            <p style={{ margin:"0 0 8px", fontSize:18, fontWeight:700, color:C.red, textAlign:"center" }}>Delete Account?</p>
            <p style={{ margin:"0 0 12px", fontSize:13, color:C.ink, lineHeight:1.6, textAlign:"center" }}>
              This will <strong>permanently delete</strong> your account and all your data.
            </p>
            <div style={{ background:"#FEF2F2", borderRadius:12, padding:"12px 14px", marginBottom:20 }}>
              <p style={{ margin:0, fontSize:12, color:C.red, fontWeight:700, marginBottom:6 }}>
                ⚠️ All data will be lost and cannot be restored:
              </p>
              <p style={{ margin:0, fontSize:12, color:"#7F1D1D", lineHeight:1.8 }}>
                • All expenses and transactions<br/>
                • Savings goals and plans<br/>
                • Loan records<br/>
                • Account settings
              </p>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={closeDeleteModal} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${C.border}`, background:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:14, color:C.muted, fontWeight:600 }}>
                Cancel
              </button>
              <button onClick={()=>setDeleteStep(2)} style={{ flex:2, padding:"13px", borderRadius:12, border:"none", background:C.red, cursor:"pointer", fontFamily:"inherit", fontSize:14, color:"#fff", fontWeight:700 }}>
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account modal — Step 2: Confirm ── */}
      {showDeleteModal && deleteStep === 2 && (
        <div onClick={closeDeleteModal} style={{ position:"fixed", inset:0, zIndex:Z_MODAL, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"flex-end" }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#fff", borderRadius:"20px 20px 0 0",
            padding:"24px 20px", width:"100%",
            paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 24px)",
          }}>
            <p style={{ margin:"0 0 6px", fontSize:17, fontWeight:700, color:C.red }}>
              {isEmailUser ? "Confirm with Password" : "Final Confirmation"}
            </p>
            <p style={{ margin:"0 0 16px", fontSize:13, color:C.muted, lineHeight:1.5 }}>
              {isEmailUser
                ? "Enter your password to confirm. This cannot be undone."
                : "Your account and all data will be permanently deleted. This cannot be undone."}
            </p>
            {isEmailUser && (
              <>
                <input
                  autoFocus
                  type="password"
                  value={deletePassword}
                  onChange={e=>{ setDeletePassword(e.target.value); setDeleteError(""); }}
                  placeholder="Enter your password"
                  style={{ width:"100%", padding:"12px 14px", borderRadius:10,
                    border:`1.5px solid ${deleteError ? C.red : C.border}`, outline:"none",
                    fontFamily:"inherit", fontSize:15, color:C.ink,
                    boxSizing:"border-box", marginBottom:deleteError?6:16,
                  }}
                />
                {deleteError && (
                  <p style={{ margin:"0 0 12px", fontSize:12, color:C.red }}>{deleteError}</p>
                )}
              </>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setDeleteStep(1)} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${C.border}`, background:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:14, color:C.muted, fontWeight:600 }}>
                Back
              </button>
              <button
                disabled={deleting || (isEmailUser && !deletePassword.trim())}
                onClick={async () => {
                  setDeleting(true);
                  setDeleteError("");
                  try {
                    await onDeleteAccount(isEmailUser ? deletePassword : null);
                    setShowDeleteModal(false);
                    onClose();
                  } catch(e) {
                    setDeleteError(e?.message || "Deletion failed. Please try again.");
                    setDeleting(false);
                  }
                }}
                style={{ flex:2, padding:"13px", borderRadius:12, border:"none",
                  background: deleting || (isEmailUser && !deletePassword.trim()) ? "#D1D5DB" : C.red,
                  cursor: deleting || (isEmailUser && !deletePassword.trim()) ? "not-allowed" : "pointer",
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
        <div onClick={()=>setShowResetModal(false)} style={{ position:"fixed", inset:0, zIndex:Z_MODAL, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end" }}>
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

function ProfileField({ label, value, onChange, type="text", placeholder }) {
  return (
    <div style={{ marginBottom:14 }}>
      <p style={{ margin:"0 0 5px", fontSize:12, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:"0.4px" }}>{label}</p>
      <input
        type={type}
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width:"100%", padding:"11px 13px", borderRadius:10, border:`1.5px solid ${C.border}`,
          outline:"none", fontFamily:"inherit", fontSize:15, color:C.ink, boxSizing:"border-box",
          background:"#fff" }}
      />
    </div>
  );
}

function ProfileSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:14 }}>
      <p style={{ margin:"0 0 5px", fontSize:12, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:"0.4px" }}>{label}</p>
      <select
        value={value}
        onChange={e=>onChange(e.target.value)}
        style={{ width:"100%", padding:"11px 13px", borderRadius:10, border:`1.5px solid ${C.border}`,
          outline:"none", fontFamily:"inherit", fontSize:15, color: value ? C.ink : C.muted,
          boxSizing:"border-box", background:"#fff", appearance:"none",
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat:"no-repeat", backgroundPosition:"right 13px center",
        }}
      >
        <option value="">Select (optional)</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
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
