// api/claude.js — server-side proxy for the site's AI buttons.
// Only the prompt text comes from the browser; model and length are fixed
// here so the endpoint cannot be used as a general-purpose Claude API.
const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 1000;
const MAX_PROMPT_CHARS = 12000;

// Best-effort limit per IP. It lives in one function instance's memory, so it
// slows down abuse rather than capping it; the Anthropic spend limit is the hard cap.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_REQUESTS;
}

// Browsers send Origin on POST; only accept calls from pages on this same site.
function sameSite(req) {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!sameSite(req)) return res.status(403).json({ error: 'Forbidden' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'Too many requests, try again later.' });

  const prompt = req.body?.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'Missing prompt' });
  if (prompt.length > MAX_PROMPT_CHARS) return res.status(413).json({ error: 'Prompt too long' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.REACT_APP_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, messages: [{ role: 'user', content: prompt }] })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
