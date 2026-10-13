// scripts/watch/check.mjs — check of regulator and reimbursement pages.
//
// Run by .github/workflows/check-decisions.yml every 3 hours. First it saves a
// copy of the team's Google Sheet (src/hivSheetSnapshot.json), so the check and
// the site work from what the team last entered. Then, for every body and
// product in sources.mjs, it downloads the page and keeps only the text around
// the product's names. Claude reads that text when it has changed, when the
// team's status for it has changed, or when it has never been read, and says
// whether the page agrees with the status and whether it shows a new decision.
// Unchanged text keeps its last answer, so most runs cost nothing.
//
// Writes to src/hivAutoDetections.json, which the site reads:
//   detections     new decisions found on a page
//   confirmations  per product and column, the date the page last agreed with
//                  the status (or listed nothing, for "no decision" statuses),
//                  or that it seems to say something different
//
// Needs ANTHROPIC_API_KEY. Without it the pages are still checked and changes
// are kept for the next run, but nothing is read by Claude.
//   node scripts/watch/check.mjs            normal run
//   node scripts/watch/check.mjs --dry      fetch and compare only, write nothing
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SHEET_ID, sheetCsvUrl, rowsFromCsv, packRows } from '../../src/hivSheet.js';

const ROOT = new URL('../../', import.meta.url);
const STATE_FILE = new URL('scripts/watch/state.json', ROOT);
const OUT_FILE = new URL('src/hivAutoDetections.json', ROOT);
const SNAPSHOT_FILE = new URL('src/hivSheetSnapshot.json', ROOT);
const DRY = process.argv.includes('--dry');
const MODEL = process.env.CHECK_MODEL || 'claude-haiku-5-5';
// Keeps the cost per run bounded: changes beyond this many wait for the next run (runs every 3 hours).
const MAX_CLAUDE_CALLS = Number(process.env.MAX_CLAUDE_CALLS || 15);
const WINDOW = 350;          // characters kept either side of each product name
const MAX_SNIPPET = 5000;    // characters sent to Claude per page and product
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const REG_STATUSES = ['approved', 'positive', 'review', 'negative', 'notapproved'];
const ACCESS_STATUSES = ['favourable', 'restricted', 'limited', 'listed', 'noadded', 'unfavourable'];
const NO_DECISION = ['none', 'pending', 'planned'];

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const today = new Date().toISOString().slice(0, 10);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', laquo: '«', raquo: '»', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', oslash: 'ø', aring: 'å', aelig: 'æ' };
function toText(body, type) {
  if (/json|xml|csv|text\/plain/i.test(type)) return body.replace(/\s+/g, ' ');
  return body
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENTITIES[e] ?? ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ');
}

// The text around each mention of the product, merged where windows overlap.
function snippetFor(text, terms) {
  const lower = text.toLowerCase();
  const spans = [];
  for (const t of terms) {
    const needle = t.toLowerCase();
    for (let i = lower.indexOf(needle); i !== -1; i = lower.indexOf(needle, i + needle.length)) {
      spans.push([Math.max(0, i - WINDOW), Math.min(text.length, i + needle.length + WINDOW)]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]); else merged.push([...s]);
  }
  return merged.map(([a, b]) => text.slice(a, b).trim()).join(' … ').slice(0, MAX_SNIPPET);
}

async function get(url) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/json;q=0.9,*/*;q=0.8' }, signal: AbortSignal.timeout(30000), redirect: 'follow' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const bytes = new Uint8Array(await r.arrayBuffer());
      const utf8 = new TextDecoder('utf-8').decode(bytes);
      // Some official open-data files are still Windows-1252.
      const body = utf8.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(bytes) : utf8;
      return { body, type: r.headers.get('content-type') || '' };
    } catch (e) { lastError = e; }
  }
  throw lastError;
}

// Honour each site's robots.txt: a page its rules close to all robots is not read.
const robotsCache = new Map();
async function allowed(url) {
  const { origin, pathname, search } = new URL(url);
  if (!robotsCache.has(origin)) {
    robotsCache.set(origin, get(`${origin}/robots.txt`).then(({ body }) => {
      const rules = [];
      let applies = false, lastWasAgent = false;
      for (const raw of body.split('\n')) {
        const [k, ...v] = raw.replace(/#.*/, '').split(':');
        const key = k.trim().toLowerCase(), val = v.join(':').trim();
        if (key === 'user-agent') { applies = lastWasAgent ? applies || val === '*' : val === '*'; lastWasAgent = true; continue; }
        lastWasAgent = false;
        if (applies && (key === 'disallow' || key === 'allow') && val) rules.push({ allow: key === 'allow', path: val.replace(/\*$/, '') });
      }
      return rules;
    }).catch(() => []));
  }
  const rules = await robotsCache.get(origin);
  const path = pathname + search;
  // The longest matching rule wins, as in Google's interpretation.
  const match = rules.filter((r) => !r.path.includes('*') && path.startsWith(r.path)).sort((a, b) => b.path.length - a.path.length)[0];
  return !match || match.allow;
}

