import React, { useState, useCallback } from 'react';

const ANTHROPIC_API_KEY = process.env.REACT_APP_ANTHROPIC_API_KEY || '';

const INITIAL_WATCHLIST = [
  { ticker: 'MRNA', name: 'Moderna', price: 47.82, change: 2.3, mktcap: '19B', stage: 'Commercial', note: 'RSV vaccine Phase 3 readout due Q3' },
  { ticker: 'EDIT', name: 'Editas Medicine', price: 4.21, change: -5.1, mktcap: '380M', stage: 'Phase 1/2', note: 'CRISPR gene editing for sickle cell' },
  { ticker: 'RXRX', name: 'Recursion Pharma', price: 5.70, change: 1.8, mktcap: '1.1B', stage: 'Platform', note: 'AI-driven drug discovery platform' },
  { ticker: 'BEAM', name: 'Beam Therapeutics', price: 11.45, change: -2.9, mktcap: '700M', stage: 'Phase 1', note: 'Base editing in hemoglobinopathies' },
  { ticker: 'KYMR', name: 'Kymera Therapeutics', price: 23.10, change: 4.6, mktcap: '1.3B', stage: 'Phase 2', note: 'Targeted protein degradation, STAT6 program' },
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

const s = {
  app: { maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' },
  title: { fontSize: 24, fontWeight: 600, color: '#e8e8f0', letterSpacing: '-0.5px' },
  subtitle: { fontSize: 13, color: '#666680', marginTop: 2 },
  liveBadge: { fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '0.5px solid rgba(52,211,153,0.3)', fontWeight: 500 },
  tabs: { display: 'flex', gap: 2, borderBottom: '0.5px solid #1e1e2e', marginBottom: '1.5rem' },
  tab: (active) => ({ padding: '10px 18px', fontSize: 13, cursor: 'pointer', border: 'none', background: 'none', color: active ? '#e8e8f0' : '#555570', borderBottom: active ? '2px solid #7c6af7' : '2px solid transparent', marginBottom: -1, fontWeight: active ? 500 : 400, transition: 'color 0.15s' }),
  card: { background: '#111118', border: '0.5px solid #1e1e2e', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: '1.25rem' },
  metric: { background: '#0d0d14', borderRadius: 10, padding: '12px 14px', border: '0.5px solid #1a1a28' },
  metricLabel: { fontSize: 11, color: '#555570', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' },
  metricVal: { fontSize: 22, fontWeight: 500 },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  ticker: { fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, color: '#7c6af7' },
  muted: { fontSize: 13, color: '#666680' },
  badge: (type) => {
    const map = { green: ['rgba(52,211,153,0.1)','#34d399','rgba(52,211,153,0.2)'], red: ['rgba(248,113,113,0.1)','#f87171','rgba(248,113,113,0.2)'], amber: ['rgba(251,191,36,0.1)','#fbbf24','rgba(251,191,36,0.2)'], purple: ['rgba(124,106,247,0.1)','#7c6af7','rgba(124,106,247,0.2)'], blue: ['rgba(96,165,250,0.1)','#60a5fa','rgba(96,165,250,0.2)'] };
    const [bg, color, border] = map[type] || map.blue;
    return { fontSize: 11, padding: '3px 8px', borderRadius: 20, background: bg, color, border: `0.5px solid ${border}`, fontWeight: 500, whiteSpace: 'nowrap' };
  },
  input: { background: '#0d0d14', border: '0.5px solid #1e1e2e', borderRadius: 8, padding: '9px 14px', color: '#e8e8f0', fontSize: 13, outline: 'none', width: '100%' },
  btn: { background: 'rgba(124,106,247,0.1)', border: '0.5px solid rgba(124,106,247,0.3)', borderRadius: 8, padding: '8px 14px', color: '#7c6af7', fontSize: 12, cursor: 'pointer', fontWeight: 500 },
  btnSm: { background: 'transparent', border: '0.5px solid #1e1e2e', borderRadius: 6, padding: '5px 10px', color: '#555570', fontSize: 11, cursor: 'pointer' },
  aiBox: { background: '#0d0d14', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#9999b8', marginTop: 10, lineHeight: 1.7, border: '0.5px solid #1a1a28' },
  divider: { border: 'none', borderTop: '0.5px solid #1a1a28', margin: '10px 0' },
  priceUp: { color: '#34d399', fontWeight: 500 },
  priceDown: { color: '#f87171', fontWeight: 500 },
  fdaDate: { fontSize: 11, color: '#555570', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' },
};

function Spinner() {
  return (
    <span style={{ display: 'inline-block', width: 12, height: 12, border: '1.5px solid #2a2a3a', borderTopColor: '#7c6af7', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 6, verticalAlign: -2 }} />
  );
}

function stageBadge(stage) {
  if (stage === 'Commercial') return 'green';
  if (stage.includes('Phase')) return 'amber';
  if (stage === 'Platform') return 'blue';
  return 'purple';
}

function tagBadge(tag) {
  if (tag === 'Trial Results' || tag === 'Clinical Data') return 'green';
  if (tag === 'Regulatory') return 'blue';
  if (tag === 'Partnership') return 'amber';
  return 'purple';
}

function fdaBadge(type) {
  if (type === 'approval') return 'green';
  if (type === 'trial') return 'amber';
  return 'blue';
}

async function callClaude(prompt) {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || 'Could not generate response.';
}

export default function App() {
  const [tab, setTab] = useState('watchlist');
  const [watchlist, setWatchlist] = useState(INITIAL_WATCHLIST);
  const [tickerInput, setTickerInput] = useState('');
  const [newsFilter, setNewsFilter] = useState('');
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState({});

  const addTicker = useCallback(() => {
    const val = tickerInput.trim().toUpperCase();
    if (!val || watchlist.find(s => s.ticker === val)) { setTickerInput(''); return; }
    setWatchlist(prev => [...prev, { ticker: val, name: val, price: 0, change: 0, mktcap: '—', stage: 'Unknown', note: 'Add your own notes about this company.' }]);
    setTickerInput('');
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

  const filteredNews = NEWS_DATA.filter(n => !newsFilter || n.headline.toLowerCase().includes(newsFilter.toLowerCase()) || n.ticker.toLowerCase().includes(newsFilter.toLowerCase()) || n.tag.toLowerCase().includes(newsFilter.toLowerCase()));
  const gainers = watchlist.filter(s => s.change >= 0).length;
  const losers = watchlist.filter(s => s.change < 0).length;

  return (
    <div style={s.app}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } input:focus { border-color: #7c6af7 !important; } button:hover { opacity: 0.85; }`}</style>

      <div style={s.header}>
        <div>
          <div style={s.title}>Biotech & Pharma Tracker</div>
          <div style={s.subtitle}>Follow your picks · News · FDA catalysts</div>
        </div>
        <span style={s.liveBadge}>● Live</span>
      </div>

      <div style={s.tabs}>
        {['watchlist', 'news', 'fda'].map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'watchlist' ? '★ Watchlist' : t === 'news' ? '📰 News' : '📅 FDA Calendar'}
          </button>
        ))}
      </div>

      {/* WATCHLIST */}
      {tab === 'watchlist' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
            <input style={s.input} value={tickerInput} onChange={e => setTickerInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTicker()} placeholder="Add ticker (e.g. NVAX, GILD)..." />
            <button style={s.btn} onClick={addTicker}>Add →</button>
          </div>
          <div style={s.grid4}>
            <div style={s.metric}><div style={s.metricLabel}>Watching</div><div style={{ ...s.metricVal, color: '#7c6af7' }}>{watchlist.length}</div></div>
            <div style={s.metric}><div style={s.metricLabel}>Gainers</div><div style={{ ...s.metricVal, color: '#34d399' }}>{gainers}</div></div>
            <div style={s.metric}><div style={s.metricLabel}>Losers</div><div style={{ ...s.metricVal, color: '#f87171' }}>{losers}</div></div>
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

      {/* NEWS */}
      {tab === 'news' && (
        <div>
          <input style={{ ...s.input, marginBottom: '1.25rem' }} value={newsFilter} onChange={e => setNewsFilter(e.target.value)} placeholder="Filter by keyword, ticker or tag..." />
          {filteredNews.length === 0 && <div style={{ textAlign: 'center', color: '#333350', padding: '2rem', fontSize: 14 }}>No news matching filter.</div>}
          {filteredNews.map((n, i) => (
            <div key={i} style={s.card}>
              <div style={{ ...s.rowBetween, marginBottom: 6 }}>
                <div style={s.row}>
                  <span style={s.ticker}>{n.ticker}</span>
                  <span style={s.badge(tagBadge(n.tag))}>{n.tag}</span>
                </div>
                <span style={{ fontSize: 11, color: '#333350' }}>{n.date}</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#c8c8e0', lineHeight: 1.4, marginBottom: 4 }}>{n.headline}</p>
              <p style={{ fontSize: 12, color: '#333350' }}>{n.source}</p>
              <div style={{ marginTop: 10 }}>
                <button style={s.btn} onClick={() => getSummary(`news-${i}`, `You are a clinical data expert and biotech analyst. Explain this news to an informed pharma professional in 3-4 sentences: "${n.headline}". Context: ${n.summary}. Focus on clinical and regulatory significance. Be direct.`)}>
                  {loading[`news-${i}`] ? <><Spinner />Analyzing...</> : 'Explain this →'}
                </button>
              </div>
              {summaries[`news-${i}`] && <div style={s.aiBox}>{summaries[`news-${i}`]}</div>}
            </div>
          ))}
        </div>
      )}

      {/* FDA CALENDAR */}
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
