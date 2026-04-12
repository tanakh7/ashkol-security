/* ══════════════════════════════════════════
   Admin Page — Dashboard logic
   ══════════════════════════════════════════ */

import {
  appData, INSTS, INST_ICONS, persist, saveLocal, getProcItems,
  selMapInst, setSelMapInst, selPhoneInst, setSelPhoneInst,
  addInstitution, removeInstitution,
} from '../store.js';
import { escHtml, flash, fixGdriveUrl } from '../utils/helpers.js';
import { initRouteEditor, reLoadForInst } from '../components/routeEditor.js';
import { buildInstGrid } from '../main.js';

/** Initialize admin page event listeners */
export function initAdmin() {
  initRouteEditor();

  document.getElementById('btn-save-phones')?.addEventListener('click', savePhones);
  document.getElementById('btn-save-procs')?.addEventListener('click', saveProcs);
  document.getElementById('btn-save-routine')?.addEventListener('click', saveProcs);
  document.getElementById('btn-save-education')?.addEventListener('click', saveProcs);
  document.getElementById('btn-save-commander-text')?.addEventListener('click', saveCommanderText);
  document.getElementById('btn-add-police')?.addEventListener('click', () => addProcItem('police'));
  document.getElementById('btn-add-routine')?.addEventListener('click', () => addProcItem('routine'));
  document.getElementById('btn-add-education')?.addEventListener('click', () => addProcItem('education'));
  document.getElementById('btn-add-commander')?.addEventListener('click', addCommanderMsg);

  // Institution management
  document.getElementById('btn-add-inst')?.addEventListener('click', handleAddInst);
  document.getElementById('new-inst-name')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAddInst();
  });
}

/** Build admin UI with current data */
export function buildAdminUI() {
  const ph = appData.phones || {};
  ['police', 'mokad', 'mada', 'fire', 'eldad', 'mor', 'shlomi'].forEach(k => {
    const el = document.getElementById('a-' + k);
    if (el) el.value = ph[k] || '';
  });

  renderInstAdmin();
  buildPhoneInstPills(0);
  renderProcAdmin('police');
  renderProcAdmin('routine');
  renderProcAdmin('education');
  renderCommanderAdmin();

  const cmdTextEl = document.getElementById('commander-text-input');
  if (cmdTextEl) cmdTextEl.value = appData.commanderText || '';

  // Map pills
  const pills = document.getElementById('map-pills');
  if (pills) {
    pills.innerHTML = '';
    INSTS.forEach((name, idx) => {
      const b = document.createElement('button');
      b.className = 'i-pill' + (idx === 0 ? ' on' : '');
      b.textContent = name;
      b.onclick = () => {
        pills.querySelectorAll('.i-pill').forEach(p => p.classList.remove('on'));
        b.classList.add('on');
        setSelMapInst(idx);
        reLoadForInst(idx);
      };
      pills.appendChild(b);
    });
  }

  // Show file statuses
  ['shoot', 'combat', 'anon', 'suspect', 'r1file', 'r2file'].forEach(k => renderProcFileList(k));

  setTimeout(() => reLoadForInst(0), 60);
}

// ── Phone Management ──
function buildPhoneInstPills(initIdx) {
  setSelPhoneInst(initIdx);
  const container = document.getElementById('phone-inst-pills');
  if (!container) return;
  container.innerHTML = '';
  INSTS.forEach((name, idx) => {
    const b = document.createElement('button');
    b.className = 'i-pill' + (idx === initIdx ? ' on' : '');
    b.textContent = name;
    b.onclick = () => {
      phoneInstSave(selPhoneInst);
      container.querySelectorAll('.i-pill').forEach(p => p.classList.remove('on'));
      b.classList.add('on');
      setSelPhoneInst(idx);
      phoneInstLoad(idx);
    };
    container.appendChild(b);
  });
  phoneInstLoad(initIdx);
}

function phoneInstLoad(idx) {
  const instPhones = ((appData.phones || {}).inst || {})[idx] || {};
  ['principal-name', 'principal-phone', 'security-name', 'security-phone'].forEach(k => {
    const el = document.getElementById('a-' + k);
    if (el) el.value = instPhones[k] || '';
  });
}

