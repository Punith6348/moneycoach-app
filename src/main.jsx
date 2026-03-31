// ─── main.jsx ────────────────────────────────────────────────────────────────
import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import App from "./App.jsx";
import AuthScreen from "./AuthScreen.jsx";
import "./App.css";

// Fix blank space — body/html fill screen, content scrolls naturally
const globalStyle = document.createElement("style");
globalStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: #0F172A;
    overscroll-behavior: none;
    -webkit-text-size-adjust: 100%;
  }
  body { background: #0F172A; }
  #root { background: #0F172A; }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
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
      <div style={{
        minHeight:"100vh", background:"#0F172A",
        display:"flex", alignItems:"center", justifyContent:"center",
        flexDirection:"column", gap:16,
      }}>
        <div style={{
          width:56, height:56, borderRadius:14,
          background:"linear-gradient(135deg,#1E40AF,#0EA5E9)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:28, color:"#fff",
        }}>₹</div>
        <p style={{color:"#64748B", fontSize:13, margin:0}}>Loading...</p>
      </div>
    );
  }

  // Show login if not authenticated and not guest
  if (!user && !guestMode) {
    return <AuthScreen onGuest={() => setGuestMode(true)} />;
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
