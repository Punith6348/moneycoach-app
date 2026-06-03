// ─── main.jsx ────────────────────────────────────────────────────────────────
import { StrictMode, useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signOut, GoogleAuthProvider, reauthenticateWithPopup, reauthenticateWithCredential } from "firebase/auth";
import { auth, initPersistence } from "./firebase";
import { clearSession, deleteAccountREST, deleteFirestoreREST, signInWithEmail } from "./firebaseAuth";
import { registerUserProfile } from "./useFirestoreSync";
import App from "./App.jsx";
import AuthScreen from "./AuthScreen.jsx";
import "./App.css";

// Read cached Firebase user synchronously from localStorage.
// Firebase serialises the user under "firebase:authUser:<apiKey>:[DEFAULT]".
// Returns the plain data object (has .uid, .email, .displayName, etc.) or null.
function readCachedUser() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith("firebase:authUser:"));
    if (!key) return null;
    const d = JSON.parse(localStorage.getItem(key) || "{}");
    return d?.uid ? d : null;
  } catch { return null; }
}

const globalStyle = document.createElement("style");
globalStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  html { margin:0; padding:0; height:100%; overflow-x:hidden; touch-action:pan-y; }
  body { margin:0; padding:0; min-height:100%; overscroll-behavior:none; -webkit-text-size-adjust:100%; overflow-x:hidden; }
  #root { min-height:100dvh; width:100%; margin:0; padding:0; }
  img, svg, video { max-width:100%; }
  button, a, input, select, textarea { touch-action: manipulation; }
  .auth-root {
    position: fixed; inset: 0;
    overflow-y: scroll; overflow-x: hidden;
    -webkit-overflow-scrolling: touch; touch-action: pan-y;
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
  // Fix 1: initialise with cached user immediately — returning users skip the
  // loading screen entirely instead of waiting 12 s for Firebase to hydrate.
  const [user,      setUser]      = useState(() => readCachedUser() || undefined);
  const [guestMode, setGuestMode] = useState(false);
  // Fix 2: ref for the grace-period timer used to absorb transient null signals
  const nullTimerRef = useRef(null);

  useEffect(() => {
    initPersistence(); // fire-and-forget — runs in parallel with onAuthStateChanged

    // Only use a cold-start fallback for genuinely new sessions (no cached data).
    // Returning users already have a non-undefined initial state, so no spinner needed.
    const isNewSession = !readCachedUser();
    const fallback = isNewSession
      ? setTimeout(() => setUser(prev => prev === undefined ? null : prev), 4000)
      : null;

    const unsub = onAuthStateChanged(auth, u => {
      if (fallback) clearTimeout(fallback);

      if (u) {
        // Cancel any pending grace-period logout — token refresh succeeded
        if (nullTimerRef.current) { clearTimeout(nullTimerRef.current); nullTimerRef.current = null; }
        try {
          const storedUid = localStorage.getItem("moneyCoachUID");
          if (storedUid && storedUid !== u.uid) {
            localStorage.removeItem("moneyCoachData_v3");
            localStorage.removeItem("moneyCoachData_v2");
            localStorage.removeItem("moneyCoachData");
          }
          localStorage.setItem("moneyCoachUID", u.uid);
        } catch(_) {}
        setGuestMode(false);
        registerUserProfile(u).catch(() => {});
        setUser(u);
      } else {
        // Fix 2: Firebase fires null briefly on app resume during token refresh.
        // If the localStorage cache is still present the session is just refreshing —
        // wait 5 s before treating this as a real sign-out.
        if (readCachedUser()) {
          nullTimerRef.current = setTimeout(() => {
            nullTimerRef.current = null;
            if (!readCachedUser()) setUser(null); // cache gone → genuine sign-out
          }, 5000);
        } else {
          setUser(null); // no cache → genuine sign-out
        }
      }
    });

    return () => {
      if (fallback) clearTimeout(fallback);
      if (nullTimerRef.current) clearTimeout(nullTimerRef.current);
      unsub();
    };
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
          onAuthSuccess={(u) => {
            // If a different user signs in, wipe local data so they start clean.
            const prevUid = localStorage.getItem("moneyCoachUID");
            if (prevUid && prevUid !== u.uid) {
              localStorage.removeItem("moneyCoachData_v3");
              localStorage.removeItem("moneyCoachData_v2");
              localStorage.removeItem("moneyCoachData");
            }
            localStorage.setItem("moneyCoachUID", u.uid);
            setGuestMode(false);
            registerUserProfile(u).catch(() => {});
            setUser(u);
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
        try { if (auth.currentUser) await signOut(auth); } catch(e) {}
        setGuestMode(false);
        setUser(null);
      }}
      onDeleteAccount={async (password = null) => {
        // 1. Get idToken for Firestore + Auth deletion
        let idToken = null;
        try {
          if (password) {
            // Email users: re-auth via REST with password
            const email = localStorage.getItem("mc_email") || auth.currentUser?.email;
            if (!email) throw { message: "Could not find account email." };
            const data = await signInWithEmail(email, password);
            idToken = data.idToken;
          } else if (auth.currentUser) {
            const providerId = auth.currentUser.providerData?.[0]?.providerId;
            if (providerId === "google.com") {
              // Google users: use native plugin on Capacitor Android, popup on web
              if (window.Capacitor?.getPlatform?.() === "android") {
                const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
                await GoogleAuth.initialize({ clientId: "39662562896-1i4u083pnmt7tjgqled1posgmpmp269f.apps.googleusercontent.com", scopes: ["profile","email"] });
                const g = await GoogleAuth.signIn();
                const cred = GoogleAuthProvider.credential(g.authentication.idToken);
                const result = await reauthenticateWithCredential(auth.currentUser, cred);
                idToken = await result.user.getIdToken();
              } else {
                const result = await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider());
                idToken = await result.user.getIdToken();
              }
            } else {
              // Apple / other: try SDK token, fall back to cached mc_token
              try { idToken = await auth.currentUser.getIdToken(true); } catch(_) {}
              if (!idToken) idToken = localStorage.getItem("mc_token");
            }
          }
        } catch(e) {
          throw { message: e?.message || "Authentication failed. Please try again." };
        }
        if (!idToken) throw { message: "Could not authenticate. Please sign out and sign in again." };

        const uid = user?.uid || localStorage.getItem("moneyCoachUID");

        // 2. Delete Firestore data
        if (uid && idToken) {
          await deleteFirestoreREST(uid, idToken);
        }

        // 3. Delete Firebase Auth account
        if (idToken) {
          try { await deleteAccountREST(idToken); } catch(e) { console.warn("Auth delete:", e); }
        }

        // 4. Wipe all local storage
        localStorage.clear();

        // 5. Reset UI — fire-and-forget signOut, don't await it.
        // auth.signOut() can hang indefinitely in Capacitor WKWebView
        // (same issue as signInWithCredential). UI resets via setUser(null).
        signOut(auth).catch(() => {});
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
