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
  app: { maxWidth: 1400, margin: '0 auto', padding: '2rem 2.5rem', minHeight: '100vh', background: '#fefcf9' },
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

const np = {
  wrapper: { fontFamily: "'Georgia', 'Times New Roman', serif" },
  datebar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '3px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', paddingTop: '0.4rem', paddingBottom: '0.4rem', marginBottom: '1.25rem' },
  datebarText: { fontSize: 11, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" },
  sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 8, fontFamily: "'DM Mono', monospace", borderBottom: '1px solid #e5e0d8', paddingBottom: 4 },
  featuredWrap: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', borderBottom: '1px solid #d1ccc4', paddingBottom: '1.5rem', marginBottom: '1.5rem' },
  featuredHeadline: { fontSize: 30, fontWeight: 700, lineHeight: 1.15, color: '#111', marginBottom: 10, letterSpacing: '-0.3px', fontFamily: "'Georgia', serif" },
  featuredByline: { fontSize: 11, color: '#777', marginBottom: 10, letterSpacing: '0.3px', fontFamily: "'DM Mono', monospace" },
  featuredSummary: { fontSize: 15, lineHeight: 1.75, color: '#333', fontFamily: "'Georgia', serif" },
  secondaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', borderBottom: '1px solid #d1ccc4', paddingBottom: '1.5rem', marginBottom: '1.5rem' },
  secondaryHeadline: { fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: '#111', marginBottom: 6, fontFamily: "'Georgia', serif" },
  secondarySource: { fontSize: 11, color: '#777', fontFamily: "'DM Mono', monospace", marginBottom: 6 },
  secondaryBody: { fontSize: 13, lineHeight: 1.65, color: '#444', fontFamily: "'Georgia', serif" },
  tagPill: (tag) => {
    const c = tagColor(tag);
    return { display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 3, background: c.bg, color: c.color, border: `1px solid ${c.border}`, marginBottom: 8, fontFamily: "'DM Mono', monospace" };
  },
  filterBar: { display: 'flex', gap: 8, marginBottom: '1.25rem', alignItems: 'center' },
  filterInput: { background: '#fff', border: '1px solid #d1ccc4', borderRadius: 6, padding: '7px 12px', color: '#1a1a1a', fontSize: 12, outline: 'none', flex: 1, fontFamily: "'DM Mono', monospace" },
  npAiBox: { background: '#faf8f4', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#333', marginTop: 10, lineHeight: 1.75, border: '1px solid #e5e0d8', fontFamily: "'Georgia', serif", borderLeft: '3px solid #c8102e' },
};

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
    </svg>
  );
}

function NewsImage({ photoKeyword, seed = 0, height = 160 }) {
  const [imgError, setImgError] = React.useState(false);
  const imgUrl = `https://picsum.photos/seed/${encodeURIComponent(photoKeyword || seed)}/600/300`;
  if (imgError) return <div style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden' }}><FallbackGraphic seed={seed} /></div>;
  return (
    <div style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden', background: '#f0ede8' }}>
      <img src={imgUrl} alt="" onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, display: 'block', opacity: 0.85 }} />
    </div>
  );
}

