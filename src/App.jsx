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

// Tag color mapping — light theme
function tagColor(tag) {
  if (!tag) return { bg: 'rgba(109,40,217,0.07)', color: '#5b21b6', border: 'rgba(109,40,217,0.2)' };
  const t = tag.toLowerCase();
  if (t.includes('trial') || t.includes('clinical')) return { bg: 'rgba(22,163,74,0.08)', color: '#15803d', border: 'rgba(22,163,74,0.25)' };
  if (t.includes('regulat') || t.includes('fda')) return { bg: 'rgba(29,78,216,0.07)', color: '#1d4ed8', border: 'rgba(29,78,216,0.2)' };
  if (t.includes('partner') || t.includes('deal')) return { bg: 'rgba(161,98,7,0.07)', color: '#a16207', border: 'rgba(161,98,7,0.2)' };
  if (t.includes('conference')) return { bg: 'rgba(190,18,60,0.07)', color: '#be123c', border: 'rgba(190,18,60,0.2)' };
  if (t.includes('finance')) return { bg: 'rgba(21,128,61,0.07)', color: '#166534', border: 'rgba(21,128,61,0.2)' };
  return { bg: 'rgba(109,40,217,0.07)', color: '#5b21b6', border: 'rgba(109,40,217,0.2)' };
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
  app: { maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem', minHeight: '100vh', background: '#f7f4ef' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.5px', fontFamily: "'Georgia', serif" },
  subtitle: { fontSize: 12, color: '#888', marginTop: 2, letterSpacing: '0.3px' },
  liveBadge: { fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '0.5px solid rgba(22,163,74,0.3)', fontWeight: 600 },
  tabs: { display: 'flex', gap: 2, borderBottom: '2px solid #1a1a1a', marginBottom: '1.75rem' },
  tab: (active) => ({ padding: '10px 18px', fontSize: 13, cursor: 'pointer', border: 'none', background: 'none', color: active ? '#1a1a1a' : '#888', borderBottom: active ? '3px solid #c8102e' : '3px solid transparent', marginBottom: -2, fontWeight: active ? 700 : 400, transition: 'color 0.15s', letterSpacing: '0.3px', fontFamily: "'Georgia', serif" }),
  card: { background: '#fff', border: '1px solid #e5e0d8', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: 10 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: '1.25rem' },
  metric: { background: '#fff', borderRadius: 8, padding: '12px 14px', border: '1px solid #e5e0d8' },
  metricLabel: { fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' },
  metricVal: { fontSize: 22, fontWeight: 700, color: '#1a1a1a' },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  ticker: { fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: '#c8102e', background: 'rgba(200,16,46,0.07)', padding: '2px 7px', borderRadius: 4, border: '0.5px solid rgba(200,16,46,0.2)' },
  muted: { fontSize: 13, color: '#555' },
  badge: (type) => {
    const map = {
      green: ['rgba(22,163,74,0.08)', '#15803d', 'rgba(22,163,74,0.25)'],
      red: ['rgba(200,16,46,0.08)', '#c8102e', 'rgba(200,16,46,0.25)'],
      amber: ['rgba(161,98,7,0.08)', '#a16207', 'rgba(161,98,7,0.25)'],
      purple: ['rgba(109,40,217,0.08)', '#6d28d9', 'rgba(109,40,217,0.25)'],
      blue: ['rgba(29,78,216,0.08)', '#1d4ed8', 'rgba(29,78,216,0.25)'],
    };
    const [bg, color, border] = map[type] || map.blue;
    return { fontSize: 11, padding: '3px 8px', borderRadius: 20, background: bg, color, border: `0.5px solid ${border}`, fontWeight: 600, whiteSpace: 'nowrap' };
  },
  input: { background: '#fff', border: '1px solid #d1ccc4', borderRadius: 8, padding: '9px 14px', color: '#1a1a1a', fontSize: 13, outline: 'none', width: '100%' },
  btn: { background: '#1a1a1a', border: 'none', borderRadius: 6, padding: '8px 14px', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnSm: { background: 'transparent', border: '1px solid #d1ccc4', borderRadius: 6, padding: '5px 10px', color: '#555', fontSize: 11, cursor: 'pointer' },
  aiBox: { background: '#faf8f4', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#444', marginTop: 10, lineHeight: 1.7, border: '1px solid #e5e0d8' },
  divider: { border: 'none', borderTop: '1px solid #e5e0d8', margin: '10px 0' },
  priceUp: { color: '#16a34a', fontWeight: 600 },
  priceDown: { color: '#c8102e', fontWeight: 600 },
  fdaDate: { fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' },
};

// ─── Newspaper styles (light theme) ────────────────────────────────────────
const np = {
  wrapper: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  datebar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '3px solid #1a1a1a',
    borderBottom: '1px solid #1a1a1a',
    paddingTop: '0.4rem',
    paddingBottom: '0.4rem',
    marginBottom: '1.25rem',
  },
  datebarText: { fontSize: 11, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    color: '#c8102e',
    marginBottom: 8,
    fontFamily: "'DM Mono', monospace",
    borderBottom: '1px solid #e5e0d8',
    paddingBottom: 4,
  },
  featuredWrap: {
    display: 'grid',
    gridTemplateColumns: '1fr 280px',
    gap: '1.5rem',
    borderBottom: '1px solid #d1ccc4',
    paddingBottom: '1.5rem',
    marginBottom: '1.5rem',
  },
  featuredWrapMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    borderBottom: '1px solid #d1ccc4',
    paddingBottom: '1.5rem',
    marginBottom: '1.5rem',
  },
  featuredHeadline: {
    fontSize: 30,
    fontWeight: 700,
    lineHeight: 1.15,
    color: '#111',
    marginBottom: 10,
    letterSpacing: '-0.3px',
    fontFamily: "'Georgia', serif",
  },
  featuredByline: {
    fontSize: 11,
    color: '#777',
    marginBottom: 10,
    letterSpacing: '0.3px',
    fontFamily: "'DM Mono', monospace",
  },
  featuredSummary: {
    fontSize: 15,
    lineHeight: 1.75,
    color: '#333',
    fontFamily: "'Georgia', serif",
  },
  imgPlaceholder: () => ({}), // unused — kept for compat
  secondaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '1.25rem',
    borderBottom: '1px solid #d1ccc4',
    paddingBottom: '1.5rem',
    marginBottom: '1.5rem',
  },
  secondaryHeadline: {
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.3,
    color: '#111',
    marginBottom: 6,
    fontFamily: "'Georgia', serif",
  },
  secondarySource: {
    fontSize: 11,
    color: '#777',
    fontFamily: "'DM Mono', monospace",
    marginBottom: 6,
  },
  secondaryBody: {
    fontSize: 13,
    lineHeight: 1.65,
    color: '#444',
    fontFamily: "'Georgia', serif",
  },
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
      border: `1px solid ${c.border}`,
      marginBottom: 8,
      fontFamily: "'DM Mono', monospace",
    };
  },
  colDivider: { borderLeft: '1px solid #d1ccc4', margin: '0 0.25rem' },
  filterBar: { display: 'flex', gap: 8, marginBottom: '1.25rem', alignItems: 'center' },
  filterInput: {
    background: '#fff',
    border: '1px solid #d1ccc4',
    borderRadius: 6,
    padding: '7px 12px',
    color: '#1a1a1a',
    fontSize: 12,
    outline: 'none',
    flex: 1,
    fontFamily: "'DM Mono', monospace",
  },
  npAiBox: {
    background: '#faf8f4',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 13,
    color: '#333',
    marginTop: 10,
    lineHeight: 1.75,
    border: '1px solid #e5e0d8',
    fontFamily: "'Georgia', serif",
    borderLeft: '3px solid #c8102e',
  },
};

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

