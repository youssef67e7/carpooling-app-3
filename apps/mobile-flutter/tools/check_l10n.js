const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync('lib/l10n/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('lib/l10n/ar.json', 'utf8'));

const keys = new Set();
function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      if (!p.includes(`${path.sep}l10n`)) walk(p);
    } else if (f.name.endsWith('.dart')) {
      const t = fs.readFileSync(p, 'utf8');
      for (const m of t.matchAll(/'([a-zA-Z][a-zA-Z0-9_]{2,})'\.tr(?:\(|\b)/g)) keys.add(m[1]);
      for (const m of t.matchAll(/"([a-zA-Z][a-zA-Z0-9_]{2,})"\.tr(?:\(|\b)/g)) keys.add(m[1]);
    }
  }
}
walk('lib');

const missingEn = [...keys].filter((k) => !en[k]).sort();
const missingAr = [...keys].filter((k) => !ar[k]).sort();
const onlyEn = Object.keys(en).filter((k) => !ar[k]);
const onlyAr = Object.keys(ar).filter((k) => !en[k]);

const same = Object.keys(en).filter((k) => en[k] === ar[k] && /[\u0600-\u06FF]/.test(en[k]));
const enHasArabic = Object.keys(en).filter((k) => /[\u0600-\u06FF]/.test(en[k]));
const arHasLatinOnly = Object.keys(ar).filter((k) => !/[\u0600-\u06FF]/.test(ar[k]) && /[A-Za-z]{4,}/.test(ar[k]));

console.log('JSON keys en/ar:', Object.keys(en).length, Object.keys(ar).length);
console.log('Used tr keys:', keys.size);
console.log('Missing from en:', missingEn.length, missingEn.slice(0, 40).join(', '));
console.log('Missing from ar:', missingAr.length, missingAr.slice(0, 40).join(', '));
console.log('Identical ar/en (with Arabic chars):', same.length);
console.log('en values with Arabic:', enHasArabic.length, enHasArabic.slice(0, 20).join(', '));
console.log('ar values mostly English:', arHasLatinOnly.length, arHasLatinOnly.slice(0, 30).join(', '));
