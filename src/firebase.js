/* ══════════════════════════════════════════
   Firebase Configuration & Helpers
   ══════════════════════════════════════════ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getDatabase, ref, onValue, set, get
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGFPA79ibYKjOox_kQwog_CuRRclG-zZg",
  authDomain: "mic222.firebaseapp.com",
  databaseURL: "https://mic222-default-rtdb.firebaseio.com",
  projectId: "mic222",
  storageBucket: "mic222.firebasestorage.app",
  messagingSenderId: "1076552653566",
  appId: "1:1076552653566:web:7257163862bf7e2ed123af",
  measurementId: "G-WS8LMMJTCL"
};

let app = null;
let db = null;
let ready = false;

/** Initialize Firebase */
export function initFirebase() {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    ready = true;
    return true;
  } catch (e) {
    console.warn('Firebase init failed:', e);
    return false;
  }
}

export function isReady() { return ready; }

export function isConfigured() {
  return !firebaseConfig.apiKey.includes('REPLACE');
}

/** Database helpers */
export function dbRef(path) {
  return ref(db, path);
}

export function dbSet(path, val) {
  return set(ref(db, path), val);
}

export function dbGet(path) {
  return get(ref(db, path));
}

export function dbListen(path, cb) {
  onValue(ref(db, path), snap => cb(snap.val()));
}
