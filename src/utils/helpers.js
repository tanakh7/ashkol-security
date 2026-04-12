/* ══════════════════════════════════════════
   Utility Helpers
   ══════════════════════════════════════════ */

/** Escape HTML to prevent XSS */
export function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Safe DOM getter — runs callback only if element exists */
export function getEl(id, cb) {
  const el = document.getElementById(id);
  if (el && cb) cb(el);
  return el;
}

/** Flash a "saved" indicator */
export function flash(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

/** Normalize Google Drive links */
export function fixGdriveUrl(url) {
  const m = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/view?usp=sharing`;
  return url;
}

/** Compress image to base64 */
export function compressImage(src, maxW, maxH, quality) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = src;
  });
}
