// ─── main.jsx ────────────────────────────────────────────────────────────────
import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import App from "./App.jsx";
import AuthScreen from "./AuthScreen.jsx";
import "./App.css";

// Global reset
const globalStyle = document.createElement("style");
globalStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  html { margin:0; padding:0; height:100%; }
  body { margin:0; padding:0; min-height:100%; overscroll-behavior:none; -webkit-text-size-adjust:100%; }
  #root { min-height:100vh; min-height:100dvh; }
  .auth-root {
    position: fixed;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
    background: linear-gradient(160deg,#0F172A 0%,#1E293B 60%,#0F172A 100%);
    z-index: 9999;
  }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
  input[type=number] { -moz-appearance:textfield; }
`;
document.head.appendChild(globalStyle);

function Root() {
  const [user,        setUser]        = useState(undefined); // undefined=loading
  const [guestMode,   setGuestMode]   = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsub;
  }, []);

  // Loading spinner while Firebase checks auth
  if (user === undefined && !guestMode) {
    return (
      <div className="auth-root" style={{ display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
        <div style={{ width:64, height:64, borderRadius:16, overflow:"hidden", boxShadow:"0 8px 24px rgba(37,99,235,0.4)" }}>
          <img src="/icon-512.png" alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
            onError={e=>{e.target.parentNode.style.background="linear-gradient(135deg,#1E40AF,#06B6D4)";e.target.style.display="none";e.target.parentNode.innerHTML='<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;color:#fff;font-family:Georgia,serif;font-weight:700">₹</div>';}}
          />
        </div>
        <p style={{ color:"#64748B", fontSize:13, margin:0 }}>Loading...</p>
      </div>
    );
  }

  // Show login if not authenticated and not guest
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
      firebaseUser={user}
      isGuest={guestMode}
      onSignOut={async () => {
        if (user) await signOut(auth);
        setGuestMode(false);
        setUser(null);
      }}
    />
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
