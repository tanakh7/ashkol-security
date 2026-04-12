/* ══════════════════════════════════════════
   Main Entry Point
   מערכת אבטחה — מוסדות חינוך אשכול
   ══════════════════════════════════════════ */

// Styles
import './styles/index.css';

// Core modules
import * as fb from './firebase.js';
import {
  INSTS, INST_ICONS, appData,
  setCurrentInst, currentInst,
  loadFromLocal, startListening, syncPassFromFirebase, verifyPassword,
} from './store.js';
import { showPage, goHome, switchTab } from './router.js';

// Components
import { renderPhones } from './components/phones.js';
import { renderAllProcs } from './components/procedures.js';
import { renderCommander } from './components/commander.js';
import { renderMap } from './components/routeViewer.js';
import { initAdmin, buildAdminUI } from './pages/admin.js';

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
  buildInstGrid();
  bindGlobalEvents();
  initAdmin();
  initFirebaseAndLoad();
});

// ── Firebase Init ──
async function initFirebaseAndLoad() {
  const ok = fb.initFirebase();

  if (ok) {
    await syncPassFromFirebase();
  }

  if (!ok || !fb.isConfigured()) {
    loadFromLocal();
    hideLoading();
    return;
  }

  startListening(() => {
    hideLoading();
    updateConnStatus(true);
  });

  // Fallback timeout
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls && !ls.classList.contains('hidden')) {
      loadFromLocal();
      hideLoading();
    }
  }, 4000);
}

// ── Loading Screen ──
function hideLoading() {
  const l = document.getElementById('loading-screen');
  if (!l) return;
  l.classList.add('hidden');
  setTimeout(() => l.style.display = 'none', 500);

  // URL routing: ?inst=N opens directly
  const p = new URLSearchParams(window.location.search);
  const inst = p.get('inst');
  if (inst !== null && !isNaN(inst) && +inst >= 0 && +inst < INSTS.length) {
    openInst(+inst);
  }
}

function updateConnStatus(online) {
  const el = document.getElementById('conn-indicator');
  const txt = document.getElementById('conn-text');
  if (!el || !txt) return;
  el.className = 'conn-status ' + (online ? 'online' : 'offline');
  txt.textContent = online ? 'מחובר — נתונים מעודכנים' : 'לא מחובר';
}

// ── Build Institution Grid ──
function buildInstGrid() {
  const grid = document.getElementById('inst-grid');
  if (!grid) return;

  grid.innerHTML = INSTS.map((name, idx) => `
    <div class="inst-card" tabindex="0" role="button" aria-label="פתח ${name}" data-inst="${idx}">
      <div class="inst-icon">${INST_ICONS[idx]}</div>
      <div class="inst-name">${name}</div>
      <div class="inst-cta">← פתח</div>
    </div>
  `).join('');

  grid.addEventListener('click', e => {
    const card = e.target.closest('.inst-card');
    if (card) openInst(+card.dataset.inst);
  });
  grid.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.inst-card');
      if (card) { e.preventDefault(); openInst(+card.dataset.inst); }
    }
  });
}

// ── Open Institution ──
function openInst(idx) {
  setCurrentInst(idx);
  const title = document.getElementById('inst-title');
  if (title) title.textContent = INSTS[idx];
  switchTab(0, onTabSwitch);
  showPage('inst-page');
}

function onTabSwitch(idx) {
  if (idx === 0) renderMap();
  if (idx === 1) renderAllProcs();
  if (idx === 2) renderCommander();
  if (idx === 3) renderPhones();
}

// ── Bind Global Events ──
function bindGlobalEvents() {
  // Logo → Home
  document.getElementById('logo-home')?.addEventListener('click', goHome);

  // Back button
  document.getElementById('btn-back')?.addEventListener('click', goHome);

  // Tab navigation
  document.getElementById('tabs-nav')?.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (tab) switchTab(+tab.dataset.tab, onTabSwitch);
  });

  // Admin trigger
  document.getElementById('btn-admin')?.addEventListener('click', openAdminLogin);

  // Admin login
  document.getElementById('btn-login')?.addEventListener('click', doLogin);
  document.getElementById('btn-cancel')?.addEventListener('click', closeOverlay);
  document.getElementById('pass-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  // Admin logout
  document.getElementById('btn-logout')?.addEventListener('click', () => goHome());
}

// ── Admin Auth ──
function openAdminLogin() {
  const overlay = document.getElementById('admin-overlay');
  if (!overlay) return;
  overlay.classList.add('show');
  const passInput = document.getElementById('pass-input');
  if (passInput) { passInput.value = ''; }
  const errEl = document.getElementById('pass-err');
  if (errEl) errEl.textContent = '';
  setTimeout(() => passInput?.focus(), 100);
}

function closeOverlay() {
  document.getElementById('admin-overlay')?.classList.remove('show');
}

async function doLogin() {
  const entered = document.getElementById('pass-input')?.value || '';
  const btnLogin = document.getElementById('btn-login');
  const errEl = document.getElementById('pass-err');

  // Show loading state
  if (btnLogin) { btnLogin.textContent = 'מאמת...'; btnLogin.disabled = true; }
  if (errEl) errEl.textContent = '';

  const isValid = await verifyPassword(entered);

  if (btnLogin) { btnLogin.textContent = 'כניסה'; btnLogin.disabled = false; }

  if (isValid) {
    closeOverlay();
    buildAdminUI();
    showPage('admin-page');
    if (!fb.isConfigured()) {
      const card = document.getElementById('firebase-setup-card');
      if (card) card.style.display = 'block';
    }
  } else {
    const errEl = document.getElementById('pass-err');
    if (errEl) errEl.textContent = 'סיסמה שגויה';
  }
}
