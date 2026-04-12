/* ══════════════════════════════════════════
   Commander Messages Component
   ══════════════════════════════════════════ */

import { appData, persist } from '../store.js';
import { escHtml } from '../utils/helpers.js';

/** Render commander messages (public view) */
export function renderCommander() {
  const msgs = appData.commanderMsgs || [];
  const text = appData.commanderText || '';
  const el = document.getElementById('commander-content');
  if (!el) return;

  const readerName = localStorage.getItem('sec_reader_name') || '';
  let html = '';

  // Reader name bar
  html += `
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;
       padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <span style="font-size:.85rem;color:var(--muted);white-space:nowrap">👤 שמך:</span>
    <input id="reader-name-input" type="text" placeholder="הזן שם פרטי לאישור קריאה..."
           value="${escHtml(readerName)}"
           style="flex:1;min-width:140px;padding:7px 12px;background:rgba(255,255,255,.05);border:1px solid var(--border);
                  border-radius:7px;color:var(--text);font-family:'Heebo',sans-serif;font-size:.88rem;outline:none"
           oninput="localStorage.setItem('sec_reader_name',this.value)">
    ${readerName ? `<span style="font-size:.78rem;color:#5dd98a">✓ שם שמור</span>` : ''}
  </div>`;

  // Commander free text
  if (text) {
    html += `
    <div style="background:linear-gradient(135deg,var(--surface2),var(--blue));
         border:1px solid rgba(232,184,75,.25);border-right:4px solid var(--accent);
         border-radius:14px;padding:18px 20px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:1.2rem">📢</span>
        <span style="font-size:.8rem;font-weight:700;color:var(--accent);letter-spacing:.05em">דבר הקב"ט</span>
      </div>
      <div style="font-size:.92rem;line-height:1.85;color:var(--text);white-space:pre-wrap">${escHtml(text)}</div>
    </div>`;
  }

  // Empty state
  if (!msgs.length && !text) {
    el.innerHTML = `
      <div class="map-placeholder">
        <div class="mpi">📢</div>
        <p>אין הודעות כרגע</p>
        <p class="mp-hint">הודעות יתפרסמו ע"י הקב"ט בעת הצורך</p>
      </div>`;
    return;
  }

  // Messages
  if (msgs.length) {
    html += `<div style="font-size:.78rem;font-weight:700;color:var(--accent);letter-spacing:.06em;margin-bottom:10px;padding-right:4px">⚡ הוראות השעה</div>`;

    msgs.forEach((m, i) => { if (!m.key) m.key = 'msg_' + (m.ts || i) + '_' + i; });

    const sorted = [...msgs].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.ts || 0) - (a.ts || 0);
    });

    sorted.forEach(msg => {
      const date = msg.ts ? new Date(msg.ts).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      const urgencyColor = msg.urgency === 'high' ? '#e07b6f' : msg.urgency === 'med' ? '#e8b84b' : '#5dd98a';
      const urgencyLabel = msg.urgency === 'high' ? '🔴 דחוף' : msg.urgency === 'med' ? '🟡 חשוב' : '🟢 מידע';
      const pinnedBadge = msg.pinned ? `<span style="font-size:.7rem;padding:2px 8px;background:rgba(232,184,75,.15);border:1px solid rgba(232,184,75,.3);border-radius:99px;color:var(--accent);margin-left:6px">📌 מוצמד</span>` : '';

      const readers = msg.readers || {};
      const readersList = Object.values(readers);
      const myName = localStorage.getItem('sec_reader_name') || '';
      const iRead = myName && readers[myName.trim()];

      const readBtn = iRead
        ? `<span style="font-size:.75rem;color:#5dd98a;padding:5px 12px;background:rgba(26,107,58,.15);border:1px solid rgba(26,107,58,.3);border-radius:7px">✅ קראתי</span>`
        : `<button data-read-key="${msg.key}" style="font-size:.75rem;padding:5px 14px;background:rgba(232,184,75,.1);color:var(--accent);border:1px solid rgba(232,184,75,.3);border-radius:7px;cursor:pointer;font-family:'Heebo',sans-serif">✓ קראתי</button>`;

      const readersBox = readersList.length
        ? `<div style="margin-top:10px;padding:10px 12px;background:rgba(26,107,58,.08);border:1px solid rgba(26,107,58,.2);border-radius:9px">
             <div style="font-size:.7rem;color:#5dd98a;font-weight:700;margin-bottom:7px">👁 קראו ${readersList.length} ��אבטחים:</div>
             <div style="display:flex;flex-wrap:wrap;gap:5px">${readersList.map(r => `<span style="font-size:.72rem;padding:3px 10px;background:rgba(26,107,58,.18);border:1px solid rgba(26,107,58,.35);border-radius:99px;color:#5dd98a">✓ ${escHtml(r.name)}</span>`).join('')}</div>
           </div>`
        : `<div style="margin-top:8px;font-size:.7rem;color:var(--muted)">טרם אישר אף מאבטח</div>`;

      html += `
      <div style="background:var(--surface);border:1px solid ${urgencyColor}33;border-right:4px solid ${urgencyColor};border-radius:12px;padding:16px;margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">
          <div style="display:flex;align-items:center;gap:8px">
            ${pinnedBadge}
            <span style="font-size:.75rem;padding:3px 10px;background:${urgencyColor}1a;border:1px solid ${urgencyColor}44;border-radius:99px;color:${urgencyColor}">${urgencyLabel}</span>
          </div>
          <span style="font-size:.72rem;color:var(--muted)">${date}</span>
        </div>
        <div style="font-size:.95rem;font-weight:600;margin-bottom:6px;line-height:1.5">${escHtml(msg.title)}</div>
        <div style="font-size:.85rem;color:var(--muted);line-height:1.7;white-space:pre-wrap;margin-bottom:10px">${escHtml(msg.body || '')}</div>
        <div style="display:flex;justify-content:flex-end;border-top:1px solid rgba(255,255,255,.06);padding-top:10px">${readBtn}</div>
        ${readersBox}
      </div>`;
    });
  }

  el.innerHTML = html;

  // Bind read buttons
  el.querySelectorAll('[data-read-key]').forEach(btn => {
    btn.addEventListener('click', () => markAsRead(btn.dataset.readKey));
  });
}

/** Mark a message as read */
async function markAsRead(msgKey) {
  const name = (localStorage.getItem('sec_reader_name') || '').trim();
  if (!name) {
    const inp = document.getElementById('reader-name-input');
    if (inp) {
      inp.style.borderColor = '#e07b6f';
      inp.focus();
      inp.placeholder = '⚠️ הזן שם פרטי תחילה!';
      setTimeout(() => { inp.style.borderColor = ''; inp.placeholder = 'הזן שם פרטי לאישור קריאה...'; }, 3000);
    }
    return;
  }

  const msgs = appData.commanderMsgs || [];
  msgs.forEach((m, i) => { if (!m.key) m.key = 'msg_' + (m.ts || i) + '_' + i; });

  const msg = msgs.find(m => m.key === msgKey);
  if (!msg) return;

  msg.readers = msg.readers || {};
  msg.readers[name] = { name, ts: Date.now() };
  appData.commanderMsgs = msgs;
  await persist('commanderMsgs', msgs);
  renderCommander();
}
