// onePager.js — a printable one-page brief per competitor asset.
// Opens a clean page in a new tab with the asset's regulatory, reimbursement and news picture
// and the browser's print dialog, where "Save as PDF" gives the file to share.
import { AGENCIES, STATUS, VERIFIED_ON } from './hivRegulatoryData';
import { ACCESS_BODIES, EXTRA_REGULATORS, ACCESS_STATUS, ACCESS_VERIFIED_ON } from './hivAccessData';
import { fmtDate, todayIso } from './ui';

const REG_BODIES = [...AGENCIES, { key: 'mhra', label: 'MHRA', region: 'United Kingdom' }, ...EXTRA_REGULATORS];

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = (iso) => (iso ? fmtDate(iso) : '');

function statusText(cell, table) {
  if (!cell) return 'Not verified';
  const base = cell.label || table[cell.s]?.label || (cell.s === 'none' ? '' : cell.s);
  return [base, cell.note].filter(Boolean).join(' · ') || 'Not verified';
}

function rows(bodies, pick, table) {
  return bodies.map((b) => {
    const cell = pick(b.key);
    return `<tr><td>${esc(b.label)}<span class="muted"> · ${esc(b.region)}</span></td><td>${esc(statusText(cell, table))}</td><td class="num">${esc(cell?.date && !cell.dateUnverified ? date(cell.date) : '')}</td></tr>`;
  }).join('');
}

// Words that identify the asset in a headline: brand name and each INN.
function assetWords(p) {
  return [p.name, ...(p.inn || '').split('/')].map((w) => w.trim().toLowerCase()).filter((w) => w.length > 4 && !/tenofovir|emtricitabine|lamivudine|abacavir/.test(w));
}
const names = (p) => assetWords(p).map((w) => w[0].toUpperCase() + w.slice(1)).join(' or ');
function matcher(p) {
  const words = assetWords(p);
  return (text) => words.some((w) => (text || '').toLowerCase().includes(w));
}

function render(p, news) {
  const today = todayIso();
  const events = [...p.events].sort((a, b) => b.date.localeCompare(a.date));
  const upcoming = events.filter((e) => e.date > today).reverse();
  const recent = events.filter((e) => e.date <= today).slice(0, 6);
  const event = (e) => `<li><span class="num">${esc(date(e.date))}</span> <b>${esc(e.agency)}</b> ${esc(e.text)}</li>`;
  const story = (n) => `<li><span class="num">${esc(n.date)}</span> ${esc(n.headline)} <span class="muted">(${esc(n.source)})</span></li>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.name)} · HIV competitor brief</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; font-size: 10.5pt; line-height: 1.45; margin: 0; }
  .top { display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 6px; font-size: 9pt; color: #6b6760; }
  h1 { font-size: 20pt; margin: 10px 0 0; } .inn { color: #6b6760; margin-bottom: 6px; }
  h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: .06em; color: #6b6760; margin: 14px 0 4px; border-bottom: 1px solid #e6e2db; padding-bottom: 3px; }
  .facts { display: grid; grid-template-columns: 110px 1fr; gap: 2px 10px; }
  .facts span:nth-child(odd) { color: #6b6760; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; } td { padding: 2px 4px 2px 0; border-bottom: 1px solid #f0ede8; vertical-align: top; }
  .num { white-space: nowrap; font-variant-numeric: tabular-nums; } .muted { color: #96918a; }
  ul { margin: 0; padding-left: 16px; } li { margin: 2px 0; }
  .watch { background: #fdfaf3; border: 1px solid #eadfc8; padding: 6px 10px; margin-top: 8px; }
  .notes { border: 1px solid #d8d2c8; height: 90px; margin-top: 4px; }
  .foot { margin-top: 12px; font-size: 8pt; color: #96918a; }
  @media screen { body { max-width: 820px; margin: 24px auto; padding: 0 16px; } }
  @media print { .noprint { display: none; } }
</style></head><body>
<div class="top"><span>Catalyst · HIV competitor brief</span><span>${esc(fmtDate(today))}</span></div>
<p class="noprint muted">Use your browser's print dialog and choose "Save as PDF" to keep this page.</p>
<h1>${esc(p.name)}</h1><div class="inn">${esc(p.inn)}</div>
<div class="facts">
  <span>Company</span><span>${esc(p.company)}</span>
  <span>Segment</span><span>${esc(p.segment)}</span>
  <span>Stage</span><span>${esc(p.stage)}</span>
  <span>Class</span><span>${esc(p.klass)}</span>
  <span>Dosing</span><span>${esc(p.dosing)}</span>
  ${p.trials ? `<span>Pivotal trials</span><span>${esc(p.trials)}</span>` : ''}
</div>
<h2>Positioning</h2><div>${esc(p.position)}</div>
${p.watch ? `<div class="watch"><b>Next to watch:</b> ${esc(p.watch)}</div>` : ''}
<div class="cols">
  <div><h2>Regulatory status</h2><table>${rows(REG_BODIES, (k) => p.reg?.[k], STATUS)}</table></div>
  <div><h2>Reimbursement and HTA</h2><table>${rows(ACCESS_BODIES, (k) => p.access?.[k], ACCESS_STATUS)}</table></div>
</div>
<div class="cols">
  <div><h2>Recent milestones</h2><ul>${recent.map(event).join('') || '<li class="muted">None on record.</li>'}</ul>
  ${upcoming.length ? `<h2>Upcoming</h2><ul>${upcoming.map(event).join('')}</ul>` : ''}</div>
  <div><h2>Latest news naming ${esc(names(p))}</h2><ul>${news.length ? news.map(story).join('') : '<li class="muted">No stories naming this asset in the current news feed.</li>'}</ul></div>
</div>
<h2>Implications for our launch</h2><div class="notes"></div>
<div class="foot">Regulatory data checked on ${esc(fmtDate(VERIFIED_ON))}; reimbursement data checked on ${esc(fmtDate(ACCESS_VERIFIED_ON))} or later. "Not verified" means the listing was not confirmed, not that the asset is unlisted. Sources are linked in Catalyst.</div>
</body></html>`;
}

// Must be called from a click, so the browser allows the new tab.
export async function openOnePager(p) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<p style="font-family:system-ui;padding:24px;color:#6b6760">Preparing the ${esc(p.name)} brief…</p>`);
  let news = [];
  try {
    const res = await fetch('/api/rss');
    const all = await res.json();
    const mentions = matcher(p);
    if (Array.isArray(all)) news = all.filter((n) => mentions(`${n.headline} ${n.summary || ''}`)).slice(0, 6);
  } catch {}
  win.document.open();
  win.document.write(render(p, news));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