function phoneInstSave(idx) {
  appData.phones = appData.phones || {};
  appData.phones.inst = appData.phones.inst || {};
  const data = {};
  ['principal-name', 'principal-phone', 'security-name', 'security-phone'].forEach(k => {
    const el = document.getElementById('a-' + k);
    if (el && el.value.trim()) data[k] = el.value.trim();
  });
  appData.phones.inst[idx] = data;
}

async function savePhones() {
  appData.phones = appData.phones || {};
  ['police', 'mokad', 'mada', 'fire', 'eldad', 'mor', 'shlomi'].forEach(k => {
    const el = document.getElementById('a-' + k);
    if (el) {
      const v = el.value.trim();
      if (v) appData.phones[k] = v; else delete appData.phones[k];
    }
  });
  phoneInstSave(selPhoneInst);
  await persist('phones', appData.phones);
  flash('ok-phones');
}

// ── Procedures Admin ──
function renderProcAdmin(type) {
  const containerId = type === 'police' ? 'police-procs-admin' : type === 'education' ? 'education-procs-admin' : 'routine-procs-admin';
  const container = document.getElementById(containerId);
  if (!container) return;
  const items = getProcItems(type);

  container.innerHTML = items.map((item, idx) => {
    const urlsHTML = (item.urls || []).map((u, ui) => `
      <div class="pf-item">
        <span style="font-size:.85rem">${u.url.includes('drive.google.com') ? '📁' : '📄'}</span>
        <span class="pf-item-name"><strong>${escHtml(u.name || u.url)}</strong></span>
        <button class="pf-del" data-del-url="${type},${idx},${ui}">✕</button>
      </div>`).join('');

    return `
    <div class="proc-admin-row" style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:.78rem;font-weight:700;color:var(--accent)">${idx + 1}.</span>
        <input class="f-input" style="flex:1;margin:0" value="${escHtml(item.title)}"
               data-proc-title="${type},${idx}" placeholder="שם הנוהל">
        <button data-del-proc="${type},${idx}"
                style="padding:5px 10px;background:rgba(192,57,43,.15);color:#e07b6f;border:1px solid rgba(192,57,43,.3);border-radius:6px;cursor:pointer;font-size:.8rem;white-space:nowrap">🗑 מחק נוהל</button>
      </div>
      <div class="pf-list" style="margin-bottom:6px">${urlsHTML}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <input class="f-input" id="pi-name-${type}-${idx}" placeholder="שם הקובץ / כותרת" type="text" style="flex:1;margin:0;min-width:100px">
        <input class="f-input" id="pi-url-${type}-${idx}" placeholder="https://... קישור" type="url" dir="ltr" style="flex:2;margin:0">
        <button data-add-url="${type},${idx}"
                style="padding:7px 14px;background:var(--accent);color:#07111e;border:none;border-radius:7px;font-weight:700;cursor:pointer;white-space:nowrap">+ הוסף</button>
        <label class="file-upload-btn">📎 קובץ
          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" multiple data-file-key="${item.key}">
        </label>
      </div>
      <div class="pf-list" id="fs-${item.key}" style="margin-top:4px"></div>
    </div>`;
  }).join('');

  // Bind events
  container.querySelectorAll('[data-proc-title]').forEach(el => {
    el.addEventListener('input', () => {
      const [t, i] = el.dataset.procTitle.split(',');
      updateProcTitle(t, +i, el.value);
    });
  });
  container.querySelectorAll('[data-del-proc]').forEach(el => {
    el.addEventListener('click', () => {
      const [t, i] = el.dataset.delProc.split(',');
      deleteProcItem(t, +i, el);
    });
  });
  container.querySelectorAll('[data-del-url]').forEach(el => {
    el.addEventListener('click', () => {
      const [t, i, ui] = el.dataset.delUrl.split(',');
      deleteProcItemUrl(t, +i, +ui);
    });
  });
  container.querySelectorAll('[data-add-url]').forEach(el => {
    el.addEventListener('click', () => {
      const [t, i] = el.dataset.addUrl.split(',');
      addProcItemUrl(t, +i);
    });
  });
  container.querySelectorAll('[data-file-key]').forEach(el => {
    el.addEventListener('change', () => handleProcFile(el.dataset.fileKey, el));
  });
  // Enter key on URL inputs
  container.querySelectorAll('[id^="pi-url-"]').forEach(el => {
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const match = el.id.match(/pi-url-(\w+)-(\d+)/);
        if (match) addProcItemUrl(match[1], +match[2]);
      }
    });
  });

  items.forEach(item => renderProcFileList(item.key));
}

