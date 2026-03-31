// ─── AuthScreen.jsx — Complete auth flow ─────────────────────────────────────
import { useState } from "react";
import { auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const S = {
  wrap: { minHeight:"100dvh", background:"linear-gradient(160deg,#0F172A 0%,#1E293B 60%,#0F172A 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", position:"relative", overflow:"hidden" },
  card: { background:"#fff", borderRadius:24, padding:"28px 24px 24px", width:"100%", maxWidth:400, boxShadow:"0 24px 64px rgba(0,0,0,0.45)" },
  error: { background:"#FFF1F2", border:"1px solid #FECACA", borderRadius:10, padding:"9px 13px", marginBottom:14, fontSize:12, color:"#DC2626", textAlign:"center" },
  label: { fontSize:12, fontWeight:600, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.7px", display:"block", marginBottom:6 },
};

function BgDecor() {
  return (
    <>
      <div style={{ position:"absolute",top:-120,right:-120,width:320,height:320,borderRadius:"50%",background:"rgba(37,99,235,0.07)",pointerEvents:"none" }}/>
      <div style={{ position:"absolute",bottom:-100,left:-100,width:280,height:280,borderRadius:"50%",background:"rgba(16,163,74,0.05)",pointerEvents:"none" }}/>
    </>
  );
}

function AppLogo({ size=80 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.27, overflow:"hidden", margin:"0 auto", boxShadow:"0 8px 32px rgba(37,99,235,0.4)" }}>
      <img src="/icon-512.png" alt="Money Coach" style={{ width:"100%", height:"100%", objectFit:"cover" }}
        onError={e=>{ e.target.parentNode.style.background="linear-gradient(135deg,#1E40AF,#06B6D4)"; e.target.style.display="none"; e.target.parentNode.innerHTML=`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:${size*0.44}px;color:#fff;font-family:Georgia,serif;font-weight:700">₹</div>`; }}
      />
    </div>
  );
}

function OutlineBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width:"100%", padding:"14px 16px", borderRadius:14, border:"1.5px solid #E5E7EB", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:10, cursor:"pointer", fontFamily:"inherit", fontSize:15, fontWeight:700, color:"#111827", marginBottom:10, transition:"border-color 0.15s" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor="#2563EB"}
      onMouseLeave={e=>e.currentTarget.style.borderColor="#E5E7EB"}>
      {children}
    </button>
  );
}

function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width:"100%", padding:"15px 16px", borderRadius:14, border:"none", background: disabled?"#E5E7EB":"#111827", color: disabled?"#9CA3AF":"#fff", cursor: disabled?"default":"pointer", fontFamily:"inherit", fontSize:15, fontWeight:700, marginBottom:10 }}>
      {children}
    </button>
  );
}

