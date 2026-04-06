// ─── main.jsx ────────────────────────────────────────────────────────────────
import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
import { auth } from "./firebase";
import { registerUserProfile } from "./useFirestoreSync";
import App from "./App.jsx";
import AuthScreen from "./AuthScreen.jsx";
import "./App.css";

const globalStyle = document.createElement("style");
globalStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  html { margin:0; padding:0; height:100%; }
  body { margin:0; padding:0; min-height:100%; overscroll-behavior:none; -webkit-text-size-adjust:100%; }
  #root { min-height:100vh; min-height:100dvh; }
  .auth-root {
    position: fixed; inset: 0;
    overflow-y: auto; overflow-x: hidden;
    background: linear-gradient(160deg,#0F172A 0%,#1E293B 60%,#0F172A 100%);
    z-index: 9999;
  }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
  input[type=number] { -moz-appearance:textfield; }
`;
document.head.appendChild(globalStyle);

function LoadingScreen() {
  return (
    <div className="auth-root" style={{ display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ width:72, height:72, borderRadius:18, overflow:"hidden", boxShadow:"0 8px 24px rgba(37,99,235,0.4)" }}>
        <img src="/icon-512.png" alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
          onError={e=>{ const p=e.target.parentNode; p.style.cssText="background:linear-gradient(135deg,#1E40AF,#06B6D4);display:flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:18px"; e.target.remove(); p.innerHTML='<span style="font-size:32px;color:#fff;font-family:Georgia,serif;font-weight:700">₹</span>'; }}
        />
      </div>
      <p style={{ color:"#64748B", fontSize:13, margin:0, fontFamily:"sans-serif" }}>Loading...</p>
    </div>
  );
}

function Root() {
  const [user,      setUser]      = useState(undefined);
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    let unsub = null;

    // FIRST: Handle Google redirect result
    // This must complete before setting up auth listener
    getRedirectResult(auth)
      .then(result => {
        if (result?.user) {
          console.log("✅ Google redirect success:", result.user.email);
        }
      })
      .catch(err => {
        // Ignore no-auth-event errors (normal on first load)
        if (err.code !== "auth/no-auth-event") {
          console.warn("Redirect error:", err.code);
        }
      })
      .finally(() => {
        // THEN: Listen for auth state changes
        unsub = onAuthStateChanged(auth, async u => {
          console.log("Auth state:", u?.email || u?.phoneNumber || "null");
          if (u) await registerUserProfile(u);
          setUser(u ?? null);
        });
      });

    return () => { if (unsub) unsub(); };
  }, []);

  if (user === undefined && !guestMode) return <LoadingScreen/>;

  if (!user && !guestMode) {
    return (
      <div className="auth-root">
        <AuthScreen onGuest={() => setGuestMode(true)} />
      </div>
    );
  }

  return (
    <App
      firebaseUser={user || null}
      isGuest={guestMode}
      onSignOut={async () => {
        // Clear local data before signing out
        localStorage.removeItem("moneyCoachData_v3");
        localStorage.removeItem("moneyCoachUID");
        if (user) await signOut(auth);
        setGuestMode(false);
        setUser(null);
      }}
    />
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode><Root/></StrictMode>
);
