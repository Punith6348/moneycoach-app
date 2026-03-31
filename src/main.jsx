// ─── main.jsx ────────────────────────────────────────────────────────────────
import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
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
  // undefined = still checking, null = not logged in, object = logged in
  const [user,      setUser]      = useState(undefined);
  const [guestMode, setGuestMode] = useState(false);
  const [checking,  setChecking]  = useState(true);

  useEffect(() => {
    // Step 1: Handle Google redirect result first (if returning from Google login)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          // User just came back from Google redirect — set them immediately
          setUser(result.user);
        }
      })
      .catch((err) => {
        console.warn("Redirect result error:", err);
      })
      .finally(() => {
        // Step 2: Then listen for ongoing auth state changes
        const unsub = onAuthStateChanged(auth, (u) => {
          setUser(u ?? null);
          setChecking(false);
        });
        // Store unsub for cleanup
        window._authUnsub = unsub;
      });

    return () => {
      if (window._authUnsub) window._authUnsub();
    };
  }, []);

  // Show loading while checking auth
  if (checking && !guestMode) {
    return (
      <div className="auth-root" style={{
        display:"flex", alignItems:"center",
        justifyContent:"center", flexDirection:"column", gap:16,
      }}>
        <div style={{
          width:72, height:72, borderRadius:18,
          overflow:"hidden", boxShadow:"0 8px 24px rgba(37,99,235,0.4)",
        }}>
          <img src="/icon-512.png" alt="Money Coach"
            style={{ width:"100%", height:"100%", objectFit:"cover" }}
            onError={e=>{
              const p = e.target.parentNode;
              p.style.background = "linear-gradient(135deg,#1E40AF,#06B6D4)";
              p.style.display = "flex";
              p.style.alignItems = "center";
              p.style.justifyContent = "center";
              e.target.style.display = "none";
              p.innerHTML += '<span style="font-size:32px;color:#fff;font-family:Georgia,serif;font-weight:700">₹</span>';
            }}
          />
        </div>
        <p style={{ color:"#64748B", fontSize:13, margin:0, fontFamily:"sans-serif" }}>
          Loading...
        </p>
      </div>
    );
  }

  // Not logged in and not guest — show auth screen
  if (!user && !guestMode) {
    return (
      <div className="auth-root">
        <AuthScreen onGuest={() => setGuestMode(true)} />
      </div>
    );
  }

  // Logged in or guest — show main app
  return (
    <App
      firebaseUser={user || null}
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
