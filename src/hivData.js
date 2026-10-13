// Joins the curated HIV datasets into one record per asset, and lays the
// decisions found by the daily page check (scripts/watch) over them.
// Shared by the tracker page and the weekly email, so imports carry extensions.
import { PRODUCTS } from './hivRegulatoryData.js';
import { ACCESS, ACCESS_BODIES, EXTRA_REGULATORS } from './hivAccessData.js';
import { MORE_ACCESS, MORE_EVENTS } from './hivAccessMore.js';
const UNVERIFIED = { s: 'none', note: 'Not verified' };

// Curated regulatory data joined with the market-access data for each asset.
export const BASE = PRODUCTS.map((p) => {
  const a = ACCESS[p.id];
  if (!a) return { ...p, access: {} };
  const { hc, tga, ...more } = MORE_ACCESS[p.id] || {};
  const { mhra, events, watch, ...own } = a;
  const curated = { ...own, ...more };
  // Bodies added later default to "not verified", or "not authorised" for assets with no EU authorisation.
  const unauthorised = curated.gba?.note === 'Not authorised here';
  const fallback = unauthorised ? curated.gba : UNVERIFIED;
  const regFallback = unauthorised ? { s: 'none', note: 'No public announcement found' } : UNVERIFIED;
  const access = Object.fromEntries(ACCESS_BODIES.map((b) => [b.key, curated[b.key] || fallback]));
  return { ...p, reg: { ...p.reg, mhra, hc: hc || regFallback, tga: tga || regFallback }, access, events: [...p.events, ...events, ...(MORE_EVENTS[p.id] || [])], watch: watch || p.watch };
});

// Column key → the agency name used in event histories.
export const COLUMN_AGENCY = {
  fda: 'FDA', chmp: 'CHMP', ec: 'EC', ch: 'Swissmedic', mhra: 'MHRA', hc: 'Health Canada', tga: 'TGA',
  gba: 'G-BA', sl: 'BAG', eko: 'Dachverband', nice: 'NICE', smc: 'SMC', ie: 'NCPE', has: 'HAS', it: 'AIFA', es: 'Spain',
  pt: 'INFARMED', nl: 'Zorginstituut', be: 'RIZIV', se: 'TLV', dk: 'Medicinradet', no: 'Nye Metoder', cda: 'CDA-AMC', pbac: 'PBAC',
};
const BODY_LABEL = Object.fromEntries([
  ['ch', 'Swissmedic'], ['mhra', 'MHRA'], ...EXTRA_REGULATORS.map((b) => [b.key, b.label]), ...ACCESS_BODIES.map((b) => [b.key, b.label]),
]);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

// A detection replaces the curated cell unless the curated cell already holds a later decision.
export function applyDetections(products, auto) {
  const list = [...(auto?.detections || [])].sort((a, b) => (a.date || a.detectedAt).localeCompare(b.date || b.detectedAt));
  if (!list.length) return products;
  return products.map((p) => {
    const mine = list.filter((d) => d.product === p.id);
    if (!mine.length) return p;
    const reg = { ...p.reg }, access = { ...p.access }, events = [...p.events];
    for (const d of mine) {
      const target = d.type === 'access' ? access : reg;
      const current = target[d.column];
      if (current?.date && d.date && current.date > d.date) continue;
      if (current?.date && !d.date && current.s !== 'none') continue;
      target[d.column] = {
        s: d.s, label: d.label || undefined, date: d.date || undefined, dateUnverified: !d.date || undefined,
        note: d.note || undefined, src: d.src,
        auto: `the daily check of ${BODY_LABEL[d.column] || d.body}'s website on ${short(d.detectedAt)}`,
        was: current && current.s !== 'none' && current.s !== d.s ? current : null,
      };
      const agency = COLUMN_AGENCY[d.column];
      const date = d.date || d.detectedAt;
      if (!events.some((e) => e.agency === agency && e.date === date)) {
        events.push({ date, agency, outcome: d.s, text: `${d.summary || 'New decision published.'} Picked up by the daily automatic check.`, src: d.src, auto: true });
      }
    }
    return { ...p, reg, access, events };
  });
}

// Marks each status with what the website check last found for it: the page agrees,
// lists nothing (for "no decision" statuses), or seems to say something different.
export function applyConfirmations(products, auto) {
  const conf = auto?.confirmations || {};
  if (!Object.keys(conf).length) return products;
  const mark = (id, cells) => {
    let out = cells;
    for (const k of Object.keys(cells || {})) {
      const c = conf[`${id}:${k}`];
      // A status the check itself just updated already says so; a result for a
      // status the team has since changed in the sheet no longer applies.
      if (!c || cells[k]?.auto) continue;
      if (c.sig && c.sig !== JSON.stringify([cells[k]?.s || 'none', cells[k]?.date || ''])) continue;
      if (out === cells) out = { ...cells };
      out[k] = { ...cells[k], verified: c };
    }
    return out;
  };
  return products.map((p) => ({ ...p, reg: mark(p.id, p.reg), access: mark(p.id, p.access) }));
}
