/* ══════════════════════════════════════════
   Route Editor — Admin-only map editor
   ══════════════════════════════════════════ */

import { appData, selMapInst, saveLocal, persist } from '../store.js';
import { getEl, compressImage, flash } from '../utils/helpers.js';
import * as fb from '../firebase.js';

let reWaypoints = [];
let reRedoStack = [];
let reImageLoaded = false;
let rePlaying = false;
let reTimer = null;
let reInterpPts = [];
let reInterpIdx = 0;
let rePlayStep = 0;
let reStepMs = 600;
const RE_INTERP = 30;

/** Initialize route editor event listeners */
export function initRouteEditor() {
  const canvas = document.getElementById('re-canvas');
  if (!canvas) return;

  canvas.addEventListener('click', reOnClick);
  canvas.addEventListener('mousemove', reOnHover);
  canvas.addEventListener('touchend', reOnTouch, { passive: false });

  document.getElementById('re-upload-btn')?.addEventListener('click', reUpload);
  document.getElementById('re-placeholder-btn')?.addEventListener('click', reUpload);
  document.getElementById('re-file-input')?.addEventListener('change', reLoadImage);
  document.getElementById('re-undo-btn')?.addEventListener('click', reUndo);
  document.getElementById('re-redo-btn')?.addEventListener('click', reRedo);
  document.getElementById('re-clear-btn')?.addEventListener('click', reClear);
  document.getElementById('re-play-btn')?.addEventListener('click', reStartPlay);
  document.getElementById('re-stop-btn')?.addEventListener('click', reStopPlay);
  document.getElementById('re-speed')?.addEventListener('input', e => reUpdateSpeed(e.target.value));
  document.getElementById('btn-publish-route')?.addEventListener('click', publishRoute);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (!document.getElementById('admin-page')?.classList.contains('active')) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); reUndo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); reRedo(); }
  });
}

/** Load saved route for institution */
export function reLoadForInst(idx) {
  clearInterval(reTimer);
  rePlaying = false;
  reInterpIdx = 0;
  reClearSilent();

  const saved = (appData.publishedRoutes || {})[idx] || (appData.routes || {})[idx];
  if (saved) {
    reWaypoints = (saved.waypoints || []).map(p => ({ x: p.x, y: p.y }));
    reRedoStack = [];
    if (saved.image) {
      getEl('re-img', img => { img.src = saved.image; img.style.display = 'block'; });
      getEl('re-placeholder', ph => ph.classList.add('hidden'));
      reImageLoaded = true;
    }
    reRenderDots();
    reRenderRoute();
    getEl('re-pt-count', el => el.textContent = reWaypoints.length);
    getEl('re-redo-btn', el => el.style.opacity = '.4');
  }

  // Reset playback UI
  getEl('re-guard', el => el.style.display = 'none');
  getEl('re-pulse', el => el.style.display = 'none');
  getEl('re-play-btn', el => { el.innerHTML = '▶ תצוגה מקדימה'; el.style.display = 'flex'; });
  getEl('re-stop-btn', el => el.style.display = 'none');
  getEl('re-playbar', el => el.style.display = 'none');
  getEl('re-step-num', el => el.textContent = '—');
  getEl('re-step-txt', el => el.textContent = 'לחץ "תצוגה מקדימה" לבדיקה');
  getEl('re-prog-fill', el => el.style.width = '0%');
  getEl('re-prog-pct', el => el.textContent = '0%');
  getEl('re-prog-pts', el => el.textContent = '0/0');
  getEl('re-canvas', el => {
    el.classList.remove('playing');
    el.querySelectorAll('.wp-dot').forEach(d => d.style.opacity = '1');
  });
  getEl('re-prev', el => el.setAttribute('display', 'none'));
}

function reUpload() { document.getElementById('re-file-input')?.click(); }

function reLoadImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('re-img');
    if (img) { img.src = e.target.result; img.style.display = 'block'; }
    getEl('re-placeholder', ph => ph.classList.add('hidden'));
    reImageLoaded = true;
    reClear();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function reEventToPercent(e) {
  const rect = document.getElementById('re-canvas').getBoundingClientRect();
  let cx = e.clientX, cy = e.clientY;
  if (e.changedTouches) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; }
  return {
    x: Math.max(0, Math.min(100, (cx - rect.left) / rect.width * 100)),
    y: Math.max(0, Math.min(100, (cy - rect.top) / rect.height * 100))
  };
}

