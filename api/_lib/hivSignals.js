// api/_lib/hivSignals.js — shared by /api/hiv-signals and /api/hiv-digest
// Polls public sources for HIV regulatory and competitor activity and returns
// one normalised list of "signals". Each source is fetched independently, so
// one failing source never hides the others; its failure is reported instead.

// ─── WHAT WE TRACK ──────────────────────────────────────────────────────────
// keyword (lower case) → { product, company }. First match wins, so brand
// names come before the substances they contain.
const TRACKED = [
  ['islatravir/lenacapavir', 'Islatravir / lenacapavir', 'Gilead + MSD'],
  ['islatravir and lenacapavir', 'Islatravir / lenacapavir', 'Gilead + MSD'],
  ['islatravir plus lenacapavir', 'Islatravir / lenacapavir', 'Gilead + MSD'],
  ['bixlenvo', 'Bixlenvo', 'Gilead'],
  ['yeztugo', 'Yeztugo · Yeytuo', 'Gilead'],
  ['yeytuo', 'Yeztugo · Yeytuo', 'Gilead'],
  ['sunlenca', 'Sunlenca', 'Gilead'],
  ['biktarvy', 'Biktarvy', 'Gilead'],
  ['idvynso', 'Idvynso', 'MSD'],
  ['mk-8527', 'MK-8527', 'MSD'],
  ['apretude', 'Apretude', 'ViiV Healthcare'],
  ['cabenuva', 'Cabenuva · Vocabria + Rekambys', 'ViiV Healthcare / J&J'],
  ['vocabria', 'Cabenuva · Vocabria + Rekambys', 'ViiV Healthcare / J&J'],
  ['rekambys', 'Cabenuva · Vocabria + Rekambys', 'ViiV Healthcare / J&J'],
  ['dovato', 'Dovato', 'ViiV Healthcare'],
  ['lotivibart', 'Lotivibart', 'ViiV Healthcare'],
  ['islatravir', 'Islatravir', 'MSD'],
  ['doravirine', 'Doravirine', 'MSD'],
  ['lenacapavir', 'Lenacapavir', 'Gilead'],
  ['bictegravir', 'Bictegravir', 'Gilead'],
  ['cabotegravir', 'Cabotegravir', 'ViiV Healthcare'],
  ['dolutegravir', 'Dolutegravir', 'ViiV Healthcare'],
  ['rilpivirine', 'Rilpivirine', 'J&J'],
];

// Substances used to query the structured FDA and EMA datasets.
const SUBSTANCES = ['lenacapavir', 'bictegravir', 'islatravir', 'doravirine', 'cabotegravir', 'rilpivirine', 'dolutegravir'];
// Swissmedic lists substances by their Latin INN.
const SWISSMEDIC_TERMS = ['lenacapavir', 'bictegravir', 'islatravir', 'doravirin', 'cabotegravir', 'rilpivirin', 'dolutegravir',
  'yeytuo', 'yeztugo', 'sunlenca', 'bixlenvo', 'idvynso', 'apretude', 'vocabria', 'rekambys', 'biktarvy', 'dovato'];

const HIV_RE = /\bHIV\b|pre-exposure prophylaxis|\bPrEP\b|antiretroviral/i;
const COMPANY_RE = /gilead|viiv|\bgsk\b|merck|\bmsd\b|janssen|johnson & johnson/i;
const REG_RE = /\bFDA\b|\bEMA\b|\bCHMP\b|swissmedic|european commission|approv|authoris|authoriz|opinion|pdufa|\bNDA\b|\bsNDA\b|\bMAA\b|complete response|priority review|submission|filing|phase 3|phase III|topline|\bNICE\b|G-BA|\bHTA\b|reimburs|draft guidance/i;

