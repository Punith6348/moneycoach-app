// ─── firebaseAuth.js ─────────────────────────────────────────────────────────
// Direct Firebase Auth REST API — works in Capacitor WKWebView
// No Firebase SDK auth calls that hang on iOS

const API_KEY = "AIzaSyCi2YckhXYnZk8Fis4PE3SB7A2QrGdn_wI";
const BASE    = "https://identitytoolkit.googleapis.com/v1/accounts";

// ── Sign up with email/password ───────────────────────────────────────────────
export async function signUpWithEmail(email, password) {
  const res = await fetch(`${BASE}:signUp?key=${API_KEY}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (data.error) throw { code: data.error.message, message: data.error.message };
  return data; // { idToken, localId, email, ... }
}

// ── Sign in with email/password ───────────────────────────────────────────────
export async function signInWithEmail(email, password) {
  const res = await fetch(`${BASE}:signInWithPassword?key=${API_KEY}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (data.error) throw { code: data.error.message, message: data.error.message };
  return data; // { idToken, localId, email, ... }
}

// ── Save session to localStorage ──────────────────────────────────────────────
export function saveSession(data) {
  localStorage.setItem("mc_uid",   data.localId);
  localStorage.setItem("mc_email", data.email);
  localStorage.setItem("mc_token", data.idToken);
  localStorage.setItem("moneyCoachUID", data.localId);
}

// ── Get current session ───────────────────────────────────────────────────────
export function getSession() {
  const uid   = localStorage.getItem("mc_uid");
  const email = localStorage.getItem("mc_email");
  const token = localStorage.getItem("mc_token");
  if (!uid) return null;
  return { uid, email, token };
}

// ── Clear session ─────────────────────────────────────────────────────────────
export function clearSession() {
  localStorage.removeItem("mc_uid");
  localStorage.removeItem("mc_email");
  localStorage.removeItem("mc_token");
  localStorage.removeItem("moneyCoachUID");
  localStorage.removeItem("moneyCoachData_v3");
}

// ── Format error codes ────────────────────────────────────────────────────────
export function formatAuthError(code) {
  const map = {
    "EMAIL_NOT_FOUND":        "No account found with this email",
    "INVALID_PASSWORD":       "Incorrect password",
    "INVALID_LOGIN_CREDENTIALS": "Incorrect email or password",
    "EMAIL_EXISTS":           "Email already registered. Try signing in.",
    "WEAK_PASSWORD":          "Password too weak — use at least 6 characters",
    "INVALID_EMAIL":          "Invalid email address",
    "TOO_MANY_ATTEMPTS_TRY_LATER": "Too many attempts. Try again later.",
    "USER_DISABLED":          "Account disabled. Contact support.",
  };
  return map[code] || `Error: ${code}`;
}
