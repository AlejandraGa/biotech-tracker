// api/press.js — Press releases / company announcements
// Fetches from BioPharma Dive press releases + GlobeNewswire biotech feed

const PRESS_FEEDS = [
  { url: 'https://www.biopharmadive.com/press-release/feed/', source: 'BioPharma Dive' },
  { url: 'https://www.fiercebiotech.com/rss/press-releases', source: 'Fierce Biotech' },
  { url: 'https://www.fiercepharma.com/rss/press-releases', source: 'Fierce Pharma' },
];

function stripHTML(str) {
  let s = str || '';
  s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
  s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function extractTag(xml, tag) {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const m = cdataRe.exec(xml);
  if (m) return stripHTML(m[1]);
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m2 = plainRe.exec(xml);
  if (m2) return stripHTML(m2[1]);
  return '';
}

// Extract company name from press release title
function extractCompany(title) {
  // Common patterns: "CompanyName Announces...", "CompanyName Reports..."
  const verbs = ['announces', 'reports', 'presents', 'launches', 'receives', 'completes', 'initiates', 'raises', 'closes', 'granted', 'appoints', 'expands', 'enters', 'achieves'];
  const lower = title.toLowerCase();
  for (const verb of verbs) {
    const idx = lower.indexOf(verb);
    if (idx > 2 && idx < 80) {
      return title.slice(0, idx).trim().replace(/,\s*$/, '');
    }
  }
  // Fallback: first 30 chars before a comma or dash
  const commaIdx = title.indexOf(',');
  const dashIdx = title.indexOf(' —');
  const cutoff = Math.min(
    commaIdx > 0 ? commaIdx : 999,
    dashIdx > 0 ? dashIdx : 999,
    50
  );
  if (cutoff < 50) return title.slice(0, cutoff).trim();
  return '';
}

function parsePressRSS(xml, source) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    if (!title) continue;

    let date = '';
    let dateObj = null;
    try {
      dateObj = new Date(pubDate);
      date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { date = ''; }

    const company = extractCompany(title);

    items.push({
      headline: title,
      company: company || source,
      source,
      date,
      dateObj: dateObj ? dateObj.toISOString() : '',
      link,
    });
  }
  return items;
}

function deduplicate(articles) {
  const seen = new Set();
  return articles.filter(a => {
    const key = a.headline.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 60).trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const results = await Promise.allSettled(
      PRESS_FEEDS.map(async ({ url, source }) => {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BiotechTracker/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
          signal: AbortSignal.timeout(7000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xml = await response.text();
        return parsePressRSS(xml, source);
      })
    );

    let all = [];
    results.forEach(r => { if (r.status === 'fulfilled') all = all.concat(r.value); });

    all = deduplicate(all);

    // Keep only articles with pharma/biotech relevant keywords
    const PHARMA_KEYWORDS = [
      'trial', 'phase', 'fda', 'ema', 'approval', 'drug', 'therapy', 'therapeutic',
      'clinical', 'patient', 'data', 'efficacy', 'safety', 'biomarker', 'endpoint',
      'cancer', 'oncol', 'tumor', 'immuno', 'antibody', 'biologic', 'biosimilar',
      'gene', 'crispr', 'mrna', 'rna', 'cell therapy', 'rare disease', 'orphan',
      'nda', 'bla', 'ind', 'pdufa', 'sNDA', 'label', 'investigational',
      'pharma', 'biotech', 'biopharma', 'medicine', 'disease', 'treatment',
      'compound', 'molecule', 'mechanism', 'pathway', 'target', 'inhibitor',
      'agonist', 'antagonist', 'monoclonal', 'vaccine', 'immunotherapy',
      'acquisition', 'merger', 'licensing', 'partnership', 'collaboration',
      'milestone', 'royalty', 'series a', 'series b', 'ipo', 'financing',
    ];

    // French-language detection
    const FRENCH_WORDS = ['selon', 'pour', ' dans ', 'avec ', ' les ', ' des ', ' qui ', ' est ', ' par ', 'après', "l'", 'améliore', 'finalise', 'annonce', 'lance'];

    all = all.filter(a => {
      const lower = a.headline.toLowerCase();
      // Reject French
      const frenchCount = FRENCH_WORDS.filter(w => lower.includes(w)).length;
      if (frenchCount >= 2) return false;
      // Must contain at least one pharma keyword
      return PHARMA_KEYWORDS.some(kw => lower.includes(kw));
    });

    all.sort((a, b) => {
      if (a.dateObj && b.dateObj) return new Date(b.dateObj) - new Date(a.dateObj);
      return 0;
    });

    const clean = all.map(({ dateObj, ...rest }) => rest);
    return res.status(200).json(clean.slice(0, 30));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