// Investor and stock-market coverage: not competitive intelligence.
const FINANCE_PUBLISHER_RE = /simply wall|zacks|motley fool|seeking alpha|marketbeat|yahoo finance|investing\.com|tipranks|benzinga|insider monkey|barchart|stocktwits|investorplace|24\/7 wall|tradingview|nasdaq\.com|morningstar|barron|stock titan|defense world|ticker report|marketscreener|finviz|gurufocus|investor's business/i;
const FINANCE_TITLE_RE = /\bstocks?\b|\bshares?\b(?! (data|results|findings|update|new|plans|pipeline|interim|week))|share price|price target|\banalysts?\b|valuation|\binvestors?\b|investment case|buy rating|\bupgrades?\b|\bdowngrades?\b|dividend|market cap|\bnasdaq\b|\bnyse\b|morgan stanley|goldman sachs|jefferies|wall street|growth phase|hedge fund|\bholdings?\b|stake in|\bbullish\b|\bbearish\b|outperform|underperform/i;
export function isFinanceNoise(title, publisher = '') {
  return FINANCE_PUBLISHER_RE.test(publisher) || FINANCE_TITLE_RE.test(title);
}
// Same story from several outlets: compare on the first significant words.
function storyKey(title) {
  return (title || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3).slice(0, 7).join(' ');
}

export function tagProduct(text) {
  const t = (text || '').toLowerCase();
  for (const [kw, product, company] of TRACKED) if (t.includes(kw)) return { product, company };
  return { product: '', company: '' };
}

