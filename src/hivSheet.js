// The tracker's statuses live in a Google Sheet that the team edits ("Statuses" tab,
// one row per product and body). This file reads that sheet and lays its rows over
// the product records. Shared by the site, the weekly email and the website check,
// so imports carry extensions.
//
// SHEET_ID is the long ID in the sheet's link (…/spreadsheets/d/<ID>/edit). The sheet
// must be shared as "Anyone with the link: Viewer" so the site can read it.
export const SHEET_ID = '';
export const SHEET_TAB = 'Statuses';
export const sheetCsvUrl = (id = SHEET_ID) =>
  `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB)}`;
export const sheetEditUrl = (id = SHEET_ID) => `https://docs.google.com/spreadsheets/d/${id}/edit`;

// Column key → header in the sheet.
export const SHEET_COLUMNS = [
  ['product_id', 'Product ID'],
  ['product', 'Product'],
  ['kind', 'Kind'],
  ['body_key', 'Body ID'],
  ['body', 'Body'],
  ['market', 'Market'],
  ['status', 'Status'],
  ['label', 'Status wording (optional)'],
  ['date', 'Decision date'],
  ['expected', 'Date is expected'],
  ['date_unverified', 'Date not confirmed'],
  ['note', 'Note'],
  ['source', 'Source link'],
  ['checked_on', 'Last checked by hand'],
  ['checked_by', 'Checked by'],
];

export const REG_STATUSES = ['approved', 'positive', 'review', 'negative', 'notapproved', 'planned', 'pending', 'none'];
export const ACCESS_STATUSES = ['favourable', 'restricted', 'limited', 'listed', 'noadded', 'unfavourable', 'none'];
const REG_KEYS = ['fda', 'chmp', 'ec', 'ch', 'mhra', 'hc', 'tga'];

// Minimal CSV reader: quoted fields, doubled quotes, commas and line breaks inside quotes.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

// Dates typed in the sheet may come back as 2026-10-13, 13/10/2026 or a spreadsheet date.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export function toIsoDate(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
  if (m) return m[3] ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : `${m[1]}-${m[2].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/); // day first, as written in Europe
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$/);
  if (m && MONTHS.includes(m[2].toLowerCase())) return `${m[3]}-${String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

// CSV text → row objects keyed as in SHEET_COLUMNS. Rows without a product or body ID are skipped.
export function rowsFromCsv(text) {
  const [head, ...body] = parseCsv(text);
  if (!head) return [];
  const index = Object.fromEntries(SHEET_COLUMNS.map(([key, label]) => [key, head.findIndex((h) => h.trim().toLowerCase() === label.toLowerCase())]));
  if (index.product_id < 0 || index.body_key < 0 || index.status < 0) throw new Error('The sheet is missing the Product ID, Body ID or Status column');
  return body.map((r) => Object.fromEntries(SHEET_COLUMNS.map(([key]) => [key, index[key] >= 0 ? (r[index[key]] || '').trim() : ''])))
    .filter((r) => r.product_id && r.body_key);
}

const yes = (v) => /^(yes|y|true|x|sí|si|✓|1)$/i.test(String(v || '').trim());

// One sheet row → a status cell as the site uses it, or null if the status is not one we know.
export function cellFromRow(r) {
  const kind = REG_KEYS.includes(r.body_key) ? 'reg' : 'access';
  const s = (r.status || 'none').toLowerCase().replace(/\s+/g, '');
  if (!(kind === 'reg' ? REG_STATUSES : ACCESS_STATUSES).includes(s)) return null;
  const date = toIsoDate(r.date);
  const cell = { s };
  if (r.label) cell.label = r.label;
  if (date) cell.date = date;
  if (date && yes(r.expected)) cell.expected = true;
  if (yes(r.date_unverified)) cell.dateUnverified = true;
  if (r.note) cell.note = r.note;
  if (/^https?:\/\//.test(r.source)) cell.src = r.source;
  const checked = toIsoDate(r.checked_on);
  if (checked) cell.checkedOn = checked;
  if (r.checked_by) cell.checkedBy = r.checked_by;
  return { kind, cell };
}

// Lays the sheet's rows over the products. Rows for unknown products, or with a status
// we do not recognise, are ignored and the existing value is kept.
export function applySheet(products, rows) {
  if (!rows?.length) return products;
  const byProduct = new Map();
  for (const r of rows) {
    const c = cellFromRow(r);
    if (!c) continue;
    if (!byProduct.has(r.product_id)) byProduct.set(r.product_id, []);
    byProduct.get(r.product_id).push({ key: r.body_key, ...c });
  }
  return products.map((p) => {
    const mine = byProduct.get(p.id);
    if (!mine) return p;
    const reg = { ...p.reg }, access = { ...p.access };
    for (const { key, kind, cell } of mine) (kind === 'reg' ? reg : access)[key] = cell;
    return { ...p, reg, access };
  });
}

// The snapshot kept in the repository stores rows as arrays to stay small.
export const packRows = (rows) => ({ columns: SHEET_COLUMNS.map(([k]) => k), rows: rows.map((r) => SHEET_COLUMNS.map(([k]) => r[k] || '')) });
export const unpackRows = (snap) => (snap?.rows || []).map((a) => Object.fromEntries((snap.columns || []).map((k, i) => [k, a[i] || ''])));