// NewsImage: uses photoKeyword from the RSS article for a relevant Picsum query.
// When Pexels API key is added later, swap the imgUrl line only.
function NewsImage({ photoKeyword, seed = 0, height = 160 }) {
  const [imgError, setImgError] = React.useState(false);

  // Picsum with a stable seed so each article gets a consistent image.
  // When you have the Pexels key, replace this URL with the Pexels API call.
  const imgUrl = `https://picsum.photos/seed/${encodeURIComponent(photoKeyword || seed)}/600/300`;

  if (imgError) {
    return (
      <div style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden' }}>
        <FallbackGraphic seed={seed} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden', background: '#f0ede8' }}>
      <img
        src={imgUrl}
        alt=""
        onError={() => setImgError(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, display: 'block', opacity: 0.85 }}
      />
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ display: 'inline-block', width: 12, height: 12, border: '1.5px solid #ddd', borderTopColor: '#c8102e', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 6, verticalAlign: -2 }} />
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
    <div style={s.app}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        body { background: #f7f4ef; }
        input:focus { border-color: #c8102e !important; }
        button:hover { opacity: 0.85; }
        .np-secondary-card:hover { background: #faf8f4 !important; }
      `}</style>

      {/* ── App Header ── */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Biotech & Pharma Tracker</div>
          <div style={s.subtitle}>Follow your picks · News · FDA catalysts</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>

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
            <span style={{ ...np.datebarText, color: '#c8102e' }}>
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
            <div style={{ textAlign: 'center', color: '#888', padding: '3rem', fontSize: 13 }}>
              <Spinner />Loading news…
            </div>
          )}

          {!loadingNews && filteredNews.length === 0 && (
            <div style={{ textAlign: 'center', color: '#555', padding: '3rem', fontSize: 14 }}>
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
                      <span style={{ fontFamily: "'DM Mono', monospace", color: '#c8102e', fontWeight: 600 }}>{featured.ticker} · </span>
                    )}
                    {featured.source}
                    {' · '}
                    {featured.date}
                    {featured.link && (
                      <a href={featured.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 10, color: '#c8102e', fontSize: 11, textDecoration: 'none', fontWeight: 600 }}>Read full article ↗</a>
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
                  <NewsImage photoKeyword={featured.photoKeyword} seed={0} height={200} />
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
                        background: '#fff',
                        border: '1px solid #e5e0d8',
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
                        <NewsImage photoKeyword={n.photoKeyword} seed={idx} height={140} />
                      </div>

                      {/* Tag + ticker row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={np.tagPill(n.tag)}>{n.tag}</span>
                        {n.ticker && (
                          <span style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 11,
                            color: '#c8102e',
                            background: 'rgba(200,16,46,0.07)',
                            padding: '1px 6px',
                            borderRadius: 3,
                            border: '0.5px solid rgba(200,16,46,0.2)',
                          }}>{n.ticker}</span>
                        )}
                      </div>

                      {/* Headline */}
                      <p style={np.secondaryHeadline}>{n.headline}</p>

                      {/* Source + date */}
                      <p style={np.secondarySource}>
                        {n.source} · {n.date}
                        {n.link && (
                          <a href={n.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, color: '#c8102e', textDecoration: 'none', fontWeight: 600 }}>↗</a>
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
            <div style={s.metric}><div style={s.metricLabel}>Watching</div><div style={{ ...s.metricVal, color: '#1a1a1a' }}>{watchlist.length}</div></div>
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
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 18, lineHeight: 1 }} onClick={() => removeTicker(stock.ticker)}>×</button>
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
