/* ══════════════════════════════════════════
   Route Viewer — Public route display
   ══════════════════════════════════════════ */

import { appData, INSTS, currentInst } from '../store.js';
import { escHtml } from '../utils/helpers.js';

let viewPlayTimer = null;

function buildViewPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
  }
  d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  return d;
}

/** Render published route map */
export function renderMap() {
  if (viewPlayTimer) { clearInterval(viewPlayTimer); viewPlayTimer = null; }

  const pub = (appData.publishedRoutes || {})[currentInst];
  const el = document.getElementById('map-content');
  if (!el) return;

  if (!pub || !pub.image) {
    el.innerHTML = `
      <div class="map-placeholder">
        <div class="mpi">🗺️</div>
        <p>מסלול סריקה עבור<br><span class="mp-name">${escHtml(INSTS[currentInst])}</span><br>טרם פורסם</p>
        <p class="mp-hint">קב"ט — הכן ופרסם מסלול דרך לוח הבקרה</p>
      </div>`;
    return;
  }

  const wps = pub.waypoints || [];
  const pathD = buildViewPath(wps);

  let wpMarkersHTML = '';
  wps.forEach((pt, i) => {
    const n = wps.length;
    const isStart = i === 0;
    const isEnd = i === n - 1 && n > 1;

    if (isStart) {
      wpMarkersHTML += `
        <div style="position:absolute;left:${pt.x}%;top:${pt.y}%;transform:translate(-50%,-100%);z-index:15;pointer-events:none">
          <div style="background:linear-gradient(135deg,#f0c040,#c8992a);width:28px;height:28px;border-radius:50% 50% 50% 4px;
               display:flex;align-items:center;justify-content:center;
               box-shadow:0 0 0 3px rgba(240,192,64,.4),0 3px 10px rgba(0,0,0,.6)">
            <span style="font-size:.7rem;font-weight:900;color:#07111e">▶</span>
          </div>
          <div style="background:rgba(10,20,40,.92);border:1px solid rgba(240,192,64,.4);border-radius:5px;
               padding:2px 7px;font-size:.6rem;font-weight:700;color:#f0c040;white-space:nowrap;
               margin-top:2px;text-align:center">תחילת סריקה</div>
        </div>`;
    } else if (isEnd) {
      wpMarkersHTML += `
        <div style="position:absolute;left:${pt.x}%;top:${pt.y}%;transform:translate(-50%,-100%);z-index:15;pointer-events:none">
          <div style="background:linear-gradient(135deg,#2ecc71,#1a8a4a);width:28px;height:28px;border-radius:50% 50% 50% 4px;
               display:flex;align-items:center;justify-content:center;
               box-shadow:0 0 0 3px rgba(46,204,113,.4),0 3px 10px rgba(0,0,0,.6)">
            <span style="font-size:.7rem;font-weight:900;color:#fff">■</span>
          </div>
          <div style="background:rgba(10,20,40,.92);border:1px solid rgba(46,204,113,.4);border-radius:5px;
               padding:2px 7px;font-size:.6rem;font-weight:700;color:#2ecc71;white-space:nowrap;
               margin-top:2px;text-align:center">סוף סריקה</div>
        </div>`;
    } else {
      wpMarkersHTML += `
        <div style="position:absolute;left:${pt.x}%;top:${pt.y}%;transform:translate(-50%,-50%);z-index:14;pointer-events:none">
          <div style="width:11px;height:11px;border-radius:50%;background:#4a8fd4;
               box-shadow:0 0 0 2px rgba(74,143,212,.4),0 2px 5px rgba(0,0,0,.5);
               display:flex;align-items:center;justify-content:center">
            <span style="font-size:.45rem;font-weight:900;color:#fff">${i}</span>
          </div>
        </div>`;
    }
  });

  const guardSvg = `<svg width="36" height="36" viewBox="0 0 36 36">
    <ellipse cx="18" cy="8" rx="7" ry="4.8" fill="#1a3a6b"/>
    <rect x="11" y="10.5" width="14" height="2.3" rx="1.2" fill="#1a3a6b"/>
    <circle cx="18" cy="13" r="4.8" fill="#FFD180"/>
    <rect x="11.5" y="17.5" width="13" height="10.5" rx="2.8" fill="#1e4d8c"/>
    <rect x="11.5" y="20" width="13" height="2.2" fill="#e8b84b" opacity=".9"/>
    <rect x="11.5" y="24" width="13" height="2.2" fill="#e8b84b" opacity=".9"/>
    <rect x="5.5" y="17.5" width="6" height="8" rx="2.3" fill="#1e4d8c"/>
    <rect x="24.5" y="17.5" width="6" height="8" rx="2.3" fill="#1e4d8c"/>
    <circle cx="8.5" cy="26.5" r="1.9" fill="#FFD180"/>
    <circle cx="27.5" cy="26.5" r="1.9" fill="#FFD180"/>
    <rect x="12.5" y="28" width="4.5" height="7" rx="2" fill="#0d2240"/>
    <rect x="19" y="28" width="4.5" height="7" rx="2" fill="#0d2240"/>
    <rect x="11.5" y="33" width="6" height="3" rx="1.5" fill="#111"/>
    <rect x="18.5" y="33" width="6" height="3" rx="1.5" fill="#111"/>
  </svg>`;

  el.innerHTML = `
    <div style="position:relative;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.5)">
      <img src="${pub.image}" alt="מסלול סריקה" style="width:100%;display:block">
      <svg style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none"
           viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="vg"><feGaussianBlur stdDeviation="0.4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <marker id="va" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0.6 L4,2.5 L0,4.4 L1.2,2.5 Z" fill="#e8b84b" opacity=".9"/></marker>
        </defs>
        <path d="${pathD}" fill="none" stroke="rgba(232,184,75,.18)" stroke-width="2.2" stroke-linecap="round"/>
        <path d="${pathD}" fill="none" stroke="#e8b84b" stroke-width="0.7"
              stroke-linecap="round" stroke-linejoin="round"
              filter="url(#vg)" marker-mid="url(#va)" opacity=".94"/>
      </svg>
      ${wpMarkersHTML}
      <div id="view-guard-pulse" style="display:none;position:absolute;width:44px;height:44px;border-radius:50%;
           background:radial-gradient(circle,rgba(232,184,75,.5) 0%,transparent 70%);
           transform:translate(-50%,-50%);z-index:19;pointer-events:none;
           animation:re-pulse-anim 1.3s ease-in-out infinite"></div>
      <div id="view-guard" style="display:none;position:absolute;transform:translate(-50%,-50%);z-index:20;pointer-events:none;
           filter:drop-shadow(0 3px 8px rgba(0,0,0,.8))">${guardSvg}</div>
    </div>
    <div style="margin-top:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <button id="view-play-btn"
              style="padding:10px 22px;background:var(--accent);color:#07111e;border:none;border-radius:8px;
                     font-family:'Heebo',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer;
                     box-shadow:0 2px 10px rgba(232,184,75,.3);transition:.15s">
        ▶ הפעל סריקה
      </button>
      <button id="view-stop-btn" style="display:none;
              padding:10px 18px;background:rgba(255,255,255,.08);color:var(--text);border:1px solid rgba(255,255,255,.15);
              border-radius:8px;font-family:'Heebo',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer">
        ⏹ עצור
      </button>
      <div id="view-playbar" style="display:none;flex:1;min-width:120px">
        <div style="height:5px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden">
          <div id="view-prog-fill" style="height:100%;background:linear-gradient(90deg,var(--blue),var(--accent));
               border-radius:99px;width:0%;transition:width .25s"></div>
        </div>
        <div style="font-size:.68rem;color:var(--muted);margin-top:4px" id="view-prog-lbl"></div>
      </div>
    </div>`;

  // Bind play/stop buttons
  const playBtn = document.getElementById('view-play-btn');
  const stopBtn = document.getElementById('view-stop-btn');
  if (playBtn) playBtn.addEventListener('click', () => viewStartPlay(currentInst));
  if (stopBtn) stopBtn.addEventListener('click', viewStopPlay);
}