// ── Welcome Screen ────────────────────────────────────────────────────────────
function WelcomeScreen({ onStart }) {
  return (
    <div style={S.wrap}>
      <BgDecor/>
      <div style={{ textAlign:"center", marginBottom:44, zIndex:1 }}>
        <AppLogo size={100}/>
        <h1 style={{ margin:"20px 0 8px", fontSize:34, fontWeight:800, color:"#F1F5F9", fontFamily:"Georgia,serif", letterSpacing:"-0.5px" }}>Money Coach</h1>
        <p style={{ margin:0, fontSize:15, color:"#64748B" }}>Track · Plan · Grow</p>
      </div>
      <div style={{ zIndex:1, width:"100%", maxWidth:400, marginBottom:36 }}>
        {[
          { icon:"💸", title:"Daily Expense Tracking", desc:"Log every expense in seconds" },
          { icon:"📊", title:"Smart Budgets & Loans", desc:"Set limits, track EMIs" },
          { icon:"☁️", title:"Sync Across Devices", desc:"Your data, everywhere" },
        ].map((f,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", marginBottom:8, background:"rgba(255,255,255,0.05)", borderRadius:14, border:"1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontSize:26, flexShrink:0 }}>{f.icon}</span>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#E2E8F0" }}>{f.title}</p>
              <p style={{ margin:0, fontSize:11, color:"#64748B" }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ width:"100%", maxWidth:400, zIndex:1 }}>
        <button onClick={onStart} style={{ width:"100%", padding:"16px", borderRadius:16, border:"none", background:"linear-gradient(135deg,#2563EB,#1D4ED8)", color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:16, fontWeight:800, boxShadow:"0 4px 20px rgba(37,99,235,0.45)", marginBottom:12 }}>
          Get Started →
        </button>
        <p style={{ textAlign:"center", fontSize:11, color:"#334155", margin:0 }}>Free forever · No credit card needed</p>
      </div>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onBack, onGuest, onPhone, onGoogle, loading, error }) {
  return (
    <div style={S.wrap}>
      <BgDecor/>
      <div style={{ textAlign:"center", marginBottom:24, zIndex:1 }}>
        <AppLogo size={64}/>
        <h2 style={{ margin:"14px 0 4px", fontSize:22, fontWeight:800, color:"#F1F5F9", fontFamily:"Georgia,serif" }}>Sign in</h2>
        <p style={{ margin:0, fontSize:13, color:"#64748B" }}>Sync your data across all devices</p>
      </div>
      <div style={{ ...S.card, zIndex:1 }}>
        {error && <div style={S.error}>{error}</div>}
        <OutlineBtn onClick={onGoogle} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </OutlineBtn>
        <OutlineBtn onClick={onPhone} disabled={loading}>
          <span style={{ fontSize:20 }}>📱</span> Continue with Phone
        </OutlineBtn>
        <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0 10px" }}>
          <div style={{ flex:1, height:1, background:"#F1F5F9" }}/><span style={{ fontSize:11, color:"#9CA3AF" }}>or</span><div style={{ flex:1, height:1, background:"#F1F5F9" }}/>
        </div>
        <button onClick={onGuest} style={{ width:"100%", padding:"13px", borderRadius:14, border:"1.5px solid #F1F5F9", background:"#F8FAFC", cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight:600, color:"#6B7280", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          👤 Continue as Guest
        </button>
        <p style={{ textAlign:"center", fontSize:11, color:"#9CA3AF", margin:"8px 0 0" }}>Guest mode — data stays on this device only</p>
      </div>
      <button onClick={onBack} style={{ marginTop:20, background:"none", border:"none", color:"#475569", cursor:"pointer", fontFamily:"inherit", fontSize:13, zIndex:1 }}>← Back</button>
      <p style={{ marginTop:10, fontSize:11, color:"#334155", textAlign:"center", zIndex:1 }}>
        By continuing you agree to our <a href="/privacy-policy.html" style={{ color:"#60A5FA", textDecoration:"none" }}>Privacy Policy</a>
      </p>
    </div>
  );
}

// ── Phone Screen ──────────────────────────────────────────────────────────────
function PhoneScreen({ onBack, onSent, loading, setLoading, error, setError }) {
  const [phone, setPhone] = useState("");
  const send = async () => {
    if (phone.length!==10) { setError("Enter a valid 10-digit number"); return; }
    setError(""); setLoading(true);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth,"recaptcha-container",{size:"invisible"});
      }
      const r = await signInWithPhoneNumber(auth,`+91${phone}`,window.recaptchaVerifier);
      onSent(r, phone);
    } catch {
      setError("Failed to send OTP. Try again.");
      if(window.recaptchaVerifier){window.recaptchaVerifier.clear();window.recaptchaVerifier=null;}
    }
    setLoading(false);
  };
  return (
    <div style={S.wrap}>
      <BgDecor/>
      <div style={{ textAlign:"center", marginBottom:24, zIndex:1 }}>
        <AppLogo size={60}/>
        <h2 style={{ margin:"14px 0 4px", fontSize:20, fontWeight:800, color:"#F1F5F9" }}>Your phone number</h2>
        <p style={{ margin:0, fontSize:13, color:"#64748B" }}>We'll send a 6-digit OTP to verify</p>
      </div>
      <div style={{ ...S.card, zIndex:1 }}>
        {error && <div style={S.error}>{error}</div>}
        <label style={S.label}>Mobile Number</label>
        <div style={{ display:"flex", border:"1.5px solid #E5E7EB", borderRadius:12, overflow:"hidden", marginBottom:16 }}>
          <div style={{ padding:"13px 12px", background:"#F8FAFC", borderRight:"1px solid #E5E7EB", fontSize:14, fontWeight:700, color:"#374151", display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>🇮🇳 +91</div>
          <input type="tel" value={phone} autoFocus onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} onKeyDown={e=>e.key==="Enter"&&phone.length===10&&send()} placeholder="10-digit number" style={{ flex:1, padding:"13px 12px", border:"none", outline:"none", fontFamily:"inherit", fontSize:15, color:"#111827" }}/>
        </div>
        <PrimaryBtn onClick={send} disabled={loading||phone.length!==10}>{loading?"Sending...":"Send OTP →"}</PrimaryBtn>
      </div>
      <button onClick={onBack} style={{ marginTop:20, background:"none", border:"none", color:"#475569", cursor:"pointer", fontFamily:"inherit", fontSize:13, zIndex:1 }}>← Back</button>
    </div>
  );
}

// ── OTP Screen ────────────────────────────────────────────────────────────────
function OTPScreen({ phone, confirmResult, onBack, loading, setLoading, error, setError }) {
  const [otp, setOtp] = useState("");
  const verify = async () => {
    if (otp.length!==6) { setError("Enter the 6-digit OTP"); return; }
    setError(""); setLoading(true);
    try { await confirmResult.confirm(otp); }
    catch { setError("Wrong OTP. Please try again."); setLoading(false); }
  };
  return (
    <div style={S.wrap}>
      <BgDecor/>
      <div style={{ textAlign:"center", marginBottom:24, zIndex:1 }}>
        <AppLogo size={60}/>
        <h2 style={{ margin:"14px 0 4px", fontSize:20, fontWeight:800, color:"#F1F5F9" }}>Enter OTP</h2>
        <p style={{ margin:0, fontSize:13, color:"#64748B" }}>Sent to +91 {phone}</p>
      </div>
      <div style={{ ...S.card, zIndex:1 }}>
        {error && <div style={S.error}>{error}</div>}
        <label style={S.label}>6-Digit OTP</label>
        <input type="number" value={otp} autoFocus onChange={e=>setOtp(e.target.value.slice(0,6))} onKeyDown={e=>e.key==="Enter"&&otp.length===6&&verify()} placeholder="• • • • • •"
          style={{ width:"100%", padding:"16px", borderRadius:12, border:`1.5px solid ${otp.length>0?"#2563EB":"#E5E7EB"}`, outline:"none", fontFamily:"Georgia,serif", fontSize:30, fontWeight:700, letterSpacing:12, textAlign:"center", marginBottom:14, boxSizing:"border-box", color:"#111827", background:"#fff" }}/>
        <PrimaryBtn onClick={verify} disabled={loading||otp.length!==6}>{loading?"Verifying...":"Verify & Continue ✓"}</PrimaryBtn>
        <button onClick={onBack} style={{ width:"100%", padding:"12px", borderRadius:14, border:"1px solid #E5E7EB", background:"#F8FAFC", cursor:"pointer", fontFamily:"inherit", fontSize:13, color:"#6B7280", fontWeight:600 }}>← Change Number</button>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
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
