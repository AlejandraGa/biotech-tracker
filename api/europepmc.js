// api/europepmc.js — Vercel serverless function
// Proxy for Europe PMC API to avoid CORS issues from the browser

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, rows = 10 } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    const encoded = encodeURIComponent(query);
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encoded}&format=json&pageSize=${rows}&sort=date&resultType=lite`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CatalystApp/1.0)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Europe PMC returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const results = (data.resultList?.result || []).map(p => ({
      id: p.id,
      title: p.title,
      authors: p.authorString,
      journalTitle: p.journalTitle,
      pubYear: p.pubYear,
      pubDate: p.firstPublicationDate,
      source: p.source,
      doi: p.doi,
      pmid: p.pmid,
      abstract: p.abstractText,
      isOpenAccess: p.isOpenAccess === 'Y',
      citedByCount: p.citedByCount || 0,
      pubType: p.pubType || '',
    }));

    return res.status(200).json(results);

  } catch (err) {
    console.error('Europe PMC proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
