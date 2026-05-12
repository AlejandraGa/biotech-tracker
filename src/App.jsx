import React, { useState, useCallback } from 'react';

const INITIAL_WATCHLIST = [
  { ticker: 'MRNA', name: 'Moderna', price: 0, change: 0, mktcap: '—', stage: 'Commercial', note: 'RSV vaccine Phase 3 readout due Q3' },
  { ticker: 'EDIT', name: 'Editas Medicine', price: 0, change: 0, mktcap: '—', stage: 'Phase 1/2', note: 'CRISPR gene editing for sickle cell' },
  { ticker: 'RXRX', name: 'Recursion Pharma', price: 0, change: 0, mktcap: '—', stage: 'Platform', note: 'AI-driven drug discovery platform' },
  { ticker: 'BEAM', name: 'Beam Therapeutics', price: 0, change: 0, mktcap: '—', stage: 'Phase 1', note: 'Base editing in hemoglobinopathies' },
  { ticker: 'KYMR', name: 'Kymera Therapeutics', price: 0, change: 0, mktcap: '—', stage: 'Phase 2', note: 'Targeted protein degradation, STAT6 program' },
  { ticker: 'GBIO', name: 'Generation Bio', price: 0, change: 0, mktcap: '—', stage: 'Phase 1/2', note: 'Non-viral gene therapy platform' },
  { ticker: 'KALA', name: 'Kailera Therapeutics', price: 0, change: 0, mktcap: '—', stage: 'Phase 2', note: 'GLP-1 based obesity programs' },
  { ticker: 'ODSY', name: 'Odyssey Therapeutics', price: 0, change: 0, mktcap: '—', stage: 'Preclinical', note: 'Precision immunology' },
  { ticker: 'EVMN', name: 'Evommune Inc', price: 0, change: 0, mktcap: '—', stage: 'Phase 2', note: 'Inflammatory disease programs' },
];

const NEWS_DATA = [
  { ticker: 'MRNA', headline: 'Moderna reports positive Phase 3 data for mRNA-1345 RSV vaccine in older adults', source: 'BioPharma Dive', date: 'May 10, 2025', tag: 'Trial Results', summary: "Moderna's RSV vaccine candidate demonstrated 83.7% efficacy against RSV lower respiratory tract disease in adults 60+. Primary and secondary endpoints were met." },
  { ticker: 'EDIT', headline: 'Editas Medicine announces EDIT-301 patient data showing durable HbF induction', source: 'Fierce Biotech', date: 'May 8, 2025', tag: 'Clinical Data', summary: 'EDIT-301 uses AsCas12a to edit the BCL11A enhancer, increasing fetal hemoglobin. Early patient data shows sustained elevation above therapeutic threshold.' },
  { ticker: 'RXRX', headline: 'Recursion and Roche expand AI partnership to neurological disease targets', source: 'Reuters', date: 'May 7, 2025', tag: 'Partnership', summary: "Recursion's platform partnership with Roche is being extended to include CNS targets. This is a milestone payment trigger worth up to $50M." },
  { ticker: 'BEAM', headline: 'Beam Therapeutics presents BEAM-302 alpha-1 antitrypsin deficiency data at ATS 2025', source: 'STAT News', date: 'May 6, 2025', tag: 'Conference', summary: 'BEAM-302 uses base editing to correct the Z-allele mutation causing A1AT deficiency. Data showed dose-dependent AAT protein restoration.' },
  { ticker: 'KYMR', headline: "Kymera's KY1005 shows strong EASI-75 response in atopic dermatitis Phase 2", source: 'Evaluate Pharma', date: 'May 5, 2025', tag: 'Trial Results', summary: 'KY1005 targets STAT6, a key driver of Th2 inflammation in atopic dermatitis. 68% EASI-75 response at week 16 vs 18% placebo.' },
  { ticker: 'MRNA', headline: "FDA accepts PDUFA date for Moderna's flu-COVID combination vaccine", source: 'FDA News', date: 'May 3, 2025', tag: 'Regulatory', summary: 'The FDA has set a PDUFA date of December 2025 for mRNA-1083. This combination approach is differentiated and would simplify vaccination schedules for older adults.' },
];