async function fetchText(w) {
  if (!(await allowed(w.url))) throw new Error('robots.txt asks robots not to read this page');
  if (w.fetch) return w.fetch(async (u) => (await get(u)).body).then((t) => t.replace(/[ \t]+/g, ' '));
  const { body, type } = await get(w.url);
  return toText(body, type);
}

// One call per page and product: does the page agree with the status we show, and
// (when its text changed since the last check) does it show a new decision?
async function askClaude(w, product, previous, current) {
  const statuses = w.type === 'access' ? ACCESS_STATUSES : REG_STATUSES;
  const prompt = `You monitor ${w.bodyName} (${w.country}) for decisions on the HIV medicine ${product.name} (${product.inn}).
${w.type === 'access' ? 'This body decides on reimbursement, health technology assessment or pricing.' : 'This body decides on marketing authorisation.'}

What our tracker currently shows for this body: ${JSON.stringify(product.current || 'nothing')}

Text from ${w.url} around mentions of the product, as it was at the previous check:
<previous>${previous || '(no previous copy)'}</previous>

The same text today:
<current>${current}</current>

1. "matches": does today's text agree with what our tracker shows (same decision, and the same date if the text gives one)? "yes" if it agrees, "no" if it states a different decision or date by ${w.bodyName} on this product, "unclear" if the text does not say.
2. "newDecision": does today's text show a decision by ${w.bodyName} on ${product.name} that our tracker does not already record (a new decision, a changed status, or a date we do not have)?
Only count decisions about this exact product and this body, stated in the text. Ignore page layout, other products and news that is not a decision.

Answer with JSON only, no other text:
{"matches": "yes"|"no"|"unclear", "newDecision": true|false, "status": one of ${JSON.stringify(statuses)} or null, "date": "YYYY-MM-DD" or null, "label": short status wording (max 4 words) or null, "note": key detail such as indication, restriction or price (max 90 characters) or null, "summary": one plain English sentence on what the text says, or null}`;

  const r = await fetch(`${process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 350, messages: [{ role: 'user', content: prompt }] }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body?.error?.message || `Anthropic HTTP ${r.status}`);
  const text = body.content?.map((c) => c.text || '').join('') || '';
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const out = JSON.parse(json);
  if (out.newDecision && !statuses.includes(out.status)) out.newDecision = false;
  if (out.date && !/^\d{4}-\d{2}-\d{2}$/.test(out.date)) out.date = null;
  out.result = out.matches === 'yes' ? 'agrees' : out.matches === 'no' ? 'differs' : null;
  return out;
}

// Saves a copy of the team's sheet for the check, the weekly email and the site's
// fallback. Written only when the sheet's content changed, so a quiet sheet makes
// no commit. A sheet that cannot be read leaves the last copy in place.
async function saveSheet() {
  const id = process.env.HIV_SHEET_ID || SHEET_ID;
  if (!id) { console.log('Team sheet: not set up yet, using the saved copy'); return; }
  try {
    const r = await fetch(sheetCsvUrl(id), { signal: AbortSignal.timeout(30000), redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    if (!/csv|text\/plain/i.test(r.headers.get('content-type') || '')) throw new Error('not shared as "Anyone with the link"');
    const rows = rowsFromCsv(await r.text());
    if (rows.length < 100) throw new Error(`only ${rows.length} rows, keeping the saved copy`);
    const packed = packRows(rows);
    const old = readJson(SNAPSHOT_FILE, {});
    if (JSON.stringify(old.rows) === JSON.stringify(packed.rows) && old.from === 'sheet') { console.log(`Team sheet: ${rows.length} rows, unchanged`); return; }
    console.log(`Team sheet: ${rows.length} rows, saved`);
    if (!DRY) writeFileSync(SNAPSHOT_FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), from: 'sheet', ...packed }) + '\n');
  } catch (e) {
    console.log(`Team sheet: could not read (${e.message}), using the saved copy`);
  }
}

// Confirms the key works without spending tokens (listing models is free).
async function keyStatus() {
  if (!process.env.ANTHROPIC_API_KEY) return 'missing';
  try {
    const r = await fetch(`${process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'}/v1/models?limit=1`, { headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' } });
    return r.ok ? 'ok' : `rejected (HTTP ${r.status})`;
  } catch (e) { return `unreachable (${e.message})`; }
}

