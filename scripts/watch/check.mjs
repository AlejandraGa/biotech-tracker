// scripts/watch/check.mjs — check of regulator and reimbursement pages.
//
// Run by .github/workflows/check-decisions.yml. For every body and product in
// sources.mjs it downloads the page, keeps only the text around the product's
// names, and compares it with yesterday's copy in state.json. Only when that
// text has changed is it sent to Claude, which says whether it contains a new
// decision. New decisions are written to src/hivAutoDetections.json, which the
// site reads, so they appear after the next deploy.
//
// Needs ANTHROPIC_API_KEY. Without it the pages are still checked and changes
// are kept for the next run, but nothing is read by Claude.
//   node scripts/watch/check.mjs            normal daily run
//   node scripts/watch/check.mjs --dry      fetch and compare only, write nothing
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const { WATCHES } = await import(process.env.WATCH_SOURCES || './sources.mjs');

const ROOT = new URL('../../', import.meta.url);
const STATE_FILE = new URL('scripts/watch/state.json', ROOT);
const OUT_FILE = new URL('src/hivAutoDetections.json', ROOT);
const DRY = process.argv.includes('--dry');
const MODEL = process.env.CHECK_MODEL || 'claude-haiku-5-5';
// Keeps the cost per run bounded: changes beyond this many wait for the next run (runs every 3 hours).
const MAX_CLAUDE_CALLS = Number(process.env.MAX_CLAUDE_CALLS || 15);
const WINDOW = 350;          // characters kept either side of each product name
const MAX_SNIPPET = 5000;    // characters sent to Claude per page and product
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const REG_STATUSES = ['approved', 'positive', 'review', 'negative', 'notapproved'];
const ACCESS_STATUSES = ['favourable', 'restricted', 'limited', 'listed', 'noadded', 'unfavourable'];

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

async function askClaude(w, product, previous, current) {
  const statuses = w.type === 'access' ? ACCESS_STATUSES : REG_STATUSES;
  const prompt = `You monitor ${w.bodyName} (${w.country}) for decisions on the HIV medicine ${product.name} (${product.inn}).
${w.type === 'access' ? 'This body decides on reimbursement, health technology assessment or pricing.' : 'This body decides on marketing authorisation.'}

What our tracker currently records for this body: ${JSON.stringify(product.current || 'nothing')}

Text from ${w.url} around mentions of the product, as it was at the previous check:
<previous>${previous || '(no previous copy)'}</previous>

The same text today:
<current>${current}</current>

Does today's text show a decision by ${w.bodyName} on ${product.name} that our tracker does not already record (a new decision, a changed status, or a date we do not have)? Only count decisions about this exact product and this body, stated in the text. Ignore page layout changes, other products and news that is not a decision.

Answer with JSON only, no other text:
{"newDecision": true|false, "status": one of ${JSON.stringify(statuses)} or null, "date": "YYYY-MM-DD" or null, "label": short status wording (max 4 words) or null, "note": key detail such as indication, restriction or price (max 90 characters) or null, "summary": one plain English sentence describing the decision, or null}`;

  const r = await fetch(`${process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body?.error?.message || `Anthropic HTTP ${r.status}`);
  const text = body.content?.map((c) => c.text || '').join('') || '';
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const out = JSON.parse(json);
  if (out.newDecision && !statuses.includes(out.status)) out.newDecision = false;
  if (out.date && !/^\d{4}-\d{2}-\d{2}$/.test(out.date)) out.date = null;
  return out;
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
  const state = readJson(STATE_FILE, {});
  const claudeKey = await keyStatus();
  console.log(`Claude API key: ${claudeKey}`);
  const output = readJson(OUT_FILE, { lastRun: null, sources: {}, detections: [] });
  const hasKey = claudeKey === 'ok';
  let calls = 0;
  const found = [];
  const sources = {};

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
      if (!prev) {
        // First sighting: remember the page as it is today, nothing to compare with yet.
        state[key] = { hash, snippet, since: today };
        console.log(`· ${key}: baseline${snippet ? '' : ' (product not mentioned)'}`);
        continue;
      }
      if (prev.hash === hash) continue;
      if (!snippet) { state[key] = { hash, snippet, since: today }; continue; }
      if (!hasKey || calls >= MAX_CLAUDE_CALLS) { console.log(`… ${key}: changed, left for the next run`); continue; }
      calls++;
      try {
        const res = await askClaude(w, product, prev.snippet, snippet);
        state[key] = { hash, snippet, since: today };
        console.log(`${res.newDecision ? '★' : '○'} ${key}: ${res.summary || 'no new decision'}`);
        if (res.newDecision) {
          found.push({ product: product.id, body: w.body, column: w.column, type: w.type, s: res.status, date: res.date, label: res.label, note: res.note, summary: res.summary, src: w.link?.(product) || w.url, detectedAt: today });
        }
      } catch (e) {
        console.log(`✕ ${key}: Claude: ${e.message}`);
      }
    }
  }

  // Newer detections replace older ones for the same product and column.
  const kept = output.detections.filter((d) => !found.some((f) => f.product === d.product && f.column === d.column && f.date === d.date && f.s === d.s));
  const next = { lastRun: today, model: MODEL, claudeKey, claudeCalls: calls, sources, detections: [...kept, ...found].sort((a, b) => (b.detectedAt + (b.date || '')).localeCompare(a.detectedAt + (a.date || ''))) };
  console.log(`\n${WATCHES.length} pages, ${Object.values(sources).filter((s) => !s.ok).length} unreachable, ${calls} read by Claude, ${found.length} new decisions.`);
  if (DRY) return;
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 1) + '\n');
  writeFileSync(OUT_FILE, JSON.stringify(next, null, 1) + '\n');
}

export { snippetFor, toText, allowed, fetchText };
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