function Spinner() {
  return <span style={{ display: 'inline-block', width: 12, height: 12, border: '1.5px solid #ddd', borderTopColor: '#c8102e', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 6, verticalAlign: -2 }} />;
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

// ─── Analyst Rating Bar (Google Finance style) ───────────────────────────────
function AnalystRatingBar({ buy, hold, sell }) {
  const total = buy + hold + sell;
  if (total === 0) return null;
  const buyPct = Math.round((buy / total) * 100);
  const holdPct = Math.round((hold / total) * 100);
  const sellPct = 100 - buyPct - holdPct;

  // Determine overall verdict
  let verdict = 'Hold';
  let verdictColor = '#a16207';
  if (buyPct >= 60) { verdict = 'Strong Buy'; verdictColor = '#15803d'; }
  else if (buyPct >= 45) { verdict = 'Buy'; verdictColor = '#16a34a'; }
  else if (sellPct >= 45) { verdict = 'Strong Sell'; verdictColor = '#c8102e'; }
  else if (sellPct >= 30) { verdict = 'Sell'; verdictColor = '#dc2626'; }

  return (
    <div style={{ marginTop: 14 }}>
      {/* Verdict */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: "'DM Mono', monospace" }}>Analyst Consensus</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: verdictColor, fontFamily: "'DM Mono', monospace" }}>{verdict}</span>
      </div>

      {/* Stacked bar */}
      <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', marginBottom: 8 }}>
        <div style={{ width: `${buyPct}%`, background: '#16a34a', transition: 'width 0.6s ease' }} />
        <div style={{ width: `${holdPct}%`, background: '#d97706', transition: 'width 0.6s ease' }} />
        <div style={{ width: `${sellPct}%`, background: '#dc2626', transition: 'width 0.6s ease' }} />
      </div>

      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
        <span style={{ color: '#15803d' }}>Buy {buyPct}%</span>
        <span style={{ color: '#a16207' }}>Hold {holdPct}%</span>
        <span style={{ color: '#dc2626' }}>Sell {sellPct}%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
        <span>{buy} analysts</span>
        <span>{hold} analysts</span>
        <span>{sell} analysts</span>
      </div>
    </div>
  );
}

