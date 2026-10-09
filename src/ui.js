// Shared design tokens for the app.
export const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
export const INK = '#1a1a1a';
export const TEXT = '#33312e';
export const MUTED = '#6b6760';
export const FAINT = '#96918a';
export const LINE = '#e6e2db';
export const HAIR = '#f0ede8';
export const PAPER = '#fbfaf7';
export const BRAND = '#c8102e';

// One muted colour per company, used only as a small dot.
export const COMPANY_COLOR = {
  'Gilead': '#b3122b',
  'Gilead + MSD': '#7c3aed',
  'ViiV Healthcare': '#c2410c',
  'ViiV Healthcare / J&J': '#c2410c',
  'J&J': '#1d4ed8',
  'MSD': '#0f766e',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return d ? `${d} ${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${y}`;
}
export const todayIso = () => new Date().toISOString().slice(0, 10);