function viewStartPlay(inst) {
  const pub = (appData.publishedRoutes || {})[inst];
  if (!pub || (pub.waypoints || []).length < 2) return;

  if (viewPlayTimer) { clearInterval(viewPlayTimer); viewPlayTimer = null; }

  const wps = pub.waypoints;
  const g = document.getElementById('view-guard');
  const p = document.getElementById('view-guard-pulse');
  const pb = document.getElementById('view-playbar');
  const pf = document.getElementById('view-prog-fill');
  const pl = document.getElementById('view-prog-lbl');
  const playBtn = document.getElementById('view-play-btn');
  const stopBtn = document.getElementById('view-stop-btn');
  if (!g) return;

  g.style.display = 'block';
  p.style.display = 'block';
  if (pb) pb.style.display = 'flex';
  if (playBtn) playBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'block';

  const INTERP = 30;
  const pts = [];
  for (let i = 0; i < wps.length - 1; i++) {
    for (let t = 0; t < INTERP; t++) {
      const f = t / INTERP;
      pts.push({ x: wps[i].x + (wps[i + 1].x - wps[i].x) * f, y: wps[i].y + (wps[i + 1].y - wps[i].y) * f, wi: i });
    }
  }
  pts.push({ ...wps[wps.length - 1], wi: wps.length - 1 });

  let idx = 0;
  const move = () => {
    const pt = pts[idx];
    g.style.left = pt.x + '%'; g.style.top = pt.y + '%';
    p.style.left = pt.x + '%'; p.style.top = pt.y + '%';
    const ni = Math.min(idx + 1, pts.length - 1);
    if (ni !== idx) {
      const np = pts[ni];
      const ang = Math.atan2(np.y - pt.y, np.x - pt.x) * 180 / Math.PI + 90;
      const svg = g.querySelector('svg');
      if (svg) svg.style.transform = `rotate(${ang}deg)`;
    }
    const pct = Math.round(pt.wi / (wps.length - 1) * 100);
    if (pf) pf.style.width = pct + '%';
    if (pl) pl.textContent = `נקודה ${pt.wi + 1} / ${wps.length}`;
  };
  move();

  viewPlayTimer = setInterval(() => {
    idx++;
    if (idx >= pts.length) {
      clearInterval(viewPlayTimer); viewPlayTimer = null;
      if (pl) pl.textContent = '✅ הסריקה הושלמה';
      if (g) g.style.display = 'none';
      if (p) p.style.display = 'none';
      if (playBtn) { playBtn.textContent = '↺ הפעל שוב'; playBtn.style.display = 'block'; }
      if (stopBtn) stopBtn.style.display = 'none';
      return;
    }
    move();
  }, 40);
}

function viewStopPlay() {
  if (viewPlayTimer) { clearInterval(viewPlayTimer); viewPlayTimer = null; }
  const g = document.getElementById('view-guard');
  const p = document.getElementById('view-guard-pulse');
  const playBtn = document.getElementById('view-play-btn');
  const stopBtn = document.getElementById('view-stop-btn');
  const pb = document.getElementById('view-playbar');
  if (g) g.style.display = 'none';
  if (p) p.style.display = 'none';
  if (pb) pb.style.display = 'none';
  if (playBtn) { playBtn.textContent = '▶ הפעל סריקה'; playBtn.style.display = 'block'; }
  if (stopBtn) stopBtn.style.display = 'none';
}