async function main() {
  await saveSheet();
  // Imported after the sheet is saved: sources.mjs reads the statuses from the copy.
  const { WATCHES } = await import(process.env.WATCH_SOURCES || './sources.mjs');
  const state = readJson(STATE_FILE, {});
  const claudeKey = await keyStatus();
  console.log(`Claude API key: ${claudeKey}`);
  const output = readJson(OUT_FILE, { lastRun: null, sources: {}, detections: [] });
  const hasKey = claudeKey === 'ok';
  let calls = 0;
  const found = [];
  const sources = {};
  const queue = [];

  // What this run found for each status. A page that disagrees outweighs one that
  // agrees, which outweighs one that lists nothing.
  const RANK = { differs: 3, agrees: 2, absent: 1 };
  const confirmations = {};
  const confirm = (w, product, sig, result, note) => {
    const k = `${product.id}:${w.column}`;
    if (confirmations[k] && RANK[confirmations[k].result] >= RANK[result]) return;
    confirmations[k] = { at: today, result, sig, body: w.body, page: w.link?.(product) || w.url, note: note || null };
  };

  for (const w of WATCHES) {
    let text;
    try {
      text = await fetchText(w);
      sources[w.id] = { body: w.body, ok: true };
    } catch (e) {
      sources[w.id] = { body: w.body, ok: false, error: String(e.message || e).slice(0, 120) };
      console.log(`✕ ${w.id}: ${e.message}`);
      continue;
    }
    for (const product of w.products) {
      const key = `${w.id}:${product.id}`;
      const snippet = snippetFor(text, product.terms);
      const hash = createHash('sha256').update(snippet).digest('hex').slice(0, 16);
      const prev = state[key];
      const cur = product.current || {};
      // The status the team's sheet shows; when it changes, the page is read again.
      const sig = JSON.stringify([cur.s || 'none', cur.date || '']);
      if (!snippet) {
        // The page does not mention the product: that confirms "no decision yet".
        if (NO_DECISION.includes(cur.s || 'none')) confirm(w, product, sig, 'absent');
        if (!prev || prev.hash !== hash) state[key] = { hash, snippet, since: today };
        continue;
      }
      const changed = !!prev && prev.hash !== hash;
      if (!changed && prev?.verdict?.sig === sig) {
        // Same text, same status: the last answer still holds.
        if (prev.verdict.result) confirm(w, product, sig, prev.verdict.result, prev.verdict.note);
        continue;
      }
      if (!prev) state[key] = { hash, snippet, since: today };
      // Changed text first, then text never read, then statuses the team changed.
      queue.push({ w, product, key, snippet, hash, prev, sig, changed, order: changed ? 0 : !prev?.verdict ? 1 : 2 });
    }
  }

  queue.sort((a, b) => a.order - b.order);
  for (const { w, product, key, snippet, hash, prev, sig, changed } of queue) {
    if (!hasKey || calls >= MAX_CLAUDE_CALLS) { console.log(`… ${key}: left for the next run`); continue; }
    calls++;
    try {
      const res = await askClaude(w, product, changed ? prev.snippet : null, snippet);
      state[key] = { hash, snippet, since: changed ? today : state[key].since, verdict: { sig, result: res.result, note: res.result === 'differs' ? (res.summary || res.note || null) : null } };
      if (res.result) confirm(w, product, sig, res.result, state[key].verdict.note);
      console.log(`${res.newDecision && changed ? '★' : res.result === 'differs' ? '⚠' : res.result === 'agrees' ? '✓' : '○'} ${key}: ${res.summary || 'nothing stated'}`);
      // A new decision counts only when the text changed since a previous check;
      // on a first reading a mismatch is shown as "check source" instead.
      if (res.newDecision && changed) {
        found.push({ product: product.id, body: w.body, column: w.column, type: w.type, s: res.status, date: res.date, label: res.label, note: res.note, summary: res.summary, src: w.link?.(product) || w.url, detectedAt: today });
      }
    } catch (e) {
      console.log(`✕ ${key}: Claude: ${e.message}`);
    }
  }

  // Newer detections replace older ones for the same product and column.
  const kept = output.detections.filter((d) => !found.some((f) => f.product === d.product && f.column === d.column && f.date === d.date && f.s === d.s));
  const next = {
    lastRun: today, model: MODEL, claudeKey, claudeCalls: calls, sources,
    detections: [...kept, ...found].sort((a, b) => (b.detectedAt + (b.date || '')).localeCompare(a.detectedAt + (a.date || ''))),
    // Statuses not reached this run keep their last result.
    confirmations: Object.fromEntries(Object.entries({ ...(output.confirmations || {}), ...confirmations }).sort(([a], [b]) => a.localeCompare(b))),
  };
  const counts = Object.values(confirmations).reduce((n, c) => ({ ...n, [c.result]: (n[c.result] || 0) + 1 }), {});
  console.log(`\n${WATCHES.length} pages, ${Object.values(sources).filter((s) => !s.ok).length} unreachable, ${calls} read by Claude, ${found.length} new decisions.`);
  console.log(`Statuses: ${counts.agrees || 0} confirmed, ${counts.absent || 0} with nothing listed, ${counts.differs || 0} to check.`);
  if (DRY) return;
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 1) + '\n');
  writeFileSync(OUT_FILE, JSON.stringify(next, null, 1) + '\n');
}

export { snippetFor, toText, allowed, fetchText };
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
