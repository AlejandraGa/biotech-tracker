// api/hiv-statuses.js — the tracker's statuses, read from the team's Google Sheet.
//
// The site calls this on load so an edit in the sheet shows within a few minutes,
// without a redeploy. The sheet ID is in src/hivSheet.js (or HIV_SHEET_ID in Vercel).
// If the sheet cannot be read the site keeps the copy saved in the repository.
import { SHEET_ID, sheetCsvUrl, rowsFromCsv, packRows } from '../src/hivSheet.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const id = process.env.HIV_SHEET_ID || SHEET_ID;
  if (!id) return res.status(404).json({ error: 'No sheet configured' });
  try {
    const r = await fetch(sheetCsvUrl(id), { signal: AbortSignal.timeout(10000), redirect: 'follow' });
    const type = r.headers.get('content-type') || '';
    // A sheet that is not shared answers with Google's sign-in page instead of CSV.
    if (!r.ok || !/csv|text\/plain/.test(type)) throw new Error(r.ok ? 'The sheet is not shared as "Anyone with the link"' : `Google Sheets HTTP ${r.status}`);
    const rows = rowsFromCsv(await r.text());
    if (rows.length < 10) throw new Error(`Only ${rows.length} rows read from the sheet`);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({ fetchedAt: new Date().toISOString(), from: 'sheet', ...packRows(rows) });
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=60');
    return res.status(502).json({ error: String(e.message || e) });
  }
}