// ─── Price Target indicator ───────────────────────────────────────────────────
function PriceTarget({ current, target }) {
  if (!target || !current || current === 0) return null;
  const upside = (((target - current) / current) * 100).toFixed(1);
  const isUp = target >= current;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '8px 12px', background: isUp ? 'rgba(22,163,74,0.05)' : 'rgba(220,38,38,0.05)', borderRadius: 6, border: `1px solid ${isUp ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}` }}>
      <div>
        <div style={{ fontSize: 10, color: '#888', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px' }}>12-mo Price Target</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>${target.toFixed(2)}</div>
      </div>
      <div style={{ borderLeft: '1px solid #e5e0d8', paddingLeft: 10 }}>
        <div style={{ fontSize: 10, color: '#888', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px' }}>vs Current</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: isUp ? '#16a34a' : '#dc2626' }}>
          {isUp ? '▲' : '▼'} {Math.abs(upside)}%
        </div>
      </div>
    </div>
  );
}

// ─── Investor Sentiment Pills ─────────────────────────────────────────────────
function SentimentPills({ sentiments }) {
  if (!sentiments || sentiments.length === 0) return null;
  const colorMap = {
    bullish: { bg: 'rgba(22,163,74,0.08)', color: '#15803d', border: 'rgba(22,163,74,0.25)', icon: '↑' },
    bearish: { bg: 'rgba(220,38,38,0.08)', color: '#dc2626', border: 'rgba(220,38,38,0.25)', icon: '↓' },
    neutral: { bg: 'rgba(100,100,100,0.08)', color: '#555', border: 'rgba(100,100,100,0.2)', icon: '→' },
    cautious: { bg: 'rgba(161,98,7,0.08)', color: '#a16207', border: 'rgba(161,98,7,0.25)', icon: '⚠' },
    speculative: { bg: 'rgba(109,40,217,0.08)', color: '#6d28d9', border: 'rgba(109,40,217,0.25)', icon: '◆' },
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      {sentiments.map((s, i) => {
        const tone = s.tone?.toLowerCase() || 'neutral';
        const c = colorMap[tone] || colorMap.neutral;
        return (
          <span key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: c.bg, color: c.color, border: `0.5px solid ${c.border}`, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
            {c.icon} {s.label}
          </span>
        );
      })}
    </div>
  );
}

// ─── Expandable Stock Card ────────────────────────────────────────────────────
function StockCard({ stock, onRemove, onLoadDetail, onStageUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) {
      setLoadingDetail(true);
      try {
        const result = await onLoadDetail(stock, onStageUpdate);
        setDetail(result);
      } catch (e) {
        setDetail({ error: 'Could not load details.' });
      }
      setLoadingDetail(false);
    }
  };

  return (
    <div style={{ ...s.card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
      {/* ── Header row (always visible) ── */}
      <div
        style={{ padding: '14px 18px', cursor: 'pointer', borderBottom: expanded ? '1px solid #e5e0d8' : 'none' }} className="stock-card-header"
        onClick={handleExpand}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={s.ticker}>{stock.ticker}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{stock.name}</span>
              <span style={s.badge(stageBadge(stock.stage))}>{stock.stage}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {stock.price > 0 && (
                <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Mono', monospace" }}>
                  ${stock.price.toFixed(2)}
                </span>
              )}
              {stock.price > 0 && (
                <span style={{ ...(stock.change >= 0 ? s.priceUp : s.priceDown), fontSize: 14, fontFamily: "'DM Mono', monospace" }}>
                  {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toFixed(1)}%
                </span>
              )}
              {stock.mktcap !== '—' && (
                <span style={{ fontSize: 12, color: '#888', fontFamily: "'DM Mono', monospace" }}>Mkt cap: {stock.mktcap}</span>
              )}
            </div>
            <p style={{ ...s.muted, marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>{stock.note}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 18, color: '#bbb', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>⌄</span>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 20, lineHeight: 1, padding: '0 2px' }}
              onClick={(e) => { e.stopPropagation(); onRemove(stock.ticker); }}
            >×</button>
          </div>
        </div>
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div style={{ padding: '16px 18px', background: '#fdfcfa' }} className="stock-card-detail">
          {loadingDetail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 13, padding: '12px 0' }}>
              <Spinner />Loading company intelligence…
            </div>
          )}

          {detail && !detail.error && (
            <div>
              {/* About */}
              {detail.about && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>About</div>
                  <p style={{ fontSize: 13, color: '#333', lineHeight: 1.7, margin: 0 }}>{detail.about}</p>
                </div>
              )}

              <hr style={s.divider} />

              {/* Analyst Ratings */}
              {detail.ratings && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>Analyst Ratings</div>
                  <AnalystRatingBar buy={detail.ratings.buy} hold={detail.ratings.hold} sell={detail.ratings.sell} />
                </div>
              )}

              {/* Price Target */}
              {detail.priceTarget && stock.price > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <PriceTarget current={stock.price} target={detail.priceTarget} />
                </div>
              )}

              <hr style={s.divider} />

              {/* Investor Sentiment */}
              {detail.sentiments && detail.sentiments.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>Investor Sentiment</div>
                  <SentimentPills sentiments={detail.sentiments} />
                  {detail.sentimentSummary && (
                    <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>{detail.sentimentSummary}</p>
                  )}
                </div>
              )}

              {/* Key Risks */}
              {detail.risks && detail.risks.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>Key Risks</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detail.risks.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                        <span style={{ color: '#c8102e', flexShrink: 0, marginTop: 1 }}>▸</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {detail?.error && (
            <div style={{ color: '#c8102e', fontSize: 13 }}>{detail.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Smart Search Bar with Finnhub live lookup ────────────────────────────────
function SearchBar({ onAdd, watchlist }) {
  const [val, setVal] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = React.useRef(null);

  const searchTickers = async (query) => {
    if (!query || query.length < 2) { setSuggestions([]); setShowSugg(false); return; }
    setSearching(true);
    try {
      // Use Finnhub symbol search — same API key your /api/stocks uses
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      // data should be array of { ticker, name }
      if (Array.isArray(data) && data.length > 0) {
        setSuggestions(data.slice(0, 7));
        setShowSugg(true);
      } else {
        setSuggestions([]);
        setShowSugg(true); // still show "no results" state
      }
    } catch {
      setSuggestions([]);
    }
    setSearching(false);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setVal(v);
    setError('');
    clearTimeout(debounceRef.current);
    if (v.trim().length >= 2) {
      debounceRef.current = setTimeout(() => searchTickers(v.trim()), 350);
    } else {
      setSuggestions([]);
      setShowSugg(false);
    }
  };

  const handleSelect = async (ticker, name) => {
    setVal('');
    setSuggestions([]);
    setShowSugg(false);
    setError('');
    // Already in watchlist?
    if (watchlist.find(s => s.ticker === ticker)) {
      setError(`${ticker} is already in your watchlist.`);
      return;
    }
    setAdding(true);
    await onAdd(ticker, name);
    setAdding(false);
  };

  const handleManualAdd = async () => {
    const t = val.trim().toUpperCase();
    if (!t) return;
    // Try to find it in current suggestions first
    const match = suggestions.find(s => s.ticker === t);
    if (match) { handleSelect(match.ticker, match.name); return; }
    // Otherwise validate it exists via search
    setAdding(true);
    setError('');
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(t)}`);
      const data = await res.json();
      const exact = Array.isArray(data) && data.find(s => s.ticker === t);
      if (exact) {
        await handleSelect(exact.ticker, exact.name);
      } else {
        setError(`"${t}" not found. Check the ticker symbol and try again.`);
      }
    } catch {
      setError('Search failed. Please try again.');
    }
    setAdding(false);
    setVal('');
  };

  const tickerStyle = { fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: '#c8102e', background: 'rgba(200,16,46,0.07)', padding: '2px 7px', borderRadius: 4, border: '0.5px solid rgba(200,16,46,0.2)', flexShrink: 0 };

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', gap: 8 }} className="search-row">
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: searching ? '#c8102e' : '#aaa', fontSize: 13, pointerEvents: 'none', transition: 'color 0.2s' }}>
            {searching ? '⟳' : '🔍'}
          </span>
          <input
            style={{ ...s.input, paddingLeft: 34, borderColor: error ? '#fca5a5' : undefined }}
            value={val}
            onChange={handleChange}
            onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
            onBlur={() => setTimeout(() => setShowSugg(false), 200)}
            onFocus={() => suggestions.length > 0 && setShowSugg(true)}
            placeholder="Search by name or ticker: 'Moderna', 'CRSP', 'Gilead'…"
            disabled={adding}
          />

          {/* Dropdown */}
          {showSugg && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e0d8', borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.1)', zIndex: 100, marginTop: 4, overflow: 'hidden' }}>
              {suggestions.length === 0 && !searching && (
                <div style={{ padding: '12px 14px', fontSize: 12, color: '#888', fontFamily: "'DM Mono', monospace" }}>
                  No results found for "{val}"
                </div>
              )}
              {suggestions.map((item, i) => {
                const alreadyIn = watchlist.find(s => s.ticker === item.ticker);
                return (
                  <div
                    key={item.ticker}
                    style={{ padding: '10px 14px', cursor: alreadyIn ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < suggestions.length - 1 ? '1px solid #f5f3ef' : 'none', opacity: alreadyIn ? 0.5 : 1, background: 'transparent', transition: 'background 0.1s' }}
                    onMouseDown={() => !alreadyIn && handleSelect(item.ticker, item.name)}
                    onMouseOver={e => { if (!alreadyIn) e.currentTarget.style.background = '#faf8f4'; }}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={tickerStyle}>{item.ticker}</span>
                    <span style={{ fontSize: 13, color: '#333', flex: 1 }}>{item.name}</span>
                    {alreadyIn && <span style={{ fontSize: 10, color: '#aaa', fontFamily: "'DM Mono', monospace" }}>already added</span>}
                    {!alreadyIn && <span style={{ fontSize: 11, color: '#c8102e', fontFamily: "'DM Mono', monospace" }}>+ Add</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          style={{ ...s.btn, minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: adding ? 0.7 : 1 }}
          onClick={handleManualAdd}
          disabled={adding || !val.trim()}
        >
          {adding ? <><Spinner />Adding…</> : 'Add →'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', fontFamily: "'DM Mono', monospace" }}>
          <span>✕</span> {error}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('news');
  const [watchlist, setWatchlist] = useState(INITIAL_WATCHLIST);
  const [newsFilter, setNewsFilter] = useState('');
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState({});
  const [realNews, setRealNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [pressReleases, setPressReleases] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');

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
    const fetchPress = async () => {
      try {
        const res = await fetch('/api/press');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setPressReleases(data);
      } catch (e) { console.error(e); }
    };
    fetchPress();
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

  const addTicker = useCallback(async (val, knownName) => {
    if (!val || watchlist.find(s => s.ticker === val)) return;
    setWatchlist(prev => [...prev, { ticker: val, name: knownName || val, price: 0, change: 0, mktcap: '—', stage: 'Unknown', note: 'Loading price data…' }]);
    try {
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: [val] }),
      });
      const data = await res.json();
      if (data[0]) {
        setWatchlist(prev => prev.map(s => s.ticker === val ? { ...s, ...data[0], name: data[0].name || knownName || val } : s));
      } else {
        setWatchlist(prev => prev.map(s => s.ticker === val ? { ...s, note: 'Price data unavailable.' } : s));
      }
    } catch (e) {
      setWatchlist(prev => prev.map(s => s.ticker === val ? { ...s, note: 'Could not fetch price data.' } : s));
    }
  }, [watchlist]);

  const removeTicker = (ticker) => setWatchlist(prev => prev.filter(s => s.ticker !== ticker));

  const updateStage = useCallback((ticker, stage) => {
    setWatchlist(prev => prev.map(s => s.ticker === ticker ? { ...s, stage } : s));
  }, []);

  const getSummary = useCallback(async (key, prompt) => {
    if (summaries[key]) return;
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const text = await callClaude(prompt);
      setSummaries(prev => ({ ...prev, [key]: text }));
    } catch { setSummaries(prev => ({ ...prev, [key]: 'Error generating summary.' })); }
    setLoading(prev => ({ ...prev, [key]: false }));
  }, [summaries]);

  // Load detailed company intelligence via Claude
  const loadStockDetail = useCallback(async (stock, onStageUpdate) => {
    const prompt = `You are a financial data assistant. Return ONLY valid JSON, no markdown, no explanation.

For the biotech/pharma company ${stock.ticker} (${stock.name}), return this exact JSON structure:

{
  "stage": "one of exactly: Preclinical | Phase 1 | Phase 1/2 | Phase 2 | Phase 2/3 | Phase 3 | Commercial | Platform | Private | Unknown",
  "about": "2-3 sentence description of what the company does, their main technology platform, and lead programs",
  "ratings": {
    "buy": <integer, estimated number of analysts with Buy rating, 0 if private or unknown>,
    "hold": <integer, estimated number of analysts with Hold rating, 0 if private or unknown>,
    "sell": <integer, estimated number of analysts with Sell rating, 0 if private or unknown>
  },
  "priceTarget": <number, consensus 12-month price target in USD, or null if private/not applicable>,
  "sentiments": [
    { "label": "short sentiment tag", "tone": "bullish|bearish|neutral|cautious|speculative" },
    { "label": "another tag", "tone": "bullish|bearish|neutral|cautious|speculative" },
    { "label": "another tag", "tone": "bullish|bearish|neutral|cautious|speculative" }
  ],
  "sentimentSummary": "1-2 sentence summary of what investors are saying about this company right now",
  "risks": [
    "Key risk 1",
    "Key risk 2",
    "Key risk 3"
  ]
}

Base this on your knowledge of ${stock.ticker} (${stock.name}). Infer the most accurate clinical stage from the company's actual pipeline status. Return ONLY the JSON object.`;

    const raw = await callClaude(prompt);
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      // Update stage in watchlist immediately if we got one
      if (parsed.stage && parsed.stage !== 'Unknown' && onStageUpdate) {
        onStageUpdate(stock.ticker, parsed.stage);
      }
      return parsed;
    } catch {
      return { error: 'Could not parse company data.' };
    }
  }, []);

  const newsSource = realNews.length > 0 ? realNews : NEWS_DATA;

  // Category → keywords to match against tag + headline
  const CATEGORY_KEYWORDS = {
    'Pharma':          ['pharma', 'drug', 'medicine', 'therapeutic'],
    'Biotech':         ['biotech', 'biologic', 'biosimilar', 'gene', 'cell therapy', 'crispr', 'mrna'],
    'FDA':             ['fda', 'regulatory', 'approval', 'pdufa', 'ema', 'nda', 'bla'],
    'Clinical Trials': ['trial', 'phase', 'clinical', 'readout', 'efficacy', 'endpoint'],
    'Deals':           ['deal', 'partner', 'acqui', 'merger', 'licens', 'collaboration'],
    'Gene Therapy':    ['gene therapy', 'gene edit', 'crispr', 'aav', 'base edit', 'prime edit'],
    'AI':              ['artificial intel', ' ai ', 'machine learn', 'algorithm', 'digital', 'data-driven'],
    'Oncology':        ['cancer', 'oncol', 'tumor', 'immuno-oncol', 'checkpoint', 'car-t'],
    'Finance':         ['ipo', 'funding', 'invest', 'earning', 'revenue', 'financ', 'stock'],
  };

  const filteredNews = newsSource.filter(n => {
    // Category filter
    if (categoryFilter) {
      const kws = CATEGORY_KEYWORDS[categoryFilter] || [];
      const haystack = (n.headline + ' ' + (n.tag || '') + ' ' + (n.summary || '')).toLowerCase();
      const matchesCat = kws.some(kw => haystack.includes(kw)) ||
        (n.tag && n.tag.toLowerCase().includes(categoryFilter.toLowerCase()));
      if (!matchesCat) return false;
    }
    // Text search
    if (newsFilter) {
      const haystack = (n.headline + ' ' + (n.ticker || '') + ' ' + (n.tag || '')).toLowerCase();
      if (!haystack.includes(newsFilter.toLowerCase())) return false;
    }
    return true;
  });

  const gainers = watchlist.filter(s => s.change >= 0).length;
  const losers = watchlist.filter(s => s.change < 0).length;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const featured = filteredNews[0];
  const secondary = filteredNews.slice(1);

  return (
    <div style={s.app} className="app-root">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        body { background: #fefcf9; margin: 0; }
        input:focus { border-color: #c8102e !important; }
        button:hover { opacity: 0.85; }
        .np-secondary-card:hover { background: #faf8f4 !important; }

        /* ── Mobile responsive ── */
        @media (max-width: 600px) {
          .app-root { padding: 1rem !important; }

          /* Header */
          .app-header { flex-direction: column; align-items: flex-start !important; gap: 8px; margin-bottom: 1rem !important; }
          .app-title { font-size: 18px !important; }

          /* Tabs */
          .app-tabs button { padding: 8px 12px !important; font-size: 12px !important; }

          /* Top story: stack vertically on mobile */
          .featured-grid {
            display: flex !important;
            flex-direction: column-reverse !important;
            gap: 1rem !important;
          }
          .featured-headline { font-size: 20px !important; line-height: 1.25 !important; }
          .featured-image { width: 100% !important; height: 180px !important; }

          /* Secondary grid: single column */
          .secondary-grid { grid-template-columns: 1fr !important; }

          /* Metrics grid: 2 cols */
          .metrics-grid { grid-template-columns: 1fr 1fr !important; }

          /* Stock card padding */
          .stock-card-header { padding: 12px 14px !important; }
          .stock-card-detail { padding: 12px 14px !important; }

          /* Date bar smaller text */
          .datebar-text { font-size: 10px !important; }

          /* Search bar */
          .search-row { flex-direction: column !important; }
          .search-row button { width: 100% !important; }

          /* News layout: stack on mobile */
          .news-layout { grid-template-columns: 1fr !important; }

          /* Filter pills: smaller on mobile */
          .filter-pills button { padding: 4px 10px !important; font-size: 11px !important; }
        }
      `}</style>

      <div style={s.header} className="app-header">
        <div>
          <div style={s.title} className="app-title">Biotech & Pharma Tracker</div>
          <div style={s.subtitle}>Follow your picks · News · FDA catalysts</div>
        </div>
        <span style={s.liveBadge}>● Live</span>
      </div>

      <div style={s.tabs} className="app-tabs">
        {['news', 'watchlist', 'fda'].map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'news' ? 'News' : t === 'watchlist' ? 'Watchlist' : 'FDA Calendar'}
          </button>
        ))}
      </div>

      {/* ══════════════ NEWS TAB ══════════════ */}
      {tab === 'news' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '2rem', alignItems: 'flex-start' }} className="news-layout">
        <div style={np.wrapper}>
          <div style={np.datebar}>
            <span style={np.datebarText}>{today}</span>
            <span style={{ ...np.datebarText, color: '#c8102e' }}>
              {filteredNews.length} {filteredNews.length === 1 ? 'story' : 'stories'}
              {realNews.length > 0 ? ' · Live feed' : ' · Sample data'}
            </span>
          </div>

          {/* ── Category filter pills ── */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }} className="filter-pills">
            {['All', 'Pharma', 'Biotech', 'FDA', 'Clinical Trials', 'Deals', 'Gene Therapy', 'AI', 'Oncology', 'Finance'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === 'All' ? '' : cat)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  border: (categoryFilter === cat || (cat === 'All' && !categoryFilter))
                    ? '1.5px solid #1a1a1a'
                    : '1px solid #d1ccc4',
                  background: (categoryFilter === cat || (cat === 'All' && !categoryFilter))
                    ? '#1a1a1a'
                    : 'transparent',
                  color: (categoryFilter === cat || (cat === 'All' && !categoryFilter))
                    ? '#fff'
                    : '#555',
                  fontSize: 12,
                  fontWeight: (categoryFilter === cat || (cat === 'All' && !categoryFilter)) ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: '0.2px',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >{cat}</button>
            ))}
          </div>

          {/* ── Keyword search ── */}
          <div style={np.filterBar}>
            <input style={np.filterInput} value={newsFilter} onChange={e => setNewsFilter(e.target.value)} placeholder="Search by keyword or ticker…" />
            {newsFilter && <button style={{ ...s.btnSm, fontSize: 11 }} onClick={() => setNewsFilter('')}>✕ Clear</button>}
          </div>

          {loadingNews && <div style={{ textAlign: 'center', color: '#888', padding: '3rem', fontSize: 13 }}><Spinner />Loading news…</div>}
          {!loadingNews && filteredNews.length === 0 && <div style={{ textAlign: 'center', color: '#555', padding: '3rem', fontSize: 14 }}>No stories match your filter.</div>}

          {!loadingNews && featured && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={np.sectionLabel}>Top Story</div>
              <div style={np.featuredWrap} className="featured-grid">
                <div>
                  <div style={np.tagPill(featured.tag)}>{featured.tag}</div>
                  <h2 style={np.featuredHeadline} className="featured-headline">{featured.headline}</h2>
                  <div style={np.featuredByline}>

                    {featured.source} · {featured.date}
                    {featured.link && <a href={featured.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 10, color: '#c8102e', fontSize: 11, textDecoration: 'none', fontWeight: 600 }}>Read full article ↗</a>}
                  </div>
                  {featured.summary && <p style={np.featuredSummary}>{featured.summary}</p>}
                  <div style={{ marginTop: 14 }}>
                    <button style={s.btn} onClick={() => getSummary(`news-0`, `You are a clinical data expert and biotech analyst. Explain this news to an informed pharma professional in 3–4 sentences: "${featured.headline}". Context: ${featured.summary}. Focus on clinical and regulatory significance. Be direct.`)}>
                      {loading['news-0'] ? <><Spinner />Analyzing…</> : 'AI analysis →'}
                    </button>
                  </div>
                  {summaries['news-0'] && <div style={np.npAiBox}>{summaries['news-0']}</div>}
                </div>
                <div style={{ borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start' }}>
                  <NewsImage photoKeyword={featured.photoKeyword} seed={0} height={200} />
                </div>
              </div>
            </div>
          )}

          {!loadingNews && secondary.length > 0 && (
            <div>
              <div style={np.sectionLabel}>More Stories</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {secondary.map((n, i) => {
                  const idx = i + 1;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '1.25rem', padding: '1.1rem 0', borderBottom: '1px solid #e5e0d8', alignItems: 'flex-start', transition: 'background 0.15s', borderRadius: 4 }}
                      onMouseOver={e => e.currentTarget.style.background = '#f5f2ee'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ flexShrink: 0, width: 110, height: 74, borderRadius: 6, overflow: 'hidden' }}>
                        <NewsImage photoKeyword={n.photoKeyword} seed={idx} height={74} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                          <span style={np.tagPill(n.tag)}>{n.tag}</span>
                          <span style={{ fontSize: 11, color: '#999', fontFamily: "'DM Mono', monospace" }}>{n.source} · {n.date}</span>
                          {n.link && <a href={n.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#c8102e', textDecoration: 'none', fontWeight: 600 }}>↗</a>}
                        </div>
                        <p style={{ ...np.secondaryHeadline, fontSize: 15, margin: '0 0 5px 0' }}>{n.headline}</p>
                        {n.summary && <p style={{ fontSize: 12, lineHeight: 1.6, color: '#666', margin: '0 0 8px 0', fontFamily: "'Georgia', serif" }}>{n.summary}</p>}
                        <button style={{ ...s.btn, fontSize: 10, padding: '4px 10px' }} onClick={() => getSummary(`news-${idx}`, `You are a clinical data expert and biotech analyst. Explain this news to an informed pharma professional in 3–4 sentences: "${n.headline}". Context: ${n.summary}. Focus on clinical and regulatory significance. Be direct.`)}>
                          {loading[`news-${idx}`] ? <><Spinner />Analyzing…</> : 'Explain →'}
                        </button>
                        {summaries[`news-${idx}`] && <div style={{ ...np.npAiBox, marginTop: 8 }}>{summaries[`news-${idx}`]}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Press Releases Sidebar ── */}
        <div style={{ position: 'sticky', top: '1rem' }}>
            <div style={{ borderTop: '3px solid #1a1a1a', paddingTop: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c8102e', fontFamily: "'DM Mono', monospace" }}>Company Announcements</div>
            </div>
            {pressReleases.length === 0 && (
              <div style={{ fontSize: 12, color: '#aaa', fontFamily: "'DM Mono', monospace" }}>Loading…</div>
            )}
            {pressReleases.map((pr, i) => (
              <div key={i} style={{ paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid #e5e0d8' }}>
                <a
                  href={pr.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4, margin: '0 0 5px 0', fontFamily: "'Georgia', serif" }}>
                    {pr.headline}
                  </p>
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: '#888', fontFamily: "'DM Mono', monospace" }}>From {pr.company || pr.source}</span>
                  {pr.date && <span style={{ fontSize: 10, color: '#bbb', fontFamily: "'DM Mono', monospace" }}>· {pr.date}</span>}
                </div>
              </div>
            ))}
            {pressReleases.length > 0 && (
              <a href="https://www.biopharmadive.com/press-release/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#c8102e', fontFamily: "'DM Mono', monospace", textDecoration: 'none', fontWeight: 600 }}>View all press releases ↗</a>
            )}
        </div>
      </div>
      )}

      {/* ══════════════ WATCHLIST TAB ══════════════ */}
      {tab === 'watchlist' && (
        <div>
          {/* Search bar */}
          <SearchBar onAdd={addTicker} watchlist={watchlist} />

          {/* Metrics row */}
          <div style={s.grid4} className="metrics-grid">
            <div style={s.metric}><div style={s.metricLabel}>Watching</div><div style={{ ...s.metricVal, color: '#1a1a1a' }}>{watchlist.length}</div></div>
            <div style={s.metric}><div style={s.metricLabel}>Gainers</div><div style={{ ...s.metricVal, color: '#34d399' }}>{gainers}</div></div>
            <div style={s.metric}><div style={s.metricLabel}>Losers</div><div style={{ ...s.metricVal, color: '#faa19b' }}>{losers}</div></div>
            <div style={s.metric}><div style={s.metricLabel}>FDA events (30d)</div><div style={{ ...s.metricVal, color: '#fbbf24' }}>4</div></div>
          </div>

          {/* Hint */}
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
            ↓ Click any card to expand company details, analyst ratings & investor sentiment
          </div>

          {/* Stock cards */}
          {watchlist.map((stock) => (
            <StockCard
              key={stock.ticker}
              stock={stock}
              onRemove={removeTicker}
              onLoadDetail={loadStockDetail}
              onStageUpdate={updateStage}
            />
          ))}
        </div>
      )}

      {/* ══════════════ FDA CALENDAR TAB ══════════════ */}
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
