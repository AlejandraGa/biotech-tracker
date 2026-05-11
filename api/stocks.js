export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { tickers } = req.body;
  const apiKey = process.env.FINNHUB_API_KEY;
  
  try {
    const results = await Promise.all(
      tickers.map(async (ticker) => {
        const [quoteRes, profileRes] = await Promise.all([
          fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`),
          fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`)
        ]);
        const quote = await quoteRes.json();
        const profile = await profileRes.json();
        return {
          ticker,
          price: quote.c || 0,
          change: quote.dp || 0,
          mktcap: profile.marketCapitalization ? `${(profile.marketCapitalization / 1000).toFixed(1)}B` : '—',
          name: profile.name || ticker
        };
      })
    );
    res.status(200).json(results);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