function reOnClick(e) {
  if (!reImageLoaded || rePlaying) return;
  if (e.target.classList.contains('wp-dot') || e.target.closest('.wp-dot')) return;
  const { x, y } = reEventToPercent(e);
  reRedoStack = [];
  reWaypoints.push({ x, y });
  reRenderDots();
  reRenderRoute();
  getEl('re-pt-count', el => el.textContent = reWaypoints.length);
  getEl('re-redo-btn', el => el.style.opacity = '.4');
  reAutoSave();
}

function reOnTouch(e) { e.preventDefault(); reOnClick(e); }

function reOnHover(e) {
  getEl('re-prev', prev => {
    if (!reImageLoaded || rePlaying || reWaypoints.length === 0) { prev.setAttribute('display', 'none'); return; }
    const { x, y } = reEventToPercent(e);
    const last = reWaypoints[reWaypoints.length - 1];
    prev.setAttribute('display', 'block');
    prev.setAttribute('x1', last.x); prev.setAttribute('y1', last.y);
    prev.setAttribute('x2', x); prev.setAttribute('y2', y);
  });
}

function reRenderDots() {
  const canvas = document.getElementById('re-canvas');
  if (!canvas) return;
  canvas.querySelectorAll('.wp-dot').forEach(d => d.remove());

  reWaypoints.forEach((pt, i) => {
    const n = reWaypoints.length;
    const isStart = i === 0;
    const isEnd = i === n - 1 && n > 1;

    const dot = document.createElement('div');
    dot.className = `wp-dot ${isStart ? 'wp-start' : isEnd ? 'wp-end' : 'wp-mid'}`;
    dot.style.left = pt.x + '%';
    dot.style.top = pt.y + '%';

    if (isStart || isEnd) {
      const lbl = document.createElement('div');
      lbl.className = 'wp-label ' + (isStart ? 'start-lbl' : 'end-lbl');
      lbl.textContent = isStart ? '▶ תחילת סריקה' : '⬛ סוף סריקה';
      dot.appendChild(lbl);
    }

    const inner = document.createElement('div');
    inner.className = 'wp-num';
    if (isStart) inner.textContent = '▶';
    else if (isEnd) inner.textContent = '■';
    else inner.textContent = i;
    dot.appendChild(inner);

    const del = document.createElement('div');
    del.className = 'wp-delete';
    del.textContent = '✕';
    del.title = 'מחק נקודה';
    del.addEventListener('mousedown', ev => ev.stopPropagation());
    del.addEventListener('click', ev => {
      ev.stopPropagation();
      reRedoStack = [];
      reWaypoints.splice(i, 1);
      reRenderDots(); reRenderRoute();
      getEl('re-pt-count', el => el.textContent = reWaypoints.length);
      reAutoSave();
    });
    dot.appendChild(del);

    dot.addEventListener('dblclick', ev => { ev.stopPropagation(); del.click(); });

    reMakeDraggable(dot, i);
    canvas.appendChild(dot);
  });
}

function reMakeDraggable(dot, idx) {
  let dragging = false;
  const start = e => { e.stopPropagation(); dragging = true; };
  const move = e => {
    if (!dragging) return; e.preventDefault();
    const { x, y } = reEventToPercent(e);
    reWaypoints[idx] = { x, y };
    dot.style.left = x + '%'; dot.style.top = y + '%';
    reRenderRoute();
  };
  const end = () => { if (!dragging) return; dragging = false; reRenderDots(); reRenderRoute(); reAutoSave(); };
  dot.addEventListener('mousedown', start);
  dot.addEventListener('touchstart', start, { passive: true });
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('mouseup', end);
  window.addEventListener('touchend', end);
}

function reBuildPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
  }
  d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  return d;
}

function reRenderRoute() {
  const d = reBuildPath(reWaypoints);
  getEl('re-route', el => el.setAttribute('d', d));
  getEl('re-halo', el => el.setAttribute('d', d));
}

