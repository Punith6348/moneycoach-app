// ─── AuthScreen.jsx — Mobile-first, top-aligned, scrollable ──────────────────
import { useState } from "react";
import { auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// ── Base layout — top-aligned, scrollable, safe-area aware ───────────────────
const pageStyle = {
  minHeight: "100vh",
  minHeight: "100dvh",
  overflowY: "auto",
  overflowX: "hidden",
  background: "linear-gradient(160deg,#0F172A 0%,#1E293B 60%,#0F172A 100%)",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  boxSizing: "border-box",
  paddingTop: "env(safe-area-inset-top, 0px)",
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
};

const containerStyle = {
  maxWidth: 420,
  margin: "0 auto",
  padding: "32px 20px 40px",
  boxSizing: "border-box",
  width: "100%",
};

const cardStyle = {
  background: "#fff",
  borderRadius: 20,
  padding: "24px 20px",
  width: "100%",
  boxSizing: "border-box",
  boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
};

const errorStyle = {
  background: "#FFF1F2",
  border: "1px solid #FECACA",
  borderRadius: 10,
  padding: "9px 13px",
  marginBottom: 14,
  fontSize: 12,
  color: "#DC2626",
  textAlign: "center",
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "#6B7280",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  display: "block",
  marginBottom: 6,
};

function PrimaryBtn({ onClick, disabled, children, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "15px 16px", borderRadius: 14, border: "none",
      background: disabled ? "#E5E7EB" : "#111827",
      color: disabled ? "#9CA3AF" : "#fff",
      cursor: disabled ? "default" : "pointer",
      fontFamily: "inherit", fontSize: 15, fontWeight: 700,
      marginBottom: 10, boxSizing: "border-box",
      ...style,
    }}>{children}</button>
  );
}

function OutlineBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "14px 16px", borderRadius: 14,
      border: "1.5px solid #E5E7EB", background: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      cursor: "pointer", fontFamily: "inherit", fontSize: 15,
      fontWeight: 700, color: "#111827", marginBottom: 10,
      boxSizing: "border-box",
    }}>{children}</button>
  );
}

function AppLogo({ size = 80 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25,
      overflow: "hidden", boxShadow: "0 8px 24px rgba(37,99,235,0.35)",
      flexShrink: 0,
    }}>
      <img src="/icon-512.png" alt="Money Coach"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={e => {
          const p = e.target.parentNode;
          p.style.background = "linear-gradient(135deg,#1E40AF,#06B6D4)";
          p.style.display = "flex";
          p.style.alignItems = "center";
          p.style.justifyContent = "center";
          e.target.style.display = "none";
          p.innerHTML += `<span style="font-size:${Math.round(size*0.44)}px;color:#fff;font-family:Georgia,serif;font-weight:700">₹</span>`;
        }}
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

// ── Screen 1: Welcome ─────────────────────────────────────────────────────────
function WelcomeScreen({ onStart }) {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        {/* Logo + Brand */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:16, marginBottom:32 }}>
          <AppLogo size={88}/>
          <h1 style={{ margin:"16px 0 6px", fontSize:30, fontWeight:800, color:"#F1F5F9", fontFamily:"Georgia,serif", letterSpacing:"-0.5px", textAlign:"center" }}>
            Money Coach
          </h1>
          <p style={{ margin:0, fontSize:14, color:"#64748B", textAlign:"center" }}>
            Track · Plan · Grow
          </p>
        </div>

        {/* Feature cards */}
        <div style={{ marginBottom:32 }}>
          {[
            { icon:"💸", title:"Daily Expense Tracking", desc:"Log every expense in seconds" },
            { icon:"📊", title:"Smart Budgets & Loans",  desc:"Set limits, track EMIs easily" },
            { icon:"☁️", title:"Sync Across Devices",    desc:"Sign in to access anywhere" },
            { icon:"🔒", title:"100% Private",           desc:"Your data, never shared" },
          ].map((f,i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:14,
              padding:"13px 16px", marginBottom:8,
              background:"rgba(255,255,255,0.05)",
              borderRadius:14, border:"1px solid rgba(255,255,255,0.08)",
              boxSizing:"border-box",
            }}>
              <span style={{ fontSize:24, flexShrink:0 }}>{f.icon}</span>
              <div>
                <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#E2E8F0" }}>{f.title}</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:"#64748B" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button onClick={onStart} style={{
          width:"100%", padding:"16px", borderRadius:16, border:"none",
          background:"linear-gradient(135deg,#2563EB,#1D4ED8)",
          color:"#fff", cursor:"pointer", fontFamily:"inherit",
          fontSize:16, fontWeight:800, letterSpacing:"0.2px",
          boxShadow:"0 4px 20px rgba(37,99,235,0.4)",
          marginBottom:12, boxSizing:"border-box",
        }}>
          Get Started →
        </button>
        <p style={{ textAlign:"center", fontSize:11, color:"#334155", margin:0 }}>
          Free forever · No credit card needed
        </p>

      </div>
    </div>
  );
}

