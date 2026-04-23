// ─── AuthScreen.jsx ───────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { OAuthProvider, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import {
  signInWithAppleREST, saveFirebaseSDKSession, saveSession,
  signUpWithEmail, signInWithEmail, saveEmailSDKSession, formatAuthError,
  loadFirestoreREST,
} from "./firebaseAuth";

function AppLogo({ size=80 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.22,
      overflow:"hidden", margin:"0 auto", flexShrink:0,
      boxShadow:"0 8px 28px rgba(37,99,235,0.3)" }}>
      <img src="/icon-512.png" alt="Money Coach"
        style={{ width:"100%", height:"100%", objectFit:"cover" }}
        onError={e=>{
          const p=e.target.parentNode;
          p.style.cssText=`width:${size}px;height:${size}px;border-radius:${size*0.22}px;background:linear-gradient(135deg,#1E40AF,#06B6D4);display:flex;align-items:center;justify-content:center`;
          e.target.remove();
          p.innerHTML=`<span style="font-size:${Math.round(size*0.44)}px;color:#fff;font-family:Georgia,serif;font-weight:700">₹</span>`;
        }}
      />
    </div>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="22" viewBox="0 0 814 1000" style={{flexShrink:0}}>
      <path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 790.7 0 694.3 0 603.3c0-9 0-18 .6-27.1 14.7-104.4 104.9-179.5 208.2-179.5 50.7 0 99.1 18.7 134.8 18.7 34.5 0 90.7-20.7 152.5-20.7 11.7 0 108.2 1.3 166.4 99.8zm-229-201.9c31.2-37.5 53.2-89.6 53.2-141.3 0-7.1-.6-14.3-1.9-20.1-50.1 1.9-109.6 33.4-145.8 75.8-28.5 32.4-55.1 83.9-55.1 136.3 0 7.7 1.3 15.5 1.9 18 3.2.6 8.4 1.3 13.6 1.3 44.1 0 98.7-29.2 133.8-69.1h.3z"/>
    </svg>
  );
}

// True only when running inside the Capacitor iOS native shell.
// On Android (TWA) and web, this is false — Apple Sign In native plugin
// is not available there, so we hide the button to avoid a browser popup.
const isCapacitorIOS = typeof window !== "undefined"
  && window.Capacitor?.getPlatform?.() === "ios";

// Global style injected once so auth screens hide scrollbars on all platforms
const AUTH_GLOBAL_CSS = `
  ::-webkit-scrollbar { display:none !important; }
  * { scrollbar-width:none !important; }
`;