function addProcItem(type) {
  appData.procItems = appData.procItems || {};
  const items = getProcItems(type);
  const key = type + '_custom_' + Date.now();
  items.push({ title: 'נוהל חדש', key, urls: [] });
  appData.procItems[type] = items;
  renderProcAdmin(type);
}

function deleteProcItem(type, idx, btnEl) {
  const items = getProcItems(type);
  if (btnEl.dataset.confirm) {
    items.splice(idx, 1);
    appData.procItems = appData.procItems || {};
    appData.procItems[type] = items;
    renderProcAdmin(type);
    saveProcs();
  } else {
    btnEl.dataset.confirm = '1';
    btnEl.textContent = '⚠️ לחץ שוב לאישור';
    btnEl.style.background = 'rgba(192,57,43,.4)';
    setTimeout(() => {
      btnEl.textContent = '🗑 מחק נוהל';
      btnEl.style.background = 'rgba(192,57,43,.15)';
      delete btnEl.dataset.confirm;
    }, 3000);
  }
}

function updateProcTitle(type, idx, val) {
  const items = getProcItems(type);
  if (items[idx]) items[idx].title = val;
  appData.procItems = appData.procItems || {};
  appData.procItems[type] = items;
}

function addProcItemUrl(type, idx) {
  const urlEl = document.getElementById(`pi-url-${type}-${idx}`);
  const nameEl = document.getElementById(`pi-name-${type}-${idx}`);
  if (!urlEl || !urlEl.value.trim()) return;
  const url = fixGdriveUrl(urlEl.value.trim());
  const name = nameEl ? nameEl.value.trim() : '';
  const items = getProcItems(type);
  if (!items[idx].urls) items[idx].urls = [];
  items[idx].urls.push({ url, name });
  appData.procItems = appData.procItems || {};
  appData.procItems[type] = items;
  urlEl.value = '';
  if (nameEl) nameEl.value = '';
  renderProcAdmin(type);
}

function deleteProcItemUrl(type, idx, urlIdx) {
  const items = getProcItems(type);
  if (items[idx] && items[idx].urls) items[idx].urls.splice(urlIdx, 1);
  appData.procItems = appData.procItems || {};
  appData.procItems[type] = items;
  renderProcAdmin(type);
}

async function saveProcs() {
  appData.procs = appData.procs || {};
  appData.procItems = appData.procItems || {};
  await persist('procs', appData.procs);
  await persist('procItems', appData.procItems);
  saveLocal();
  flash('ok-procs');
  flash('ok-routine');
  flash('ok-education');
}

// ── File Upload ──
function renderProcFileList(key) {
  const container = document.getElementById('fs-' + key);
  if (!container) return;
  const files = (appData.procFiles || {})[key] || [];
  const arr = Array.isArray(files) ? files : [files];
  container.innerHTML = arr.map((f, i) => `
    <div class="pf-item">
      <span style="font-size:.85rem">📎</span>
      <span class="pf-item-name">${escHtml(f.name)}</span>
      <button class="pf-del" data-del-file="${key},${i}" title="מחק קובץ">✕</button>
    </div>`).join('');
  container.querySelectorAll('[data-del-file]').forEach(el => {
    el.addEventListener('click', () => {
      const [k, i] = el.dataset.delFile.split(',');
      deleteProcFile(k, +i);
    });
  });
}

function deleteProcFile(key, idx) {
  appData.procFiles = appData.procFiles || {};
  const arr = Array.isArray(appData.procFiles[key]) ? appData.procFiles[key] : [appData.procFiles[key]].filter(Boolean);
  arr.splice(idx, 1);
  if (arr.length === 0) delete appData.procFiles[key];
  else appData.procFiles[key] = arr;
  saveLocal();
  renderProcFileList(key);
}

function handleProcFile(key, input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  appData.procFiles = appData.procFiles || {};
  const existing = Array.isArray(appData.procFiles[key]) ? appData.procFiles[key] :
    (appData.procFiles[key] ? [appData.procFiles[key]] : []);
  let loaded = 0;
  files.forEach(file => {
    if (file.size > 5 * 1024 * 1024) { alert(`הקובץ ${file.name} גדול מדי (מקסימום 5MB)`); return; }
    const reader = new FileReader();
    reader.onload = e => {
      existing.push({ name: file.name, data: e.target.result, type: file.type });
      loaded++;
      if (loaded === files.length) {
        appData.procFiles[key] = existing;
        saveLocal();
        renderProcFileList(key);
      }
    };
    reader.readAsDataURL(file);
  });
}

