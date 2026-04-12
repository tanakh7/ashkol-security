/* ══════════════════════════════════════════
   Procedures Component
   ══════════════════════════════════════════ */

import { appData, getProcItems } from '../store.js';
import { escHtml } from '../utils/helpers.js';

/** Render a single procedure card */
function procCard(num, title, urls, text, fileKey) {
  const pfRaw = (appData.procFiles || {})[fileKey] || null;
  const pfArr = pfRaw ? (Array.isArray(pfRaw) ? pfRaw : [pfRaw]) : [];
  const urlArr2 = Array.isArray(urls) ? urls : (urls ? [urls] : []);
  const avail = !!(urlArr2.length || text || pfArr.length);

  const badge = avail
    ? `<span class="proc-badge ok">זמין</span>`
    : `<span class="proc-badge pend">ממתין להשלמה</span>`;

  let body = '';
  const filesHTML = pfArr.map(f =>
    `<a class="proc-link" href="${f.data}" target="_blank" download="${escHtml(f.name)}" style="display:block;margin-top:5px">
      📎 ${escHtml(f.name)}</a>`
  ).join('');

  if (pfArr.length) {
    body = `<p>${escHtml(title)}</p>${filesHTML}`;
    if (urls) body += `<a class="proc-link" href="${escHtml(urls)}" target="_blank" style="display:block;margin-top:5px">📄 פתח קישור נוסף</a>`;
  } else if (urls) {
    const urlArr = Array.isArray(urls) ? urls : [urls];
    const linksHTML = urlArr.map((item, i) => {
      const u = (typeof item === 'object') ? item.url : item;
      const name = (typeof item === 'object' && item.name) ? item.name :
        u.includes('drive.google.com') ? 'Google Drive' :
        u.includes('police.gov.il') ? 'נוהל פתיחה באש' : `מסמך ${i + 1}`;
      const icon = u.includes('drive.google.com') ? '📁' : '📄';
      return `<a class="proc-link" href="${escHtml(u)}" target="_blank" style="display:block;margin-top:5px">${icon} ${escHtml(name)}</a>`;
    }).join('');
    body = `<p>${escHtml(title)}</p>${linksHTML}`;
  } else if (text) {
    body = `<p>${escHtml(text).replace(/\n/g, '<br>')}</p>`;
  } else {
    body = `<p style="color:#e07b6f">נוהל זה טרם הועלה למערכת.</p>`;
  }

  return `
    <div class="proc-card" onclick="this.classList.toggle('open')">
      <div class="proc-head">
        <div class="proc-head-r">
          <div class="proc-n">${num}</div>
          <div class="proc-name">${escHtml(title)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${badge}
          <span class="proc-chev">▼</span>
        </div>
      </div>
      <div class="proc-body">${body}</div>
    </div>`;
}

/** Render all procedures (combined view) */
export function renderAllProcs() {
  const policeItems = getProcItems('police');
  const routineItems = getProcItems('routine');
  const educationItems = getProcItems('education');

  let html = '';
  html += `<div class="proc-section-label">👮 נהלי משטרה</div>`;
  html += `<div class="proc-list">${policeItems.map((item, i) => procCard(i + 1, item.title, item.urls || [], null, item.key)).join('')}</div>`;

  html += `<div class="proc-section-label" style="margin-top:24px">📋 נהלי שגרה</div>`;
  html += `<div class="proc-list">${routineItems.map((item, i) => procCard(i + 1, item.title, item.urls || [], null, item.key)).join('')}</div>`;

  html += `<div class="proc-section-label" style="margin-top:24px">🎓 נהלי משרד החינוך</div>`;
  html += `<div class="proc-list">${educationItems.map((item, i) => procCard(i + 1, item.title, item.urls || [], null, item.key)).join('')}</div>`;

  const el = document.getElementById('all-procs');
  if (el) el.innerHTML = html;
}
