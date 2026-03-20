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

// ── Export ────────────────────────────────────────────────────────────────────
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
export default function SettingsPanel({ name, onClose, onResetAll, onNameChange }) {
  const [importStatus, setImportStatus] = useState(null); // null | "success" | string(error)
  const [exportDone,   setExportDone]   = useState(false);
  const [resetArmed,   setResetArmed]   = useState(false);
  const [editingName,  setEditingName]  = useState(false);
  const [draftName,    setDraftName]    = useState(name || "");
  const fileRef = useRef(null);

  const handleExport = () => {
    const ok = exportData();
    if (ok) { setExportDone(true); setTimeout(() => setExportDone(false), 3000); }
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

          {/* ── PROFILE ── */}
          <p style={{ margin:"16px 0 4px", fontSize:10, fontWeight:700, color:C.muted,
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

          {/* Export */}
          <SettingRow icon="📤" title="Export Backup"
            subtitle="Download all your data as a JSON file">
            <Btn
              label={exportDone ? "✓ Saved!" : "Export"}
              onClick={handleExport}
              variant={exportDone ? "primary" : "default"}
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

        </div>
      </div>
    </>
  );
}