// ── Commander Admin ──
function renderCommanderAdmin() {
  const container = document.getElementById('commander-admin');
  if (!container) return;
  const msgs = appData.commanderMsgs || [];

  if (!msgs.length) {
    container.innerHTML = `<div style="color:var(--muted);font-size:.85rem;padding:8px 0">אין הודעות. לחץ "+ הוסף הודעה" ליצירת הוראת שעה.</div>`;
    return;
  }

  container.innerHTML = msgs.map((msg, i) => {
    const urgencyColor = msg.urgency === 'high' ? '#e07b6f' : msg.urgency === 'med' ? '#e8b84b' : '#5dd98a';
    const readers = Object.values(msg.readers || {});
    const readersHTML = readers.length
      ? `<div style="margin-top:8px;padding:8px;background:rgba(26,107,58,.08);border-radius:7px;border:1px solid rgba(26,107,58,.2)">
           <div style="font-size:.7rem;color:#5dd98a;margin-bottom:5px;font-weight:700">✅ קראו (${readers.length}):</div>
           <div style="display:flex;flex-wrap:wrap;gap:5px">
             ${readers.map(r => `<span style="font-size:.7rem;padding:2px 8px;background:rgba(26,107,58,.18);border:1px solid rgba(26,107,58,.3);border-radius:99px;color:#5dd98a">✓ ${escHtml(r.name)}</span>`).join('')}
           </div>
         </div>`
      : `<div style="font-size:.7rem;color:var(--muted);margin-top:6px">טרם קרא אף מאבטח</div>`;

    return `
    <div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px;border-right:4px solid ${urgencyColor}">
      <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center">
        <select data-cmd-field="${i},urgency"
                style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);
                       padding:4px 8px;font-family:'Heebo',sans-serif;font-size:.78rem">
          <option value="low" ${msg.urgency === 'low' ? 'selected' : ''}>🟢 מידע</option>
          <option value="med" ${msg.urgency === 'med' ? 'selected' : ''}>🟡 חשוב</option>
          <option value="high" ${msg.urgency === 'high' ? 'selected' : ''}>🔴 דחוף</option>
        </select>
        <label style="display:flex;align-items:center;gap:5px;font-size:.78rem;cursor:pointer">
          <input type="checkbox" ${msg.pinned ? 'checked' : ''} data-cmd-pin="${i}" style="accent-color:var(--accent)">
          📌 הצמד
        </label>
        <button data-cmd-del="${i}"
                style="margin-right:auto;padding:4px 10px;background:rgba(192,57,43,.15);color:#e07b6f;
                       border:1px solid rgba(192,57,43,.3);border-radius:6px;cursor:pointer;font-size:.75rem">🗑 מחק</button>
      </div>
      <input class="f-input" style="margin-bottom:8px" value="${escHtml(msg.title)}" placeholder="כותרת ההודעה"
             data-cmd-title="${i}">
      <textarea class="f-input" rows="3" placeholder="תוכן ההודעה (אופציונלי)..."
                data-cmd-body="${i}"
                style="resize:vertical;margin-bottom:6px">${escHtml(msg.body || '')}</textarea>
      ${readersHTML}
    </div>`;
  }).join('');

  // Bind events
  container.querySelectorAll('[data-cmd-field]').forEach(el => {
    el.addEventListener('change', () => {
      const [i, field] = el.dataset.cmdField.split(',');
      updateCmdField(+i, field, el.value);
    });
  });
  container.querySelectorAll('[data-cmd-pin]').forEach(el => {
    el.addEventListener('change', () => updateCmdField(+el.dataset.cmdPin, 'pinned', el.checked));
  });
  container.querySelectorAll('[data-cmd-title]').forEach(el => {
    el.addEventListener('input', () => updateCmdField(+el.dataset.cmdTitle, 'title', el.value));
  });
  container.querySelectorAll('[data-cmd-body]').forEach(el => {
    el.addEventListener('input', () => updateCmdField(+el.dataset.cmdBody, 'body', el.value));
  });
  container.querySelectorAll('[data-cmd-del]').forEach(el => {
    el.addEventListener('click', () => deleteCommanderMsg(+el.dataset.cmdDel, el));
  });
}

