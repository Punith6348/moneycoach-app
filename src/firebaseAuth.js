// ─── firebaseAuth.js ─────────────────────────────────────────────────────────
// Direct Firebase Auth REST API — works in Capacitor WKWebView
// Firebase SDK's signInWithCredential hangs on Capacitor iOS because the SDK
// sends window.location.href ("capacitor://localhost") as requestUri, which is
// not an authorized domain in Firebase Console → server silently rejects → hang.
// We bypass signInWithCredential for Apple by calling the REST API directly,
// then writing the session into localStorage in Firebase SDK format so
// onAuthStateChanged restores the session on next app open.

const API_KEY    = "AIzaSyCi2YckhXYnZk8Fis4PE3SB7A2QrGdn_wI";
const BASE       = "https://identitytoolkit.googleapis.com/v1/accounts";
const AUTH_DOMAIN = "https://money-coach-aaa8c.firebaseapp.com"; // authorized domain

// ── Fetch with 10-second timeout ─────────────────────────────────────────────
async function fetchWithTimeout(url, options, ms = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(timer);
    return res;
  } catch(e) {
    clearTimeout(timer);
    if (e.name === "AbortError") throw { code: "NETWORK_TIMEOUT", message: "Request timed out. Check your internet and try again." };
    throw { code: "NETWORK_ERROR", message: "No internet connection. Check your network." };
  }
}

// ── Sign up with email/password ───────────────────────────────────────────────
export async function signUpWithEmail(email, password) {
  const res = await fetchWithTimeout(`${BASE}:signUp?key=${API_KEY}`, {
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
  const res = await fetchWithTimeout(`${BASE}:signInWithPassword?key=${API_KEY}`, {
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
  // moneyCoachUID is set by onAuthSuccess AFTER the user-change check,
  // so it must NOT be set here (would defeat the prevUid comparison).
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
  // moneyCoachUID is intentionally kept so onAuthSuccess can detect
  // whether the next sign-in is the same user or a different one.
  // moneyCoachData_v3 is also kept for same-user fast restore.
  // Both are cleared in onAuthSuccess when a different user signs in.
}

// ── Apple Sign In via REST API ────────────────────────────────────────────────
// Uses the authorized AUTH_DOMAIN as requestUri so Firebase accepts the request.
export async function signInWithAppleREST(identityToken, rawNonce) {
  let postBody = `id_token=${encodeURIComponent(identityToken)}&providerId=apple.com`;
  if (rawNonce) postBody += `&nonce=${encodeURIComponent(rawNonce)}`;
  const res = await fetch(`${BASE}:signInWithIdp?key=${API_KEY}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      postBody,
      requestUri:          AUTH_DOMAIN,
      returnIdpCredential: true,
      returnSecureToken:   true,
    }),
  });
  const data = await res.json();
  if (data.error) throw { code: data.error.message, message: data.error.message };
  return data;
  // returns: { localId, idToken, refreshToken, email, displayName, expiresIn, ... }
}

// ── Write Firebase SDK auth state to localStorage ─────────────────────────────
// Writes the user session in the format Firebase SDK v10 expects so that
// onAuthStateChanged fires with the correct user on the next app open.
export function saveFirebaseSDKSession(data) {
  const expiresIn      = parseInt(data.expiresIn || "3600", 10);
  const expirationTime = Date.now() + expiresIn * 1000;
  const sdkUser = {
    uid:           data.localId,
    email:         data.email         || null,
    emailVerified: data.emailVerified || false,
    displayName:   data.displayName   || data.fullName || null,
    isAnonymous:   false,
    photoURL:      data.photoUrl      || null,
    phoneNumber:   null,
    tenantId:      null,
    providerData: [{
      providerId:  "apple.com",
      uid:         data.localId,
      displayName: data.displayName || null,
      email:       data.email       || null,
      phoneNumber: null,
      photoURL:    null,
    }],
    stsTokenManager: {
      refreshToken:   data.refreshToken,
      accessToken:    data.idToken,
      expirationTime,
    },
    createdAt:   String(Date.now()),
    lastLoginAt: String(Date.now()),
    apiKey:   API_KEY,
    appName:  "[DEFAULT]",
  };
  const key = `firebase:authUser:${API_KEY}:[DEFAULT]`;
  localStorage.setItem(key, JSON.stringify(sdkUser));

  // Dispatch a synthetic storage event so Firebase SDK picks up the new session
  // immediately in this tab (cross-tab storage events don't fire in same window)
  try {
    window.dispatchEvent(new StorageEvent("storage", {
      key,
      newValue:    localStorage.getItem(key),
      oldValue:    null,
      storageArea: window.localStorage,
      url:         window.location.href,
    }));
  } catch (_) {}

  return sdkUser;
}

// ── Write email/password auth state to localStorage in Firebase SDK format ───
export function saveEmailSDKSession(data, displayName) {
  const expiresIn      = parseInt(data.expiresIn || "3600", 10);
  const expirationTime = Date.now() + expiresIn * 1000;
  const sdkUser = {
    uid:           data.localId,
    email:         data.email         || null,
    emailVerified: data.emailVerified || false,
    displayName:   displayName        || data.displayName || null,
    isAnonymous:   false,
    photoURL:      null,
    phoneNumber:   null,
    tenantId:      null,
    providerData: [{
      providerId:  "password",
      uid:         data.email         || data.localId,
      displayName: displayName        || null,
      email:       data.email         || null,
      phoneNumber: null,
      photoURL:    null,
    }],
    stsTokenManager: {
      refreshToken:   data.refreshToken,
      accessToken:    data.idToken,
      expirationTime,
    },
    createdAt:   String(Date.now()),
    lastLoginAt: String(Date.now()),
    apiKey:   API_KEY,
    appName:  "[DEFAULT]",
  };
  const key = `firebase:authUser:${API_KEY}:[DEFAULT]`;
  localStorage.setItem(key, JSON.stringify(sdkUser));
  try {
    window.dispatchEvent(new StorageEvent("storage", {
      key,
      newValue:    localStorage.getItem(key),
      oldValue:    null,
      storageArea: window.localStorage,
      url:         window.location.href,
    }));
  } catch (_) {}
  return sdkUser;
}

// ── Format error codes ────────────────────────────────────────────────────────
export function formatAuthError(code) {
  const map = {
    "EMAIL_NOT_FOUND":        "No account found with this email. Create one below.",
    "INVALID_PASSWORD":       "Incorrect password. Try again.",
    "INVALID_LOGIN_CREDENTIALS": "Incorrect email or password.",
    "EMAIL_EXISTS":           "Email already registered. Tap Sign In instead.",
    "WEAK_PASSWORD":          "Password too weak — use at least 6 characters.",
    "INVALID_EMAIL":          "Invalid email address.",
    "TOO_MANY_ATTEMPTS_TRY_LATER": "Too many attempts. Wait a moment and try again.",
    "USER_DISABLED":          "Account disabled. Contact support.",
    "OPERATION_NOT_ALLOWED":  "Email sign-in is not enabled. Contact support.",
    "NETWORK_TIMEOUT":        "Request timed out. Check your internet and try again.",
    "NETWORK_ERROR":          "No internet connection. Check your network.",
  };
  return map[code] || (code ? `Sign in failed: ${code}` : "Something went wrong. Try again.");
}
