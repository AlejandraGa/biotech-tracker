// api/rss.js — Vercel serverless function
// Fetches RSS feeds from multiple biotech/pharma news sources

// Known biotech/pharma companies — ticker + name variants to detect in headlines
const KNOWN_COMPANIES = [
  { ticker: 'MRNA', names: ['Moderna'] },
  { ticker: 'EDIT', names: ['Editas'] },
  { ticker: 'RXRX', names: ['Recursion'] },
  { ticker: 'BEAM', names: ['Beam Therapeutics'] },
  { ticker: 'KYMR', names: ['Kymera'] },
  { ticker: 'GBIO', names: ['Generation Bio'] },
  { ticker: 'KALA', names: ['Kailera'] },
  { ticker: 'NVAX', names: ['Novavax'] },
  { ticker: 'GILD', names: ['Gilead'] },
  { ticker: 'BIIB', names: ['Biogen'] },
  { ticker: 'REGN', names: ['Regeneron'] },
  { ticker: 'VRTX', names: ['Vertex'] },
  { ticker: 'ALNY', names: ['Alnylam'] },
  { ticker: 'BMRN', names: ['BioMarin'] },
  { ticker: 'BLUE', names: ['bluebird bio', 'bluebird'] },
  { ticker: 'CRSP', names: ['CRISPR Therapeutics'] },
  { ticker: 'NTLA', names: ['Intellia'] },
  { ticker: 'PFE',  names: ['Pfizer'] },
  { ticker: 'JNJ',  names: ['Johnson & Johnson', 'J&J', 'Janssen'] },
  { ticker: 'LLY',  names: ['Eli Lilly', 'Lilly'] },
  { ticker: 'NVO',  names: ['Novo Nordisk', 'Novo'] },
  { ticker: 'AZN',  names: ['AstraZeneca'] },
  { ticker: 'RHHBY',names: ['Roche', 'Genentech'] },
  { ticker: 'NVS',  names: ['Novartis'] },
  { ticker: 'ABBV', names: ['AbbVie'] },
  { ticker: 'BMY',  names: ['Bristol Myers', 'Bristol-Myers', 'BMS'] },
  { ticker: 'MRK',  names: ['Merck', 'MSD'] },
  { ticker: 'AMGN', names: ['Amgen'] },
  { ticker: 'BNTX', names: ['BioNTech'] },
  { ticker: 'SGEN', names: ['Seagen'] },
  { ticker: 'INCY', names: ['Incyte'] },
  { ticker: 'RARE', names: ['Ultragenyx'] },
  { ticker: 'IONS', names: ['Ionis'] },
  { ticker: 'FOLD', names: ['Amicus'] },
  { ticker: 'PTGX', names: ['Protagonist'] },
  { ticker: 'FATE', names: ['Fate Therapeutics'] },
  { ticker: 'SRRK', names: ['Scholar Rock'] },
];

// Detect company mentions in headline+summary, return { ticker, companyName }[]
function detectCompanies(text) {
  const found = [];
  const lower = text.toLowerCase();
  for (const co of KNOWN_COMPANIES) {
    for (const name of co.names) {
      if (lower.includes(name.toLowerCase())) {
        found.push({ ticker: co.ticker, companyName: co.names[0] });
        break; // only add once per company
      }
    }
  }
  return found;
}

const RSS_FEEDS = [
  { url: 'https://www.biopharmadive.com/feeds/news/', source: 'BioPharma Dive' },
  { url: 'https://www.statnews.com/feed/', source: 'STAT News' },
  { url: 'https://www.fiercebiotech.com/rss/xml', source: 'Fierce Biotech' },
  { url: 'https://www.fiercepharma.com/rss/xml', source: 'Fierce Pharma' },
  { url: 'https://endpts.com/feed/', source: 'Endpoints News' },
  { url: 'https://www.pharmexec.com/rss', source: 'Pharm Exec' },
  { url: 'https://www.evaluate.com/vantage/rss', source: 'Evaluate Vantage' },
  { url: 'https://feeds.feedburner.com/InVivoMedtechInsight', source: 'In Vivo' },
];

// Strip ALL HTML and decode entities — aggressive clean
function stripHTML(str) {
  let s = str;
  s = s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, '');
  s = s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<img[^>]*\/?>/gi, '')
    .replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function extractTag(xml, tag) {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const cdataMatch = cdataRe.exec(xml);
  if (cdataMatch) return stripHTML(cdataMatch[1]);
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const plainMatch = plainRe.exec(xml);
  if (plainMatch) return stripHTML(plainMatch[1]);
  return '';
}

