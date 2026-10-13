// api/brief.js — "What matters this week" for the News tab.
// Written once a day for everyone: Vercel's CDN caches the response for 24 hours,
// so visitors read the cached copy instead of each costing a Claude call.
import { loadHivNews } from './rss.js';

const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 400;
const DAY = 24 * 60 * 60;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  // Query strings would each get their own cache entry and a fresh Claude call.
  if ((req.url || '').includes('?')) return res.status(400).json({ error: 'No parameters accepted' });

  try {
    const news = await loadHivNews();
    const weekAgo = new Date(Date.now() - 7 * DAY * 1000).toISOString().slice(0, 10);
    const rank = { High: 0, Medium: 1, Low: 2 };
    const week = (news || []).filter(n => n.published && n.published >= weekAgo)
      .sort((a, b) => (rank[a.impact] ?? 2) - (rank[b.impact] ?? 2))
      .slice(0, 25);
    if (!week.length) {
      res.setHeader('Cache-Control', 's-maxage=900');
      return res.status(200).json({ brief: '', stories: 0 });
    }

    const list = week.map(n => `- [${n.published}] ${n.headline} (${n.source})`).join('\n');
    const prompt = `You are a competitive intelligence analyst for an HIV launch readiness team. From these HIV news headlines of the last 7 days, write exactly 3 bullet points on what matters most this week for the HIV market and its competitors (Gilead, ViiV/GSK, MSD, J&J) and for access. One sentence each, each starting with "• ". Use only facts from the headlines; do not invent numbers or dates.\n\n${list}`;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.REACT_APP_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await response.json();
    const brief = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
    if (!response.ok || !brief) throw new Error(data.error?.message || `HTTP ${response.status}`);

    // Fresh for a day; while the next one is written, the previous day's is still served.
    res.setHeader('Cache-Control', `s-maxage=${DAY}, stale-while-revalidate=${DAY}`);
    return res.status(200).json({ brief, stories: week.length, generated: new Date().toISOString() });
  } catch (err) {
    console.error('Brief error:', err.message);
    // Retry after 15 minutes rather than calling Claude on every visit.
    res.setHeader('Cache-Control', 's-maxage=900');
    return res.status(502).json({ error: 'Brief unavailable' });
  }
}
