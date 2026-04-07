// ─── AuthScreen.jsx — Google popup (works everywhere) ────────────────────────
import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

function AppLogo({ size=80 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.25, overflow:"hidden", margin:"0 auto", boxShadow:"0 8px 24px rgba(37,99,235,0.35)" }}>
      <img src="/icon-512.png" alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
        onError={e=>{ const p=e.target.parentNode; p.style.cssText=`width:${size}px;height:${size}px;border-radius:${size*0.25}px;background:linear-gradient(135deg,#1E40AF,#06B6D4);display:flex;align-items:center;justify-content:center`; e.target.remove(); p.innerHTML=`<span style="font-size:${Math.round(size*0.44)}px;color:#fff;font-family:Georgia,serif;font-weight:700">₹</span>`; }}
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

export default function AuthScreen({ onGuest }) {
  const [screen,  setScreen]  = useState("welcome");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      // signInWithPopup — works on all platforms
      // onAuthStateChanged in main.jsx will detect the new user automatically
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Google popup success:", result.user.email);
      // No need to do anything — onAuthStateChanged handles navigation
    } catch(e) {
      console.error("Google error:", e.code, e.message);
      if (e.code === "auth/popup-closed-by-user" ||
          e.code === "auth/cancelled-popup-request") {
        // User closed popup — just reset
        setError("");
      } else if (e.code === "auth/popup-blocked") {
        setError("Popup was blocked. Please allow popups for this site and try again.");
      } else {
        setError(`Sign-in failed (${e.code}). Please try again.`);
      }
      setLoading(false);
    }
  };

  // Welcome screen
  if (screen === "welcome") {
    return (
      <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <div style={{ maxWidth:420, margin:"0 auto", padding:"28px 20px 32px", boxSizing:"border-box" }}>
          <div style={{ textAlign:"center", paddingTop:8, marginBottom:32 }}>
            <AppLogo size={92}/>
            <h1 style={{ margin:"18px 0 6px", fontSize:30, fontWeight:800, color:"#F1F5F9", fontFamily:"Georgia,serif" }}>Money Coach</h1>
            <p style={{ margin:0, fontSize:14, color:"#64748B" }}>Track · Plan · Grow</p>
          </div>
          <div style={{ marginBottom:28 }}>
            {[
              { icon:"💸", title:"Daily Expense Tracking", desc:"Log every expense in seconds" },
              { icon:"📊", title:"Smart Budgets & Loans",  desc:"Set limits, track EMIs" },
              { icon:"☁️", title:"Sync Across Devices",    desc:"Login anywhere, data follows" },
              { icon:"🔒", title:"100% Private",           desc:"Your data, never shared" },
            ].map((f,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", marginBottom:8, background:"rgba(255,255,255,0.05)", borderRadius:14, border:"1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize:24, flexShrink:0 }}>{f.icon}</span>
                <div>
                  <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#E2E8F0" }}>{f.title}</p>
                  <p style={{ margin:"2px 0 0", fontSize:11, color:"#64748B" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={()=>{ setError(""); setScreen("login"); }} style={{ width:"100%", padding:"16px", borderRadius:16, border:"none", background:"linear-gradient(135deg,#2563EB,#1D4ED8)", color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:16, fontWeight:800, boxShadow:"0 4px 20px rgba(37,99,235,0.4)", marginBottom:10, boxSizing:"border-box" }}>
            Get Started →
          </button>
          <p style={{ textAlign:"center", fontSize:11, color:"#334155", margin:0 }}>Free forever · No credit card needed</p>
        </div>
      </div>
    );
  }

  // Login screen
  return (
    <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:420, margin:"0 auto", padding:"28px 20px 32px", boxSizing:"border-box" }}>

        <div style={{ textAlign:"center", paddingTop:8, marginBottom:28 }}>
          <AppLogo size={68}/>
          <h2 style={{ margin:"14px 0 4px", fontSize:22, fontWeight:800, color:"#F1F5F9", fontFamily:"Georgia,serif" }}>Welcome back</h2>
          <p style={{ margin:0, fontSize:13, color:"#64748B" }}>Sign in to sync your data</p>
        </div>

        <div style={{ background:"#fff", borderRadius:20, padding:"24px 20px", boxShadow:"0 12px 40px rgba(0,0,0,0.35)", boxSizing:"border-box" }}>

          {error && (
            <div style={{ background:"#FFF1F2", border:"1px solid #FECACA", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#DC2626", textAlign:"center" }}>
              {error}
            </div>
          )}

          <button onClick={handleGoogle} disabled={loading} style={{
            width:"100%", padding:"15px 16px", borderRadius:14,
            border:"1.5px solid #E5E7EB", background:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            cursor: loading ? "default" : "pointer",
            fontFamily:"inherit", fontSize:15, fontWeight:700, color:"#111827",
            marginBottom:16, boxSizing:"border-box",
            boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
            opacity: loading ? 0.7 : 1,
          }}>
            <GoogleIcon/>
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ flex:1, height:1, background:"#F1F5F9" }}/>
            <span style={{ fontSize:11, color:"#9CA3AF" }}>or</span>
            <div style={{ flex:1, height:1, background:"#F1F5F9" }}/>
          </div>

          <button onClick={onGuest} disabled={loading} style={{
            width:"100%", padding:"14px", borderRadius:14,
            border:"1.5px solid #F1F5F9", background:"#F8FAFC",
            cursor:"pointer", fontFamily:"inherit", fontSize:14,
            fontWeight:600, color:"#6B7280",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            boxSizing:"border-box",
          }}>
            👤 Continue as Guest
          </button>
          <p style={{ textAlign:"center", fontSize:11, color:"#9CA3AF", margin:"8px 0 0" }}>
            Guest mode — data stays on this device only
          </p>
        </div>

        <div style={{ textAlign:"center", marginTop:16 }}>
          <button onClick={()=>setScreen("welcome")} style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontFamily:"inherit", fontSize:13, display:"block", margin:"0 auto 8px" }}>← Back</button>
          <p style={{ fontSize:11, color:"#334155", margin:0 }}>
            By continuing you agree to our <a href="/privacy-policy.html" style={{ color:"#60A5FA", textDecoration:"none" }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