function addCommanderMsg() {
  appData.commanderMsgs = appData.commanderMsgs || [];
  const key = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  appData.commanderMsgs.push({ key, title: 'הוראת שעה חדשה', body: '', urgency: 'med', pinned: false, ts: Date.now(), readers: {} });
  renderCommanderAdmin();
  saveCommanderMsgs();
}

function deleteCommanderMsg(idx, btnEl) {
  if (btnEl.dataset.confirm) {
    appData.commanderMsgs.splice(idx, 1);
    renderCommanderAdmin();
    saveCommanderMsgs();
  } else {
    btnEl.textContent = '⚠️ לחץ שוב';
    btnEl.dataset.confirm = '1';
    btnEl.style.background = 'rgba(192,57,43,.4)';
    setTimeout(() => { btnEl.textContent = '🗑 מחק'; btnEl.style.background = 'rgba(192,57,43,.15)'; delete btnEl.dataset.confirm; }, 3000);
  }
}

function updateCmdField(idx, field, val) {
  if (!appData.commanderMsgs || !appData.commanderMsgs[idx]) return;
  appData.commanderMsgs[idx][field] = val;
  saveCommanderMsgs();
}

async function saveCommanderMsgs() {
  await persist('commanderMsgs', appData.commanderMsgs || []);
  flash('ok-commander');
}

async function saveCommanderText() {
  appData.commanderText = (document.getElementById('commander-text-input') || {}).value || appData.commanderText || '';
  await persist('commanderText', appData.commanderText);
  flash('ok-commander-text');
}

// ══ Institution Management ══
function renderInstAdmin() {
  const container = document.getElementById('inst-admin-list');
  if (!container) return;

  if (!INSTS.length) {
    container.innerHTML = `<div style="color:var(--muted);font-size:.85rem;padding:8px 0">אין מוסדות. הוסף מוסד חדש למטה.</div>`;
    return;
  }

  container.innerHTML = INSTS.map((name, idx) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
         background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;margin-bottom:6px;
         transition:border-color .2s">
      <span style="font-size:1.3rem;flex-shrink:0">${INST_ICONS[idx]}</span>
      <span style="flex:1;font-size:.88rem;font-weight:600">${escHtml(name)}</span>
      <span style="font-size:.7rem;color:var(--muted);padding:2px 8px;background:rgba(0,0,0,.2);border-radius:4px">#${idx + 1}</span>
      <button data-remove-inst="${idx}"
              style="padding:4px 10px;background:rgba(192,57,43,.12);color:#e07b6f;
                     border:1px solid rgba(192,57,43,.25);border-radius:6px;cursor:pointer;
                     font-size:.75rem;font-family:'Heebo',sans-serif;white-space:nowrap">🗑 הסר</button>
    </div>
  `).join('');

  // Bind remove buttons
  container.querySelectorAll('[data-remove-inst]').forEach(btn => {
    btn.addEventListener('click', () => handleRemoveInst(+btn.dataset.removeInst, btn));
  });
}

async function handleAddInst() {
  const nameEl = document.getElementById('new-inst-name');
  const iconEl = document.getElementById('new-inst-icon');
  if (!nameEl || !nameEl.value.trim()) {
    if (nameEl) { nameEl.style.borderColor = '#e07b6f'; setTimeout(() => nameEl.style.borderColor = '', 2000); }
    return;
  }

  const name = nameEl.value.trim();
  const icon = iconEl ? iconEl.value : '🏫';

  await addInstitution(name, icon);

  nameEl.value = '';
  renderInstAdmin();
  buildInstGrid();
  // Rebuild admin pills
  buildAdminUI();
}

async function handleRemoveInst(idx, btnEl) {
  if (btnEl.dataset.confirm) {
    await removeInstitution(idx);
    renderInstAdmin();
    buildInstGrid();
    // Rebuild admin pills
    buildAdminUI();
  } else {
    const name = INSTS[idx];
    btnEl.dataset.confirm = '1';
    btnEl.innerHTML = `⚠️ בטוח? "${escHtml(name)}"`;
    btnEl.style.background = 'rgba(192,57,43,.4)';
    setTimeout(() => {
      if (btnEl.dataset.confirm) {
        btnEl.innerHTML = '🗑 הסר';
        btnEl.style.background = 'rgba(192,57,43,.12)';
        delete btnEl.dataset.confirm;
      }
    }, 3000);
  }
}
