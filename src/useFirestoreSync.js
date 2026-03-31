// ─── useFirestoreSync.js ─────────────────────────────────────────────────────
// Syncs Money Coach data to Firestore for logged-in users.
// Guest users continue using localStorage only.
import { useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const STORAGE_KEY = "moneyCoachData_v3";

// Save data to Firestore (debounced — saves 2s after last change)
export function useFirestoreSync(firebaseUser, data) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!firebaseUser || !data) return;

    // Debounce writes — don't hammer Firestore on every keystroke
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const ref = doc(db, "users", firebaseUser.uid);
        await setDoc(ref, { data: JSON.stringify(data), updatedAt: Date.now() });
      } catch (e) {
        console.warn("Firestore sync failed:", e);
      }
    }, 2000);

    return () => clearTimeout(timerRef.current);
  }, [data, firebaseUser]);
}

// Load data from Firestore on first login
export async function loadFromFirestore(uid) {
  try {
    const ref  = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const raw = snap.data().data;
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Firestore load failed:", e);
  }
  return null;
}

// Migrate localStorage data to Firestore (called once on first login)
export async function migrateLocalToFirestore(uid) {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (!local) return;
    const ref  = doc(db, "users", uid);
    const snap = await getDoc(ref);
    // Only migrate if no cloud data exists yet
    if (!snap.exists()) {
      await setDoc(ref, { data: local, updatedAt: Date.now() });
      console.log("✓ Local data migrated to Firestore");
    }
  } catch (e) {
    console.warn("Migration failed:", e);
  }
}