// ── Screen 2: Login ───────────────────────────────────────────────────────────
function LoginScreen({ onBack, onGuest, onPhone, onGoogle, loading, error }) {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        {/* Header */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:8, marginBottom:28 }}>
          <AppLogo size={68}/>
          <h2 style={{ margin:"14px 0 4px", fontSize:22, fontWeight:800, color:"#F1F5F9", fontFamily:"Georgia,serif", textAlign:"center" }}>
            Welcome back
          </h2>
          <p style={{ margin:0, fontSize:13, color:"#64748B", textAlign:"center" }}>
            Sign in to sync your data across devices
          </p>
        </div>

        {/* Card */}
        <div style={cardStyle}>
          {error && <div style={errorStyle}>{error}</div>}

          <OutlineBtn onClick={onGoogle} disabled={loading}>
            <GoogleIcon/> Continue with Google
          </OutlineBtn>

          <OutlineBtn onClick={onPhone} disabled={loading}>
            <span style={{ fontSize:20 }}>📱</span> Continue with Phone
          </OutlineBtn>

          <div style={{ display:"flex", alignItems:"center", gap:10, margin:"6px 0 12px" }}>
            <div style={{ flex:1, height:1, background:"#F1F5F9" }}/>
            <span style={{ fontSize:11, color:"#9CA3AF" }}>or</span>
            <div style={{ flex:1, height:1, background:"#F1F5F9" }}/>
          </div>

          <button onClick={onGuest} style={{
            width:"100%", padding:"13px", borderRadius:14,
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

        {/* Footer */}
        <div style={{ textAlign:"center", marginTop:20 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontFamily:"inherit", fontSize:13, marginBottom:10, display:"block", margin:"0 auto 10px" }}>
            ← Back to Welcome
          </button>
          <p style={{ fontSize:11, color:"#334155", margin:0 }}>
            By continuing you agree to our{" "}
            <a href="/privacy-policy.html" style={{ color:"#60A5FA", textDecoration:"none" }}>Privacy Policy</a>
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Screen 3: Phone entry ─────────────────────────────────────────────────────
function PhoneScreen({ onBack, onSent, loading, setLoading, error, setError }) {
  const [phone, setPhone] = useState("");

  const send = async () => {
    if (phone.length !== 10) { setError("Enter a valid 10-digit number"); return; }
    setError(""); setLoading(true);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size:"invisible" });
      }
      const r = await signInWithPhoneNumber(auth, `+91${phone}`, window.recaptchaVerifier);
      onSent(r, phone);
    } catch {
      setError("Failed to send OTP. Please try again.");
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    }
    setLoading(false);
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:8, marginBottom:28 }}>
          <AppLogo size={60}/>
          <h2 style={{ margin:"14px 0 4px", fontSize:20, fontWeight:800, color:"#F1F5F9", textAlign:"center" }}>
            Your phone number
          </h2>
          <p style={{ margin:0, fontSize:13, color:"#64748B", textAlign:"center" }}>
            We'll send a 6-digit OTP to verify
          </p>
        </div>

        <div style={cardStyle}>
          {error && <div style={errorStyle}>{error}</div>}
          <label style={labelStyle}>Mobile Number</label>
          <div style={{
            display:"flex", border:"1.5px solid #E5E7EB",
            borderRadius:12, overflow:"hidden", marginBottom:16,
          }}>
            <div style={{ padding:"13px 12px", background:"#F8FAFC", borderRight:"1px solid #E5E7EB", fontSize:14, fontWeight:700, color:"#374151", display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
              🇮🇳 +91
            </div>
            <input
              type="tel" value={phone} autoFocus
              onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
              onKeyDown={e=>e.key==="Enter" && phone.length===10 && send()}
              placeholder="10-digit mobile number"
              style={{ flex:1, padding:"13px 12px", border:"none", outline:"none", fontFamily:"inherit", fontSize:15, color:"#111827", background:"#fff", minWidth:0 }}
            />
          </div>
          <PrimaryBtn onClick={send} disabled={loading || phone.length!==10}>
            {loading ? "Sending OTP..." : "Send OTP →"}
          </PrimaryBtn>
        </div>

        <div style={{ textAlign:"center", marginTop:20 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>
            ← Back
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Screen 4: OTP verify ──────────────────────────────────────────────────────
function OTPScreen({ phone, confirmResult, onBack, loading, setLoading, error, setError }) {
  const [otp, setOtp] = useState("");

  const verify = async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setError(""); setLoading(true);
    try { await confirmResult.confirm(otp); }
    catch { setError("Wrong OTP. Please try again."); setLoading(false); }
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:8, marginBottom:28 }}>
          <AppLogo size={60}/>
          <h2 style={{ margin:"14px 0 4px", fontSize:20, fontWeight:800, color:"#F1F5F9", textAlign:"center" }}>
            Enter OTP
          </h2>
          <p style={{ margin:0, fontSize:13, color:"#64748B", textAlign:"center" }}>
            Sent to +91 {phone}
          </p>
        </div>

        <div style={cardStyle}>
          {error && <div style={errorStyle}>{error}</div>}
          <label style={labelStyle}>6-Digit Code</label>
          <input
            type="number" value={otp} autoFocus
            onChange={e=>setOtp(e.target.value.slice(0,6))}
            onKeyDown={e=>e.key==="Enter" && otp.length===6 && verify()}
            placeholder="——————"
            style={{
              width:"100%", padding:"16px 12px", borderRadius:12, outline:"none",
              border:`1.5px solid ${otp.length>0?"#2563EB":"#E5E7EB"}`,
              fontFamily:"Georgia,serif", fontSize:32, fontWeight:700,
              letterSpacing:14, textAlign:"center", marginBottom:14,
              boxSizing:"border-box", color:"#111827", background:"#fff",
            }}
          />
          <PrimaryBtn onClick={verify} disabled={loading || otp.length!==6}>
            {loading ? "Verifying..." : "Verify & Continue ✓"}
          </PrimaryBtn>
          <button onClick={onBack} style={{
            width:"100%", padding:"12px", borderRadius:14, border:"1px solid #E5E7EB",
            background:"#F8FAFC", cursor:"pointer", fontFamily:"inherit",
            fontSize:13, color:"#6B7280", fontWeight:600, boxSizing:"border-box",
          }}>
            ← Change Number
          </button>
        </div>

        <div style={{ textAlign:"center", marginTop:16 }}>
          <p style={{ fontSize:12, color:"#475569", margin:0 }}>
            Didn't receive it?{" "}
            <button onClick={onBack} style={{ background:"none", border:"none", color:"#60A5FA", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:600, padding:0 }}>
              Resend OTP
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AuthScreen({ onGuest }) {
  const [screen,  setScreen]  = useState("welcome");
  const [confirm, setConfirm] = useState(null);
  const [phone,   setPhone2]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch { setError("Google sign-in failed. Try again."); setLoading(false); }
  };

  return (
    <>
      <div id="recaptcha-container"/>
      {screen==="welcome" && <WelcomeScreen onStart={()=>{ setError(""); setScreen("login"); }}/>}
      {screen==="login"   && <LoginScreen onBack={()=>setScreen("welcome")} onGuest={onGuest} onPhone={()=>{ setError(""); setScreen("phone"); }} onGoogle={handleGoogle} loading={loading} error={error}/>}
      {screen==="phone"   && <PhoneScreen onBack={()=>setScreen("login")} onSent={(r,p)=>{ setConfirm(r); setPhone2(p); setScreen("otp"); }} loading={loading} setLoading={setLoading} error={error} setError={setError}/>}
      {screen==="otp"     && <OTPScreen phone={phone} confirmResult={confirm} onBack={()=>setScreen("phone")} loading={loading} setLoading={setLoading} error={error} setError={setError}/>}
    </>
  );
}
