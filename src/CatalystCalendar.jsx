import React, { useState, useCallback } from 'react';

// ─── Static catalyst data (AI-enriched, curated) ─────────────────────────────
const CATALYST_EVENTS = [
  // FDA / Regulatory
  { id: 1, date: '2025-06-03', ticker: 'MRNA', company: 'Moderna', drug: 'mRNA-1010', eventType: 'PDUFA', indication: 'Influenza', phase: 'NDA', importance: 9, volatilityScore: 7, successProbability: 82, sentiment: 'bullish', watchlist: true,
    aiSummary: 'This seasonal flu vaccine NDA represents Moderna\'s first non-COVID commercial product. Approval would validate its mRNA platform beyond COVID and open a $6B+ annual market.',
    historicalContext: 'Similar mRNA flu vaccine submissions: 78% approval rate. Average stock move on approval: +18%. Average drop on rejection: -34%.',
    tags: ['FDA', 'mRNA', 'Commercial'],
    keyRisks: ['Manufacturing scale concerns', 'Competition from established flu vaccines'],
  },
  { id: 2, date: '2025-08-22', ticker: 'BEAM', company: 'Beam Therapeutics', drug: 'BEAM-101', eventType: 'PDUFA', indication: 'Sickle Cell Disease', phase: 'BLA', importance: 10, volatilityScore: 9, successProbability: 71, sentiment: 'bullish', watchlist: true,
    aiSummary: 'BEAM-101 uses base editing — a next-gen CRISPR approach — to increase fetal hemoglobin. Direct competitor to Casgevy (approved 2023). A positive readout could establish base editing as a superior modality.',
    historicalContext: 'Gene therapy approvals in SCD: 2/3 (67%). Average stock move on approval: +45%. Average drop on CRL: -52%. Market highly binary.',
    tags: ['FDA', 'Gene Editing', 'Rare Disease'],
    keyRisks: ['Casgevy competition', 'Manufacturing complexity', 'Pricing pressure'],
  },
  { id: 3, date: '2025-10-14', ticker: 'MRNA', company: 'Moderna', drug: 'mRNA-1345', eventType: 'PDUFA', indication: 'RSV (adults 60+)', phase: 'BLA', importance: 10, volatilityScore: 8, successProbability: 88, sentiment: 'bullish', watchlist: true,
    aiSummary: 'RSV vaccine for older adults. Phase 3 showed 83.7% efficacy. Competes with GSK\'s Arexvy and Pfizer\'s Abrysvo. Moderna enters a $4B+ market. Approval is widely expected given strong Phase 3 data.',
    historicalContext: 'RSV vaccine approval rate: 3/3 in recent cycle. Average stock move on approval: +12%. Market already partially priced in.',
    tags: ['FDA', 'mRNA', 'Vaccine', 'Commercial'],
    keyRisks: ['Market share vs established competitors', 'Pricing dynamics'],
  },

  // Phase 2/3 Readouts
  { id: 4, date: '2025-06-17', ticker: 'KYMR', company: 'Kymera Therapeutics', drug: 'KY1005', eventType: 'Phase 2 Readout', indication: 'Atopic Dermatitis', phase: 'Phase 2', importance: 9, volatilityScore: 8, successProbability: 65, sentiment: 'bullish', watchlist: true,
    aiSummary: 'KY1005 targets STAT6, a master regulator of Th2 inflammation. Full Phase 2 data will determine if protein degradation (TPD) can compete with biologics like dupilumab. High scientific novelty — first STAT6 degrader in clinical trials.',
    historicalContext: 'Phase 2 AD trials with novel mechanisms: 58% meet primary endpoint. Average stock move on beat: +55%. Average drop on miss: -45%.',
    tags: ['Phase 2', 'Immunology', 'TPD'],
    keyRisks: ['Dupilumab dominance', 'STAT6 selectivity concerns', 'Durability of response'],
  },
  { id: 5, date: '2025-09-05', ticker: 'RXRX', company: 'Recursion Pharma', drug: 'REC-994', eventType: 'Phase 2 Interim', indication: 'Cavernous Malformation', phase: 'Phase 2', importance: 8, volatilityScore: 9, successProbability: 48, sentiment: 'neutral', watchlist: true,
    aiSummary: 'REC-994 is the first clinical proof-of-concept for Recursion\'s AI drug discovery platform. A positive interim in this rare CNS disease would validate the entire platform thesis — potentially re-rating the entire company.',
    historicalContext: 'First-in-class CNS rare disease Phase 2: 42% success rate. Average stock move on positive interim: +65%. Platform validation events carry outsized re-rating potential.',
    tags: ['Phase 2', 'AI Platform', 'CNS', 'Rare Disease'],
    keyRisks: ['Small patient population limits signal', 'AI platform validation still unproven', 'High placebo effect in CNS trials'],
  },
  { id: 6, date: '2025-07-08', ticker: 'EDIT', company: 'Editas Medicine', drug: 'EDIT-301', eventType: 'IND Expansion', indication: 'Beta-Thalassemia', phase: 'Phase 1/2', importance: 7, volatilityScore: 6, successProbability: 73, sentiment: 'bullish', watchlist: true,
    aiSummary: 'Expansion of EDIT-301\'s IND to beta-thalassemia following promising sickle cell data. Broadens addressable market significantly. Regulatory milestone, not a data readout — but signals FDA comfort with the program.',
    historicalContext: 'IND expansions in gene editing: 76% approved without major changes. Average stock move: +8 to +15%.',
    tags: ['Regulatory', 'Gene Editing', 'Rare Disease'],
    keyRisks: ['Competitive landscape from bluebird, CRISPR Tx', 'Manufacturing scale'],
  },

  // Conferences
  { id: 7, date: '2025-06-02', ticker: 'SECTOR', company: 'Sector-wide', drug: 'Multiple', eventType: 'Conference', indication: 'Oncology', phase: '—', importance: 8, volatilityScore: 6, successProbability: null, sentiment: 'bullish', watchlist: false,
    aiSummary: 'ASCO 2025 Annual Meeting. Major oncology data releases expected across checkpoint inhibitors, ADCs, and CAR-T. Historically the single most important annual event for oncology biotech stocks.',
    historicalContext: 'ASCO week average biotech volatility: +23% vs normal weeks. Watchlist oncology names should be monitored closely.',
    tags: ['Conference', 'ASCO', 'Oncology'],
    keyRisks: ['Data surprises in either direction'],
  },
  { id: 8, date: '2025-09-12', ticker: 'SECTOR', company: 'Sector-wide', drug: 'Multiple', eventType: 'Conference', indication: 'Hematology', phase: '—', importance: 7, volatilityScore: 5, successProbability: null, sentiment: 'neutral', watchlist: false,
    aiSummary: 'EHA 2025 Congress. Key data expected in sickle cell, MDS, and AML. Critical for BEAM, EDIT, and other hematology-focused names in your watchlist.',
    historicalContext: 'EHA average move for hematology names presenting: +12% on positive data.',
    tags: ['Conference', 'EHA', 'Hematology'],
    keyRisks: [],
  },
  { id: 9, date: '2025-12-06', ticker: 'SECTOR', company: 'Sector-wide', drug: 'Multiple', eventType: 'Conference', indication: 'Hematology', phase: '—', importance: 9, volatilityScore: 7, successProbability: null, sentiment: 'bullish', watchlist: false,
    aiSummary: 'ASH 2025 Annual Meeting. The most important hematology conference of the year. Gene therapy, base editing, and protein degradation data expected. BEAM and EDIT likely to present updated data.',
    historicalContext: 'ASH week average biotech volatility: +18% vs normal. Gene therapy names: historically +25-40% on strong ASH data.',
    tags: ['Conference', 'ASH', 'Hematology', 'Gene Therapy'],
    keyRisks: [],
  },

  // Earnings
  { id: 10, date: '2025-07-31', ticker: 'MRNA', company: 'Moderna', drug: '—', eventType: 'Earnings', indication: '—', phase: 'Q2 2025', importance: 6, volatilityScore: 5, successProbability: null, sentiment: 'cautious', watchlist: true,
    aiSummary: 'Q2 earnings will show COVID revenue trajectory and guidance for mRNA-1345 RSV launch. Cash burn and runway guidance key for sentiment. Analysts watching for pipeline investment pace.',
    historicalContext: 'Moderna earnings: average post-earnings move ±18%. Revenue miss historically triggers -15 to -25% reaction.',
    tags: ['Earnings', 'Commercial'],
    keyRisks: ['COVID revenue decline acceleration', 'R&D cost guidance'],
  },
  { id: 11, date: '2025-08-07', ticker: 'RXRX', company: 'Recursion Pharma', drug: '—', eventType: 'Earnings', indication: '—', phase: 'Q2 2025', importance: 5, volatilityScore: 4, successProbability: null, sentiment: 'neutral', watchlist: true,
    aiSummary: 'Q2 earnings for Recursion. Focus on partnership revenue from Roche/Bayer deals and burn rate. Management commentary on AI platform progress and REC-994 readout timing will be closely watched.',
    historicalContext: 'Recursion earnings: average post-earnings move ±12%.',
    tags: ['Earnings', 'AI Platform'],
    keyRisks: ['Cash runway', 'Partnership milestone delays'],
  },

  // Insider / Dilution
  { id: 12, date: '2025-06-20', ticker: 'KYMR', company: 'Kymera Therapeutics', drug: '—', eventType: 'Insider Buying', indication: '—', phase: '—', importance: 6, volatilityScore: 3, successProbability: null, sentiment: 'bullish', watchlist: true,
    aiSummary: 'CEO and CFO purchased $2.1M in open market shares at $24.50, just weeks before the KY1005 Phase 2 readout. Insider buying ahead of a binary catalyst is historically a strong bullish signal.',
    historicalContext: 'Executive insider buys >$1M within 60 days of Phase 2 readout: 71% correlated with positive outcome in historical analysis.',
    tags: ['Insider', 'Bullish Signal'],
    keyRisks: ['Insiders can be wrong'],
  },
  { id: 13, date: '2025-07-15', ticker: 'EDIT', company: 'Editas Medicine', drug: '—', eventType: 'Dilution Risk', indication: '—', phase: '—', importance: 7, volatilityScore: 6, successProbability: null, sentiment: 'bearish', watchlist: true,
    aiSummary: 'Editas ends Q1 with $285M cash and ~$110M annual burn. At this pace, runway extends to mid-2027 — but gene therapy manufacturing costs could accelerate burn. Watch for ATM offerings or follow-on risk.',
    historicalContext: 'Small-cap biotechs with <18 months runway: 68% issue dilutive equity within 6 months. Average dilution impact: -10 to -20%.',
    tags: ['Dilution Risk', 'Cash Runway'],
    keyRisks: ['Follow-on offering', 'ATM program activation'],
  },
];

