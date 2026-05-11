export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { tickers } = req.body;
  const apiKey = process.env.FINNHUB_API_KEY;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const results = await Promise.all(
      tickers.map(async (ticker) => {
        const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${monthAgo}&to=${today}&token=${apiKey}`);
        const news = await res.json();
        return news.slice(0, 3).map(n => ({
          ticker,
          headline: n.headline,
          source: n.source,
          date: new Date(n.datetime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          url: n.url,
          summary: n.summary
        }));
      })
    );
    
    res.status(200).json(results.flat().sort((a, b) => new Date(b.date) - new Date(a.date)));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
