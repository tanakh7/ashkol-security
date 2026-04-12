/**
 * Firebase Backup Script
 * גיבוי כל הנתונים מ-Firebase Realtime Database לקובץ JSON מקומי
 *
 * הפעלה: node scripts/backup.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DB_URL = 'https://mic222-default-rtdb.firebaseio.com';
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON: ' + data.substring(0, 200))); }
      });
    }).on('error', reject);
  });
}

async function backup() {
  console.log('🔄 מוריד נתונים מ-Firebase...');

  try {
    const data = await fetchJSON(`${DB_URL}/data.json`);

    if (!data) {
      console.log('⚠️  אין נתונים ב-Firebase');
      return;
    }

    // Create backups directory
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Save backup (pretty printed)
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');

    // Calculate size
    const stats = fs.statSync(filepath);
    const sizeKB = (stats.size / 1024).toFixed(1);

    console.log(`✅ גיבוי נשמר: ${filename} (${sizeKB} KB)`);
    console.log(`📂 מיקום: ${filepath}`);

    // Show data summary
    console.log('\n📊 סיכום נתונים:');
    if (data.phones) {
      const instCount = Object.keys(data.phones.inst || {}).length;
      console.log(`   📞 טלפונים: ${Object.keys(data.phones).length} שדות, ${instCount} מוסדות`);
    }
    if (data.procItems) {
      const types = Object.keys(data.procItems);
      const total = types.reduce((sum, t) => sum + (data.procItems[t]?.length || 0), 0);
      console.log(`   📋 נהלים: ${total} פריטים (${types.join(', ')})`);
    }
    if (data.publishedRoutes) {
      const routeCount = Object.keys(data.publishedRoutes).filter(k => data.publishedRoutes[k]?.waypoints).length;
      console.log(`   🗺️  מסלולים מפורסמים: ${routeCount}`);
    }
    if (data.commanderMsgs) {
      const msgCount = Array.isArray(data.commanderMsgs) ? data.commanderMsgs.length : 0;
      console.log(`   📢 הודעות קב"ט: ${msgCount}`);
    }

    // Cleanup old backups (keep last 10)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse();
    if (files.length > 10) {
      files.slice(10).forEach(f => {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        console.log(`🗑️  מחיקת גיבוי ישן: ${f}`);
      });
    }

    console.log('\n✨ הגיבוי הושלם בהצלחה!');
  } catch (err) {
    console.error('❌ שגיאה בגיבוי:', err.message);
    process.exit(1);
  }
}

backup();
