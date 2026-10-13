// api/rss.js — Vercel serverless function
// Fetches HIV news: HIV-specific feeds plus trade press filtered to HIV stories
import { isHivNews, stripPublisher, gnews, storyCompetitors, storyImpact, groupSameStory } from './_lib/hivNews.js';
import { tagProduct } from './_lib/hivSignals.js';

// Companies active in HIV — ticker + name variants to detect in headlines
const KNOWN_COMPANIES = [
  { ticker: 'GILD', names: ['Gilead'] },
  { ticker: 'GSK',  names: ['ViiV Healthcare', 'ViiV', 'GSK', 'GlaxoSmithKline'] },
  { ticker: 'MRK',  names: ['Merck', 'MSD'] },
  { ticker: 'JNJ',  names: ['Johnson & Johnson', 'J&J', 'Janssen'] },
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
  { url: 'https://www.eatg.org/hiv-news/feed/', source: 'EATG' },
  { url: gnews('HIV treatment OR "HIV prevention" OR "HIV PrEP"'), source: 'Google News' },
  { url: gnews('lenacapavir OR cabotegravir OR islatravir OR bictegravir OR doravirine OR Yeztugo OR Apretude OR Cabenuva OR Biktarvy OR Dovato'), source: 'Google News' },
  { url: gnews('"ViiV Healthcare" OR "Gilead HIV" OR "Merck HIV"'), source: 'Google News' },
  { url: gnews('HIV UNAIDS OR PEPFAR OR "Global Fund"'), source: 'Google News' },
  // HIV specialist outlets and the competitors' own newsrooms
  { url: gnews('HIV site:aidsmap.com'), source: 'aidsmap' },
  { url: gnews('HIV site:natap.org'), source: 'NATAP' },
  { url: gnews('HIV (site:gilead.com OR site:viivhealthcare.com OR site:gsk.com OR site:merck.com OR site:jnj.com)'), source: 'Company newsroom' },
  { url: 'https://www.biopharmadive.com/feeds/news/', source: 'BioPharma Dive' },
  { url: 'https://endpts.com/feed/', source: 'Endpoints News' },
  { url: 'https://www.fiercebiotech.com/rss/xml', source: 'Fierce Biotech' },
  { url: 'https://www.fiercepharma.com/rss/xml', source: 'Fierce Pharma' },
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
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&amp;/g, '&')
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
    const publisher = extractTag(block, 'source');
    const title = stripPublisher(extractTag(block, 'title'), publisher);
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    const description = extractTag(block, 'description');
    const category = extractTag(block, 'category');

    if (!title) continue;
    if (!isHivNews(title, description, publisher)) continue;

    let date = '';
    let dateObj = null;
    try {
      dateObj = new Date(pubDate);
      date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      date = pubDate || '';
    }

    // Google News descriptions only repeat the title and publisher.
    const summary = publisher ? '' : description.length > 340
      ? description.slice(0, 340).replace(/\s+\S*$/, '') + '…'
      : description;

    const text = (title + ' ' + category + ' ').toLowerCase();
    let tag = 'HIV News';
    if (text.includes('trial') || text.includes('phase') || text.includes('efficacy') || text.includes('readout') || text.includes('data')) tag = 'Trial Results';
    else if (text.includes('fda') || text.includes('approv') || text.includes('pdufa') || text.includes('regulat') || text.includes('ema') || text.includes('chmp') || text.includes('swissmedic')) tag = 'Regulatory';
    else if (text.includes('croi') || text.includes('ias ') || text.includes('aids 20') || text.includes('idweek') || text.includes('eacs') || text.includes('glasgow') || text.includes('conference')) tag = 'Conference';
    else if (text.includes('pepfar') || text.includes('unaids') || text.includes('global fund') || text.includes('price') || text.includes('reimburs') || text.includes('access') || text.includes('guideline') || text.includes('generic') || text.includes('nice')) tag = 'Access & Policy';
    else if (text.includes('partner') || text.includes('deal') || text.includes('acqui') || text.includes('merger') || text.includes('licens')) tag = 'Partnership';
    else if (text.includes('earning') || text.includes('revenue') || text.includes('sales') || text.includes('quarter')) tag = 'Market';

    const subject = storySubject(title + ' ' + description, detectCompanies(title + ' ' + description));

    // Detect company mentions in headline + summary
    const detected = detectCompanies(title + ' ' + description);
    const ticker = detected.length === 1 ? detected[0].ticker : '';
    const companies = detected; // all matches, for display
    const { products, competitors } = storyCompetitors(title + ' ' + description);
    const impact = storyImpact(title + ' ' + description, competitors.length > 0 || products.length > 0);

    items.push({
      headline: title,
      summary,
      source: publisher || source,
      date,
      dateObj: dateObj && !isNaN(dateObj) ? dateObj.toISOString() : '',
      link,
      tag,
      ticker,
      companies,
      products,
      competitors,
      impact,
      ...subject,
    });
  }

  return items;
}

