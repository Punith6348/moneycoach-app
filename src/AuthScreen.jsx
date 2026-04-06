// ─── AuthScreen.jsx — Fixed Google + Phone OTP for Android ───────────────────
import { useState, useEffect, useRef } from "react";
import { auth } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

const S = {
  page: { fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", boxSizing:"border-box" },
  container: { maxWidth:420, margin:"0 auto", padding:"28px 20px 32px", boxSizing:"border-box", width:"100%" },
  card: { background:"#fff", borderRadius:20, padding:"24px 20px", width:"100%", boxSizing:"border-box", boxShadow:"0 12px 40px rgba(0,0,0,0.35)" },
  error: { background:"#FFF1F2", border:"1px solid #FECACA", borderRadius:10, padding:"9px 13px", marginBottom:14, fontSize:12, color:"#DC2626", textAlign:"center" },
  label: { fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.8px", display:"block", marginBottom:6 },
};

function AppLogo({ size=80 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.25, overflow:"hidden", margin:"0 auto", boxShadow:"0 8px 24px rgba(37,99,235,0.35)" }}>
      <img src="/icon-512.png" alt="Money Coach" style={{ width:"100%", height:"100%", objectFit:"cover" }}
        onError={e=>{ const p=e.target.parentNode; p.style.cssText=`width:${size}px;height:${size}px;border-radius:${size*0.25}px;background:linear-gradient(135deg,#1E40AF,#06B6D4);display:flex;align-items:center;justify-content:center`; e.target.remove(); p.innerHTML=`<span style="font-size:${Math.round(size*0.44)}px;color:#fff;font-family:Georgia,serif;font-weight:700">₹</span>`; }}
      />
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, children, style={} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", background:disabled?"#E5E7EB":"#111827", color:disabled?"#9CA3AF":"#fff", cursor:disabled?"default":"pointer", fontFamily:"inherit", fontSize:15, fontWeight:700, marginBottom:10, boxSizing:"border-box", ...style }}>
      {children}
    </button>
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

// ── Welcome Screen ────────────────────────────────────────────────────────────
function WelcomeScreen({ onStart, onSignIn }) {
  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={{ textAlign:"center", paddingTop:8, marginBottom:32 }}>
          <AppLogo size={92}/>
          <h1 style={{ margin:"18px 0 6px", fontSize:30, fontWeight:800, color:"#F1F5F9", fontFamily:"Georgia,serif" }}>Money Coach</h1>
          <p style={{ margin:0, fontSize:14, color:"#64748B" }}>Track · Plan · Grow</p>
        </div>
        <div style={{ marginBottom:28 }}>
          {[
            { icon:"💸", title:"Daily Expense Tracking", desc:"Log every expense in seconds" },
            { icon:"📊", title:"Smart Budgets & Loans", desc:"Set limits, track EMIs" },
            { icon:"☁️", title:"Sync Across Devices", desc:"Login anywhere, data follows" },
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
        <button onClick={onStart} style={{ width:"100%", padding:"16px", borderRadius:16, border:"none", background:"linear-gradient(135deg,#2563EB,#1D4ED8)", color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:16, fontWeight:800, boxShadow:"0 4px 20px rgba(37,99,235,0.4)", marginBottom:12 }}>
          Get Started →
        </button>
        <button onClick={onSignIn} style={{ width:"100%", padding:"14px", borderRadius:16, border:"1.5px solid rgba(255,255,255,0.15)", background:"transparent", color:"#94A3B8", cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight:600 }}>
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onBack, onGuest, onPhone, onGoogle, loading, error }) {
  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={{ textAlign:"center", paddingTop:8, marginBottom:24 }}>
          <AppLogo size={64}/>
          <h2 style={{ margin:"14px 0 4px", fontSize:22, fontWeight:800, color:"#F1F5F9", fontFamily:"Georgia,serif" }}>Sign in</h2>
          <p style={{ margin:0, fontSize:13, color:"#64748B" }}>Sync your data across all devices</p>
        </div>
        <div style={S.card}>
          {error && <div style={S.error}>{error}</div>}

          {/* Google — uses redirect, works on all devices */}
          <button onClick={onGoogle} disabled={loading} style={{ width:"100%", padding:"14px 16px", borderRadius:14, border:"1.5px solid #E5E7EB", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:10, cursor:"pointer", fontFamily:"inherit", fontSize:15, fontWeight:700, color:"#111827", marginBottom:10, boxSizing:"border-box" }}>
            <GoogleIcon/> Continue with Google
          </button>

          <button onClick={onPhone} disabled={loading} style={{ width:"100%", padding:"14px 16px", borderRadius:14, border:"1.5px solid #E5E7EB", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:10, cursor:"pointer", fontFamily:"inherit", fontSize:15, fontWeight:700, color:"#111827", marginBottom:10, boxSizing:"border-box" }}>
            <span style={{ fontSize:20 }}>📱</span> Continue with Phone
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0 10px" }}>
            <div style={{ flex:1, height:1, background:"#F1F5F9" }}/><span style={{ fontSize:11, color:"#9CA3AF" }}>or</span><div style={{ flex:1, height:1, background:"#F1F5F9" }}/>
          </div>

          <button onClick={onGuest} style={{ width:"100%", padding:"13px", borderRadius:14, border:"1.5px solid #F1F5F9", background:"#F8FAFC", cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight:600, color:"#6B7280", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxSizing:"border-box" }}>
            👤 Continue as Guest
          </button>
          <p style={{ textAlign:"center", fontSize:11, color:"#9CA3AF", margin:"8px 0 0" }}>Guest mode — data stays on this device only</p>
        </div>
        <button onClick={onBack} style={{ display:"block", margin:"16px auto 0", background:"none", border:"none", color:"#475569", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>← Back</button>
        <p style={{ marginTop:10, fontSize:11, color:"#334155", textAlign:"center" }}>
          By continuing you agree to our <a href="/privacy-policy.html" style={{ color:"#60A5FA", textDecoration:"none" }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

// ── Phone Screen ──────────────────────────────────────────────────────────────
function PhoneScreen({ onBack, onSent, loading, setLoading, error, setError, recaptchaRef }) {
  const [phone, setPhone] = useState("");

  const send = async () => {
    if (phone.length !== 10) { setError("Enter a valid 10-digit number"); return; }
    setError(""); setLoading(true);
    try {
      // Always clear old verifier first
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e) {}
        window.recaptchaVerifier = null;
      }

      // Re-create the container div fresh (fixes mobile DOM issues)
      const oldDiv = document.getElementById("recaptcha-container");
      if (oldDiv) {
        const newDiv = document.createElement("div");
        newDiv.id = "recaptcha-container";
        oldDiv.parentNode.replaceChild(newDiv, oldDiv);
      }

      // Create RecaptchaVerifier — invisible mode
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );

      const result = await signInWithPhoneNumber(auth, `+91${phone}`, window.recaptchaVerifier);
      onSent(result, phone);
    } catch(e) {
      console.error("OTP error:", e.code, e.message);
      if (e.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else if (e.code === "auth/invalid-phone-number") {
        setError("Invalid phone number. Check and try again.");
      } else if (e.code === "auth/captcha-check-failed" || e.code === "auth/recaptcha-not-enabled") {
        setError("Security check failed. Please refresh and try again.");
      } else {
        setError(`Failed to send OTP (${e.code}). Try again.`);
      }
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e) {}
        window.recaptchaVerifier = null;
      }
    }
    setLoading(false);
  };

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={{ textAlign:"center", paddingTop:8, marginBottom:24 }}>
          <AppLogo size={60}/>
          <h2 style={{ margin:"14px 0 4px", fontSize:20, fontWeight:800, color:"#F1F5F9" }}>Your phone number</h2>
          <p style={{ margin:0, fontSize:13, color:"#64748B" }}>We'll send a 6-digit OTP to verify</p>
        </div>
        <div style={S.card}>
          {error && <div style={S.error}>{error}</div>}
          <label style={S.label}>Mobile Number</label>
          <div style={{ display:"flex", border:"1.5px solid #E5E7EB", borderRadius:12, overflow:"hidden", marginBottom:16 }}>
            <div style={{ padding:"13px 12px", background:"#F8FAFC", borderRight:"1px solid #E5E7EB", fontSize:14, fontWeight:700, color:"#374151", display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>🇮🇳 +91</div>
            <input type="tel" value={phone} autoFocus
              onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
              onKeyDown={e=>e.key==="Enter"&&phone.length===10&&send()}
              placeholder="10-digit number"
              style={{ flex:1, padding:"13px 12px", border:"none", outline:"none", fontFamily:"inherit", fontSize:15, color:"#111827", minWidth:0 }}
            />
          </div>
          <PrimaryBtn onClick={send} disabled={loading||phone.length!==10}>
            {loading ? "Sending OTP..." : "Send OTP →"}
          </PrimaryBtn>
        </div>
        <button onClick={onBack} style={{ display:"block", margin:"16px auto 0", background:"none", border:"none", color:"#475569", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>← Back</button>
      </div>
    </div>
  );
}

// ── OTP Screen ────────────────────────────────────────────────────────────────
function OTPScreen({ phone, confirmResult, onBack, onResend, loading, setLoading, error, setError }) {
  const [otp, setOtp] = useState("");

  const verify = async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setError(""); setLoading(true);
    try {
      await confirmResult.confirm(otp);
    } catch(e) {
      console.error("Verify error:", e.code);
      if (e.code === "auth/invalid-verification-code") {
        setError("Wrong OTP. Please check and try again.");
      } else if (e.code === "auth/code-expired") {
        setError("OTP expired. Please request a new one.");
      } else {
        setError("Verification failed. Try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={{ textAlign:"center", paddingTop:8, marginBottom:24 }}>
          <AppLogo size={60}/>
          <h2 style={{ margin:"14px 0 4px", fontSize:20, fontWeight:800, color:"#F1F5F9" }}>Enter OTP</h2>
          <p style={{ margin:0, fontSize:13, color:"#64748B" }}>Sent to +91 {phone}</p>
        </div>
        <div style={S.card}>
          {error && <div style={S.error}>{error}</div>}
          <label style={S.label}>6-Digit Code</label>
          <input type="number" value={otp} autoFocus
            onChange={e=>setOtp(e.target.value.slice(0,6))}
            onKeyDown={e=>e.key==="Enter"&&otp.length===6&&verify()}
            placeholder="——————"
            style={{ width:"100%", padding:"16px 12px", borderRadius:12, outline:"none", border:`1.5px solid ${otp.length>0?"#2563EB":"#E5E7EB"}`, fontFamily:"Georgia,serif", fontSize:30, fontWeight:700, letterSpacing:12, textAlign:"center", marginBottom:14, boxSizing:"border-box", color:"#111827", background:"#fff" }}
          />
          <PrimaryBtn onClick={verify} disabled={loading||otp.length!==6}>
            {loading ? "Verifying..." : "Verify & Continue ✓"}
          </PrimaryBtn>
          <button onClick={onResend} style={{ width:"100%", padding:"12px", borderRadius:14, border:"1px solid #E5E7EB", background:"#F8FAFC", cursor:"pointer", fontFamily:"inherit", fontSize:13, color:"#6B7280", fontWeight:600, boxSizing:"border-box" }}>
            ← Resend OTP
          </button>
        </div>
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

  // Handle Google redirect result on app load
  useEffect(() => {
    getRedirectResult(auth)
      .then(result => {
        if (result?.user) {
          console.log("Google redirect success:", result.user.email);
          // onAuthStateChanged in main.jsx handles navigation
        }
      })
      .catch(e => {
        if (e.code !== "auth/no-auth-event") {
          console.warn("Redirect error:", e.code);
        }
      });
  }, []);

  // Google — always use redirect (works on Android PWA, iOS Safari, desktop)
  const handleGoogle = async () => {
    setLoading(true); setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      // signInWithRedirect works on ALL platforms — no popup issues
      await signInWithRedirect(auth, provider);
      // Page redirects to Google — code below won't run
    } catch(e) {
      console.error("Google error:", e.code);
      setError("Google sign-in failed. Try again.");
      setLoading(false);
    }
  };

  const clearErr = () => setError("");

  return (
    <>
      {/* Recaptcha container — always in DOM, never removed */}
      <div id="recaptcha-container" style={{ position:"fixed", bottom:10, left:10, zIndex:99999, opacity:0.01 }}/>

      {screen==="welcome" && (
        <WelcomeScreen
          onStart={()=>{ clearErr(); setScreen("login"); }}
          onSignIn={()=>{ clearErr(); setScreen("login"); }}
        />
      )}

      {screen==="login" && (
        <LoginScreen
          onBack={()=>setScreen("welcome")}
          onGuest={onGuest}
          onPhone={()=>{ clearErr(); setScreen("phone"); }}
          onGoogle={handleGoogle}
          loading={loading} error={error}
        />
      )}

      {screen==="phone" && (
        <PhoneScreen
          onBack={()=>{ setScreen("login"); clearErr(); }}
          onSent={(result, ph)=>{ setConfirm(result); setPhone2(ph); setScreen("otp"); }}
          loading={loading} setLoading={setLoading}
          error={error} setError={setError}
        />
      )}

      {screen==="otp" && (
        <OTPScreen
          phone={phone} confirmResult={confirm}
          onBack={()=>setScreen("phone")}
          onResend={()=>{ clearErr(); setScreen("phone"); }}
          loading={loading} setLoading={setLoading}
          error={error} setError={setError}
        />
      )}
    </>
  );
}
