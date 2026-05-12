// api/rss.js — Vercel serverless function
// Fetches RSS feeds from BioPharma Dive, STAT News, Fierce Biotech

const RSS_FEEDS = [
  { url: 'https://www.biopharmadive.com/feeds/news/', source: 'BioPharma Dive' },
  { url: 'https://www.statnews.com/feed/', source: 'STAT News' },
  { url: 'https://www.fiercebiotech.com/rss/xml', source: 'Fierce Biotech' },
];

// Strip ALL HTML and decode entities — aggressive clean
function stripHTML(str) {
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<img[^>]*\/?>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract text content from an XML tag (handles CDATA too)
function extractTag(xml, tag) {
  // Try CDATA first
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const cdataMatch = cdataRe.exec(xml);
  if (cdataMatch) return stripHTML(cdataMatch[1]);
  // Plain tag
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const plainMatch = plainRe.exec(xml);
  if (plainMatch) return stripHTML(plainMatch[1]);
  return '';
}

// Parse RSS XML into article objects
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

    // Format date
    let date = '';
    try {
      const d = new Date(pubDate);
      date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      date = pubDate || '';
    }

    // Trim summary to 220 chars cleanly
    const summary = description.length > 220
      ? description.slice(0, 220).replace(/\s+\S*$/, '') + '…'
      : description;

    // Detect tag from title + category keywords
    const text = (title + ' ' + category).toLowerCase();
    let tag = 'Industry News';
    if (text.includes('trial') || text.includes('phase') || text.includes('efficacy') || text.includes('readout')) tag = 'Trial Results';
    else if (text.includes('fda') || text.includes('approv') || text.includes('pdufa') || text.includes('regulat')) tag = 'Regulatory';
    else if (text.includes('partner') || text.includes('deal') || text.includes('acqui') || text.includes('merger')) tag = 'Partnership';
    else if (text.includes('crispr') || text.includes('gene edit') || text.includes('mrna') || text.includes('cell therapy')) tag = 'Clinical Data';
    else if (text.includes('conference') || text.includes('congress') || text.includes('asco') || text.includes('ats')) tag = 'Conference';
    else if (text.includes('finance') || text.includes('invest') || text.includes('earning') || text.includes('revenue')) tag = 'Finance';

    // Extract a clean photo search keyword from the title
    // (used later by the frontend for Pexels image search)
    const photoKeyword = extractPhotoKeyword(title, tag);

    items.push({
      headline: title,
      summary,
      source,
      date,
      link,
      tag,
      ticker: '',
      photoKeyword,
    });
  }

  return items;
}

// Map article title + tag to a meaningful Pexels search keyword
function extractPhotoKeyword(title, tag) {
  const t = title.toLowerCase();
  if (t.includes('hiv') || t.includes('aids')) return 'HIV virus research';
  if (t.includes('cancer') || t.includes('oncol') || t.includes('tumor')) return 'cancer research laboratory';
  if (t.includes('vaccine') || t.includes('immuniz')) return 'vaccine syringe medical';
  if (t.includes('alzheimer') || t.includes('dementia') || t.includes('neuro')) return 'brain neuroscience';
  if (t.includes('diabetes') || t.includes('insulin') || t.includes('glp')) return 'diabetes insulin medical';
  if (t.includes('crispr') || t.includes('gene edit') || t.includes('gene therapy')) return 'DNA genetics laboratory';
  if (t.includes('mrna') || t.includes('rna')) return 'mRNA molecule science';
  if (t.includes('fda') || t.includes('approv') || t.includes('regulat')) return 'FDA medicine approval';
  if (t.includes('merger') || t.includes('acqui') || t.includes('deal') || t.includes('invest')) return 'pharmaceutical business deal';
  if (t.includes('clinical trial') || t.includes('phase')) return 'clinical trial patient doctor';
  if (t.includes('antibody') || t.includes('immuno')) return 'antibody immunology research';
  if (t.includes('heart') || t.includes('cardio')) return 'heart cardiology medical';
  if (t.includes('rare disease') || t.includes('orphan')) return 'rare disease laboratory';
  if (t.includes('manufactur') || t.includes('supply chain')) return 'pharmaceutical manufacturing';
  if (tag === 'Finance') return 'pharmaceutical stock finance';
  if (tag === 'Conference') return 'medical conference doctors';
  return 'pharmaceutical research laboratory';
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

    // Sort newest first
    allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json(allArticles.slice(0, 30));

  } catch (err) {
    console.error('RSS handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