const FDA_DATA = [
  { date: 'Jun 3, 2025', ticker: 'MRNA', drug: 'mRNA-1010 (flu)', event: 'PDUFA date', type: 'approval', note: 'Standard flu vaccine; likely approval but modest revenue impact' },
  { date: 'Jun 17, 2025', ticker: 'KYMR', drug: 'KY1005 (AD)', event: 'Phase 2 full data', type: 'trial', note: 'Atopic dermatitis readout — high investor focus' },
  { date: 'Jul 8, 2025', ticker: 'EDIT', drug: 'EDIT-301', event: 'IND expansion', type: 'regulatory', note: 'Expansion to beta-thalassemia indication' },
  { date: 'Aug 22, 2025', ticker: 'BEAM', drug: 'BEAM-101', event: 'PDUFA date', type: 'approval', note: 'Sickle cell disease; competing with Casgevy' },
  { date: 'Sep 5, 2025', ticker: 'RXRX', drug: 'REC-994', event: 'Phase 2 interim', type: 'trial', note: 'Cavernous malformation; first clinical proof-of-concept' },
  { date: 'Oct 14, 2025', ticker: 'MRNA', drug: 'mRNA-1345 (RSV)', event: 'PDUFA date', type: 'approval', note: 'High stakes — crowded RSV market but strong data' },
];

// Tag color mapping
function tagColor(tag) {
  if (!tag) return { bg: '#1a1a2e', color: '#7c6af7', border: '#2a2a4a' };
  const t = tag.toLowerCase();
  if (t.includes('trial') || t.includes('clinical')) return { bg: 'rgba(52,211,153,0.08)', color: '#34d399', border: 'rgba(52,211,153,0.2)' };
  if (t.includes('regulat') || t.includes('fda')) return { bg: 'rgba(96,165,250,0.08)', color: '#60a5fa', border: 'rgba(96,165,250,0.2)' };
  if (t.includes('partner')) return { bg: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: 'rgba(251,191,36,0.2)' };
  if (t.includes('conference')) return { bg: 'rgba(244,114,182,0.08)', color: '#f472b6', border: 'rgba(244,114,182,0.2)' };
  return { bg: 'rgba(124,106,247,0.08)', color: '#7c6af7', border: 'rgba(124,106,247,0.2)' };
}

function stageBadge(stage) {
  if (stage === 'Commercial') return 'green';
  if (stage.includes('Phase')) return 'amber';
  if (stage === 'Platform') return 'blue';
  return 'purple';
}

function fdaBadge(type) {
  if (type === 'approval') return 'green';
  if (type === 'trial') return 'amber';
  return 'blue';
}

