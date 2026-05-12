// api/search.js — Finnhub symbol search endpoint
// Searches by ticker OR company name, returns { ticker, name }[]
// Deploy this to /api/search.js in your Vercel project

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  if (!FINNHUB_KEY) {
    return res.status(500).json({ error: 'Missing FINNHUB_API_KEY' });
  }

  try {
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB_KEY}`;
    const r = await fetch(url);
    const data = await r.json();

    if (!data.result || data.result.length === 0) {
      return res.status(200).json([]);
    }

    // Filter: only US common stocks, ETFs, and pharma/biotech
    // Finnhub returns type: 'Common Stock', 'ETP', etc.
    const filtered = data.result
      .filter(item =>
        item.type === 'Common Stock' ||
        item.type === 'ETP' ||
        item.type === ''
      )
      .filter(item =>
        // Exclude OTC pink sheets (usually 5-letter tickers ending in F/Y/PK patterns)
        item.symbol && item.symbol.length <= 5 && !item.symbol.includes('.')
      )
      .map(item => ({
        ticker: item.symbol,
        name: item.description || item.symbol,
      }))
      .slice(0, 8);

    return res.status(200).json(filtered);
  } catch (e) {
    console.error('Finnhub search error:', e);
    return res.status(500).json({ error: 'Search failed' });
  }
}
