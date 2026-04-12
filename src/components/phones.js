/* ══════════════════════════════════════════
   Phones Component
   ══════════════════════════════════════════ */

import { appData, INSTS, currentInst } from '../store.js';
import { escHtml } from '../utils/helpers.js';

/** Render phone list for current institution */
export function renderPhones() {
  const ph = appData.phones || {};
  const instPh = (ph.inst || {})[currentInst] || {};
  const policeNum = ph['police'] || '100';

  const rows = [
    {
      section: '🚨 חירום', items: [
        { av: 'emerg', icon: '👮', name: 'משטרת ישראל', role: 'חירום', key: null, fixed: policeNum },
        { av: 'emerg', icon: '🚑', name: 'מד"א', role: 'חירום רפואי', key: 'mada' },
        { av: 'emerg', icon: '🚒', name: 'כבאות והצלה', role: 'חירום', key: 'fire' },
      ]
    },
    {
      section: '📡 מוקד', items: [
        { av: 'service', icon: '📡', name: 'מוקד אשכול', role: 'מוקד אזורי', key: 'mokad' },
      ]
    },
    {
      section: '🛡️ קב"טים', items: [
        { av: 'person', icon: '👤', name: 'אלדד גד סעד', role: 'קב"ט מוסח', key: 'eldad' },
        { av: 'person', icon: '👤', name: 'מור אמסלם', role: 'קב"ט מוסח', key: 'mor' },
        { av: 'person', icon: '👤', name: 'שלומי ממן', role: 'קב"ט מוסח', key: 'shlomi' },
      ]
    },
    {
      section: '🏫 מנהל המוסד', items: [
        {
          av: 'person', icon: '👔',
          name: instPh['principal-name'] || 'מנהל המוסד',
          role: 'מנהל — ' + INSTS[currentInst],
          key: null, fixed: instPh['principal-phone'] || null
        },
      ]
    },
    {
      section: '🔐 רכז ביטחון', items: [
        {
          av: 'person', icon: '🔐',
          name: instPh['security-name'] || 'רכז ביטחון',
          role: 'רכז ביטחון — ' + INSTS[currentInst],
          key: null, fixed: instPh['security-phone'] || null
        },
      ]
    },
  ];

  let html = '<div class="phone-list">';
  rows.forEach(section => {
    html += `<div class="phone-section-label">${section.section}</div>`;
    section.items.forEach(item => {
      const num = item.fixed || (item.key && ph[item.key]);
      const numHtml = num
        ? `<span class="ph-num">${escHtml(num)}</span><a class="call-btn" href="tel:${escHtml(num)}">📞</a>`
        : `<span class="ph-miss">חסר — בהשלמה</span>`;
      html += `
        <div class="phone-row">
          <div class="ph-left">
            <div class="ph-av ${item.av}">${item.icon}</div>
            <div><div class="ph-name">${escHtml(item.name)}</div><div class="ph-role">${escHtml(item.role)}</div></div>
          </div>
          <div class="ph-right">${numHtml}</div>
        </div>`;
    });
  });
  html += '</div>';

  const el = document.getElementById('phone-content');
  if (el) el.innerHTML = html;
}
