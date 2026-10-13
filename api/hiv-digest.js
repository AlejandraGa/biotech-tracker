// api/hiv-digest.js — weekly HIV competitive intelligence email
//
// Runs every Monday through the cron in vercel.json. Sending needs three
// environment variables in Vercel:
//   RESEND_API_KEY  API key from resend.com
//   DIGEST_TO       recipient address (comma-separated for several)
//   CRON_SECRET     any long random string; Vercel sends it with the cron call
// Optional: DIGEST_FROM (defaults to Resend's test sender).
//
// GET /api/hiv-digest?preview=1  shows the email in the browser without sending.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectSignals } from './_lib/hivSignals.js';
import { BASE, applyDetections, COLUMN_AGENCY } from '../src/hivData.js';
import { ACCESS_BODIES } from '../src/hivAccessData.js';

// Decisions found by the daily page check (scripts/watch); shipped with each deploy.
function readDetections() {
  try { return JSON.parse(readFileSync(join(process.cwd(), 'src', 'hivAutoDetections.json'), 'utf8')); }
  catch { return { lastRun: null, sources: {}, detections: [] }; }
}

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (isoDate) => { const [y, m, d] = isoDate.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

const APPROVED = ['approved'];
const REIMBURSED = ['favourable', 'restricted', 'limited', 'listed'];
const MARKETS = [['fda', 'US'], ['ec', 'EU'], ['ch', 'CH'], ['mhra', 'UK'], ['hc', 'CA'], ['tga', 'AU']];

// One line per asset: where it is authorised, under review, and how many reimbursement bodies list it.
function situation(products) {
  return products.filter((p) => p.access && Object.keys(p.access).length).map((p) => {
    const approved = MARKETS.filter(([k]) => APPROVED.includes(p.reg[k]?.s)).map(([, m]) => m);
    const review = MARKETS.filter(([k]) => p.reg[k]?.s === 'review' || (k === 'ec' && p.reg.chmp?.s === 'positive' && p.reg.ec?.s !== 'approved')).map(([, m]) => m);
    const paid = ACCESS_BODIES.filter((b) => REIMBURSED.includes(p.access[b.key]?.s));
    const negative = ACCESS_BODIES.filter((b) => ['noadded', 'unfavourable'].includes(p.access[b.key]?.s));
    return { name: p.name, company: p.company, approved, review, paid, negative };
  }).filter((r) => r.approved.length || r.review.length);
}

export function buildDigest(data, appUrl = '', auto = { detections: [] }, products = []) {
  const major = data.signals.filter((s) => s.level === 'major');
  const minor = data.signals.filter((s) => s.level !== 'major');
  const order = ['FDA', 'EMA', 'Swissmedic', 'Spezialitätenliste', 'Press', 'ClinicalTrials.gov'];
  const failed = data.sources.filter((s) => !s.ok);
  const found = (auto.detections || []).filter((d) => d.detectedAt >= data.since);
  const nameOf = Object.fromEntries(products.map((p) => [p.id, p.name]));
  const now = situation(products);
  const total = major.length + found.length;
  const subject = `HIV competitive intelligence: ${total} key update${total === 1 ? '' : 's'} this week`;

  const row = (s) => `
    <tr><td style="padding:10px 0;border-top:1px solid #eceae6;vertical-align:top;width:92px;font-size:12px;color:#6b6b6b;white-space:nowrap">${fmt(s.date)}</td>
    <td style="padding:10px 0 10px 12px;border-top:1px solid #eceae6;vertical-align:top">
      <a href="${esc(s.url)}" style="color:#1a1a1a;text-decoration:none;font-size:14px;font-weight:600;line-height:1.4">${esc(s.title)}</a>
      <div style="font-size:12px;color:#6b6b6b;margin-top:3px;line-height:1.5">${esc([s.company, s.detail].filter(Boolean).join(' · '))}</div>
    </td></tr>`;

  const section = (src) => {
    const items = major.filter((s) => s.source === src);
    if (!items.length) return '';
    return `<h2 style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#c8102e;margin:26px 0 4px">${esc(src)} · ${items.length}</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${items.map(row).join('')}</table>`;
  };

  const html = `<!doctype html><html><body style="margin:0;background:#f7f6f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#1a1a1a">
  <div style="max-width:640px;margin:0 auto;padding:28px 22px;background:#ffffff">
    <div style="font-size:12px;color:#6b6b6b">Catalyst · weekly digest · ${fmt(data.since)} to ${fmt(data.generatedAt.slice(0, 10))}</div>
    <h1 style="font-size:22px;font-weight:600;margin:6px 0 4px">HIV competitive intelligence</h1>
    <p style="font-size:14px;color:#444;margin:0;line-height:1.55">${total ? `${total} key update${total === 1 ? '' : 's'} across regulators, reimbursement bodies, company news and trial records.` : 'No key updates were detected this week.'}${minor.length ? ` ${minor.length} routine update${minor.length === 1 ? '' : 's'} not shown.` : ''}</p>
    ${found.length ? `<h2 style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#c8102e;margin:26px 0 4px">New decisions picked up by the website check · ${found.length}</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${found.map((d) => row({ date: d.date || d.detectedAt, url: d.src, title: `${nameOf[d.product] || d.product}: ${COLUMN_AGENCY[d.column] || d.body}`, detail: [d.summary, d.note].filter(Boolean).join(' · ') })).join('')}</table>` : ''}
    ${order.map(section).join('')}
    ${now.length ? `<h2 style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#1a1a1a;margin:30px 0 4px">Where each asset stands today</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px">
        <tr><td style="padding:6px 0;font-size:11px;color:#6b6b6b">Asset</td><td style="padding:6px 8px;font-size:11px;color:#6b6b6b">Authorised</td><td style="padding:6px 0;font-size:11px;color:#6b6b6b">Reimbursed (of ${ACCESS_BODIES.length} bodies)</td></tr>
        ${now.map((r) => `<tr><td style="padding:8px 0;border-top:1px solid #eceae6;vertical-align:top;font-weight:600">${esc(r.name)}<div style="font-weight:400;font-size:11px;color:#6b6b6b">${esc(r.company)}</div></td>
          <td style="padding:8px;border-top:1px solid #eceae6;vertical-align:top">${esc(r.approved.join(', ') || 'None yet')}${r.review.length ? `<div style="font-size:11px;color:#92580a">Under review: ${esc(r.review.join(', '))}</div>` : ''}</td>
          <td style="padding:8px 0;border-top:1px solid #eceae6;vertical-align:top">${r.paid.length}${r.paid.length ? ` <span style="font-size:11px;color:#6b6b6b">(${esc(r.paid.map((b) => b.region).join(', '))})</span>` : ''}${r.negative.length ? `<div style="font-size:11px;color:#b3122b">No added benefit or negative: ${esc(r.negative.map((b) => b.region).join(', '))}</div>` : ''}</td></tr>`).join('')}
      </table>` : ''}
    ${failed.length ? `<p style="font-size:12px;color:#92580a;margin:24px 0 0;line-height:1.5">Not checked this week (source did not respond): ${esc(failed.map((f) => f.name).join(', '))}.</p>` : ''}
    ${appUrl ? `<p style="margin:26px 0 0"><a href="${esc(appUrl)}" style="font-size:13px;color:#c8102e">Open the full activity log</a></p>` : ''}
    <p style="font-size:11px;color:#9a948a;margin:22px 0 0;line-height:1.5">Compiled automatically from public sources (openFDA, EMA, Swissmedic, the Swiss Spezialitätenliste, the 3-hourly check of regulator and reimbursement websites, company and trade news, ClinicalTrials.gov). Check the linked source before relying on an item.</p>
  </div></body></html>`;

  const text = [subject, '',
    ...found.map((d) => `${fmt(d.date || d.detectedAt)} · ${COLUMN_AGENCY[d.column] || d.body} · ${nameOf[d.product] || d.product}: ${d.summary || ''}\n${d.src}`),
    ...major.map((s) => `${fmt(s.date)} · ${s.source} · ${s.title}\n${s.url}`),
    '', 'Where each asset stands today:',
    ...now.map((r) => `${r.name}: authorised ${r.approved.join(', ') || 'nowhere yet'}${r.review.length ? `; under review ${r.review.join(', ')}` : ''}; reimbursed by ${r.paid.length} of ${ACCESS_BODIES.length} bodies`)].join('\n');
  return { subject, html, text, majorCount: total };
}

export default async function handler(req, res) {
  const preview = req.query?.preview !== undefined;
  const days = Math.min(Math.max(parseInt(req.query?.days, 10) || 7, 1), 60);
  const host = req.headers?.host;
  const appUrl = host ? `https://${host}` : '';

  try {
    const data = await collectSignals({ days });
    const auto = readDetections();
    const digest = buildDigest(data, appUrl, auto, applyDetections(BASE, auto));

    if (preview) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(digest.html);
    }

    const { RESEND_API_KEY, DIGEST_TO, DIGEST_FROM, CRON_SECRET } = process.env;
    // Sending is only allowed for the scheduled call, so nobody else can trigger emails.
    if (!CRON_SECRET || req.headers?.authorization !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ sent: false, reason: 'Not authorised. Add ?preview=1 to view the digest without sending.' });
    }
    if (!RESEND_API_KEY || !DIGEST_TO) {
      return res.status(200).json({ sent: false, reason: 'RESEND_API_KEY or DIGEST_TO is not set.', subject: digest.subject });
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: DIGEST_FROM || 'Catalyst <onboarding@resend.dev>',
        to: DIGEST_TO.split(',').map((s) => s.trim()).filter(Boolean),
        subject: digest.subject, html: digest.html, text: digest.text,
      }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ sent: false, reason: body?.message || `Resend HTTP ${r.status}` });
    res.status(200).json({ sent: true, id: body.id, subject: digest.subject, keyUpdates: digest.majorCount });
  } catch (e) {
    res.status(500).json({ sent: false, reason: e.message });
  }
}