const s = {
  app: { maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' },
  title: { fontSize: 22, fontWeight: 700, color: '#e8e8f0', letterSpacing: '-0.5px', fontFamily: "'Georgia', serif" },
  subtitle: { fontSize: 12, color: '#555570', marginTop: 2, letterSpacing: '0.3px' },
  liveBadge: { fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(0,230,118,0.1)', color: '#00e676', border: '0.5px solid rgba(0,230,118,0.25)', fontWeight: 500 },
  tabs: { display: 'flex', gap: 2, borderBottom: '0.5px solid #1e1e2e', marginBottom: '1.75rem' },
  tab: (active) => ({ padding: '10px 18px', fontSize: 13, cursor: 'pointer', border: 'none', background: 'none', color: active ? '#e8e8f0' : '#555570', borderBottom: active ? '2px solid #7c6af7' : '2px solid transparent', marginBottom: -1, fontWeight: active ? 600 : 400, transition: 'color 0.15s', letterSpacing: '0.2px' }),
  card: { background: '#111118', border: '0.5px solid #1e1e2e', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: '1.25rem' },
  metric: { background: '#0d0d14', borderRadius: 10, padding: '12px 14px', border: '0.5px solid #1a1a28' },
  metricLabel: { fontSize: 11, color: '#555570', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' },
  metricVal: { fontSize: 22, fontWeight: 500 },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  ticker: { fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: '#7c6af7', background: 'rgba(124,106,247,0.08)', padding: '2px 7px', borderRadius: 4, border: '0.5px solid rgba(124,106,247,0.2)' },
  muted: { fontSize: 13, color: '#9999b8' },
  badge: (type) => {
    const map = {
      green: ['rgba(52,211,153,0.1)', '#34d399', 'rgba(52,211,153,0.2)'],
      red: ['rgba(248,113,113,0.1)', '#faa19b', 'rgba(248,113,113,0.2)'],
      amber: ['rgba(251,191,36,0.1)', '#fbbf24', 'rgba(251,191,36,0.2)'],
      purple: ['rgba(124,106,247,0.1)', '#7c6af7', 'rgba(124,106,247,0.2)'],
      blue: ['rgba(96,165,250,0.1)', '#60a5fa', 'rgba(96,165,250,0.2)'],
    };
    const [bg, color, border] = map[type] || map.blue;
    return { fontSize: 11, padding: '3px 8px', borderRadius: 20, background: bg, color, border: `0.5px solid ${border}`, fontWeight: 500, whiteSpace: 'nowrap' };
  },
  input: { background: '#0d0d14', border: '0.5px solid #1e1e2e', borderRadius: 8, padding: '9px 14px', color: '#e8e8f0', fontSize: 13, outline: 'none', width: '100%' },
  btn: { background: 'rgba(124,106,247,0.1)', border: '0.5px solid rgba(124,106,247,0.3)', borderRadius: 8, padding: '8px 14px', color: '#7c6af7', fontSize: 12, cursor: 'pointer', fontWeight: 500 },
  btnSm: { background: 'transparent', border: '0.5px solid #1e1e2e', borderRadius: 6, padding: '5px 10px', color: '#555570', fontSize: 11, cursor: 'pointer' },
  aiBox: { background: '#0d0d14', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#9999b8', marginTop: 10, lineHeight: 1.7, border: '0.5px solid #1a1a28' },
  divider: { border: 'none', borderTop: '0.5px solid #1a1a28', margin: '10px 0' },
  priceUp: { color: '#00e676', fontWeight: 500 },
  priceDown: { color: '#faa19b', fontWeight: 500 },
  fdaDate: { fontSize: 11, color: '#555570', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' },
};

// ─── Newspaper styles ───────────────────────────────────────────────────────
const np = {
  wrapper: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  // Top date bar
  datebar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #2a2a3e',
    paddingBottom: '0.5rem',
    marginBottom: '1rem',
  },
  datebarText: { fontSize: 11, color: '#555570', letterSpacing: '0.5px', textTransform: 'uppercase' },
  // Section label
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: '#7c6af7',
    marginBottom: 6,
    fontFamily: "'DM Mono', monospace",
  },
  // Big headline article (featured)
  featuredWrap: {
    display: 'grid',
    gridTemplateColumns: '1fr 260px',
    gap: '1.5rem',
    borderBottom: '0.5px solid #2a2a3e',
    paddingBottom: '1.5rem',
    marginBottom: '1.5rem',
  },
  featuredWrapMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    borderBottom: '0.5px solid #2a2a3e',
    paddingBottom: '1.5rem',
    marginBottom: '1.5rem',
  },
  featuredHeadline: {
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.2,
    color: '#f0f0fc',
    marginBottom: 10,
    letterSpacing: '-0.5px',
    fontFamily: "'Georgia', serif",
  },
  featuredByline: {
    fontSize: 11,
    color: '#555570',
    marginBottom: 10,
    letterSpacing: '0.3px',
    fontFamily: "'DM Mono', monospace",
  },
  featuredSummary: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#b0b0cc',
    fontFamily: "'Georgia', serif",
  },
  // Image placeholder (abstract graphic)
  imgPlaceholder: (seed) => {
    const colors = [
      ['#1a1033', '#7c6af7'],
      ['#0a1a1a', '#34d399'],
      ['#1a1000', '#fbbf24'],
      ['#0a0a1a', '#60a5fa'],
      ['#1a0a1a', '#f472b6'],
    ];
    const [bg, accent] = colors[seed % colors.length];
    return {
      background: bg,
      borderRadius: 8,
      border: `0.5px solid ${accent}22`,
      height: 160,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
    };
  },
  // Secondary grid
  secondaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.25rem',
    borderBottom: '0.5px solid #2a2a3e',
    paddingBottom: '1.5rem',
    marginBottom: '1.5rem',
  },
  secondaryHeadline: {
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.3,
    color: '#d8d8f0',
    marginBottom: 6,
    fontFamily: "'Georgia', serif",
  },
  secondarySource: {
    fontSize: 11,
    color: '#555570',
    fontFamily: "'DM Mono', monospace",
    marginBottom: 6,
  },
  secondaryBody: {
    fontSize: 13,
    lineHeight: 1.6,
    color: '#888898',
    fontFamily: "'Georgia', serif",
  },
  // Tag pill
  tagPill: (tag) => {
    const c = tagColor(tag);
    return {
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '1px',
      textTransform: 'uppercase',
      padding: '2px 8px',
      borderRadius: 3,
      background: c.bg,
      color: c.color,
      border: `0.5px solid ${c.border}`,
      marginBottom: 8,
      fontFamily: "'DM Mono', monospace",
    };
  },
  // Divider vertical (for column separators)
  colDivider: {
    borderLeft: '0.5px solid #2a2a3e',
    margin: '0 0.25rem',
  },
  // Filter bar
  filterBar: {
    display: 'flex',
    gap: 8,
    marginBottom: '1.25rem',
    alignItems: 'center',
  },
  filterInput: {
    background: '#0d0d14',
    border: '0.5px solid #1e1e2e',
    borderRadius: 6,
    padding: '7px 12px',
    color: '#e8e8f0',
    fontSize: 12,
    outline: 'none',
    flex: 1,
    fontFamily: "'DM Mono', monospace",
  },
  // AI box inside newspaper
  npAiBox: {
    background: '#0d0d14',
    borderRadius: 6,
    padding: '10px 12px',
    fontSize: 12,
    color: '#9999b8',
    marginTop: 8,
    lineHeight: 1.7,
    border: '0.5px solid #1a1a28',
    fontFamily: "'Georgia', serif",
  },
};