export default function AuthScreen({ onGuest, onAuthSuccess }) {
  const [screen,     setScreen]    = useState("welcome");
  const [loading,    setLoading]   = useState(false);
  const [loadMsg,    setLoadMsg]   = useState("");
  const [error,      setError]     = useState("");
  const [emailMode,  setEmailMode] = useState("login");
  const [email,      setEmail]     = useState("");
  const [password,   setPassword]  = useState("");
  const [confirmPwd, setConfirmPwd]= useState("");
  const [name,       setName]      = useState("");
  const [kbVisible,  setKbVisible] = useState(false);

  // Detect keyboard on iOS so we hide the logo and save space
  useEffect(() => {
    const onResize = () => {
      const ratio = window.visualViewport
        ? window.visualViewport.height / window.screen.height
        : 1;
      setKbVisible(ratio < 0.75);
    };
    window.visualViewport?.addEventListener("resize", onResize);
    return () => window.visualViewport?.removeEventListener("resize", onResize);
  }, []);

  // Pick up Google redirect result when the app loads after redirect
  useEffect(() => {
    if (isCapacitorIOS) return; // iOS uses Apple, not Google redirect
    getRedirectResult(auth).then(async result => {
      if (!result?.user) return;
      startLoading("Signing you in...");
      try {
        await loadFirestoreREST(result.user.uid, await result.user.getIdToken());
        onAuthSuccess?.(result.user);
      } catch(e) {
        console.error("Google redirect result error:", e);
      }
      stopLoading();
    }).catch(() => {});
  }, []);

  const startLoading = (msg) => { setError(""); setLoading(true); setLoadMsg(msg); };
  const stopLoading  = ()    => { setLoading(false); setLoadMsg(""); };

  // ── Google Sign In — Android/web only ─────────────────────────────────────
  // Uses redirect (not popup) so it works correctly inside TWA on Android.
  // After redirect, getRedirectResult() picks up the result on return.
  const handleGoogle = async () => {
    startLoading("Signing in with Google...");
    try {
      const provider = new GoogleAuthProvider();
      // On Android TWA, signInWithRedirect navigates within Chrome (no new tab).
      // On web desktop, popup works fine but redirect is also safe there.
      await signInWithRedirect(auth, provider);
      // Execution continues after the user returns from the redirect.
      const result = await getRedirectResult(auth);
      if (result?.user) {
        await loadFirestoreREST(result.user.uid, await result.user.getIdToken());
        onAuthSuccess?.(result.user);
      }
      stopLoading();
    } catch(e) {
      console.error("Google error:", e.code, e.message);
      if (e.code !== "auth/cancelled-popup-request" && e.code !== "auth/popup-closed-by-user") {
        setError("Google sign-in failed. Please try email instead.");
      }
      stopLoading();
    }
  };

  // ── Apple Sign In ─────────────────────────────────────────────────────────
  const handleApple = async () => {
    startLoading("Signing in with Apple...");
    try {
      if (window.Capacitor?.Plugins?.SignInWithApple) {
        // Native iOS path — use Capacitor plugin + REST API
        // (Firebase SDK's signInWithCredential hangs on Capacitor because it
        //  uses "capacitor://localhost" as requestUri which Firebase rejects)
        const { SignInWithApple: Plugin } = window.Capacitor.Plugins;
        const rawNonce = Math.random().toString(36).substring(2, 15);
        const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawNonce));
        const hashedNonce = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2,"0")).join("");
        const res = await Plugin.authorize({
          clientId: "com.turings.moneycoach",
          scopes:   "email name",
          nonce:    hashedNonce,
        });
        if (!res?.response?.identityToken) throw new Error("No identity token");
        const data = await signInWithAppleREST(res.response.identityToken, rawNonce);

        // Apple sends name only on the VERY FIRST sign-in, inside the native
        // plugin response (res.response), NOT in the Firebase REST API reply.
        // On repeat sign-ins givenName/familyName are null — that's expected.
        const appleGiven  = res.response.givenName  || "";
        const appleFamily = res.response.familyName || "";
        const appleName   = [appleGiven, appleFamily].filter(Boolean).join(" ")
                            || data.displayName || null;

        saveFirebaseSDKSession({ ...data, displayName: appleName });
        saveSession(data);
        onAuthSuccess?.({
          uid:         data.localId,
          email:       data.email    || res.response.email || null,
          displayName: appleName,
          photoURL:    data.photoUrl || null,
        });
      } else {
        // Web fallback — Firebase SDK popup
        await persistenceReady;
        const provider = new OAuthProvider("apple.com");
        provider.addScope("email");
        provider.addScope("name");
        const result = await signInWithPopup(auth, provider);
        if (result?.user) onAuthSuccess?.(result.user);
      }
      stopLoading();
    } catch(e) {
      console.error("Apple error:", e.code, e.message);
      if (e.code !== "ERR_CANCELED" && e.code !== "auth/cancelled-popup-request") {
        setError(`Apple sign-in failed. Please try email instead.`);
      }
      stopLoading();
    }
  };

  // ── Email Login ───────────────────────────────────────────────────────────
  const handleEmailLogin = async () => {
    if (!email.trim() || !password) { setError("Enter your email and password"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email address"); return; }
    startLoading("Signing you in...");
    try {
      const data = await signInWithEmail(email.trim(), password);
      // Pre-load cloud data into localStorage BEFORE onAuthSuccess so
      // useAppData's useState initialiser finds the saved dashboard state.
      // This avoids depending on onAuthStateChanged firing (which races
      // with the StorageEvent on Capacitor WKWebView).
      await loadFirestoreREST(data.localId, data.idToken);
      saveSession(data);
      saveEmailSDKSession(data, data.displayName || null);
      onAuthSuccess?.({ uid: data.localId, email: data.email || null, displayName: data.displayName || null, photoURL: null });
      stopLoading();
    } catch(e) {
      console.error("Login error:", e.code, e.message);
      setError(e.message && !e.code ? e.message : formatAuthError(e.code));
      stopLoading();
    }
  };

  // ── Email Signup ──────────────────────────────────────────────────────────
  const handleEmailSignup = async () => {
    if (!name.trim())               { setError("Please enter your name"); return; }
    if (!email.trim() || !password) { setError("Enter your email and password"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email address"); return; }
    if (password.length < 6)        { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPwd)    { setError("Passwords don't match. Check and try again."); return; }
    startLoading("Creating your account...");
    try {
      const data = await signUpWithEmail(email.trim(), password);
      saveSession(data);
      saveEmailSDKSession(data, name.trim() || null);
      onAuthSuccess?.({ uid: data.localId, email: data.email || null, displayName: name.trim() || null, photoURL: null });
      stopLoading();
    } catch(e) {
      console.error("Signup error:", e.code, e.message);
      setError(e.message && !e.code ? e.message : formatAuthError(e.code));
      stopLoading();
    }
  };

  const inp = {
    width:"100%", padding:"11px 14px", borderRadius:10,
    border:"1.5px solid #E5E7EB", fontFamily:"inherit",
    fontSize:16, background:"#F8FAFC", outline:"none",
    marginBottom:10, boxSizing:"border-box",
    WebkitAppearance:"none",
  };

  // ── Welcome Screen ────────────────────────────────────────────────────────
  if (screen === "welcome") {
    return (
      <div style={{ position:"fixed", inset:0, overflowY:"scroll",
        WebkitOverflowScrolling:"touch", touchAction:"pan-y",
        fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        background:"linear-gradient(160deg,#0F172A 0%,#1E293B 60%,#0F172A 100%)" }}>
        <div style={{ maxWidth:420, margin:"0 auto", padding:"40px 24px", boxSizing:"border-box" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <AppLogo size={88}/>
            <h1 style={{ margin:"16px 0 6px", fontSize:28, fontWeight:800,
              color:"#F1F5F9", fontFamily:"Georgia,serif" }}>Money Coach</h1>
            <p style={{ margin:0, fontSize:13, color:"#64748B" }}>Track · Plan · Grow</p>
          </div>
          {[
            { icon:"💸", title:"Daily Expense Tracking",  desc:"Log expenses in seconds" },
            { icon:"💳", title:"Credit Card Smart Guide",  desc:"Know which card to use when" },
            { icon:"🏦", title:"Loan & EMI Tracker",       desc:"Track loans, close them faster" },
            { icon:"☁️", title:"Sync Across All Devices",  desc:"Login anywhere, data follows" },
          ].map((f,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:14,
              padding:"12px 16px", marginBottom:8,
              background:"rgba(255,255,255,0.05)", borderRadius:14,
              border:"1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{f.icon}</span>
              <div>
                <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#E2E8F0" }}>{f.title}</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:"#64748B" }}>{f.desc}</p>
              </div>
            </div>
          ))}
          <button onClick={()=>{ setError(""); setScreen("login"); }}
            style={{ width:"100%", padding:"16px", marginTop:20, borderRadius:16, border:"none",
              background:"linear-gradient(135deg,#2563EB,#1D4ED8)", color:"#fff",
              cursor:"pointer", fontFamily:"inherit", fontSize:16, fontWeight:800,
              boxShadow:"0 4px 20px rgba(37,99,235,0.4)", boxSizing:"border-box" }}>
            Get Started →
          </button>
          <p style={{ textAlign:"center", fontSize:11, color:"#334155", margin:"10px 0 0" }}>
            Free forever · No credit card needed
          </p>
        </div>
      </div>
    );
  }

  // ── Login Screen ──────────────────────────────────────────────────────────
  return (
    <div style={{ position:"fixed", inset:0, overflowY:"auto",
      WebkitOverflowScrolling:"touch",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      background:"linear-gradient(160deg,#0F172A 0%,#1E293B 60%,#0F172A 100%)" }}>
      <div style={{ minHeight:"100%", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"20px 20px 40px", boxSizing:"border-box" }}>
        <div style={{ width:"100%", maxWidth:400 }}>

          {!kbVisible && (
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <AppLogo size={60}/>
              <h2 style={{ margin:"12px 0 4px", fontSize:20, fontWeight:800,
                color:"#F1F5F9", fontFamily:"Georgia,serif" }}>Welcome back</h2>
              <p style={{ margin:0, fontSize:12, color:"#64748B" }}>
                Sign in to sync your data
              </p>
            </div>
          )}

          <div style={{ background:"#fff", borderRadius:20, padding:"20px",
            boxShadow:"0 12px 40px rgba(0,0,0,0.4)", boxSizing:"border-box" }}>

            {error && (
              <div style={{ background:"#FFF1F2", border:"1px solid #FECACA",
                borderRadius:10, padding:"10px 12px", marginBottom:12,
                fontSize:12, color:"#DC2626" }}>
                {error}
              </div>
            )}

            {loading ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <div style={{ width:32, height:32, borderRadius:"50%",
                  border:"3px solid #E5E7EB", borderTopColor:"#111827",
                  animation:"spin 0.8s linear infinite", margin:"0 auto 10px" }}/>
                <p style={{ margin:0, fontSize:13, color:"#6B7280" }}>{loadMsg}</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : (
              <>
                <style>{AUTH_GLOBAL_CSS}</style>

                {/* ── Sign in with Apple — iOS Capacitor only ── */}
                {/* Hidden on Android/web: native plugin unavailable there,   */}
                {/* falling back to signInWithPopup opens an external browser. */}
                {isCapacitorIOS && (
                  <>
                    <button onClick={handleApple}
                      style={{ width:"100%", padding:"14px 16px", borderRadius:14,
                        border:"none", background:"#000", color:"#fff",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                        cursor:"pointer", fontFamily:"inherit", fontSize:15, fontWeight:700,
                        marginBottom:16, boxSizing:"border-box" }}>
                      <AppleIcon/> Sign in with Apple
                    </button>

                    {/* ── Divider ── */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                      <div style={{ flex:1, height:1, background:"#E5E7EB" }}/>
                      <span style={{ fontSize:11, color:"#9CA3AF" }}>or sign in with email</span>
                      <div style={{ flex:1, height:1, background:"#E5E7EB" }}/>
                    </div>
                  </>
                )}

                {/* ── Google Sign In — Android & web only ── */}
                {!isCapacitorIOS && (
                  <>
                    <button onClick={handleGoogle}
                      style={{ width:"100%", padding:"13px 16px", borderRadius:14,
                        border:"1.5px solid #E5E7EB", background:"#fff", color:"#111827",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                        cursor:"pointer", fontFamily:"inherit", fontSize:15, fontWeight:700,
                        marginBottom:16, boxSizing:"border-box",
                        boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
                      {/* Google G logo */}
                      <svg width="18" height="18" viewBox="0 0 48 48" style={{flexShrink:0}}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      Sign in with Google
                    </button>

                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                      <div style={{ flex:1, height:1, background:"#E5E7EB" }}/>
                      <span style={{ fontSize:11, color:"#9CA3AF" }}>or sign in with email</span>
                      <div style={{ flex:1, height:1, background:"#E5E7EB" }}/>
                    </div>
                  </>
                )}

                {/* ── Sign In / Create Account toggle ── */}
                <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                  {[
                    { k:"login",  l:"Sign In" },
                    { k:"signup", l:"Create Account" },
                  ].map(t=>(
                    <button key={t.k} onClick={()=>{ setEmailMode(t.k); setError(""); }}
                      style={{ flex:1, padding:"8px", borderRadius:10,
                        border:`1.5px solid ${emailMode===t.k?"#2563EB":"#E5E7EB"}`,
                        background:emailMode===t.k?"#EFF6FF":"#fff",
                        color:emailMode===t.k?"#2563EB":"#6B7280",
                        fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      {t.l}
                    </button>
                  ))}
                </div>

                {emailMode==="signup" && (
                  <>
                    <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700,
                      color:"#6B7280", textTransform:"uppercase" }}>Your Name *</p>
                    <input type="text" value={name} onChange={e=>setName(e.target.value)}
                      placeholder="Enter your name" style={inp} autoComplete="name"/>
                  </>
                )}

                <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700,
                  color:"#6B7280", textTransform:"uppercase" }}>Email</p>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email" autoCapitalize="none" autoCorrect="off"
                  onKeyDown={e=>e.key==="Enter"&&emailMode==="login"&&handleEmailLogin()}
                  style={inp}/>

                <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700,
                  color:"#6B7280", textTransform:"uppercase" }}>Password</p>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder={emailMode==="login"?"Enter password":"Min 6 characters"}
                  autoComplete={emailMode==="login"?"current-password":"new-password"}
                  onKeyDown={e=>e.key==="Enter"&&emailMode==="login"&&handleEmailLogin()}
                  style={inp}/>

                {emailMode==="signup" && (
                  <>
                    <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700,
                      color:"#6B7280", textTransform:"uppercase" }}>Confirm Password</p>
                    <input type="password" value={confirmPwd}
                      onChange={e=>setConfirmPwd(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      onKeyDown={e=>e.key==="Enter"&&handleEmailSignup()}
                      style={{...inp, marginBottom:14}}/>
                  </>
                )}

                <button onClick={emailMode==="login"?handleEmailLogin:handleEmailSignup}
                  style={{ width:"100%", padding:"13px", borderRadius:12, border:"none",
                    background:"#111827", color:"#fff", fontFamily:"inherit",
                    fontSize:14, fontWeight:700, cursor:"pointer", marginTop:2,
                    boxSizing:"border-box" }}>
                  {emailMode==="login" ? "Sign In →" : "Create Account →"}
                </button>

                {/* ── Guest ── */}
                <div style={{ display:"flex", alignItems:"center", gap:10, margin:"14px 0 10px" }}>
                  <div style={{ flex:1, height:1, background:"#F1F5F9" }}/>
                  <span style={{ fontSize:11, color:"#9CA3AF" }}>or</span>
                  <div style={{ flex:1, height:1, background:"#F1F5F9" }}/>
                </div>
                <button onClick={onGuest}
                  style={{ width:"100%", padding:"12px", borderRadius:14,
                    border:"1.5px solid #F1F5F9", background:"#F8FAFC",
                    cursor:"pointer", fontFamily:"inherit", fontSize:13,
                    fontWeight:600, color:"#6B7280",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    boxSizing:"border-box" }}>
                  👤 Continue as Guest
                </button>
              </>
            )}
          </div>

          <div style={{ textAlign:"center", marginTop:14 }}>
            {!loading && (
              <button onClick={()=>setScreen("welcome")}
                style={{ background:"none", border:"none", color:"#475569",
                  cursor:"pointer", fontFamily:"inherit", fontSize:13,
                  display:"block", margin:"0 auto 6px" }}>← Back</button>
            )}
            <p style={{ fontSize:11, color:"#334155", margin:0 }}>
              By continuing you agree to our{" "}
              <a href="/privacy-policy.html" style={{ color:"#60A5FA", textDecoration:"none" }}>
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
