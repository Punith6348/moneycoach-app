// ─── AuthScreen.jsx ──────────────────────────────────────────────────────────
import { useState } from "react";
import { auth } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

export default function AuthScreen({ onGuest }) {
  const [mode,    setMode]    = useState("main");
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const signInGoogle = async () => {
    setLoading(true); setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    setError("");
    const phoneNum = phone.startsWith("+") ? phone : `+91${phone}`;
    if (phone.length !== 10) { setError("Enter a valid 10-digit number"); return; }
    setLoading(true);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size:"invisible" });
      }
      const result = await signInWithPhoneNumber(auth, phoneNum, window.recaptchaVerifier);
      setConfirm(result);
      setMode("otp");
    } catch {
      setError("Failed to send OTP. Try again.");
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true); setError("");
    try {
      await confirm.confirm(otp);
    } catch {
      setError("Wrong OTP. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"24px", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      {/* Background decoration */}
      <div style={{
        position:"absolute", top:-100, right:-100,
        width:300, height:300, borderRadius:"50%",
        background:"rgba(37,99,235,0.08)", pointerEvents:"none",
      }}/>
      <div style={{
        position:"absolute", bottom:-80, left:-80,
        width:250, height:250, borderRadius:"50%",
        background:"rgba(16,163,74,0.06)", pointerEvents:"none",
      }}/>

      <div id="recaptcha-container"/>

      {/* Logo section */}
      <div style={{textAlign:"center", marginBottom:40}}>
        <div style={{
          width:90, height:90, borderRadius:24,
          background:"linear-gradient(135deg,#1E40AF,#06B6D4)",
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 20px",
          boxShadow:"0 8px 32px rgba(37,99,235,0.35)",
        }}>
          <span style={{fontSize:44, color:"#fff", fontFamily:"Georgia,serif", fontWeight:700}}>₹</span>
        </div>
        <h1 style={{
          margin:"0 0 6px", fontSize:30, fontWeight:800,
          color:"#F1F5F9", fontFamily:"Georgia,serif", letterSpacing:"-0.5px",
        }}>Money Coach</h1>
        <p style={{margin:0, fontSize:14, color:"#64748B"}}>
          Your personal finance tracker
        </p>
      </div>

      {/* Card */}
      <div style={{
        background:"rgba(255,255,255,0.97)",
        borderRadius:24, padding:"28px 24px",
        width:"100%", maxWidth:360,
        boxShadow:"0 24px 64px rgba(0,0,0,0.4)",
      }}>

        {/* Error */}
        {error && (
          <div style={{
            background:"#FFF1F2", border:"1px solid #FECACA",
            borderRadius:10, padding:"9px 13px", marginBottom:16,
            fontSize:12, color:"#DC2626", textAlign:"center",
          }}>{error}</div>
        )}

        {/* ── MAIN ── */}
        {mode==="main" && (
          <>
            <p style={{
              textAlign:"center", fontSize:13, fontWeight:600,
              color:"#374151", margin:"0 0 18px",
            }}>Sign in to sync your data across devices</p>

            {/* Google */}
            <button onClick={signInGoogle} disabled={loading} style={{
              width:"100%", padding:"14px 16px", borderRadius:14,
              border:"1.5px solid #E5E7EB", background:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              cursor:"pointer", fontFamily:"inherit", fontSize:15, fontWeight:700,
              color:"#111827", marginBottom:12,
              boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
              transition:"all 0.15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#2563EB"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="#E5E7EB"}>
              <svg width="20" height="20" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>

            {/* Phone */}
            <button onClick={()=>setMode("phone")} disabled={loading} style={{
              width:"100%", padding:"14px 16px", borderRadius:14,
              border:"1.5px solid #E5E7EB", background:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              cursor:"pointer", fontFamily:"inherit", fontSize:15, fontWeight:700,
              color:"#111827", marginBottom:20,
              boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
              transition:"all 0.15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#2563EB"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="#E5E7EB"}>
              <span style={{fontSize:20}}>📱</span>
              Continue with Phone
            </button>

            {/* Divider */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{flex:1,height:1,background:"#F1F5F9"}}/>
              <span style={{fontSize:11,color:"#9CA3AF",fontWeight:500}}>or</span>
              <div style={{flex:1,height:1,background:"#F1F5F9"}}/>
            </div>

            {/* Guest */}
            <button onClick={onGuest} style={{
              width:"100%", padding:"13px 16px", borderRadius:14,
              border:"1.5px solid #F1F5F9", background:"#F8FAFC",
              cursor:"pointer", fontFamily:"inherit", fontSize:14,
              fontWeight:600, color:"#6B7280",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              <span>👤</span> Continue as Guest
            </button>
            <p style={{
              textAlign:"center", fontSize:11, color:"#9CA3AF",
              margin:"10px 0 0", lineHeight:1.5,
            }}>
              Guest mode saves data on this device only
            </p>
          </>
        )}

        {/* ── PHONE ── */}
        {mode==="phone" && (
          <>
            <button onClick={()=>{setMode("main");setError("");}} style={{
              background:"none", border:"none", cursor:"pointer",
              color:"#6B7280", fontSize:13, fontWeight:600,
              display:"flex", alignItems:"center", gap:4,
              padding:"0 0 16px", fontFamily:"inherit",
            }}>← Back</button>

            <h2 style={{margin:"0 0 6px",fontSize:18,fontWeight:700,color:"#111827"}}>
              Enter your number
            </h2>
            <p style={{margin:"0 0 20px",fontSize:13,color:"#6B7280"}}>
              We'll send a 6-digit OTP to verify
            </p>

            <div style={{
              display:"flex", border:"1.5px solid #E5E7EB",
              borderRadius:12, overflow:"hidden", marginBottom:16,
            }}>
              <div style={{
                padding:"13px 12px", background:"#F8FAFC",
                borderRight:"1px solid #E5E7EB",
                fontSize:14, fontWeight:700, color:"#374151",
                flexShrink:0, display:"flex", alignItems:"center", gap:5,
              }}>🇮🇳 +91</div>
              <input type="tel" value={phone}
                onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                placeholder="10-digit mobile number"
                autoFocus
                style={{
                  flex:1, padding:"13px 12px", border:"none", outline:"none",
                  fontFamily:"inherit", fontSize:15, background:"#fff",
                  color:"#111827",
                }}/>
            </div>

            <button onClick={sendOTP} disabled={loading||phone.length!==10} style={{
              width:"100%", padding:"14px", borderRadius:14, border:"none",
              background: phone.length===10 ? "#111827" : "#E5E7EB",
              color: phone.length===10 ? "#fff" : "#9CA3AF",
              cursor: phone.length===10 ? "pointer" : "default",
              fontFamily:"inherit", fontSize:15, fontWeight:700,
            }}>
              {loading ? "Sending OTP..." : "Send OTP →"}
            </button>
          </>
        )}

        {/* ── OTP ── */}
        {mode==="otp" && (
          <>
            <button onClick={()=>{setMode("phone");setOtp("");setError("");}} style={{
              background:"none", border:"none", cursor:"pointer",
              color:"#6B7280", fontSize:13, fontWeight:600,
              display:"flex", alignItems:"center", gap:4,
              padding:"0 0 16px", fontFamily:"inherit",
            }}>← Back</button>

            <h2 style={{margin:"0 0 4px",fontSize:18,fontWeight:700,color:"#111827"}}>
              Enter OTP
            </h2>
            <p style={{margin:"0 0 20px",fontSize:13,color:"#6B7280"}}>
              Sent to +91 {phone}
            </p>

            <input type="number" value={otp}
              onChange={e=>setOtp(e.target.value.slice(0,6))}
              placeholder="— — — — — —"
              autoFocus
              style={{
                width:"100%", padding:"16px", borderRadius:12,
                border:"1.5px solid #2563EB", outline:"none",
                fontFamily:"Georgia,serif", fontSize:28,
                fontWeight:700, letterSpacing:10, textAlign:"center",
                marginBottom:16, boxSizing:"border-box", color:"#111827",
              }}/>

            <button onClick={verifyOTP} disabled={loading||otp.length!==6} style={{
              width:"100%", padding:"14px", borderRadius:14, border:"none",
              background: otp.length===6 ? "#111827" : "#E5E7EB",
              color: otp.length===6 ? "#fff" : "#9CA3AF",
              cursor: otp.length===6 ? "pointer" : "default",
              fontFamily:"inherit", fontSize:15, fontWeight:700,
            }}>
              {loading ? "Verifying..." : "Verify OTP ✓"}
            </button>

            <button onClick={()=>{ setMode("phone"); setOtp(""); }} style={{
              width:"100%", padding:"11px", borderRadius:14, marginTop:10,
              border:"1px solid #E5E7EB", background:"#fff",
              cursor:"pointer", fontFamily:"inherit", fontSize:13,
              color:"#6B7280", fontWeight:500,
            }}>Resend OTP</button>
          </>
        )}
      </div>

      {/* Footer */}
      <p style={{
        marginTop:24, fontSize:11, color:"#334155", textAlign:"center", lineHeight:1.6,
      }}>
        By continuing you agree to our{" "}
        <a href="/privacy-policy.html" style={{color:"#60A5FA",textDecoration:"none"}}>
          Privacy Policy
        </a>
      </p>
    </div>
  );
}