// Map tag → Unsplash search keyword
function tagToKeyword(tag, ticker) {
  const t = (tag || '').toLowerCase();
  if (t.includes('trial') || t.includes('clinical')) return 'clinical trial laboratory';
  if (t.includes('regulat') || t.includes('fda')) return 'FDA regulation medicine';
  if (t.includes('partner')) return 'biotech partnership science';
  if (t.includes('conference')) return 'medical conference science';
  if (t.includes('crispr') || ticker === 'EDIT' || ticker === 'BEAM') return 'DNA gene editing';
  if (ticker === 'MRNA') return 'mRNA vaccine science';
  if (ticker === 'RXRX') return 'artificial intelligence laboratory';
  return 'pharmaceutical research laboratory';
}

// Curated Picsum photo IDs that look good for biotech/science/pharma context
const PICSUM_IDS = [
  237, 287, 364, 366, 396, 414, 425, 488, 511, 534,
  582, 593, 618, 667, 680, 701, 736, 755, 780, 811,
];

function useNewsImage(tag, ticker, seed) {
  const [imgError, setImgError] = React.useState(false);
  // Pick a deterministic photo ID based on seed
  const photoId = PICSUM_IDS[seed % PICSUM_IDS.length];
  // Picsum: free, no API key, always works
  const imgUrl = `https://picsum.photos/id/${photoId}/600/300`;
  return { imgUrl, imgError, setImgError };
}

