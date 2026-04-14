// ─── AuthScreen.jsx ───────────────────────────────────────────────────────────
// iOS (Capacitor): Apple Sign In only (Google popup blocked in WKWebView)
// Web/Android: Google + Apple + Guest
import { useState, useEffect } from "react";
import { auth } from "./firebase";
import {
  GoogleAuthProvider, signInWithPopup,
  OAuthProvider, signInWithCredential,
} from "firebase/auth";

// Detect native iOS app running in Capacitor
const isNativeIOS = !!(
  window.Capacitor?.isNativePlatform?.() ||
  window.webkit?.messageHandlers ||
  (navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")) &&
  !navigator.userAgent.includes("Chrome") &&
  window.navigator.standalone !== undefined
);

function AppLogo({ size=80 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:size*0.22,
      overflow:"hidden", margin:"0 auto",
      boxShadow:"0 8px 28px rgba(37,99,235,0.3)",
    }}>
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

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" style={{flexShrink:0}}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="22" viewBox="0 0 814 1000" style={{flexShrink:0}}>
      <path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 790.7 0 694.3 0 603.3c0-9 0-18 .6-27.1 14.7-104.4 104.9-179.5 208.2-179.5 50.7 0 99.1 18.7 134.8 18.7 34.5 0 90.7-20.7 152.5-20.7 11.7 0 108.2 1.3 166.4 99.8zm-229-201.9c31.2-37.5 53.2-89.6 53.2-141.3 0-7.1-.6-14.3-1.9-20.1-50.1 1.9-109.6 33.4-145.8 75.8-28.5 32.4-55.1 83.9-55.1 136.3 0 7.7 1.3 15.5 1.9 18 3.2.6 8.4 1.3 13.6 1.3 44.1 0 98.7-29.2 133.8-69.1h.3z"/>
    </svg>
  );
}

