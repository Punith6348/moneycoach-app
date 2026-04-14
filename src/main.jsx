// ─── main.jsx ────────────────────────────────────────────────────────────────
import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, getRedirectResult } from "firebase/auth";
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
  const [user,      setUser]      = useState(undefined); // undefined=checking
  const [guestMode, setGuestMode] = useState(false);
  const [redirectError, setRedirectError] = useState(null);

  useEffect(() => {
    // Handle Google redirect result (from signInWithRedirect)
    // This must run BEFORE onAuthStateChanged to catch the redirect
    getRedirectResult(auth)
      .then(result => {
        if (result?.user) {
          console.log("✅ Google redirect completed:", result.user.email);
          // onAuthStateChanged will handle setting user state below
        }
      })
      .catch(error => {
        console.error("Redirect result error:", error.code);
        // Don't show error for cancelled signin
        if (error.code && !error.code.includes("cancelled")) {
          setRedirectError(error.message || "Sign-in redirect failed");
          // Clear error after 5 seconds
          setTimeout(() => setRedirectError(null), 5000);
        }
      });
  }, []);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        const unsub = onAuthStateChanged(auth, async u => {
          if (u) {
            // Always check if localStorage belongs to this Google user
            const storedUid = localStorage.getItem("moneyCoachUID");
            
            if (storedUid !== u.uid) {
              // Different UID or no UID (was guest) — clear ALL local data
              console.log("🔄 New user detected, clearing local data:", storedUid, "->", u.uid);
              localStorage.removeItem("moneyCoachData_v3");
              localStorage.removeItem("moneyCoachData_v2");
              localStorage.removeItem("moneyCoachData");
              localStorage.setItem("moneyCoachUID", u.uid);
            }

            setGuestMode(false);
            await registerUserProfile(u);
            setUser(u);
          } else {
            setUser(null);
          }
        });
        window._authUnsub = unsub;
      })
      .catch(err => {
        console.warn("Persistence error:", err);
        const unsub = onAuthStateChanged(auth, async u => {
          if (u) {
            const storedUid = localStorage.getItem("moneyCoachUID");
            if (storedUid !== u.uid) {
              localStorage.removeItem("moneyCoachData_v3");
              localStorage.removeItem("moneyCoachData_v2");
              localStorage.removeItem("moneyCoachData");
              localStorage.setItem("moneyCoachUID", u.uid);
            }
            setGuestMode(false);
            await registerUserProfile(u);
            setUser(u);
          } else {
            setUser(null);
          }
        });
        window._authUnsub = unsub;
      });

    return () => { if (window._authUnsub) window._authUnsub(); };
  }, []);

  // Still checking
  if (user === undefined && !guestMode) return <LoadingScreen/>;

  // Not logged in
  if (!user && !guestMode) {
    return (
      <div className="auth-root">
        {redirectError && (
          <div style={{
            position:"fixed", top:20, left:20, right:20, zIndex:10000,
            background:"#FEE2E2", border:"1px solid #FECACA", borderRadius:12,
            padding:"12px 16px", fontSize:13, color:"#DC2626", fontWeight:600,
          }}>
            ⚠️ {redirectError}
          </div>
        )}
        <AuthScreen onGuest={() => {
          // Clear any previous user data when entering guest mode
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
