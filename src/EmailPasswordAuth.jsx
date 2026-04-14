// ─── EmailPasswordAuth.jsx ────────────────────────────────────────────────────
// Email/Password authentication - privacy-compliant login for App Store
// Features:
// ✅ User controls what data to share (optional name)
// ✅ Email can be temporary/fake (user controls privacy)
// ✅ No ad tracking, no personal data beyond email+password
// ✅ Works on all devices (web, iOS, Android)

import { useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

export default function EmailPasswordAuth({ onError, onLoading }) {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    onLoading?.(true);

    try {
      if (!email || !password) {
        setError("Email and password are required");
        setLoading(false);
        onLoading?.(false);
        return;
      }

      console.log("🔐 Attempting login with:", email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Login success:", result.user.email, "UID:", result.user.uid);
      // onAuthStateChanged in main.jsx handles navigation
      // Do NOT clear loading state here - let onAuthStateChanged navigate
    } catch (e) {
      console.error("❌ Login error:", e.code, e.message);
      const msg =
        e.code === "auth/user-not-found"
          ? "No account found with this email"
          : e.code === "auth/wrong-password"
            ? "Incorrect password"
            : e.code === "auth/invalid-email"
              ? "Invalid email address"
              : e.code === "auth/too-many-requests"
                ? "Too many failed attempts. Try again later."
                : e.message || "Login failed. Please try again.";
      console.log("💬 Error message:", msg);
      setError(msg);
      setLoading(false);
      onLoading?.(false);
    }
  };

  const handleSignup = async () => {
    setError("");
    setLoading(true);
    onLoading?.(true);

    try {
      if (!email || !password) {
        setError("Email and password are required");
        setLoading(false);
        onLoading?.(false);
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        onLoading?.(false);
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords don't match");
        setLoading(false);
        onLoading?.(false);
        return;
      }

      // Create account
      console.log("📝 Creating account with:", email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log("✅ Signup success:", result.user.email, "UID:", result.user.uid);

      // Update profile if name provided
      if (name.trim()) {
        await updateProfile(result.user, {
          displayName: name.trim(),
        });
      }

      // onAuthStateChanged in main.jsx handles navigation
      // Do NOT clear loading state here - let onAuthStateChanged navigate
    } catch (e) {
      console.error("❌ Signup error:", e.code, e.message);
      const msg =
        e.code === "auth/email-already-in-use"
          ? "This email is already registered"
          : e.code === "auth/invalid-email"
            ? "Invalid email address"
            : e.code === "auth/weak-password"
              ? "Password too weak (use uppercase, numbers, etc.)"
              : "Signup failed. Please try again.";
      setError(msg);
      setLoading(false);
      onLoading?.(false);
    }
  };

  const C = {
    ink: "#111827",
    muted: "#6B7280",
    border: "#E5E7EB",
    bg: "#F8FAFC",
    red: "#DC2626",
    blue: "#2563EB",
  };

  const inp = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1.5px solid ${error ? C.red : C.border}`,
    fontFamily: "inherit",
    fontSize: 14,
    background: C.bg,
    outline: "none",
    marginBottom: 12,
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <>
      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setMode("login")}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 10,
            border: `1.5px solid ${mode === "login" ? C.blue : C.border}`,
            background: mode === "login" ? "#EFF6FF" : C.bg,
            color: mode === "login" ? C.blue : C.muted,
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => setMode("signup")}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 10,
            border: `1.5px solid ${mode === "signup" ? C.blue : C.border}`,
            background: mode === "signup" ? "#EFF6FF" : C.bg,
            color: mode === "signup" ? C.blue : C.muted,
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Create Account
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#FFF1F2",
            border: `1px solid ${C.red}`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 12,
            fontSize: 12,
            color: C.red,
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Form */}
      {mode === "login" ? (
        <>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              color: C.muted,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Email Address
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoFocus
            style={inp}
          />

          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              color: C.muted,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Password
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={inp}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: loading ? "#D1D5DB" : C.blue,
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </>
      ) : (
        <>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              color: C.muted,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Name (optional)
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            onKeyDown={(e) => e.key === "Enter" && handleSignup()}
            autoFocus
            style={inp}
          />

          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              color: C.muted,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Email Address *
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com or temp email"
            onKeyDown={(e) => e.key === "Enter" && handleSignup()}
            style={inp}
          />

          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              color: C.muted,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Password * (min 6 characters)
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a strong password"
            onKeyDown={(e) => e.key === "Enter" && handleSignup()}
            style={inp}
          />

          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              color: C.muted,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Confirm Password *
          </p>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            onKeyDown={(e) => e.key === "Enter" && handleSignup()}
            style={inp}
          />

          <button
            onClick={handleSignup}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: loading ? "#D1D5DB" : C.blue,
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: 10,
              color: C.muted,
              lineHeight: 1.5,
            }}
          >
            💡 You can use a temporary email or fake email to keep your address
            private. Data syncs only to devices you're logged into.
          </p>
        </>
      )}
    </>
  );
}