// Fallback SVG if image fails to load
function FallbackGraphic({ seed }) {
  const palettes = [
    { bg: '#1a1033', lines: '#7c6af7', circles: '#a78bfa' },
    { bg: '#0a1a1a', lines: '#34d399', circles: '#6ee7b7' },
    { bg: '#1a1000', lines: '#fbbf24', circles: '#fde68a' },
    { bg: '#0a0a1a', lines: '#60a5fa', circles: '#93c5fd' },
    { bg: '#1a0a1a', lines: '#f472b6', circles: '#fbcfe8' },
  ];
  const p = palettes[seed % palettes.length];
  return (
    <svg width="100%" height="100%" viewBox="0 0 260 160" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', borderRadius: 8 }}>
      <rect width="260" height="160" fill={p.bg} />
      {[0,1,2,3,4].map(i => <line key={`h${i}`} x1="0" y1={32*i} x2="260" y2={32*i} stroke={p.lines} strokeOpacity="0.12" strokeWidth="0.5" />)}
      {[0,1,2,3,4,5,6].map(i => <line key={`v${i}`} x1={40*i} y1="0" x2={40*i} y2="160" stroke={p.lines} strokeOpacity="0.12" strokeWidth="0.5" />)}
      <circle cx="130" cy="80" r="50" fill="none" stroke={p.lines} strokeOpacity="0.25" strokeWidth="1" />
      <circle cx="130" cy="80" r="30" fill="none" stroke={p.circles} strokeOpacity="0.2" strokeWidth="1" />
      <circle cx="130" cy="80" r="10" fill={p.lines} fillOpacity="0.3" />
      <circle cx="20" cy="20" r="3" fill={p.circles} fillOpacity="0.5" />
      <circle cx="240" cy="140" r="3" fill={p.circles} fillOpacity="0.5" />
      <line x1="80" y1="0" x2="260" y2="130" stroke={p.lines} strokeOpacity="0.1" strokeWidth="0.5" />
    </svg>
  );
}

// News image component: tries Unsplash, falls back to SVG
function NewsImage({ tag, ticker, seed, height = 160 }) {
  const { imgUrl, imgError, setImgError } = useNewsImage(tag, ticker, seed);

  if (imgError || !imgUrl) {
    return (
      <div style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden' }}>
        <FallbackGraphic seed={seed} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden', background: '#0d0d14', position: 'relative' }}>
      <img
        src={imgUrl}
        alt=""
        onError={() => setImgError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 8,
          display: 'block',
          opacity: 0.85,
        }}
      />
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ display: 'inline-block', width: 12, height: 12, border: '1.5px solid #2a2a3a', borderTopColor: '#7c6af7', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 6, verticalAlign: -2 }} />
  );
}

async function callClaude(prompt) {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || 'Could not generate response.';
}