function reUndo() {
  if (reWaypoints.length === 0) return;
  reRedoStack.push(reWaypoints.pop());
  reRenderDots(); reRenderRoute();
  getEl('re-pt-count', el => el.textContent = reWaypoints.length);
  getEl('re-prev', el => el.setAttribute('display', 'none'));
  getEl('re-redo-btn', el => el.style.opacity = '1');
  reAutoSave();
}

function reRedo() {
  if (reRedoStack.length === 0) return;
  reWaypoints.push(reRedoStack.pop());
  reRenderDots(); reRenderRoute();
  getEl('re-pt-count', el => el.textContent = reWaypoints.length);
  if (reRedoStack.length === 0) getEl('re-redo-btn', el => el.style.opacity = '.4');
  reAutoSave();
}

function reClear() {
  reRedoStack = [];
  reWaypoints = [];
  reRenderDots(); reRenderRoute();
  getEl('re-pt-count', el => el.textContent = 0);
  getEl('re-prev', el => el.setAttribute('display', 'none'));
  getEl('re-redo-btn', el => el.style.opacity = '.4');
  reStopPlay();
  reAutoSave();
}

function reClearSilent() {
  reWaypoints = []; reRedoStack = []; reImageLoaded = false;
  getEl('re-canvas', el => el.querySelectorAll('.wp-dot').forEach(d => d.remove()));
  getEl('re-route', el => el.setAttribute('d', ''));
  getEl('re-halo', el => el.setAttribute('d', ''));
  getEl('re-pt-count', el => el.textContent = 0);
  getEl('re-img', el => { el.src = ''; el.style.display = 'none'; });
  getEl('re-placeholder', el => el.classList.remove('hidden'));
}

async function reAutoSave() {
  appData.routes = appData.routes || {};
  const img = document.getElementById('re-img');
  appData.routes[selMapInst] = { waypoints: reWaypoints, image: reImageLoaded ? img?.src : null };
  const routeForFirebase = { waypoints: reWaypoints };
  if (fb.isConfigured() && fb.isReady()) {
    try { await fb.dbSet('data/routes/' + selMapInst, routeForFirebase); } catch (e) {}
  }
  saveLocal();
}

// ── Playback ──
function reBuildInterp(pts) {
  if (pts.length < 2) return [];
  const res = [];
  for (let i = 0; i < pts.length - 1; i++) {
    for (let t = 0; t < RE_INTERP; t++) {
      const f = t / RE_INTERP;
      res.push({ x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f, wpIdx: i });
    }
  }
  res.push({ ...pts[pts.length - 1], wpIdx: pts.length - 1 });
  return res;
}

function reStartPlay() {
  if (!reImageLoaded) { alert('העלה תמונה תחילה'); return; }
  if (reWaypoints.length < 2) { alert('סמן לפחות 2 נקודות'); return; }
  rePlaying = true; reInterpIdx = 0; rePlayStep = 0;
  reInterpPts = reBuildInterp(reWaypoints);
  getEl('re-canvas', el => { el.querySelectorAll('.wp-dot').forEach(d => d.style.opacity = '.3'); el.classList.add('playing'); });
  getEl('re-prev', el => el.setAttribute('display', 'none'));
  getEl('re-guard', el => el.style.display = 'block');
  getEl('re-pulse', el => el.style.display = 'block');
  getEl('re-play-btn', el => el.style.display = 'none');
  getEl('re-stop-btn', el => el.style.display = 'flex');
  getEl('re-playbar', el => el.style.display = 'flex');
  reMoveGuard(reInterpPts[0]);
  const frameMs = reStepMs / RE_INTERP;
  reTimer = setInterval(() => {
    reInterpIdx++;
    if (reInterpIdx >= reInterpPts.length) { reFinishPlay(); return; }
    reMoveGuard(reInterpPts[reInterpIdx]);
    const wp = reInterpPts[reInterpIdx].wpIdx;
    if (wp !== rePlayStep) {
      rePlayStep = wp;
      getEl('re-step-num', el => el.textContent = wp + 1);
      getEl('re-step-txt', el => el.textContent = `נקודה ${wp + 1} מתוך ${reWaypoints.length}`);
      const pct = Math.round(wp / (reWaypoints.length - 1) * 100);
      getEl('re-prog-fill', el => el.style.width = pct + '%');
      getEl('re-prog-pct', el => el.textContent = pct + '%');
      getEl('re-prog-pts', el => el.textContent = `${wp + 1}/${reWaypoints.length}`);
    }
  }, frameMs);
}