// Most Watched (FOMO section)
const MOST_WATCHED = [
  { ticker: 'BEAM', event: 'PDUFA Aug 22', watchers: 8420, change: '+340 this week', sentiment: 'bullish' },
  { ticker: 'KYMR', event: 'Ph2 Readout Jun 17', watchers: 6180, change: '+210 this week', sentiment: 'bullish' },
  { ticker: 'MRNA', event: 'RSV PDUFA Oct 14', watchers: 12340, change: '+890 this week', sentiment: 'bullish' },
  { ticker: 'RXRX', event: 'Ph2 Interim Sep 5', watchers: 4220, change: '+180 this week', sentiment: 'neutral' },
];

// Heatmap data — events per week for next 12 weeks
function getHeatmapData() {
  const weeks = [];
  const now = new Date('2025-05-12');
  for (let w = 0; w < 12; w++) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const events = CATALYST_EVENTS.filter(e => {
      const d = new Date(e.date);
      return d >= weekStart && d <= weekEnd;
    });
    const intensity = events.reduce((sum, e) => sum + e.importance, 0);
    weeks.push({
      label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      events,
      intensity,
      maxImportance: events.length > 0 ? Math.max(...events.map(e => e.importance)) : 0,
    });
  }
  return weeks;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EVENT_COLORS = {
  'PDUFA':           { color: '#1d4ed8', bg: 'rgba(29,78,216,0.08)', border: 'rgba(29,78,216,0.25)', icon: '🏛' },
  'Phase 2 Readout': { color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)', icon: '🔬' },
  'Phase 2 Interim': { color: '#6d28d9', bg: 'rgba(109,40,217,0.08)', border: 'rgba(109,40,217,0.25)', icon: '🔬' },
  'Phase 3 Readout': { color: '#be123c', bg: 'rgba(190,18,60,0.08)', border: 'rgba(190,18,60,0.25)', icon: '🔬' },
  'IND Expansion':   { color: '#0369a1', bg: 'rgba(3,105,161,0.08)', border: 'rgba(3,105,161,0.25)', icon: '📋' },
  'Conference':      { color: '#047857', bg: 'rgba(4,120,87,0.08)', border: 'rgba(4,120,87,0.25)', icon: '🎤' },
  'Earnings':        { color: '#a16207', bg: 'rgba(161,98,7,0.08)', border: 'rgba(161,98,7,0.25)', icon: '💰' },
  'Insider Buying':  { color: '#15803d', bg: 'rgba(21,128,61,0.08)', border: 'rgba(21,128,61,0.25)', icon: '📈' },
  'Dilution Risk':   { color: '#c8102e', bg: 'rgba(200,16,46,0.08)', border: 'rgba(200,16,46,0.25)', icon: '⚠' },
};

