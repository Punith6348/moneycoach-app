// ─── SettingsPanel.jsx ───────────────────────────────────────────────────────
// Slide-in settings drawer. Contains:
//   • Profile: edit name
//   • Data: export JSON, import JSON, reset all
// Replaces the raw Reset button in both headers.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from "react";

const C = {
  ink:"#111827", muted:"#6B7280", border:"#E5E7EB", bg:"#F8FAFC",
  red:"#DC2626", green:"#16A34A", blue:"#2563EB",
};
const STORAGE_KEY = "moneyCoachData_v3";

// ── Export JSON ───────────────────────────────────────────────────────────────
function exportData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const date = new Date().toISOString().split("T")[0];
  const blob = new Blob([raw], { type:"application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `moneycoach-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCSV() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    const allExp = data.allExpenses || {};
    const rows = [["Date","Month","Category","Note","Amount (₹)"]];
    Object.entries(allExp)
      .sort((a,b)=>b[0].localeCompare(a[0]))
      .forEach(([monthKey, expenses]) => {
        const monthLabel = new Date(monthKey+"-01").toLocaleDateString("en-IN",{month:"long",year:"numeric"});
        (expenses||[])
          .sort((a,b)=>new Date(b.date)-new Date(a.date))
          .forEach(e => {
            const d = new Date(e.date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
            rows.push([d, monthLabel, e.label, e.note||"", e.amount]);
          });
      });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const date = new Date().toISOString().split("T")[0];
    const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `moneycoach-expenses-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch { return false; }
}

// ── Import ────────────────────────────────────────────────────────────────────
function importData(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      // Basic validation: must have screen field
      if (!parsed || typeof parsed !== "object" || !parsed.screen) {
        onError("Invalid backup file. Please use a file exported from Money Coach.");
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      onSuccess();
    } catch {
      onError("Could not read the file. Make sure it is a valid Money Coach backup.");
    }
  };
  reader.readAsText(file);
}

// ── Row component ─────────────────────────────────────────────────────────────
function SettingRow({ icon, title, subtitle, children }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"12px 0", borderBottom:`1px solid ${C.border}`, gap:12,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0 }}>
        <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
        <div style={{ minWidth:0 }}>
          <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.ink }}>{title}</p>
          {subtitle && <p style={{ margin:"1px 0 0", fontSize:11, color:C.muted, lineHeight:1.4 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );
}

function Btn({ label, onClick, variant = "default" }) {
  const styles = {
    default: { bg:"#fff",    border:`1px solid ${C.border}`, color:C.ink  },
    primary: { bg:C.blue,   border:`1px solid ${C.blue}`,   color:"#fff" },
    danger:  { bg:"#FFF1F2", border:"1px solid #FCA5A5",     color:C.red  },
    confirm: { bg:C.red,    border:`1px solid ${C.red}`,    color:"#fff" },
  }[variant];
  return (
    <button onClick={onClick} style={{
      padding:"6px 14px", borderRadius:8, cursor:"pointer",
      fontFamily:"inherit", fontSize:12, fontWeight:600,
      background:styles.bg, border:styles.border, color:styles.color,
      transition:"opacity 0.12s", whiteSpace:"nowrap",
    }}>
      {label}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default function SettingsPanel({ name, onClose, onResetAll, onNameChange, darkMode = false, onToggleDark, firebaseUser = null, isGuest = false, onSignOut = null }) {
  const [importStatus, setImportStatus] = useState(null);
  const [exportDone,   setExportDone]   = useState(false);
  const [csvDone,      setCsvDone]      = useState(false);
  const [resetArmed,   setResetArmed]   = useState(false);
  const [editingName,  setEditingName]  = useState(false);
  const [draftName,    setDraftName]    = useState(name || "");
  const fileRef = useRef(null);

  const handleExport = () => {
    const ok = exportData();
    if (ok) { setExportDone(true); setTimeout(() => setExportDone(false), 3000); }
  };

  const handleExportCSV = () => {
    const ok = exportCSV();
    if (ok) { setCsvDone(true); setTimeout(() => setCsvDone(false), 3000); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importData(
      file,
      () => { setImportStatus("success"); setTimeout(() => window.location.reload(), 1200); },
      (err) => { setImportStatus(err); }
    );
    e.target.value = "";
  };

  const handleReset = () => {
    if (!resetArmed) { setResetArmed(true); return; }
    onResetAll();
    onClose();
  };

  const saveNameEdit = () => {
    onNameChange(draftName.trim());
    setEditingName(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.35)",
      }} />

      {/* Panel */}
      <div style={{
        position:"fixed", top:0, right:0, bottom:0, zIndex:1001,
        width:"min(360px, 92vw)",
        background:"#fff", boxShadow:"-4px 0 32px rgba(0,0,0,0.14)",
        display:"flex", flexDirection:"column",
        animation:"slideInRight 0.22s ease",
      }}>
        <style>{`
          @keyframes slideInRight {
            from { transform:translateX(100%); opacity:0.6; }
            to   { transform:translateX(0);    opacity:1;   }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 18px", borderBottom:`1px solid ${C.border}`,
        }}>
          <p style={{ margin:0, fontSize:16, fontWeight:700, color:C.ink }}>⚙️ Settings</p>
          <button onClick={onClose} style={{
            background:"none", border:"none", fontSize:22,
            cursor:"pointer", color:C.muted, lineHeight:1, padding:4,
          }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 18px 24px" }}>

          {/* ── PREFERENCES ── */}
          <p style={{ margin:"20px 0 4px", fontSize:10, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"1px" }}>Preferences</p>

          <SettingRow icon="🌙" title="Dark Mode"
            subtitle="Easier on eyes at night">
            <button onClick={() => onToggleDark && onToggleDark(!darkMode)} style={{
              width:44, height:24, borderRadius:99, border:"none", cursor:"pointer",
              background: darkMode ? "#2563EB" : "#D1D5DB",
              position:"relative", transition:"background 0.2s", flexShrink:0,
            }}>
              <div style={{
                position:"absolute", top:2, left: darkMode ? 22 : 2,
                width:20, height:20, borderRadius:99, background:"#fff",
                transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
              }}/>
            </button>
          </SettingRow>

          {/* ── PROFILE ── */}
          <p style={{ margin:"20px 0 4px", fontSize:10, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"1px" }}>Profile</p>

          <SettingRow icon="👤" title="Your Name"
            subtitle={name ? `Currently: ${name}` : "Not set"}>
            {editingName ? (
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <input
                  autoFocus
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onKeyDown={e => { if(e.key==="Enter") saveNameEdit(); if(e.key==="Escape") setEditingName(false); }}
                  placeholder="Your name"
                  style={{
                    padding:"5px 8px", borderRadius:7, fontSize:12,
                    border:`1.5px solid ${C.blue}`, outline:"none",
                    fontFamily:"inherit", width:100,
                  }}
                />
                <Btn label="✓" onClick={saveNameEdit} variant="primary" />
              </div>
            ) : (
              <Btn label="Edit" onClick={() => { setDraftName(name||""); setEditingName(true); }} />
            )}
          </SettingRow>

          {/* ── DATA ── */}
          <p style={{ margin:"20px 0 4px", fontSize:10, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"1px" }}>Data</p>

          {/* Export JSON */}
          <SettingRow icon="📤" title="Export Backup"
            subtitle="Download all your data as a JSON file">
            <Btn
              label={exportDone ? "✓ Saved!" : "Export"}
              onClick={handleExport}
              variant={exportDone ? "primary" : "default"}
            />
          </SettingRow>

          {/* Export CSV */}
          <SettingRow icon="📊" title="Export to Excel / CSV"
            subtitle="Download expenses as a spreadsheet">
            <Btn
              label={csvDone ? "✓ Downloaded!" : "CSV"}
              onClick={handleExportCSV}
              variant={csvDone ? "primary" : "default"}
            />
          </SettingRow>

          {/* Import */}
          <SettingRow icon="📥" title="Import Backup"
            subtitle="Restore from a previous backup file">
            <input
              ref={fileRef} type="file" accept=".json"
              onChange={handleFileChange}
              style={{ display:"none" }}
            />
            <Btn label="Import" onClick={() => fileRef.current?.click()} />
          </SettingRow>

          {/* Import status message */}
          {importStatus && (
            <div style={{
              marginTop:6, padding:"8px 12px", borderRadius:8, fontSize:11,
              background: importStatus==="success" ? "#F0FDF4" : "#FFF1F2",
              border: `1px solid ${importStatus==="success" ? "#86EFAC" : "#FECACA"}`,
              color: importStatus==="success" ? C.green : C.red,
            }}>
              {importStatus==="success"
                ? "✓ Import successful — reloading..."
                : `⚠ ${importStatus}`}
            </div>
          )}

          {/* Reset */}
          <SettingRow icon="🗑" title="Reset All Data"
            subtitle={resetArmed ? "⚠ This cannot be undone. Tap again to confirm." : "Permanently delete all data"}>
            <Btn
              label={resetArmed ? "Confirm Reset" : "Reset"}
              onClick={handleReset}
              variant={resetArmed ? "confirm" : "danger"}
            />
          </SettingRow>

          {/* Info */}
          <div style={{
            marginTop:20, padding:"10px 12px", borderRadius:10,
            background:C.bg, border:`1px solid ${C.border}`,
          }}>
            <p style={{ margin:0, fontSize:11, color:C.muted, lineHeight:1.6 }}>
              💡 <strong>Tip:</strong> Export a backup before resetting or switching devices. Your data is stored only on this device and browser.
            </p>
          </div>

          {/* ── ACCOUNT ── */}
          <p style={{ margin:"20px 0 4px", fontSize:10, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"1px" }}>Account</p>

          {firebaseUser && (
            <SettingRow icon="👤" title={firebaseUser.displayName || firebaseUser.phoneNumber || "Signed in"}
              subtitle={firebaseUser.email || "Phone login"}>
              <Btn label="Sign Out" onClick={async () => { onClose(); onSignOut && await onSignOut(); }} variant="danger"/>
            </SettingRow>
          )}

          {isGuest && (
            <SettingRow icon="👤" title="Guest Mode"
              subtitle="Sign in to sync data across devices">
              <Btn label="Sign In" onClick={() => { onClose(); onSignOut && onSignOut(); }} variant="primary"/>
            </SettingRow>
          )}

          {/* Cloud sync status */}
          <div style={{
            marginTop:8, padding:"10px 12px", borderRadius:10,
            background: firebaseUser ? "#F0FDF4" : "#FFFBEB",
            border: `1px solid ${firebaseUser ? "#86EFAC" : "#FCD34D"}`,
          }}>
            <p style={{ margin:0, fontSize:11, color: firebaseUser ? C.green : "#D97706", lineHeight:1.6 }}>
              {firebaseUser
                ? "✓ Cloud sync ON — your data is backed up automatically"
                : "⚠ Guest mode — data is only on this device. Sign in to enable cloud sync."}
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