function parseRSS(xml, source) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    const description = extractTag(block, 'description');
    const category = extractTag(block, 'category');

    if (!title) continue;

    let date = '';
    let dateObj = null;
    try {
      dateObj = new Date(pubDate);
      date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      date = pubDate || '';
    }

    const summary = description.length > 240
      ? description.slice(0, 240).replace(/\s+\S*$/, '') + '…'
      : description;

    const text = (title + ' ' + category).toLowerCase();
    let tag = 'Industry News';
    if (text.includes('trial') || text.includes('phase') || text.includes('efficacy') || text.includes('readout')) tag = 'Trial Results';
    else if (text.includes('fda') || text.includes('approv') || text.includes('pdufa') || text.includes('regulat') || text.includes('ema')) tag = 'Regulatory';
    else if (text.includes('partner') || text.includes('deal') || text.includes('acqui') || text.includes('merger') || text.includes('licens')) tag = 'Partnership';
    else if (text.includes('crispr') || text.includes('gene edit') || text.includes('mrna') || text.includes('cell therapy') || text.includes('gene therapy')) tag = 'Clinical Data';
    else if (text.includes('conference') || text.includes('congress') || text.includes('asco') || text.includes('ats') || text.includes('esmo') || text.includes('ash ')) tag = 'Conference';
    else if (text.includes('finance') || text.includes('invest') || text.includes('earning') || text.includes('revenue') || text.includes('ipo') || text.includes('funding')) tag = 'Finance';

    const photoKeyword = extractPhotoKeyword(title, tag);

    // Detect company mentions in headline + summary
    const detected = detectCompanies(title + ' ' + description);
    const ticker = detected.length === 1 ? detected[0].ticker : '';
    const companies = detected; // all matches, for display

    items.push({
      headline: title,
      summary,
      source,
      date,
      dateObj: dateObj ? dateObj.toISOString() : '',
      link,
      tag,
      ticker,
      companies,
      photoKeyword,
    });
  }

  return items;
}

function extractPhotoKeyword(title, tag) {
  const t = title.toLowerCase();
  if (t.includes('hiv') || t.includes('aids')) return 'HIV virus research';
  if (t.includes('cancer') || t.includes('oncol') || t.includes('tumor')) return 'cancer research laboratory';
  if (t.includes('vaccine') || t.includes('immuniz')) return 'vaccine syringe medical';
  if (t.includes('alzheimer') || t.includes('dementia') || t.includes('neuro')) return 'brain neuroscience';
  if (t.includes('diabetes') || t.includes('insulin') || t.includes('glp')) return 'diabetes insulin medical';
  if (t.includes('crispr') || t.includes('gene edit') || t.includes('gene therapy')) return 'DNA genetics laboratory';
  if (t.includes('mrna') || t.includes('rna')) return 'mRNA molecule science';
  if (t.includes('fda') || t.includes('approv') || t.includes('regulat') || t.includes('ema')) return 'FDA medicine approval';
  if (t.includes('merger') || t.includes('acqui') || t.includes('deal') || t.includes('invest') || t.includes('ipo')) return 'pharmaceutical business deal';
  if (t.includes('clinical trial') || t.includes('phase')) return 'clinical trial patient doctor';
  if (t.includes('antibody') || t.includes('immuno')) return 'antibody immunology research';
  if (t.includes('heart') || t.includes('cardio')) return 'heart cardiology medical';
  if (t.includes('rare disease') || t.includes('orphan')) return 'rare disease laboratory';
  if (t.includes('manufactur') || t.includes('supply chain')) return 'pharmaceutical manufacturing';
  if (t.includes('obesity') || t.includes('weight loss')) return 'obesity medicine health';
  if (t.includes('ai') || t.includes('artificial intel') || t.includes('machine learn')) return 'artificial intelligence technology';
  if (tag === 'Finance') return 'pharmaceutical stock finance';
  if (tag === 'Conference') return 'medical conference doctors';
  return 'pharmaceutical research laboratory';
}

// Deduplicate by headline similarity
function deduplicate(articles) {
  const seen = new Set();
  return articles.filter(a => {
    // Normalize headline: lowercase, strip punctuation, take first 60 chars
    const key = a.headline.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 60).trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const results = await Promise.allSettled(
      RSS_FEEDS.map(async ({ url, source }) => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BiotechTracker/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
        const xml = await response.text();
        return parseRSS(xml, source);
      })
    );

    let allArticles = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        allArticles = allArticles.concat(result.value);
      } else {
        console.error(`Feed failed (${RSS_FEEDS[i].source}):`, result.reason?.message);
      }
    });

    if (allArticles.length === 0) {
      return res.status(502).json({ error: 'All feeds failed' });
    }

    // Deduplicate, then sort newest first
    allArticles = deduplicate(allArticles);
    allArticles.sort((a, b) => {
      if (a.dateObj && b.dateObj) return new Date(b.dateObj) - new Date(a.dateObj);
      return 0;
    });

    // Remove internal dateObj field before sending
    const clean = allArticles.map(({ dateObj, ...rest }) => rest);

    return res.status(200).json(clean.slice(0, 80));

  } catch (err) {
    console.error('RSS handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
