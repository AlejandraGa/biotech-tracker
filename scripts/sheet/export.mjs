// scripts/sheet/export.mjs — writes the statuses held in the code as rows for the
// tracker's Google Sheet (seed only: the Sheet is the source once it exists).
//   node scripts/sheet/export.mjs > statuses.json        rows as JSON
//   node scripts/sheet/export.mjs --snapshot             rewrite src/hivSheetSnapshot.json from the code
import { writeFileSync } from 'node:fs';
import { packRows } from '../../src/hivSheet.js';
import { BASE } from '../../src/hivData.js';
import { AGENCIES, VERIFIED_ON } from '../../src/hivRegulatoryData.js';
import { ACCESS_BODIES, EXTRA_REGULATORS, ACCESS_VERIFIED_ON } from '../../src/hivAccessData.js';
import { MORE_VERIFIED_ON } from '../../src/hivAccessMore.js';

const REG = [...AGENCIES, { key: 'mhra', label: 'MHRA', region: 'United Kingdom' }, ...EXTRA_REGULATORS];
// When each part of the curated data was last checked against its sources.
const FIRST_ACCESS = ['gba', 'sl', 'eko', 'nice', 'has'];
const checkedOn = (kind, key) => (kind === 'Authorisation' ? (['hc', 'tga'].includes(key) ? MORE_VERIFIED_ON : VERIFIED_ON) : FIRST_ACCESS.includes(key) ? ACCESS_VERIFIED_ON : MORE_VERIFIED_ON);

const rows = [];
for (const p of BASE) {
  for (const [kind, bodies, cells] of [['Authorisation', REG, p.reg], ['Reimbursement', ACCESS_BODIES, p.access]]) {
    for (const b of bodies) {
      const c = cells?.[b.key] || { s: 'none' };
      rows.push({
        product_id: p.id, product: p.name, kind, body_key: b.key, body: b.label, market: b.region,
        status: c.s || 'none', label: c.label || '', date: c.date || '', expected: c.expected ? 'yes' : '', date_unverified: c.dateUnverified ? 'yes' : '',
        note: c.note || '', source: c.src || '', checked_on: checkedOn(kind, b.key), checked_by: 'Initial research',
      });
    }
  }
}
if (process.argv.includes('--snapshot')) {
  writeFileSync(new URL('../../src/hivSheetSnapshot.json', import.meta.url), JSON.stringify({ fetchedAt: null, from: 'code', ...packRows(rows) }) + '\n');
} else console.log(JSON.stringify(rows, null, 1));
