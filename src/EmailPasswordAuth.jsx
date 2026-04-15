// ─── EmailPasswordAuth.jsx ───────────────────────────────────────────────────
import { useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

export default function EmailPasswordAuth({ onError, onLoading }) {
  const [mode,            setMode]            = useState("login");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name,            setName]            = useState("");
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");

  const C = {
    ink:"#111827", muted:"#6B7280", border:"#E5E7EB",
    bg:"#F8FAFC", red:"#DC2626", blue:"#2563EB",
  };

  const inp = {
    width:"100%", padding:"12px 14px", borderRadius:10,
    border:`1.5px solid ${C.border}`, fontFamily:"inherit",
    fontSize:14, background:C.bg, outline:"none",
    marginBottom:12, boxSizing:"border-box",
  };

  const setLoadingState = (v) => {
    setLoading(v);
    onLoading?.(v);
  };

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    setLoadingState(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // onAuthStateChanged in main.jsx handles navigation
    } catch(e) {
      console.error("Login error:", e.code);
      const msg =
        e.code === "auth/user-not-found"    ? "No account found with this email" :
        e.code === "auth/wrong-password"    ? "Incorrect password" :
        e.code === "auth/invalid-credential"? "Incorrect email or password" :
        e.code === "auth/invalid-email"     ? "Invalid email address" :
        e.code === "auth/too-many-requests" ? "Too many attempts. Try again later." :
        e.code === "auth/network-request-failed" ? "Network error. Check your connection." :
        "Login failed. Please try again.";
      setError(msg);
      setLoadingState(false);
    }
  };

  const handleSignup = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoadingState(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(result.user, { displayName: name.trim() });
      }
      // onAuthStateChanged in main.jsx handles navigation
    } catch(e) {
      console.error("Signup error:", e.code);
      const msg =
        e.code === "auth/email-already-in-use" ? "This email is already registered. Try signing in." :
        e.code === "auth/invalid-email"         ? "Invalid email address" :
        e.code === "auth/weak-password"         ? "Password too weak — use at least 6 characters" :
        e.code === "auth/network-request-failed"? "Network error. Check your connection." :
        "Signup failed. Please try again.";
      setError(msg);
      setLoadingState(false);
    }
  };

  const tabBtn = (active) => ({
    flex:1, padding:"10px", borderRadius:10,
    border:`1.5px solid ${active?C.blue:C.border}`,
    background:active?"#EFF6FF":C.bg,
    color:active?C.blue:C.muted,
    fontFamily:"inherit", fontSize:13, fontWeight:700,
    cursor:"pointer",
  });

  return (
    <>
      {/* Tabs */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <button onClick={()=>{ setMode("login"); setError(""); }} style={tabBtn(mode==="login")}>
          Sign In
        </button>
        <button onClick={()=>{ setMode("signup"); setError(""); }} style={tabBtn(mode==="signup")}>
          Create Account
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background:"#FFF1F2", border:`1px solid ${C.red}`,
          borderRadius:10, padding:"10px 12px", marginBottom:12,
          fontSize:12, color:C.red, fontWeight:600 }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:"center", padding:"20px 0" }}>
          <div style={{ width:32, height:32, borderRadius:"50%",
            border:"3px solid #E5E7EB", borderTopColor:C.blue,
            animation:"spin 0.8s linear infinite", margin:"0 auto 10px" }}/>
          <p style={{ margin:0, fontSize:13, color:C.muted }}>
            {mode==="login" ? "Signing you in..." : "Creating account..."}
          </p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : mode==="login" ? (
        <>
          <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700,
            color:C.muted, textTransform:"uppercase", letterSpacing:"0.8px" }}>
            Email Address
          </p>
          <input type="email" value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="you@example.com"
            onKeyDown={e=>e.key==="Enter"&&handleLogin()}
            style={inp}/>

          <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700,
            color:C.muted, textTransform:"uppercase", letterSpacing:"0.8px" }}>
            Password
          </p>
          <input type="password" value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="Enter your password"
            onKeyDown={e=>e.key==="Enter"&&handleLogin()}
            style={inp}/>

          <button onClick={handleLogin} style={{ width:"100%", padding:"12px",
            borderRadius:10, border:"none", background:C.blue, color:"#fff",
            fontFamily:"inherit", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            Sign In →
          </button>
        </>
      ) : (
        <>
          <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700,
            color:C.muted, textTransform:"uppercase", letterSpacing:"0.8px" }}>
            Name (optional)
          </p>
          <input type="text" value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="Your name"
            style={inp}/>

          <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700,
            color:C.muted, textTransform:"uppercase", letterSpacing:"0.8px" }}>
            Email Address *
          </p>
          <input type="email" value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inp}/>

          <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700,
            color:C.muted, textTransform:"uppercase", letterSpacing:"0.8px" }}>
            Password * (min 6 characters)
          </p>
          <input type="password" value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="Choose a strong password"
            style={inp}/>

          <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700,
            color:C.muted, textTransform:"uppercase", letterSpacing:"0.8px" }}>
            Confirm Password *
          </p>
          <input type="password" value={confirmPassword}
            onChange={e=>setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            onKeyDown={e=>e.key==="Enter"&&handleSignup()}
            style={inp}/>

          <button onClick={handleSignup} style={{ width:"100%", padding:"12px",
            borderRadius:10, border:"none", background:C.blue, color:"#fff",
            fontFamily:"inherit", fontSize:14, fontWeight:700, cursor:"pointer",
            marginBottom:8 }}>
            Create Account →
          </button>
          <p style={{ margin:0, fontSize:10, color:C.muted, lineHeight:1.5 }}>
            💡 You can use any email. Data syncs across your devices.
          </p>
        </>
      )}
    </>
  );
}
