/* ══════════════════════════════════════════
   Data Store — Centralized state management
   ══════════════════════════════════════════ */

import * as fb from './firebase.js';

// ── Constants ──
export const INSTS = [
  'נופי הבשור קדמי', 'נופי הבשור אחורי', 'מרחבי אשכול', 'שדות אשכול',
  'שחר אשכול', 'שמש אשכול', 'בית ספר בנות', 'נועם נצרים בנים',
  'נועם נצרים בנות', 'תלמוד תורה', 'ישיבת נווה', 'אולפנה', 'רגבים'
];

export const INST_ICONS = [
  '🏘️', '🏘️', '🏫', '🌾', '🌅', '☀️', '📚', '🕍',
  '🕍', '📖', '🌿', '✡️', '🌱'
];

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
    onData(appData);
  });
}

// ── Password ──
export function getPass() {
  return localStorage.getItem(PASS_KEY) || '';
}

export async function syncPassFromFirebase() {
  if (!fb.isConfigured() || !fb.isReady()) return;
  try {
    const snap = await fb.dbGet('data/adminPass');
    if (snap.exists()) {
      const fbPass = snap.val();
      if (fbPass) localStorage.setItem(PASS_KEY, fbPass);
    }
  } catch (e) {
    console.warn('Could not sync password:', e);
  }
}

// ── Procedure Items ──
export function getProcItems(type) {
  const items = (appData.procItems || {})[type];
  if (items && items.length) return items;
  if (type === 'police') return DEFAULT_POLICE_PROCS.map(d => ({ ...d, urls: [] }));
  if (type === 'education') return DEFAULT_EDUCATION_PROCS.map(d => ({ ...d, urls: [] }));
  return DEFAULT_ROUTINE_PROCS.map(d => ({ ...d, urls: [] }));
}