// ── Apple Sign In handler ─────────────────────────────────────────────────────
async function signInWithApple() {
  // Native iOS — use Capacitor Sign In With Apple plugin
  if (window.Capacitor?.Plugins?.SignInWithApple) {
    const { SignInWithApple: Plugin } = window.Capacitor.Plugins;
    const res = await Plugin.authorize({
      clientId:    "com.turingsxyz.moneycoach",
      redirectURI: "https://moneycoach-app.vercel.app",
      scopes:      "email name",
    });
    const provider   = new OAuthProvider("apple.com");
    const credential = provider.credential({ idToken: res.response.identityToken });
    return signInWithCredential(auth, credential);
  }
  // Web fallback — Firebase popup
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return signInWithPopup(auth, provider);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuthScreen({ onGuest }) {
  const [screen,  setScreen]  = useState("welcome");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleApple = async () => {
    setError(""); setLoading(true);
    try {
      await signInWithApple();
      // onAuthStateChanged in main.jsx handles navigation
    } catch(e) {
      console.error("Apple error:", e.code, e.message);
      if (e.code !== "ERR_CANCELED" && e.code !== "auth/cancelled-popup-request") {
        setError("Apple sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    // Only available on web/Android — never on native iOS
    if (isNativeIOS) return;
    setError(""); setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch(e) {
      console.error("Google error:", e.code);
      if (
        e.code !== "auth/popup-closed-by-user" &&
        e.code !== "auth/cancelled-popup-request"
      ) {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Welcome Screen ──────────────────────────────────────────────────────────
  if (screen === "welcome") {
    return (
      <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <div style={{ maxWidth:420, margin:"0 auto", padding:"32px 24px", boxSizing:"border-box" }}>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <AppLogo size={96}/>
            <h1 style={{ margin:"20px 0 6px", fontSize:30, fontWeight:800,
              color:"#F1F5F9", fontFamily:"Georgia,serif" }}>
              Money Coach
            </h1>
            <p style={{ margin:0, fontSize:14, color:"#64748B" }}>Track · Plan · Grow</p>
          </div>

          {[
            { icon:"💸", title:"Daily Expense Tracking",  desc:"Log expenses in seconds" },
            { icon:"💳", title:"Credit Card Smart Guide",  desc:"Know which card to use when" },
            { icon:"🏦", title:"Loan & EMI Tracker",       desc:"Track loans, close them faster" },
            { icon:"☁️", title:"Sync Across All Devices",  desc:"Login anywhere, data follows" },
          ].map((f,i)=>(
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:14,
              padding:"13px 16px", marginBottom:8,
              background:"rgba(255,255,255,0.05)", borderRadius:14,
              border:"1px solid rgba(255,255,255,0.08)",
            }}>
              <span style={{ fontSize:24, flexShrink:0 }}>{f.icon}</span>
              <div>
                <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#E2E8F0" }}>{f.title}</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:"#64748B" }}>{f.desc}</p>
              </div>
            </div>
          ))}

          <button
            onClick={()=>{ setError(""); setScreen("login"); }}
            style={{
              width:"100%", padding:"17px", marginTop:24, borderRadius:16, border:"none",
              background:"linear-gradient(135deg,#2563EB,#1D4ED8)",
              color:"#fff", cursor:"pointer", fontFamily:"inherit",
              fontSize:16, fontWeight:800,
              boxShadow:"0 4px 20px rgba(37,99,235,0.4)",
              boxSizing:"border-box",
            }}>
            Get Started →
          </button>
          <p style={{ textAlign:"center", fontSize:11, color:"#334155", margin:"10px 0 0" }}>
            Free forever · No credit card needed
          </p>
        </div>
      </div>
    );
  }

  // ── Login Screen ────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:420, margin:"0 auto", padding:"28px 24px 32px", boxSizing:"border-box" }}>

        <div style={{ textAlign:"center", marginBottom:28 }}>
          <AppLogo size={70}/>
          <h2 style={{ margin:"16px 0 4px", fontSize:22, fontWeight:800,
            color:"#F1F5F9", fontFamily:"Georgia,serif" }}>
            Welcome back
          </h2>
          <p style={{ margin:0, fontSize:13, color:"#64748B" }}>
            Sign in to sync your data across devices
          </p>
        </div>

        <div style={{
          background:"#fff", borderRadius:20, padding:"24px 20px",
          boxShadow:"0 12px 40px rgba(0,0,0,0.3)", boxSizing:"border-box",
        }}>
          {/* Error */}
          {error && (
            <div style={{
              background:"#FFF1F2", border:"1px solid #FECACA",
              borderRadius:10, padding:"10px 14px", marginBottom:16,
              fontSize:13, color:"#DC2626", textAlign:"center",
            }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <div style={{
                width:36, height:36, borderRadius:"50%",
                border:"3px solid #E5E7EB", borderTopColor:"#111827",
                animation:"spin 0.8s linear infinite",
                margin:"0 auto 12px",
              }}/>
              <p style={{ margin:0, fontSize:14, color:"#6B7280" }}>Signing you in...</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : (
            <>
              {/* Sign in with Apple — ALWAYS shown first (Apple requirement) */}
              <button onClick={handleApple} style={{
                width:"100%", padding:"15px 16px", borderRadius:14,
                border:"none", background:"#000",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                cursor:"pointer", fontFamily:"inherit",
                fontSize:15, fontWeight:700, color:"#fff",
                marginBottom:12, boxSizing:"border-box",
              }}>
                <AppleIcon/> Sign in with Apple
              </button>

              {/* Google — only on web/Android, hidden on native iOS */}
              {!isNativeIOS && (
                <button onClick={handleGoogle} style={{
                  width:"100%", padding:"15px 16px", borderRadius:14,
                  border:"1.5px solid #E5E7EB", background:"#fff",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                  cursor:"pointer", fontFamily:"inherit",
                  fontSize:15, fontWeight:700, color:"#111827",
                  marginBottom:12, boxSizing:"border-box",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
                }}>
                  <GoogleIcon/> Continue with Google
                </button>
              )}

              {/* Divider */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ flex:1, height:1, background:"#F1F5F9" }}/>
                <span style={{ fontSize:11, color:"#9CA3AF" }}>or</span>
                <div style={{ flex:1, height:1, background:"#F1F5F9" }}/>
              </div>

              {/* Guest */}
              <button onClick={onGuest} style={{
                width:"100%", padding:"14px", borderRadius:14,
                border:"1.5px solid #F1F5F9", background:"#F8FAFC",
                cursor:"pointer", fontFamily:"inherit",
                fontSize:14, fontWeight:600, color:"#6B7280",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                boxSizing:"border-box",
              }}>
                👤 Continue as Guest
              </button>
              <p style={{ textAlign:"center", fontSize:11, color:"#9CA3AF", margin:"8px 0 0" }}>
                Guest mode — data stays on this device only
              </p>
            </>
          )}
        </div>

        <div style={{ textAlign:"center", marginTop:18 }}>
          <button onClick={()=>setScreen("welcome")} style={{
            background:"none", border:"none", color:"#475569",
            cursor:"pointer", fontFamily:"inherit", fontSize:13,
            display:"block", margin:"0 auto 8px",
          }}>← Back</button>
          <p style={{ fontSize:11, color:"#334155", margin:0 }}>
            By continuing you agree to our{" "}
            <a href="/privacy-policy.html"
              style={{ color:"#60A5FA", textDecoration:"none" }}>
              Privacy Policy
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