// What the story is about, for the card next to it: tracked product and company,
// else an HIV policy body, else the company alone.
const POLICY_BODIES = [['pepfar', 'PEPFAR'], ['unaids', 'UNAIDS'], ['global fund', 'Global Fund'], ['world health organization', 'WHO'], ['who ', 'WHO']];
function storySubject(text, companies) {
  const lower = text.toLowerCase();
  const t = tagProduct(lower);
  const segment = /prep\b|prevent|prophylaxis/.test(lower) ? 'Prevention' : /treatment|suppress|switch|regimen|antiretroviral therapy/.test(lower) ? 'Treatment' : '';
  if (t.product) return { company: t.company, product: t.product, segment };
  const body = POLICY_BODIES.find(([kw]) => lower.includes(kw));
  if (body) return { company: 'Policy', product: body[1], segment: 'Access' };
  if (companies.length) return { company: companies[0].companyName, product: '', segment };
  return { company: '', product: '', segment };
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

// Fetches, filters and ranks the HIV news. Returns null when every feed failed.
// Also used by /api/brief.
export async function loadHivNews() {
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

    if (results.every(r => r.status === 'rejected')) {
      return null;
    }

    // Deduplicate
    allArticles = deduplicate(allArticles);

    // Filter out clearly non-biotech/pharma articles
    const NOISE_KEYWORDS = [
      'alcohol epidemic', 'gun control', 'housing', 'immigration', 'climate change',
      'electric vehicle', 'crypto', 'bitcoin', 'real estate', 'stock market crash',
      'medicaid work requirement', 'social security', 'medicare cuts', 'opioid politics',
      'opinion:', 'stat+:', 'letters to the editor', 'podcast:', 'news roundup',
      'deadliest drug', 'abortion',
    ];

    // French-language detection — common French words that wouldn't appear in English pharma headlines
    const FRENCH_WORDS = ['selon', 'pour', 'dans', 'avec', 'sur', 'une ', 'les ', 'des ', 'qui ', 'est ', 'par ', 'son ', 'leur', 'aux ', 'mais', 'aussi', 'après', 'avant'];

    allArticles = allArticles.filter(a => {
      const lower = a.headline.toLowerCase();
      // Reject if contains noise keywords
      if (NOISE_KEYWORDS.some(kw => lower.includes(kw))) return false;
      // Reject if likely French (3+ French words in headline)
      const frenchCount = FRENCH_WORDS.filter(w => lower.includes(w)).length;
      if (frenchCount >= 2) return false;
      return true;
    });

    // Source priority weights — higher = shown first when same date
    const SOURCE_PRIORITY = {
      'aidsmap': 12,
      'NATAP': 12,
      'EATG': 11,
      'BioPharma Dive': 10,
      'Endpoints News': 9,
      'Fierce Biotech': 8,
      'Evaluate Vantage': 7,
      'Fierce Pharma': 6,
      'In Vivo': 5,
      'Pharm Exec': 4,
      'STAT News': 3,
    };

    // Sort: primarily by recency (last 48h), then by source priority
    const now = Date.now();
    const RECENT_WINDOW = 48 * 60 * 60 * 1000; // 48 hours in ms

    allArticles.sort((a, b) => {
      const dateA = a.dateObj ? new Date(a.dateObj).getTime() : 0;
      const dateB = b.dateObj ? new Date(b.dateObj).getTime() : 0;
      const aRecent = (now - dateA) < RECENT_WINDOW;
      const bRecent = (now - dateB) < RECENT_WINDOW;

      // Both recent: higher impact first, then source priority, then date
      if (aRecent && bRecent) {
        const IMPACT_RANK = { High: 2, Medium: 1, Low: 0 };
        const iA = IMPACT_RANK[a.impact] || 0;
        const iB = IMPACT_RANK[b.impact] || 0;
        if (iB !== iA) return iB - iA;
        const pA = SOURCE_PRIORITY[a.source] || 0;
        const pB = SOURCE_PRIORITY[b.source] || 0;
        if (pB !== pA) return pB - pA;
        return dateB - dateA;
      }
      // One recent, one not: recent wins
      if (aRecent) return -1;
      if (bRecent) return 1;
      // Both old: just sort by date
      return dateB - dateA;
    });

    // One entry per story; the other outlets go in alsoIn
    allArticles = groupSameStory(allArticles);

    // Send the publication date as YYYY-MM-DD for the weekly brief
    const clean = allArticles.map(({ dateObj, ...rest }) => ({ ...rest, published: dateObj ? dateObj.slice(0, 10) : '' }));

    return clean.slice(0, 80);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const news = await loadHivNews();
    if (!news) return res.status(502).json({ error: 'All feeds failed' });
    // Shared by every visitor for 30 minutes; an older copy is served while the next one loads.
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json(news);
  } catch (err) {
    console.error('RSS handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
