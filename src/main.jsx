// ─── main.jsx ────────────────────────────────────────────────────────────────
import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
    let resolved = false;

    // Aggressive timeout — show login after 3 seconds no matter what
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn("⏱ Auth timeout — forcing login screen");
        resolved = true;
        setUser(null);
      }
    }, 8000);

    // Listen for auth state — NO setPersistence (causes hang on iOS WKWebView)
    const unsub = onAuthStateChanged(auth, async u => {
      if (resolved && !u) return; // already timed out and no user
      clearTimeout(timeout);
      resolved = true;

      if (u) {
        try {
          const storedUid = localStorage.getItem("moneyCoachUID");
          if (storedUid !== u.uid) {
            localStorage.removeItem("moneyCoachData_v3");
            localStorage.removeItem("moneyCoachData_v2");
            localStorage.removeItem("moneyCoachData");
            localStorage.setItem("moneyCoachUID", u.uid);
          }
          setGuestMode(false);
          await registerUserProfile(u);
        } catch(e) {
          console.warn("Profile register error:", e);
        }
        setUser(u);
      } else {
        setUser(null);
      }
    });

    window._authUnsub = unsub;
    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  // Still checking
  if (user === undefined && !guestMode) return <LoadingScreen/>;

  // Not logged in
  if (!user && !guestMode) {
    return (
      <div className="auth-root">
        <AuthScreen onGuest={() => {
          localStorage.removeItem("moneyCoachUID");
          setGuestMode(true);
        }} />
      </div>
    );
  }

  // Logged in or guest
  return (
    <App
      firebaseUser={user || null}
      isGuest={guestMode}
      onSignOut={async () => {
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
