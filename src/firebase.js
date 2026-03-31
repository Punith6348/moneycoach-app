// ─── firebase.js ─────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCi2YckhXYnZk8Fis4PE3SB7A2QrGdn_wI",
  authDomain: "money-coach-aaa8c.firebaseapp.com",
  projectId: "money-coach-aaa8c",
  storageBucket: "money-coach-aaa8c.firebasestorage.app",
  messagingSenderId: "39662562896",
  appId: "1:39662562896:web:e80f0992c5a8b4a911eb55"
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
