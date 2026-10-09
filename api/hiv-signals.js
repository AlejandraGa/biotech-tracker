// api/hiv-signals.js — live HIV regulatory and competitor activity
// GET /api/hiv-signals?days=90
import { collectSignals } from './_lib/hivSignals.js';

export default async function handler(req, res) {
  const days = Math.min(Math.max(parseInt(req.query?.days, 10) || 90, 1), 365);
  try {
    const data = await collectSignals({ days });
    // Cache at the edge for an hour; serve a stale copy while refreshing.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=21600');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
