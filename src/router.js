/* ══════════════════════════════════════════
   Router — Simple page navigation
   ══════════════════════════════════════════ */

/** Show a page by its ID, hide all others */
export function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
  window.scrollTo(0, 0);
}

/** Navigate to home page */
export function goHome() {
  showPage('home-page');
}

/** Switch institution tabs */
export function switchTab(idx, onSwitch) {
  document.querySelectorAll('#tabs-nav .tab').forEach((t, i) => {
    t.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('.tab-content').forEach((c, i) => {
    c.classList.toggle('active', i === idx);
  });
  if (onSwitch) onSwitch(idx);
}
