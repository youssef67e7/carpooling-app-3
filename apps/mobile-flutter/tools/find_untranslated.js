const fs = require('fs');

const en = JSON.parse(fs.readFileSync('lib/l10n/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('lib/l10n/ar.json', 'utf8'));

const skip = /^(WERET|API|Stripe|PayPal|SUV|sedan|suv|van|OK|N\/A|\{\{|\d)/i;
const identical = Object.keys(en).filter((k) => {
  if (en[k] !== ar[k]) return false;
  const v = String(en[k]);
  if (v.length < 4) return false;
  if (skip.test(v)) return false;
  if (!/[A-Za-z]/.test(v)) return false;
  return true;
});

console.log('Identical en/ar (likely untranslated):', identical.length);
console.log(identical.slice(0, 80).join('\n'));