// ─── SMALL HELPERS ──────────────────────────────────────────────────────────
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; CatalystHIVMonitor/1.0)', Accept: '*/*' };

async function get(url, { timeout = 12000, as = 'text', fetchImpl = fetch } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetchImpl(url, { headers: UA, signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return as === 'json' ? await res.json() : await res.text();
  } finally {
    clearTimeout(timer);
  }
}

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export function isoDaysAgo(days, now = new Date()) { return iso(new Date(now.getTime() - days * 86400000)); }
// "27/08/2026" or "27.08.2026" → "2026-08-27"
function dmyToIso(s) {
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec((s || '').trim());
  return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : '';
}
// "20260827" → "2026-08-27"
function ymdToIso(s) { return /^\d{8}$/.test(s || '') ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : ''; }
function rfcToIso(s) { const d = new Date(s); return isNaN(d) ? '' : iso(d); }

function decode(s) {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;|&#8217;|&#8216;/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—').replace(/&nbsp;|&#160;/g, ' ').replace(/&reg;|&#174;/g, '®').replace(/&trade;|&#8482;/g, '™').replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ').trim();
}
function tag(block, name) {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i').exec(block);
  return m ? decode(m[1]) : '';
}
export function parseRss(xml) {
  const out = [];
  const re = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml || '')) !== null) {
    const b = m[1];
    const title = tag(b, 'title');
    if (!title) continue;
    out.push({ title, link: tag(b, 'link') || tag(b, 'guid'), date: rfcToIso(tag(b, 'pubDate')), desc: tag(b, 'description').slice(0, 280), publisher: tag(b, 'source') });
  }
  return out;
}

function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80); }

// ─── FDA · openFDA Drugs@FDA ────────────────────────────────────────────────
const FDA_STATUS = { AP: 'approved', TA: 'tentatively approved' };
export function fdaUrl() {
  const q = `products.active_ingredients.name:(${SUBSTANCES.map((s) => s.toUpperCase()).join('+')})`;
  return `https://api.fda.gov/drug/drugsfda.json?search=${q}&limit=100`;
}
export function parseFda(json, since) {
  const out = [];
  for (const app of json?.results || []) {
    const appNo = app.application_number || '';
    if (!/^(NDA|BLA)/.test(appNo)) continue; // skip generics (ANDA)
    const rawBrand = app.products?.[0]?.brand_name || app.openfda?.brand_name?.[0] || appNo;
    const brand = /^[A-Z0-9 \-]+$/.test(rawBrand) && !/^(NDA|BLA)/.test(rawBrand) ? rawBrand.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : rawBrand;
    const ingredients = [...new Set((app.products || []).flatMap((p) => (p.active_ingredients || []).map((i) => i.name)))].join(' / ');
    for (const s of app.submissions || []) {
      const date = ymdToIso(s.submission_status_date);
      if (!date || date < since) continue;
      const original = s.submission_type === 'ORIG';
      const cls = s.submission_class_code_description || s.submission_class_code || '';
      const efficacy = /efficacy|new indication|new dosage|new combination|new molecular/i.test(cls);
      const what = original ? 'Original application' : `Supplement ${s.submission_number}`;
      const { product, company } = tagProduct(`${brand} ${ingredients}`);
      out.push({
        id: `fda-${appNo}-${s.submission_type}-${s.submission_number}`,
        date, source: 'FDA', kind: 'decision', level: original || efficacy ? 'major' : 'minor',
        product: product || brand, company: company || app.sponsor_name || '',
        title: `${brand}: ${what.toLowerCase()} ${FDA_STATUS[s.submission_status] || s.submission_status}`,
        detail: [cls, s.review_priority === 'PRIORITY' ? 'Priority review' : '', ingredients.toLowerCase()].filter(Boolean).join(' · '),
        url: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${appNo.replace(/\D/g, '')}`,
      });
    }
  }
  return out;
}

// Approval record per FDA application, used to keep the status table current.
export function fdaLive(json) {
  const out = [];
  for (const app of json?.results || []) {
    const appNo = app.application_number || '';
    if (!/^(NDA|BLA)/.test(appNo)) continue;
    const orig = (app.submissions || []).find((x) => x.submission_type === 'ORIG' && x.submission_status === 'AP');
    const approvalDate = ymdToIso(orig?.submission_status_date);
    if (!approvalDate) continue;
    for (const brand of [...new Set((app.products || []).map((p) => (p.brand_name || '').toUpperCase()).filter(Boolean))]) {
      out.push({ brand, approvalDate, url: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${appNo.replace(/\D/g, '')}` });
    }
  }
  return out;
}

// ─── EMA · medicines dataset + news feed ────────────────────────────────────
export const EMA_JSON = 'https://www.ema.europa.eu/en/documents/report/medicines-output-medicines_json-report_en.json';
export const EMA_NEWS = 'https://www.ema.europa.eu/en/news.xml';
export function parseEma(json, since) {
  const out = [];
  const rows = Array.isArray(json) ? json : json?.data || [];
  for (const r of rows) {
    if (r.category && r.category !== 'Human') continue;
    if (/^yes$/i.test(r.generic || '') || /^yes$/i.test(r.biosimilar || '')) continue;
    const hay = `${r.name_of_medicine} ${r.active_substance} ${r.international_non_proprietary_name_common_name}`.toLowerCase();
    const isHiv = /hiv/i.test(r.therapeutic_area_mesh || '') || SUBSTANCES.some((s) => hay.includes(s));
    if (!isHiv) continue;
    const name = r.name_of_medicine || r.active_substance;
    const { product, company } = tagProduct(hay);
    const base = { source: 'EMA', product: product || name, company: company || r.marketing_authorisation_developer_applicant_holder || '', url: r.medicine_url || '' };
    const push = (field, kind, level, title, detail = '') => {
      const date = dmyToIso(r[field]);
      if (date && date >= since) out.push({ ...base, id: `ema-${slug(name)}-${field}-${date}`, date, kind, level, title, detail });
    };
    push('opinion_adopted_date', 'decision', 'major', `${name}: CHMP opinion adopted${r.opinion_status ? ` (${r.opinion_status.toLowerCase()})` : ''}`);
    push('marketing_authorisation_date', 'decision', 'major', `${name}: EU marketing authorisation issued`);
    push('refusal_of_marketing_authorisation_date', 'decision', 'major', `${name}: EU marketing authorisation refused`);
    push('withdrawal_of_application_date', 'decision', 'major', `${name}: application withdrawn`);
    push('start_of_evaluation_date', 'procedure', 'major', `${name}: EMA evaluation started`);
    // The latest EC decision usually reflects a variation, so it is logged as a routine update.
    if (r.european_commission_decision_date !== r.marketing_authorisation_date) {
      push('european_commission_decision_date', 'procedure', 'minor', `${name}: new European Commission decision`, r.latest_procedure_affecting_product_information || '');
    }
  }
  return out;
}
// Opinion and authorisation record per EMA medicine, used to keep the status table current.
export function emaLive(json) {
  const out = [];
  const rows = Array.isArray(json) ? json : json?.data || [];
  for (const r of rows) {
    if (r.category && r.category !== 'Human') continue;
    if (/^yes$/i.test(r.generic || '') || /^yes$/i.test(r.biosimilar || '')) continue;
    const substances = `${r.active_substance} ${r.international_non_proprietary_name_common_name}`.toLowerCase();
    if (!SUBSTANCES.some((x) => substances.includes(x))) continue;
    out.push({
      name: r.name_of_medicine || '', substances,
      medicineStatus: r.medicine_status || '', opinionStatus: r.opinion_status || '',
      opinionDate: dmyToIso(r.opinion_adopted_date), maDate: dmyToIso(r.marketing_authorisation_date),
      refusalDate: dmyToIso(r.refusal_of_marketing_authorisation_date), withdrawalDate: dmyToIso(r.withdrawal_of_application_date),
      url: r.medicine_url || '',
    });
  }
  return out;
}
export function parseEmaNews(xml, since) {
  return parseRss(xml)
    .filter((i) => i.date >= since && (HIV_RE.test(`${i.title} ${i.desc}`) || /CHMP/.test(i.title) || tagProduct(`${i.title} ${i.desc}`).product))
    .map((i) => {
      const t = tagProduct(`${i.title} ${i.desc}`);
      const highlights = /meeting highlights.*CHMP/i.test(i.title);
      return { id: `emanews-${slug(i.title)}`, date: i.date, source: 'EMA', kind: 'news', level: highlights || t.product ? 'major' : 'minor', product: t.product, company: t.company, title: i.title, detail: highlights ? 'Monthly CHMP meeting: check for HIV opinions.' : i.desc, url: i.link };
    });
}

// ─── SWISSMEDIC · newly authorised medicines page ───────────────────────────
export const SWISSMEDIC_URL = 'https://www.swissmedic.ch/swissmedic/en/home/humanarzneimittel/authorisations/new-medicines.html';
export function parseSwissmedic(html, since) {
  const entries = [];
  const re = /<a[^>]+href="([^"]*\/authorisations\/new-medicines\/[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    const title = decode(m[2]);
    if (!title) continue;
    // The date sits just before or just after the link, depending on the template.
    const before = html.slice(Math.max(0, m.index - 500), m.index);
    const after = html.slice(re.lastIndex, re.lastIndex + 300);
    const dates = before.match(/\d{2}\.\d{2}\.\d{4}/g);
    const date = dmyToIso(dates ? dates[dates.length - 1] : (after.match(/\d{2}\.\d{2}\.\d{4}/) || [''])[0]);
    const href = m[1].startsWith('http') ? m[1] : `https://www.swissmedic.ch${m[1]}`;
    entries.push({ title, date, href });
  }
  const signals = entries
    .filter((e) => e.date && e.date >= since && SWISSMEDIC_TERMS.some((t) => e.title.toLowerCase().includes(t)))
    .map((e) => {
      const t = tagProduct(e.title);
      return { id: `ch-${slug(e.title)}-${e.date}`, date: e.date, source: 'Swissmedic', kind: 'decision', level: 'major', product: t.product || e.title, company: t.company, title: `${e.title}: authorised in Switzerland`, detail: 'Listed among newly authorised human medicines.', url: e.href };
    });
  return { signals, parsed: entries.length };
}

// ─── PRESS · company and trade feeds ────────────────────────────────────────
const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:30d`)}&hl=en-US&gl=US&ceid=US:en`;
export const PRESS_FEEDS = [
  { name: 'EATG HIV news', url: 'https://www.eatg.org/hiv-news/feed/' },
  { name: 'Gilead (Google News)', url: gnews('Gilead HIV lenacapavir OR Yeztugo OR Yeytuo OR Bixlenvo OR Biktarvy') },
  { name: 'ViiV (Google News)', url: gnews('ViiV Healthcare cabotegravir OR Apretude OR Vocabria OR Dovato OR lotivibart') },
  { name: 'MSD (Google News)', url: gnews('Merck HIV islatravir OR doravirine OR Idvynso OR "MK-8527"') },
  { name: 'Swissmedic (Google News)', url: gnews('Swissmedic HIV OR lenacapavir OR cabotegravir OR islatravir') },
  { name: 'BioPharma Dive', url: 'https://www.biopharmadive.com/feeds/news/' },
  { name: 'Endpoints News', url: 'https://endpts.com/feed/' },
  { name: 'Fierce Pharma', url: 'https://www.fiercepharma.com/rss/xml' },
  { name: 'Fierce Biotech', url: 'https://www.fiercebiotech.com/rss/xml' },
];
export function parsePress(xml, feedName, since) {
  const out = [];
  for (const i of parseRss(xml)) {
    if (!i.date || i.date < since) continue;
    const text = `${i.title} ${i.desc}`;
    const t = tagProduct(text);
    // Keep only items about a tracked asset, or about HIV at one of the tracked companies.
    if (!t.product && !(HIV_RE.test(text) && COMPANY_RE.test(text))) continue;
    // Google News appends " - Publisher" to titles.
    const title = i.publisher && i.title.endsWith(` - ${i.publisher}`) ? i.title.slice(0, -(i.publisher.length + 3)) : i.title;
    if (isFinanceNoise(title, i.publisher || feedName)) continue;
    out.push({ id: `press-${slug(title)}`, date: i.date, source: 'Press', kind: 'news', level: REG_RE.test(text) ? 'major' : 'minor', product: t.product, company: t.company, title, detail: i.publisher || feedName, url: i.link });
  }
  return out;
}

// ─── CLINICALTRIALS.GOV · recently updated HIV trials by tracked sponsors ───
export function ctgovUrl(since) {
  const p = new URLSearchParams();
  p.set('query.cond', 'HIV Infections');
  p.set('query.spons', 'Gilead OR ViiV OR "Merck Sharp" OR Janssen OR GlaxoSmithKline');
  p.set('filter.advanced', `AREA[LastUpdatePostDate]RANGE[${since},MAX]`);
  p.set('sort', 'LastUpdatePostDate:desc');
  p.set('pageSize', '40');
  p.set('fields', 'NCTId,BriefTitle,LeadSponsorName,OverallStatus,Phase,PrimaryCompletionDate,LastUpdatePostDate,InterventionName');
  return `https://clinicaltrials.gov/api/v2/studies?${p.toString()}`;
}
export function parseCtgov(json, since) {
  const out = [];
  for (const raw of json?.studies || []) {
    const p = raw.protocolSection || {};
    const nct = p.identificationModule?.nctId;
    const date = p.statusModule?.lastUpdatePostDateStruct?.date || '';
    if (!nct || !date || date < since) continue;
    const phases = (p.designModule?.phases || []).join('/').replace(/PHASE/g, 'Phase ').replace(/EARLY_/g, 'Early ');
    const late = /3|4/.test(phases);
    const interventions = (p.armsInterventionsModule?.interventions || []).map((i) => i.name).slice(0, 3).join(', ');
    const title = p.identificationModule?.briefTitle || nct;
    const t = tagProduct(`${title} ${interventions}`);
    const status = (p.statusModule?.overallStatus || '').replace(/_/g, ' ').toLowerCase();
    const completion = p.statusModule?.primaryCompletionDateStruct?.date;
    out.push({
      id: `ctgov-${nct}-${date}`, date, source: 'ClinicalTrials.gov', kind: 'trial', level: late ? 'major' : 'minor',
      product: t.product, company: t.company || p.sponsorCollaboratorsModule?.leadSponsor?.name || '',
      title: `${nct} record updated: ${title}`,
      detail: [phases, status, completion ? `primary completion ${completion}` : '', p.sponsorCollaboratorsModule?.leadSponsor?.name].filter(Boolean).join(' · '),
      url: `https://clinicaltrials.gov/study/${nct}`,
    });
  }
  return out;
}

// ─── SWITZERLAND · Spezialitätenliste (BAG public API) ──────────────────────
// Reimbursement listing, public price and limitations for the tracked substances.
const SL_API = 'https://epl.bag.admin.ch/api/sl/public/medicinal-products';
const SL_SUBSTANCES = ['Lenacapavirum', 'Bictegravirum', 'Cabotegravirum', 'Rilpivirinum', 'Islatravirum', 'Doravirinum', 'Dolutegravirum'];
export const slUrl = (term) => `${SL_API}?search=${encodeURIComponent(term)}&page=1&size=50`;
export function parseSl(payloads) {
  const byName = new Map();
  for (const json of payloads) {
    for (const item of json?.items || []) {
      for (const mp of item.medicinalProducts || []) {
        const packs = (mp.packagedMedicinalProducts || []).filter((p) => !p.delistingReason);
        if (!packs.length) continue;
        const key = mp.trademark || item.trademark;
        const rec = byName.get(key) || { trademark: key, substances: (item.substances || []).join(', '), holder: item.marketingAuthorisationHolder?.name || '', packs: [], limitation: false, timeLimitedTo: '', firstListed: '', lastPriceChange: '' };
        for (const p of packs) {
          rec.packs.push({ form: mp.dosageFormAndStrength, size: p.packSize, retailPrice: p.retailPrice, exFactoryPrice: p.exFactoryPrice });
          if (p.limitation || (mp.limitations || []).length) rec.limitation = true;
          if (p.expiration && p.validTo && p.validTo > rec.timeLimitedTo) rec.timeLimitedTo = p.validTo;
          if (p.firstListed && (!rec.firstListed || p.firstListed < rec.firstListed)) rec.firstListed = p.firstListed;
          if (p.lastPriceChange && p.lastPriceChange > rec.lastPriceChange) rec.lastPriceChange = p.lastPriceChange;
        }
        byName.set(key, rec);
      }
    }
  }
  return [...byName.values()];
}
const chf = (n) => `CHF ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function slSignals(records, since, today) {
  const out = [];
  const soon = isoDaysAgo(-60, new Date(`${today}T00:00:00Z`));
  for (const r of records) {
    const t = tagProduct(`${r.trademark} ${r.substances}`);
    const base = { source: 'Spezialitätenliste', kind: 'decision', level: 'major', product: t.product || r.trademark, company: t.company || r.holder, url: `https://sl.bag.admin.ch/sl?search=${encodeURIComponent(r.trademark)}` };
    const first = r.packs[0];
    if (r.firstListed >= since) out.push({ ...base, id: `sl-${slug(r.trademark)}-listed-${r.firstListed}`, date: r.firstListed, title: `${r.trademark}: added to the Swiss Spezialitätenliste`, detail: `${chf(first.retailPrice)} public price, ${first.form}${r.limitation ? ' · with limitation' : ''}` });
    if (r.lastPriceChange >= since && r.lastPriceChange !== r.firstListed) out.push({ ...base, id: `sl-${slug(r.trademark)}-price-${r.lastPriceChange}`, date: r.lastPriceChange, title: `${r.trademark}: Swiss list price changed`, detail: `Now ${chf(first.retailPrice)} public price, ${first.form}` });
    if (r.timeLimitedTo && r.timeLimitedTo >= today && r.timeLimitedTo <= soon) out.push({ ...base, id: `sl-${slug(r.trademark)}-expiry-${r.timeLimitedTo}`, date: today, title: `${r.trademark}: time-limited Swiss listing ends ${r.timeLimitedTo}`, detail: 'A renewal decision by the BAG is due.' });
  }
  return out;
}

// ─── COLLECT ────────────────────────────────────────────────────────────────
// Returns { generatedAt, since, sources:[{name, ok, count, error}], signals:[...] }
export async function collectSignals({ days = 90, fetchImpl = fetch, now = new Date() } = {}) {
  const since = isoDaysAgo(days, now);
  const opt = { fetchImpl };
  // null means the dataset could not be read, so the table keeps its curated values.
  const live = { fda: null, ema: null, sl: null };

  const jobs = [
    ['FDA', async () => {
      const json = await get(fdaUrl(), { ...opt, as: 'json' });
      live.fda = fdaLive(json);
      return parseFda(json, since);
    }],
    ['EMA', async () => {
      const [data, news] = await Promise.allSettled([
        get(EMA_JSON, { ...opt, as: 'json', timeout: 25000 }),
        get(EMA_NEWS, opt),
      ]);
      if (data.status === 'rejected' && news.status === 'rejected') throw data.reason;
      if (data.status === 'fulfilled') live.ema = emaLive(data.value);
      return [
        ...(data.status === 'fulfilled' ? parseEma(data.value, since) : []),
        ...(news.status === 'fulfilled' ? parseEmaNews(news.value, since) : []),
      ];
    }],
    ['Swissmedic', async () => {
      const { signals, parsed } = parseSwissmedic(await get(SWISSMEDIC_URL, opt), since);
      if (!parsed) throw new Error('page layout not recognised');
      return signals;
    }],
    ['Press', async () => {
      const results = await Promise.allSettled(PRESS_FEEDS.map((f) => get(f.url, { ...opt, timeout: 9000 }).then((xml) => parsePress(xml, f.name, since))));
      if (results.every((r) => r.status === 'rejected')) throw results[0].reason;
      // Newest first, then keep one item per story.
      const all = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])).sort((a, b) => b.date.localeCompare(a.date));
      const stories = new Set();
      return all.filter((x) => { const k = storyKey(x.title); if (stories.has(k)) return false; stories.add(k); return true; });
    }],
    ['Spezialitätenliste', async () => {
      const results = await Promise.allSettled(SL_SUBSTANCES.map((term) => get(slUrl(term), { ...opt, as: 'json', timeout: 10000 })));
      if (results.every((r) => r.status === 'rejected')) throw results[0].reason;
      // Only publish the snapshot when every query answered, so a gap is never read as "not listed".
      const records = parseSl(results.filter((r) => r.status === 'fulfilled').map((r) => r.value));
      if (results.every((r) => r.status === 'fulfilled')) live.sl = records;
      return slSignals(records, since, iso(now));
    }],
    ['ClinicalTrials.gov', async () => parseCtgov(await get(ctgovUrl(since), { ...opt, as: 'json' }), since)],
  ];

  const settled = await Promise.allSettled(jobs.map(([, run]) => run()));
  const sources = [];
  const seen = new Set();
  const signals = [];
  settled.forEach((r, i) => {
    const name = jobs[i][0];
    if (r.status === 'rejected') { sources.push({ name, ok: false, count: 0, error: String(r.reason?.message || r.reason).slice(0, 120) }); return; }
    let count = 0;
    for (const s of r.value) { if (seen.has(s.id)) continue; seen.add(s.id); signals.push(s); count++; }
    sources.push({ name, ok: true, count });
  });
  signals.sort((a, b) => b.date.localeCompare(a.date) || (a.level === b.level ? 0 : a.level === 'major' ? -1 : 1));
  return { generatedAt: now.toISOString(), since, days, sources, signals, live };
}
