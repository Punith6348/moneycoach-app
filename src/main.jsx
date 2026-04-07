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
      <p style={{ color:"#64748B", fontSize:13, margin:0, fontFamily:"sans-serif" }}>Signing you in...</p>
    </div>
  );
}

function Root() {
  // undefined = still checking auth
  // null = checked, not logged in
  // object = logged in user
  const [user,        setUser]        = useState(undefined);
  const [guestMode,   setGuestMode]   = useState(false);
  const [redirectDone, setRedirectDone] = useState(false);

  useEffect(() => {
    // Step 1 — Handle redirect result first (user returning from Google)
    getRedirectResult(auth)
      .then(async result => {
        if (result?.user) {
          // User just signed in via redirect — register profile and set user
          console.log("✅ Google redirect success:", result.user.email);
          await registerUserProfile(result.user);
          setUser(result.user);
        }
      })
      .catch(err => {
        if (err.code !== "auth/no-auth-event") {
          console.warn("Redirect result error:", err.code);
        }
      })
      .finally(() => {
        // Mark redirect check as done — now safe to use auth state
        setRedirectDone(true);
      });
  }, []);

  useEffect(() => {
    // Step 2 — Only start auth listener AFTER redirect result is handled
    // This prevents race condition where null fires before redirect resolves
    if (!redirectDone) return;

    const unsub = onAuthStateChanged(auth, async u => {
      console.log("Auth state:", u?.email || u?.phoneNumber || "null");
      if (u) {
        await registerUserProfile(u);
        setUser(u);
      } else {
        // Only set null if we haven't already set a user from redirect
        setUser(prev => {
          // Keep existing user if we already set one from redirect
          if (prev && prev.uid) return prev;
          return null;
        });
      }
    });

    return () => unsub();
  }, [redirectDone]);

  // Show loading while checking auth state
  if (user === undefined && !guestMode) return <LoadingScreen/>;

  // Show auth screen if not logged in
  if (!user && !guestMode) {
    return (
      <div className="auth-root">
        <AuthScreen onGuest={() => setGuestMode(true)} />
      </div>
    );
  }

  // Show main app
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
