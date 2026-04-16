// ─── main.jsx ────────────────────────────────────────────────────────────────
import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { clearSession } from "./firebaseAuth";
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
`;
document.head.appendChild(globalStyle);

function LoadingScreen() {
  return (
    <div className="auth-root" style={{ display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ width:72, height:72, borderRadius:18, overflow:"hidden", boxShadow:"0 8px 24px rgba(37,99,235,0.4)" }}>
        <img src="/icon-512.png" alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
          onError={e=>{
            const p=e.target.parentNode;
            p.style.cssText="background:linear-gradient(135deg,#1E40AF,#06B6D4);display:flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:18px";
            e.target.remove();
            p.innerHTML='<span style="font-size:32px;color:#fff;font-family:Georgia,serif;font-weight:700">₹</span>';
          }}
        />
      </div>
      <p style={{ color:"#64748B", fontSize:13, margin:0, fontFamily:"sans-serif" }}>Loading...</p>
    </div>
  );
}

function Root() {
  const [user,      setUser]      = useState(undefined); // undefined = still checking
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    // Timeout — show login after 8s if Firebase doesn't respond
    const timeout = setTimeout(() => {
      setUser(prev => prev === undefined ? null : prev);
    }, 8000);

    // Firebase SDK auth listener — handles Google, Apple, and Email/Password
    let unsub;
    unsub = onAuthStateChanged(auth, u => {
      clearTimeout(timeout);
      if (u) {
        const storedUid = localStorage.getItem("moneyCoachUID");
        if (storedUid && storedUid !== u.uid) {
          // Different user — clear previous user's local data
          localStorage.removeItem("moneyCoachData_v3");
          localStorage.removeItem("moneyCoachData_v2");
          localStorage.removeItem("moneyCoachData");
        }
        localStorage.setItem("moneyCoachUID", u.uid);
        setGuestMode(false);
        registerUserProfile(u).catch(() => {}); // save email/name to Firestore; non-blocking
        setUser(u);
      } else {
        setUser(null);
      }
    });

    return () => { clearTimeout(timeout); if (unsub) unsub(); };
  }, []);

  if (user === undefined && !guestMode) return <LoadingScreen/>;

  if (!user && !guestMode) {
    return (
      <div className="auth-root">
        <AuthScreen
          onGuest={() => {
            localStorage.removeItem("moneyCoachUID");
            setGuestMode(true);
          }}
        />
      </div>
    );
  }

  return (
    <App
      firebaseUser={user || null}
      isGuest={guestMode}
      onSignOut={async () => {
        clearSession();
        localStorage.removeItem("moneyCoachData_v3");
        localStorage.removeItem("moneyCoachUID");
        try { if (auth.currentUser) await signOut(auth); } catch(e) {}
        setGuestMode(false);
        setUser(null);
      }}
    />
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root/>
  </StrictMode>
);