export default function App() {
  // ← NEWS is the default tab now
  const [tab, setTab] = useState('news');
  const [darkMode, setDarkMode] = useState(true);
  const [watchlist, setWatchlist] = useState(INITIAL_WATCHLIST);
  const [tickerInput, setTickerInput] = useState('');
  const [newsFilter, setNewsFilter] = useState('');
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState({});
  const [realNews, setRealNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);

  React.useEffect(() => {
    const fetchNews = async () => {
      setLoadingNews(true);
      try {
        const res = await fetch('/api/rss');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setRealNews(data);
      } catch (e) { console.error(e); }
      setLoadingNews(false);
    };
    fetchNews();
  }, []);

  React.useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/stocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers: INITIAL_WATCHLIST.map(s => s.ticker) }),
        });
        const data = await res.json();
        setWatchlist(prev => prev.map(stock => {
          const updated = data.find(d => d.ticker === stock.ticker);
          return updated ? { ...stock, ...updated } : stock;
        }));
      } catch (e) { console.error(e); }
    };
    fetchPrices();
  }, []);

  const addTicker = useCallback(async () => {
    const val = tickerInput.trim().toUpperCase();
    if (!val || watchlist.find(s => s.ticker === val)) { setTickerInput(''); return; }
    setTickerInput('');
    setWatchlist(prev => [...prev, { ticker: val, name: val, price: 0, change: 0, mktcap: '—', stage: 'Unknown', note: 'Loading...' }]);
    try {
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: [val] }),
      });
      const data = await res.json();
      if (data[0]) {
        setWatchlist(prev => prev.map(s => s.ticker === val ? { ...s, ...data[0] } : s));
      }
    } catch (e) {
      setWatchlist(prev => prev.map(s => s.ticker === val ? { ...s, note: 'Ticker not found — check the symbol and try again.' } : s));
    }
  }, [tickerInput, watchlist]);

  const removeTicker = (ticker) => setWatchlist(prev => prev.filter(s => s.ticker !== ticker));

  const getSummary = useCallback(async (key, prompt) => {
    if (summaries[key]) return;
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const text = await callClaude(prompt);
      setSummaries(prev => ({ ...prev, [key]: text }));
    } catch { setSummaries(prev => ({ ...prev, [key]: 'Error generating summary.' })); }
    setLoading(prev => ({ ...prev, [key]: false }));
  }, [summaries]);

  const newsSource = realNews.length > 0 ? realNews : NEWS_DATA;
  const filteredNews = newsSource.filter(n =>
    !newsFilter ||
    n.headline.toLowerCase().includes(newsFilter.toLowerCase()) ||
    n.ticker.toLowerCase().includes(newsFilter.toLowerCase()) ||
    (n.tag && n.tag.toLowerCase().includes(newsFilter.toLowerCase()))
  );

  const gainers = watchlist.filter(s => s.change >= 0).length;
  const losers = watchlist.filter(s => s.change < 0).length;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Featured = first article; secondary = rest
  const featured = filteredNews[0];
  const secondary = filteredNews.slice(1);

  return (
    <div style={{ ...s.app, background: darkMode ? '' : '#f5f5f5' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #7c6af7 !important; }
        button:hover { opacity: 0.85; }
        .np-secondary-card:hover { background: #161622 !important; }
      `}</style>

      {/* ── App Header ── */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Biotech & Pharma Tracker</div>
          <div style={s.subtitle}>Follow your picks · News · FDA catalysts</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button style={{ ...s.btnSm, fontSize: 13 }} onClick={() => setDarkMode(!darkMode)}>{darkMode ? '☀️ Light' : '🌙 Dark'}</button>
          <span style={s.liveBadge}>● Live</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={s.tabs}>
        {['news', 'watchlist', 'fda'].map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'news' ? '📰 News' : t === 'watchlist' ? '★ Watchlist' : '📅 FDA Calendar'}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          NEWS TAB — Newspaper layout
      ═══════════════════════════════════════════════════════ */}
      {tab === 'news' && (
        <div style={np.wrapper}>

          {/* Date bar */}
          <div style={np.datebar}>
            <span style={np.datebarText}>{today}</span>
            <span style={{ ...np.datebarText, color: '#7c6af7' }}>
              {filteredNews.length} {filteredNews.length === 1 ? 'story' : 'stories'}
              {realNews.length > 0 ? ' · Live feed' : ' · Sample data'}
            </span>
          </div>

          {/* Filter */}
          <div style={np.filterBar}>
            <input
              style={np.filterInput}
              value={newsFilter}
              onChange={e => setNewsFilter(e.target.value)}
              placeholder="Filter by keyword, ticker or tag…"
            />
            {newsFilter && (
              <button style={{ ...s.btnSm, fontSize: 11 }} onClick={() => setNewsFilter('')}>✕ Clear</button>
            )}
          </div>

          {loadingNews && (
            <div style={{ textAlign: 'center', color: '#555570', padding: '3rem', fontSize: 13 }}>
              <Spinner />Loading news…
            </div>
          )}

          {!loadingNews && filteredNews.length === 0 && (
            <div style={{ textAlign: 'center', color: '#333350', padding: '3rem', fontSize: 14 }}>
              No stories match your filter.
            </div>
          )}

          {/* ── Featured Article ── */}
          {!loadingNews && featured && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={np.sectionLabel}>Top Story</div>
              <div style={np.featuredWrap}>
                {/* Left: text */}
                <div>
                  <div style={np.tagPill(featured.tag)}>{featured.tag}</div>
                  <h2 style={np.featuredHeadline}>{featured.headline}</h2>
                  <div style={np.featuredByline}>
                    {featured.ticker && (
                      <span style={{ fontFamily: "'DM Mono', monospace", color: '#7c6af7' }}>{featured.ticker} · </span>
                    )}
                    {featured.source}
                    {' · '}
                    {featured.date}
                    {featured.link && (
                      <a href={featured.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 10, color: '#7c6af7', fontSize: 11, textDecoration: 'none' }}>Read full article ↗</a>
                    )}
                  </div>
                  {featured.summary && (
                    <p style={np.featuredSummary}>{featured.summary}</p>
                  )}
                  <div style={{ marginTop: 14 }}>
                    <button
                      style={s.btn}
                      onClick={() => getSummary(
                        `news-0`,
                        `You are a clinical data expert and biotech analyst. Explain this news to an informed pharma professional in 3–4 sentences: "${featured.headline}". Context: ${featured.summary}. Focus on clinical and regulatory significance. Be direct.`
                      )}
                    >
                      {loading['news-0'] ? <><Spinner />Analyzing…</> : 'AI analysis →'}
                    </button>
                  </div>
                  {summaries['news-0'] && <div style={np.npAiBox}>{summaries['news-0']}</div>}
                </div>
                {/* Right: real photo */}
                <div style={{ borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start' }}>
                  <NewsImage tag={featured.tag} ticker={featured.ticker} seed={0} height={200} />
                </div>
              </div>
            </div>
          )}

          {/* ── Secondary Articles Grid ── */}
          {!loadingNews && secondary.length > 0 && (
            <div>
              <div style={np.sectionLabel}>More Stories</div>
              <div style={np.secondaryGrid}>
                {secondary.map((n, i) => {
                  const idx = i + 1; // offset for summaries key
                  const tc = tagColor(n.tag);
                  return (
                    <div
                      key={idx}
                      className="np-secondary-card"
                      style={{
                        background: '#111118',
                        border: '0.5px solid #1e1e2e',
                        borderRadius: 10,
                        padding: '1rem',
                        transition: 'background 0.15s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0,
                      }}
                    >
                      {/* Photo */}
                      <div style={{ marginBottom: 12 }}>
                        <NewsImage tag={n.tag} ticker={n.ticker} seed={idx} height={140} />
                      </div>

                      {/* Tag + ticker row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={np.tagPill(n.tag)}>{n.tag}</span>
                        {n.ticker && (
                          <span style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 11,
                            color: '#7c6af7',
                            background: 'rgba(124,106,247,0.08)',
                            padding: '1px 6px',
                            borderRadius: 3,
                            border: '0.5px solid rgba(124,106,247,0.2)',
                          }}>{n.ticker}</span>
                        )}
                      </div>

                      {/* Headline */}
                      <p style={np.secondaryHeadline}>{n.headline}</p>

                      {/* Source + date */}
                      <p style={np.secondarySource}>
                        {n.source} · {n.date}
                        {n.link && (
                          <a href={n.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, color: '#7c6af7', textDecoration: 'none' }}>↗</a>
                        )}
                      </p>

                      {/* Body */}
                      {n.summary && <p style={np.secondaryBody}>{n.summary}</p>}

                      {/* AI button */}
                      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                        <button
                          style={{ ...s.btn, fontSize: 11, padding: '6px 12px' }}
                          onClick={() => getSummary(
                            `news-${idx}`,
                            `You are a clinical data expert and biotech analyst. Explain this news to an informed pharma professional in 3–4 sentences: "${n.headline}". Context: ${n.summary}. Focus on clinical and regulatory significance. Be direct.`
                          )}
                        >
                          {loading[`news-${idx}`] ? <><Spinner />Analyzing…</> : 'Explain this →'}
                        </button>
                      </div>
                      {summaries[`news-${idx}`] && <div style={np.npAiBox}>{summaries[`news-${idx}`]}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          WATCHLIST TAB
      ═══════════════════════════════════════════════════════ */}
      {tab === 'watchlist' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
            <input style={s.input} value={tickerInput} onChange={e => setTickerInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTicker()} placeholder="Add ticker (e.g. NVAX, GILD)..." />
            <button style={s.btn} onClick={addTicker}>Add →</button>
          </div>
          <div style={s.grid4}>
            <div style={s.metric}><div style={s.metricLabel}>Watching</div><div style={{ ...s.metricVal, color: '#7c6af7' }}>{watchlist.length}</div></div>
            <div style={s.metric}><div style={s.metricLabel}>Gainers</div><div style={{ ...s.metricVal, color: '#34d399' }}>{gainers}</div></div>
            <div style={s.metric}><div style={s.metricLabel}>Losers</div><div style={{ ...s.metricVal, color: '#faa19b' }}>{losers}</div></div>
            <div style={s.metric}><div style={s.metricLabel}>FDA events (30d)</div><div style={{ ...s.metricVal, color: '#fbbf24' }}>4</div></div>
          </div>
          {watchlist.map((stock) => (
            <div key={stock.ticker} style={s.card}>
              <div style={{ ...s.rowBetween, marginBottom: 6 }}>
                <div style={s.row}>
                  <span style={s.ticker}>{stock.ticker}</span>
                  <span style={s.muted}>{stock.name}</span>
                  <span style={s.badge(stageBadge(stock.stage))}>{stock.stage}</span>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333350', fontSize: 18, lineHeight: 1 }} onClick={() => removeTicker(stock.ticker)}>×</button>
              </div>
              <div style={s.row}>
                {stock.price > 0 && <span style={{ fontSize: 18, fontWeight: 500 }}>${stock.price.toFixed(2)}</span>}
                {stock.price > 0 && <span style={stock.change >= 0 ? s.priceUp : s.priceDown}>{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(1)}%</span>}
                {stock.mktcap !== '—' && <span style={s.muted}>Mkt cap: {stock.mktcap}</span>}
              </div>
              <hr style={s.divider} />
              <p style={s.muted}>{stock.note}</p>
              <div style={{ ...s.row, marginTop: 10, flexWrap: 'wrap' }}>
                <button style={s.btn} onClick={() => getSummary(`wl-${stock.ticker}`, `You are a biotech investment analyst. Give a concise 3-sentence summary of ${stock.ticker} (${stock.name}): current stage (${stock.stage}), main pipeline note (${stock.note}). Be factual and direct. No disclaimers.`)}>
                  {loading[`wl-${stock.ticker}`] ? <><Spinner />Generating...</> : 'AI summary →'}
                </button>
              </div>
              {summaries[`wl-${stock.ticker}`] && <div style={s.aiBox}>{summaries[`wl-${stock.ticker}`]}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          FDA CALENDAR TAB
      ═══════════════════════════════════════════════════════ */}
      {tab === 'fda' && (
        <div>
          <p style={{ ...s.muted, marginBottom: '1rem' }}>Upcoming PDUFA dates, advisory committee meetings & trial readouts</p>
          {FDA_DATA.map((f, i) => (
            <div key={i} style={s.card}>
              <div style={s.fdaDate}>📅 {f.date}</div>
              <div style={{ ...s.rowBetween, marginBottom: 6 }}>
                <div style={s.row}>
                  <span style={s.ticker}>{f.ticker}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{f.drug}</span>
                </div>
                <span style={s.badge(fdaBadge(f.type))}>{f.event}</span>
              </div>
              <p style={s.muted}>{f.note}</p>
              <div style={{ marginTop: 10 }}>
                <button style={s.btn} onClick={() => getSummary(`fda-${i}`, `You are a biotech investment analyst. In 3 sentences, explain what investors should know about the upcoming ${f.event} for ${f.drug} by ${f.ticker} on ${f.date}. Be specific about risks and upside. No disclaimers.`)}>
                  {loading[`fda-${i}`] ? <><Spinner />Loading...</> : 'Investor context →'}
                </button>
              </div>
              {summaries[`fda-${i}`] && <div style={s.aiBox}>{summaries[`fda-${i}`]}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
