// api/rss.js — Vercel serverless function
// Fetches RSS feeds from BioPharma Dive, STAT News, Fierce Biotech
// and returns parsed articles as JSON

const RSS_FEEDS = [
  {
    url: 'https://www.biopharmadive.com/feeds/news/',
    source: 'BioPharma Dive',
  },
  {
    url: 'https://www.statnews.com/feed/',
    source: 'STAT News',
  },
  {
    url: 'https://www.fiercebiotech.com/rss/xml',
    source: 'Fierce Biotech',
  },
];

// Extract text content from an XML tag
function extractTag(xml, tag) {
  const cdataMatch = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i').exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml);
  if (match) return match[1].replace(/<[^>]+>/g, '').trim();
  return '';
}

// Parse RSS XML string into array of article objects
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

    // Format date nicely
    let date = '';
    try {
      const d = new Date(pubDate);
      date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      date = pubDate || '';
    }

    // Clean up description — strip HTML, trim to 200 chars
    const cleanDesc = description
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220);

    // Try to guess a tag from category or title keywords
    const text = (title + ' ' + category).toLowerCase();
    let tag = 'Industry News';
    if (text.includes('trial') || text.includes('phase') || text.includes('efficacy') || text.includes('data')) tag = 'Trial Results';
    else if (text.includes('fda') || text.includes('approv') || text.includes('pdufa') || text.includes('regulat')) tag = 'Regulatory';
    else if (text.includes('partner') || text.includes('deal') || text.includes('acqui') || text.includes('merger')) tag = 'Partnership';
    else if (text.includes('crispr') || text.includes('gene') || text.includes('editing') || text.includes('rna')) tag = 'Clinical Data';
    else if (text.includes('conference') || text.includes('congress') || text.includes('asco') || text.includes('ats')) tag = 'Conference';

    items.push({
      headline: title,
      summary: cleanDesc + (cleanDesc.length === 220 ? '…' : ''),
      source,
      date,
      link,
      tag,
      ticker: '', // RSS feeds don't have ticker symbols
    });
  }

  return items;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Fetch all feeds in parallel
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

    // Combine successful results
    let allArticles = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        allArticles = allArticles.concat(result.value);
      } else {
        console.error(`Feed failed (${RSS_FEEDS[i].source}):`, result.reason?.message);
      }
    });

    if (allArticles.length === 0) {
      return res.status(502).json({ error: 'All feeds failed', articles: [] });
    }

    // Sort by date descending (most recent first)
    allArticles.sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      return db - da;
    });

    // Return up to 30 articles
    return res.status(200).json(allArticles.slice(0, 30));

  } catch (err) {
    console.error('RSS handler error:', err);
    return res.status(500).json({ error: err.message, articles: [] });
  }
}
