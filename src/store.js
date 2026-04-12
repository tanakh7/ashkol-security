/* ══════════════════════════════════════════
   Data Store — Centralized state management
   ══════════════════════════════════════════ */

import * as fb from './firebase.js';

// ── Default Institutions ──
const DEFAULT_INSTS = [
  'נופי הבשור קדמי', 'נופי הבשור אחורי', 'מרחבי אשכול', 'שדות אשכול',
  'שחר אשכול', 'שמש אשכול', 'בית ספר בנות', 'נועם נצרים בנים',
  'נועם נצרים בנות', 'תלמוד תורה', 'ישיבת נווה', 'אולפנה', 'רגבים'
];

const DEFAULT_ICONS = [
  '🏘️', '🏘️', '🏫', '🌾', '🌅', '☀️', '📚', '🕍',
  '🕍', '📖', '🌿', '✡️', '🌱'
];

// Dynamic institutions (mutable — loaded from Firebase)
export let INSTS = [...DEFAULT_INSTS];
export let INST_ICONS = [...DEFAULT_ICONS];

/** Load institutions from appData (called after Firebase sync) */
export function syncInstitutions() {
  const saved = appData.institutions;
  if (saved && Array.isArray(saved) && saved.length > 0) {
    INSTS.length = 0;
    INST_ICONS.length = 0;
    saved.forEach(inst => {
      INSTS.push(inst.name || '');
      INST_ICONS.push(inst.icon || '🏫');
    });
  }
}

/** Add a new institution */
export async function addInstitution(name, icon) {
  if (!name.trim()) return false;
  INSTS.push(name.trim());
  INST_ICONS.push(icon || '🏫');
  await saveInstitutions();
  return true;
}

/** Remove an institution by index */
export async function removeInstitution(idx) {
  if (idx < 0 || idx >= INSTS.length) return false;
  INSTS.splice(idx, 1);
  INST_ICONS.splice(idx, 1);
  // Clean up associated data
  if (appData.phones?.inst) delete appData.phones.inst[idx];
  if (appData.routes) delete appData.routes[idx];
  if (appData.publishedRoutes) delete appData.publishedRoutes[idx];
  await saveInstitutions();
  await persist('phones', appData.phones);
  await persist('routes', appData.routes);
  await persist('publishedRoutes', appData.publishedRoutes);
  return true;
}

/** Save institutions to Firebase */
async function saveInstitutions() {
  const institutions = INSTS.map((name, i) => ({ name, icon: INST_ICONS[i] }));
  appData.institutions = institutions;
  await persist('institutions', institutions);
}

export const DEFAULT_POLICE_PROCS = [
  { title: 'נוהל פתיחה באש', key: 'shoot' },
  { title: 'נוהל לחימה בעת תקרית', key: 'combat' },
  { title: 'נוהל הודעה אנונימית', key: 'anon' },
  { title: 'חפץ חשוד', key: 'suspect' },
];

export const DEFAULT_ROUTINE_PROCS = [
  { title: 'נהלי שגרה — כניסה ויציאה', key: 'r1file' },
  { title: 'נהלי שגרה — פיקוח ומעקב', key: 'r2file' },
];

export const DEFAULT_EDUCATION_PROCS = [
  { title: 'נוהל חירום — משרד החינוך', key: 'edu1' },
  { title: 'נוהל פינוי תלמידים', key: 'edu2' },
];

const PASS_KEY = 'sec_admin_pass';

// ── App State ──
export let appData = {
  phones: {},
  maps: {},
  procs: {},
  procItems: {},
  procFiles: {},
  commanderMsgs: [],
  commanderText: '',
  routes: {},
  publishedRoutes: {},
};

export let currentInst = 0;
export let selMapInst = 0;
export let selPhoneInst = 0;

export function setCurrentInst(val) { currentInst = val; }
export function setSelMapInst(val) { selMapInst = val; }
export function setSelPhoneInst(val) { selPhoneInst = val; }

// ── Local Storage ──
export function loadFromLocal() {
  try {
    const s = localStorage.getItem('sec_data');
    if (s) {
      const parsed = JSON.parse(s);
      Object.assign(appData, parsed);
    }
  } catch (e) {
    console.warn('Failed to load local data:', e);
  }
  syncInstitutions();
}

export function saveLocal() {
  try {
    localStorage.setItem('sec_data', JSON.stringify(appData));
  } catch (e) {
    console.warn('Failed to save local data:', e);
  }
}

// ── Firebase Persistence ──
export async function persist(key, val) {
  if (fb.isConfigured() && fb.isReady()) {
    try {
      await fb.dbSet('data/' + key, val);
    } catch (e) {
      console.warn('Firebase write failed:', e);
    }
  }
  saveLocal();
}

// ── Firebase Data Listener ──
export function startListening(onData) {
  if (!fb.isConfigured() || !fb.isReady()) {
    loadFromLocal();
    onData(appData);
    return;
  }

  fb.dbListen('data', val => {
    if (val) {
      // Merge Firebase data, keeping local procFiles
      const localProcFiles = appData.procFiles;
      Object.assign(appData, {
        phones: {},
        maps: {},
        procs: {},
        procItems: {},
        commanderMsgs: [],
        commanderText: '',
        routes: {},
        publishedRoutes: {},
        ...val,
      });
      // Merge local procFiles (too large for Firebase)
      try {
        const localStr = localStorage.getItem('sec_data');
        if (localStr) {
          const local = JSON.parse(localStr);
          if (local.procFiles) appData.procFiles = local.procFiles;
        }
      } catch (e) {}
    }
    syncInstitutions();
    onData(appData);
  });
}

// ── Password (Secure Verification) ──
// The password is NEVER read from Firebase.
// Instead, we write the attempt to 'verify/{id}' — Firebase rules only allow
// the write if the value matches 'config/adminPass'. Success = correct password.

export async function verifyPassword(password) {
  if (!fb.isConfigured() || !fb.isReady()) {
    // Offline fallback — check localStorage
    return password === (localStorage.getItem(PASS_KEY) || '');
  }
  try {
    const attemptId = 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    // Firebase may store the password as a number — try matching both types
    const val = /^\d+$/.test(password) ? Number(password) : password;
    await fb.dbSet('verify/' + attemptId, val);
    // Write succeeded → password is correct
    // Clean up the verification node
    try { await fb.dbSet('verify/' + attemptId, null); } catch (e) {}
    return true;
  } catch (e) {
    // Write failed → password is wrong (or network error)
    return false;
  }
}

// Legacy — kept for offline fallback only
export function getPass() {
  return localStorage.getItem(PASS_KEY) || '';
}

export async function syncPassFromFirebase() {
  // No longer reads password from Firebase (it's now protected)
  // Password verification is done via write-check in verifyPassword()
}

// ── Procedure Items ──
export function getProcItems(type) {
  const items = (appData.procItems || {})[type];
  if (items && items.length) return items;
  if (type === 'police') return DEFAULT_POLICE_PROCS.map(d => ({ ...d, urls: [] }));
  if (type === 'education') return DEFAULT_EDUCATION_PROCS.map(d => ({ ...d, urls: [] }));
  return DEFAULT_ROUTINE_PROCS.map(d => ({ ...d, urls: [] }));
}