function getEventStyle(type) {
  return EVENT_COLORS[type] || { color: '#555', bg: 'rgba(100,100,100,0.07)', border: 'rgba(100,100,100,0.2)', icon: '📌' };
}

function daysUntil(dateStr) {
  const d = new Date(dateStr);
  const now = new Date('2025-05-12');
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function VolatilityBar({ score }) {
  const color = score >= 8 ? '#c8102e' : score >= 6 ? '#d97706' : '#15803d';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: '#f0ede8', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${score * 10}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: "'DM Mono', monospace", minWidth: 16 }}>{score}</span>
    </div>
  );
}

function ImportanceDots({ score }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= Math.ceil(score / 2) ? '#c8102e' : '#e5e0d8' }} />
      ))}
    </div>
  );
}

function ProbabilityRing({ prob }) {
  if (prob === null) return <span style={{ fontSize: 11, color: '#bbb', fontFamily: "'DM Mono', monospace" }}>N/A</span>;
  const color = prob >= 75 ? '#15803d' : prob >= 55 ? '#d97706' : '#c8102e';
  const r = 18, circ = 2 * Math.PI * r;
  const dash = (prob / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#f0ede8" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 22 22)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="700" fill={color} fontFamily="monospace">{prob}%</text>
      </svg>
      <span style={{ fontSize: 8, color: '#aaa', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prob.</span>
    </div>
  );
}

// ─── Catalyst Card ────────────────────────────────────────────────────────────
function CatalystCard({ event, onAIAnalysis, aiData, loadingAI }) {
  const [expanded, setExpanded] = useState(false);
  const style = getEventStyle(event.eventType);
  const days = daysUntil(event.date);
  const isWatchlist = event.watchlist;
  const sentimentColor = event.sentiment === 'bullish' ? '#15803d' : event.sentiment === 'bearish' ? '#c8102e' : '#a16207';

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${isWatchlist ? 'rgba(200,16,46,0.2)' : '#e5e0d8'}`,
      borderLeft: `3px solid ${isWatchlist ? '#c8102e' : style.color}`,
      borderRadius: 6,
      marginBottom: 10,
      overflow: 'hidden',
      transition: 'box-shadow 0.15s',
    }}
      onMouseOver={e => e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)'}
      onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* ── Header ── */}
      <div style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(x => !x)}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

          {/* Left: probability ring */}
          <div style={{ flexShrink: 0 }}>
            <ProbabilityRing prob={event.successProbability} />
          </div>

          {/* Center: main info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Top badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: style.bg, color: style.color, border: `1px solid ${style.border}`, fontFamily: "'DM Mono', monospace", letterSpacing: '0.5px' }}>
                {style.icon} {event.eventType}
              </span>
              {isWatchlist && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(200,16,46,0.07)', color: '#c8102e', border: '0.5px solid rgba(200,16,46,0.2)', fontFamily: "'DM Mono', monospace", letterSpacing: '1px' }}>
                  📌 WATCHLIST
                </span>
              )}
              {event.tags.slice(0,2).map(tag => (
                <span key={tag} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#f5f2ed', color: '#888', fontFamily: "'DM Mono', monospace" }}>{tag}</span>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: days <= 14 ? '#c8102e' : days <= 30 ? '#d97706' : '#aaa', fontFamily: "'DM Mono', monospace", fontWeight: days <= 14 ? 700 : 400 }}>
                {days <= 0 ? 'TODAY' : `${days}d`}
              </span>
            </div>

            {/* Company + drug */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: '#c8102e', background: 'rgba(200,16,46,0.07)', padding: '2px 7px', borderRadius: 3, border: '0.5px solid rgba(200,16,46,0.2)' }}>
                {event.ticker}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Georgia', serif" }}>{event.drug !== '—' ? event.drug : event.company}</span>
              {event.indication !== '—' && <span style={{ fontSize: 12, color: '#666' }}>· {event.indication}</span>}
            </div>

            {/* Date + phase */}
            <div style={{ fontSize: 11, color: '#888', fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>
              {formatDate(event.date)} · {event.phase}
            </div>

            {/* AI Summary (always visible) */}
            <p style={{ fontSize: 12, color: '#444', lineHeight: 1.65, margin: 0, fontFamily: "'Georgia', serif" }}>
              {event.aiSummary}
            </p>
          </div>

          {/* Right: scores */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 80 }}>
            <div>
              <div style={{ fontSize: 9, color: '#aaa', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Importance</div>
              <ImportanceDots score={event.importance} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#aaa', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Volatility</div>
              <VolatilityBar score={event.volatilityScore} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#aaa', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Sentiment</div>
              <span style={{ fontSize: 10, fontWeight: 700, color: sentimentColor, fontFamily: "'DM Mono', monospace", textTransform: 'uppercase' }}>
                {event.sentiment === 'bullish' ? '↑' : event.sentiment === 'bearish' ? '↓' : '→'} {event.sentiment}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0ede8' }}>
          {/* Historical context box */}
          <div style={{ margin: '12px 0', padding: '10px 14px', background: '#faf8f4', borderRadius: 4, border: '1px solid #e5e0d8', borderLeft: '3px solid #d97706' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#a16207', fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>📊 Historical Probability</div>
            <p style={{ fontSize: 12, color: '#555', lineHeight: 1.6, margin: 0, fontFamily: "'Georgia', serif" }}>{event.historicalContext}</p>
          </div>

          {/* Key risks */}
          {event.keyRisks && event.keyRisks.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c8102e', fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>Key Risks</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {event.keyRisks.map((r, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 3, background: 'rgba(200,16,46,0.05)', color: '#c8102e', border: '0.5px solid rgba(200,16,46,0.15)', fontFamily: "'DM Mono', monospace" }}>▸ {r}</span>
                ))}
              </div>
            </div>
          )}

          {/* AI deep analysis button */}
          <button
            style={{ background: '#0f1923', border: 'none', borderRadius: 3, padding: '7px 14px', color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => onAIAnalysis(event)}
          >
            {loadingAI ? <><span style={{ display: 'inline-block', width: 10, height: 10, border: '1.5px solid #555', borderTopColor: '#c8102e', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Analyzing…</> : aiData ? '✓ AI Analysis loaded' : '⚡ Deep AI analysis →'}
          </button>
          {aiData && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: '#faf8f4', borderRadius: 4, border: '1px solid #e5e0d8', borderLeft: '3px solid #c8102e', fontSize: 12, color: '#333', lineHeight: 1.7, fontFamily: "'Georgia', serif" }}>
              {aiData}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────
function CatalystHeatmap({ weeks, onWeekClick, selectedWeek }) {
  const max = Math.max(...weeks.map(w => w.intensity), 1);
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 6, padding: '14px 16px', marginBottom: '1.25rem' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
        🗓 Catalyst Heatmap — Next 12 Weeks
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
        {weeks.map((week, i) => {
          const intensity = week.intensity / max;
          const isSelected = selectedWeek === i;
          const bgColor = intensity === 0
            ? '#f5f2ed'
            : `rgba(200,16,46,${0.08 + intensity * 0.65})`;
          return (
            <div
              key={i}
              onClick={() => onWeekClick(isSelected ? null : i)}
              style={{
                cursor: 'pointer',
                borderRadius: 4,
                padding: '8px 4px',
                background: isSelected ? '#0f1923' : bgColor,
                border: isSelected ? '2px solid #c8102e' : '1px solid transparent',
                textAlign: 'center',
                transition: 'all 0.15s',
              }}
              title={`${week.label}: ${week.events.length} events`}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: isSelected ? '#fff' : intensity > 0.5 ? '#fff' : intensity > 0.2 ? '#c8102e' : '#ccc', fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
                {week.events.length}
              </div>
              <div style={{ fontSize: 8, color: isSelected ? '#aaa' : '#bbb', fontFamily: "'DM Mono', monospace", marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {week.label}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 9, color: '#bbb', fontFamily: "'DM Mono', monospace" }}>LOW</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
          <div key={v} style={{ width: 16, height: 10, borderRadius: 2, background: `rgba(200,16,46,${0.08 + v * 0.65})` }} />
        ))}
        <span style={{ fontSize: 9, color: '#bbb', fontFamily: "'DM Mono', monospace" }}>HIGH</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#bbb', fontFamily: "'DM Mono', monospace" }}>Click week to filter</span>
      </div>
    </div>
  );
}

// ─── Most Watched FOMO Section ────────────────────────────────────────────────
function MostWatchedSection() {
  return (
    <div style={{ background: '#0f1923', borderRadius: 6, padding: '14px 16px', marginBottom: '1.25rem', border: '1px solid #1e2d3d' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
        🔥 Most Watched Catalysts
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        {MOST_WATCHED.map((item, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: '#c8102e' }}>{item.ticker}</span>
              <span style={{ fontSize: 10, color: item.sentiment === 'bullish' ? '#34d399' : '#f59e0b', fontFamily: "'DM Mono', monospace' " }}>
                {item.sentiment === 'bullish' ? '↑' : '→'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#aaa', fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>{item.event}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
              {item.watchers.toLocaleString()}
            </div>
            <div style={{ fontSize: 9, color: '#34d399', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{item.change}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main CatalystCalendar Component ─────────────────────────────────────────
export default function CatalystCalendar({ watchlist, callClaude }) {
  const [typeFilter, setTypeFilter] = useState('');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // date | importance | volatility
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [aiAnalyses, setAiAnalyses] = useState({});
  const [loadingAI, setLoadingAI] = useState({});

  const heatmapWeeks = getHeatmapData();

  const handleAIAnalysis = useCallback(async (event) => {
    if (aiAnalyses[event.id]) return;
    setLoadingAI(prev => ({ ...prev, [event.id]: true }));
    try {
      const prompt = `You are a biotech investment analyst. Give a 4-sentence deep analysis of this catalyst for an investor:
Company: ${event.company} (${event.ticker})
Drug: ${event.drug}
Event: ${event.eventType} on ${formatDate(event.date)}
Indication: ${event.indication}
Phase: ${event.phase}
Success probability: ${event.successProbability ?? 'N/A'}%
Key context: ${event.aiSummary}

Cover: (1) what this trial is really testing scientifically, (2) the bull case if successful, (3) the bear case / key risks, (4) what to watch for in the data. Be specific, no disclaimers, write for a sophisticated investor.`;
      const text = await callClaude(prompt);
      setAiAnalyses(prev => ({ ...prev, [event.id]: text }));
    } catch {
      setAiAnalyses(prev => ({ ...prev, [event.id]: 'Could not generate analysis.' }));
    }
    setLoadingAI(prev => ({ ...prev, [event.id]: false }));
  }, [aiAnalyses, callClaude]);

  const watchlistTickers = new Set(watchlist.map(s => s.ticker));

  // Filter
  let filtered = CATALYST_EVENTS.filter(e => {
    if (watchlistOnly && !watchlistTickers.has(e.ticker) && e.ticker !== 'SECTOR') return false;
    if (typeFilter && e.eventType !== typeFilter) return false;
    if (selectedWeek !== null) {
      const week = heatmapWeeks[selectedWeek];
      if (!week.events.find(we => we.id === e.id)) return false;
    }
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'date') return new Date(a.date) - new Date(b.date);
    if (sortBy === 'importance') return b.importance - a.importance;
    if (sortBy === 'volatility') return b.volatilityScore - a.volatilityScore;
    return 0;
  });

  const eventTypes = [...new Set(CATALYST_EVENTS.map(e => e.eventType))];
  const upcomingCount = filtered.filter(e => daysUntil(e.date) <= 30).length;

  return (
    <div>
      {/* Header bar */}
      <div style={{ borderTop: '3px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: '0.5rem 0', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>
          Biotech Catalyst Intelligence · {filtered.length} events tracked
        </span>
        <span style={{ fontSize: 10, color: '#c8102e', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
          {upcomingCount} catalysts in next 30 days
        </span>
      </div>

      {/* Most Watched FOMO */}
      <MostWatchedSection />

      {/* Heatmap */}
      <CatalystHeatmap weeks={heatmapWeeks} onWeekClick={setSelectedWeek} selectedWeek={selectedWeek} />

      {/* 3-column layout: filters | timeline | AI insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 220px', gap: '1.5rem', alignItems: 'flex-start' }}>

        {/* ── LEFT: Filters ── */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 12, fontFamily: "'DM Mono', monospace", borderBottom: '1px solid #e5e0d8', paddingBottom: 6 }}>Filters</div>

          {/* Watchlist toggle */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>Show</div>
            <button
              onClick={() => setWatchlistOnly(x => !x)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 3, border: watchlistOnly ? '1.5px solid #c8102e' : '1px solid #d1ccc4', background: watchlistOnly ? 'rgba(200,16,46,0.07)' : 'transparent', color: watchlistOnly ? '#c8102e' : '#555', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontWeight: watchlistOnly ? 700 : 400, textAlign: 'left', transition: 'all 0.15s' }}
            >
              {watchlistOnly ? '📌 Watchlist only' : 'All companies'}
            </button>
          </div>

          {/* Event type */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>Event type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={() => setTypeFilter('')} style={{ padding: '6px 10px', borderRadius: 3, border: !typeFilter ? '1.5px solid #1a1a1a' : '1px solid #e5e0d8', background: !typeFilter ? '#1a1a1a' : 'transparent', color: !typeFilter ? '#fff' : '#555', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono', monospace", textAlign: 'left', transition: 'all 0.15s' }}>All types</button>
              {eventTypes.map(type => {
                const st = getEventStyle(type);
                return (
                  <button key={type} onClick={() => setTypeFilter(typeFilter === type ? '' : type)} style={{ padding: '6px 10px', borderRadius: 3, border: typeFilter === type ? `1.5px solid ${st.color}` : '1px solid #e5e0d8', background: typeFilter === type ? st.bg : 'transparent', color: typeFilter === type ? st.color : '#555', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono', monospace", textAlign: 'left', transition: 'all 0.15s' }}>
                    {st.icon} {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort */}
          <div>
            <div style={{ fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>Sort by</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[{ key: 'date', label: '📅 Date' }, { key: 'importance', label: '⭐ Importance' }, { key: 'volatility', label: '⚡ Volatility' }].map(opt => (
                <button key={opt.key} onClick={() => setSortBy(opt.key)} style={{ padding: '6px 10px', borderRadius: 3, border: sortBy === opt.key ? '1.5px solid #1a1a1a' : '1px solid #e5e0d8', background: sortBy === opt.key ? '#1a1a1a' : 'transparent', color: sortBy === opt.key ? '#fff' : '#555', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono', monospace", textAlign: 'left', transition: 'all 0.15s' }}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {(typeFilter || watchlistOnly || selectedWeek !== null) && (
            <button
              onClick={() => { setTypeFilter(''); setWatchlistOnly(false); setSelectedWeek(null); }}
              style={{ marginTop: 16, width: '100%', padding: '7px 10px', borderRadius: 3, border: '1px solid #d1ccc4', background: 'transparent', color: '#888', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}
            >
              ✕ Clear filters
            </button>
          )}
        </div>

        {/* ── CENTER: Timeline ── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 12, fontFamily: "'DM Mono', monospace", borderBottom: '1px solid #e5e0d8', paddingBottom: 6 }}>
            Catalyst Timeline · {filtered.length} events
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>No catalysts match current filters.</div>
          )}
          {filtered.map(event => (
            <CatalystCard
              key={event.id}
              event={event}
              onAIAnalysis={handleAIAnalysis}
              aiData={aiAnalyses[event.id]}
              loadingAI={loadingAI[event.id]}
            />
          ))}
        </div>

        {/* ── RIGHT: AI Insights sidebar ── */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 12, fontFamily: "'DM Mono', monospace", borderBottom: '1px solid #e5e0d8', paddingBottom: 6 }}>AI Insights</div>

          {/* Upcoming in 30 days */}
          <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 6, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#aaa', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Next 30 Days</div>
            {CATALYST_EVENTS.filter(e => daysUntil(e.date) > 0 && daysUntil(e.date) <= 30).sort((a,b) => new Date(a.date)-new Date(b.date)).map(e => {
              const st = getEventStyle(e.eventType);
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #f5f2ed' }}>
                  <span style={{ fontSize: 9, color: '#c8102e', fontFamily: "'DM Mono', monospace", fontWeight: 700, minWidth: 28 }}>{daysUntil(e.date)}d</span>
                  <span style={{ fontSize: 10, color: st.color }}>{st.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Mono', monospace" }}>{e.ticker}</div>
                    <div style={{ fontSize: 10, color: '#888', fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.eventType}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Volatility ranking */}
          <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 6, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#aaa', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>⚡ Top Volatility Events</div>
            {[...CATALYST_EVENTS].sort((a,b) => b.volatilityScore - a.volatilityScore).slice(0,4).map(e => (
              <div key={e.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Mono', monospace" }}>{e.ticker} · {e.drug !== '—' ? e.drug : e.eventType}</span>
                  <span style={{ fontSize: 10, color: '#c8102e', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{e.volatilityScore}/10</span>
                </div>
                <VolatilityBar score={e.volatilityScore} />
              </div>
            ))}
          </div>

          {/* Market note */}
          <div style={{ background: '#faf8f4', border: '1px solid #e5e0d8', borderRadius: 6, padding: '12px 14px', borderLeft: '3px solid #d97706' }}>
            <div style={{ fontSize: 9, color: '#a16207', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>⚠ Note</div>
            <p style={{ fontSize: 11, color: '#666', lineHeight: 1.6, margin: 0, fontFamily: "'Georgia', serif" }}>
              Probability estimates and historical data are AI-generated for informational purposes only. Not financial advice. Binary biotech events carry high risk of significant loss.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