function reMoveGuard(pt) {
  const g = document.getElementById('re-guard'), p = document.getElementById('re-pulse');
  if (!g || !p) return;
  g.style.left = pt.x + '%'; g.style.top = pt.y + '%';
  p.style.left = pt.x + '%'; p.style.top = pt.y + '%';
  const ni = Math.min(reInterpIdx + 1, reInterpPts.length - 1);
  if (ni !== reInterpIdx) {
    const np = reInterpPts[ni];
    const ang = Math.atan2(np.y - pt.y, np.x - pt.x) * 180 / Math.PI + 90;
    const svg = g.querySelector('svg');
    if (svg) svg.style.transform = `rotate(${ang}deg)`;
  }
}

function reFinishPlay() {
  clearInterval(reTimer); rePlaying = false;
  getEl('re-step-num', el => el.textContent = reWaypoints.length);
  getEl('re-step-txt', el => el.textContent = '✅ הסריקה הושלמה!');
  getEl('re-prog-fill', el => el.style.width = '100%');
  getEl('re-prog-pct', el => el.textContent = '100%');
  getEl('re-play-btn', el => { el.innerHTML = '↺ מחדש'; el.style.display = 'flex'; });
  getEl('re-stop-btn', el => el.style.display = 'none');
  getEl('re-canvas', el => {
    el.classList.remove('playing');
    el.querySelectorAll('.wp-dot').forEach(d => d.style.opacity = '1');
  });
}

function reStopPlay() {
  clearInterval(reTimer); rePlaying = false;
  getEl('re-guard', el => el.style.display = 'none');
  getEl('re-pulse', el => el.style.display = 'none');
  getEl('re-play-btn', el => { el.innerHTML = '▶ תצוגה מקדימה'; el.style.display = 'flex'; });
  getEl('re-stop-btn', el => el.style.display = 'none');
  getEl('re-playbar', el => el.style.display = 'none');
  getEl('re-canvas', el => {
    el.classList.remove('playing');
    el.querySelectorAll('.wp-dot').forEach(d => d.style.opacity = '1');
  });
}

function reUpdateSpeed(val) {
  getEl('re-speed-lbl', el => el.textContent = '×' + val);
  reStepMs = Math.round(1800 / val);
  if (rePlaying) {
    clearInterval(reTimer);
    const frameMs = reStepMs / RE_INTERP;
    reTimer = setInterval(() => {
      reInterpIdx++;
      if (reInterpIdx >= reInterpPts.length) { reFinishPlay(); return; }
      reMoveGuard(reInterpPts[reInterpIdx]);
    }, frameMs);
  }
}

async function publishRoute() {
  if (!reImageLoaded) { alert('העלה תמונה תחילה'); return; }
  if (reWaypoints.length < 2) { alert('סמן לפחות 2 נקודות לפני פרסום'); return; }

  const btn = document.getElementById('btn-publish-route');
  if (btn) { btn.textContent = '⏳ שומר...'; btn.disabled = true; }

  const img = document.getElementById('re-img');
  const compressed = await compressImage(img.src, 800, 600, 0.5);
  const sizeKB = Math.round(compressed.length * 0.75 / 1024);

  appData.publishedRoutes = appData.publishedRoutes || {};
  appData.publishedRoutes[selMapInst] = { waypoints: reWaypoints, image: compressed };

  if (fb.isConfigured() && fb.isReady()) {
    try {
      await fb.dbSet('data/publishedRoutes/' + selMapInst + '/waypoints', reWaypoints);
      if (sizeKB < 3000) {
        await fb.dbSet('data/publishedRoutes/' + selMapInst + '/image', compressed);
      }
    } catch (e) {
      console.error('Firebase save error:', e);
    }
  }

  saveLocal();
  if (btn) { btn.textContent = '🚀 פרסם מסלול'; btn.disabled = false; }
  flash('ok-map');
}
