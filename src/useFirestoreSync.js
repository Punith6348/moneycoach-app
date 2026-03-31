// ─── useFirestoreSync.js ─────────────────────────────────────────────────────
import { doc, getDoc, setDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

const STORAGE_KEY = "moneyCoachData_v3";

// ── Save data to Firestore ────────────────────────────────────────────────────
export async function saveToFirestore(uid, data) {
  try {
    const ref = doc(db, "users", uid);
    await setDoc(ref, { data: JSON.stringify(data), updatedAt: Date.now() }, { merge: true });
  } catch(e) { console.warn("Firestore save failed:", e); }
}

// ── Load data from Firestore ──────────────────────────────────────────────────
export async function loadFromFirestore(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const raw = snap.data().data;
      if (raw) return JSON.parse(raw);
    }
  } catch(e) { console.warn("Firestore load failed:", e); }
  return null;
}

// ── Register user profile (stores phone+email for linking) ───────────────────
export async function registerUserProfile(user) {
  try {
    const ref  = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data() : {};

    // Build profile — store all linked identifiers
    const profile = {
      uid:         user.uid,
      email:       user.email       || existing.email       || null,
      phoneNumber: user.phoneNumber || existing.phoneNumber || null,
      displayName: user.displayName || existing.displayName || null,
      photoURL:    user.photoURL    || existing.photoURL    || null,
      updatedAt:   Date.now(),
      // Keep existing data if any
      data:        existing.data || null,
    };

    await setDoc(ref, profile, { merge: true });
    return profile;
  } catch(e) {
    console.warn("Profile register failed:", e);
    return null;
  }
}

// ── Find existing account by phone number ─────────────────────────────────────
// Returns the UID of an existing account that has this phone number
export async function findAccountByPhone(phoneNumber) {
  try {
    const q    = query(collection(db, "users"), where("phoneNumber", "==", phoneNumber));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id; // Return existing UID
  } catch(e) { console.warn("Find by phone failed:", e); }
  return null;
}

// ── Find existing account by email ───────────────────────────────────────────
export async function findAccountByEmail(email) {
  try {
    const q    = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;
  } catch(e) { console.warn("Find by email failed:", e); }
  return null;
}

// ── Migrate localStorage to Firestore (first login only) ─────────────────────
export async function migrateLocalToFirestore(uid) {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (!local) return;
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists() || !snap.data().data) {
      await setDoc(doc(db, "users", uid), { data: local, updatedAt: Date.now() }, { merge: true });
      console.log("✓ Local data migrated to Firestore");
    }
  } catch(e) { console.warn("Migration failed:", e); }
}
