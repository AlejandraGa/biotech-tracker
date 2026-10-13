import React, { useState, useCallback } from 'react';
import CompetitiveLandscape from './CompetitiveLandscape';
import HivLaunchMap from './HivLaunchMap';
import MultiSelect from './MultiSelect';

const DEFAULT_WATCHLIST = [
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

const LS_KEY = 'catalyst_watchlist_tickers';

function getSavedTickers() {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

function getInitialWatchlist() {
  const saved = getSavedTickers();
  if (!saved) return DEFAULT_WATCHLIST;
  return saved.map(s => ({ price: 0, change: 0, mktcap: '—', ...DEFAULT_WATCHLIST.find(d => d.ticker === s.ticker), ...s }));
}

const OTHER_COMPANIES = [
  { name: 'Pfizer', query: 'Pfizer' }, { name: 'Novartis', query: 'Novartis' },
  { name: 'Roche', query: 'Roche' }, { name: 'AstraZeneca', query: 'AstraZeneca' },
  { name: 'BioNTech', query: 'BioNTech' }, { name: 'Regeneron', query: 'Regeneron' },
  { name: 'Gilead', query: 'Gilead' }, { name: 'Vertex', query: 'Vertex Pharmaceuticals' },
];

const CONGRESS_SOURCES = {
  'ASCO': { label: 'ASCO', color: '#1d4ed8', bg: 'rgba(29,78,216,0.08)', border: 'rgba(29,78,216,0.25)' },
  'ESMO': { label: 'ESMO', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)' },
  'ASH': { label: 'ASH', color: '#b91c1c', bg: 'rgba(185,28,28,0.08)', border: 'rgba(185,28,28,0.25)' },
  'EHA': { label: 'EHA', color: '#0369a1', bg: 'rgba(3,105,161,0.08)', border: 'rgba(3,105,161,0.25)' },
  'AACR': { label: 'AACR', color: '#047857', bg: 'rgba(4,120,87,0.08)', border: 'rgba(4,120,87,0.25)' },
  'EORTC': { label: 'EORTC', color: '#9a3412', bg: 'rgba(154,52,18,0.08)', border: 'rgba(154,52,18,0.25)' },
  'SITC': { label: 'SITC', color: '#4338ca', bg: 'rgba(67,56,202,0.08)', border: 'rgba(67,56,202,0.25)' },
  'NEJM': { label: 'NEJM', color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)' },
  'Lancet': { label: 'Lancet', color: '#b45309', bg: 'rgba(180,83,9,0.08)', border: 'rgba(180,83,9,0.2)' },
  'Nature': { label: 'Nature', color: '#15803d', bg: 'rgba(21,128,61,0.08)', border: 'rgba(21,128,61,0.2)' },
};

function detectCongress(pub) {
  const haystack = ((pub.journalTitle || '') + ' ' + (pub.source || '') + ' ' + (pub.title || '')).toUpperCase();
  for (const key of Object.keys(CONGRESS_SOURCES)) { if (haystack.includes(key)) return key; }
  return null;
}

function getSourceBadge(pub) {
  const congress = detectCongress(pub);
  if (congress) return CONGRESS_SOURCES[congress];
  const journal = (pub.journalTitle || '').toLowerCase();
  if (journal.includes('new england') || journal.includes('nejm')) return CONGRESS_SOURCES['NEJM'];
  if (journal.includes('lancet')) return CONGRESS_SOURCES['Lancet'];
  if (journal.includes('nature')) return CONGRESS_SOURCES['Nature'];
  return { label: pub.journalTitle ? pub.journalTitle.slice(0, 20) : 'Journal', color: '#555', bg: 'rgba(100,100,100,0.07)', border: 'rgba(100,100,100,0.2)' };
}

const TOPIC_FILTERS = [
  { key: '', label: 'All' },
  { key: 'oncology', label: 'Oncology', keywords: ['cancer', 'oncol', 'tumor', 'carcinoma', 'leukemia', 'lymphoma', 'melanoma', 'immunotherapy'] },
  { key: 'gene-therapy', label: 'Gene Therapy', keywords: ['gene therapy', 'gene edit', 'crispr', 'base edit', 'prime edit', 'aav', 'lentiviral'] },
  { key: 'ai', label: 'AI / ML', keywords: ['artificial intelligence', 'machine learning', 'deep learning', 'neural', 'algorithm', 'ai-driven', 'computational'] },
  { key: 'immunology', label: 'Immunology', keywords: ['immunol', 'autoimmune', 'inflammation', 'cytokine', 'checkpoint', 'car-t', 'bispecific'] },
  { key: 'rare-disease', label: 'Rare Disease', keywords: ['rare disease', 'orphan', 'sickle cell', 'thalassemia', 'hemophilia', 'duchenne', 'spinal muscular'] },
  { key: 'rna', label: 'RNA / mRNA', keywords: ['mrna', 'rna', 'antisense', 'sirna', 'oligonucleotide'] },
];

const PAYWALLED_DOMAINS = [
  'statnews.com', 'endpoints.com', 'endpts.com', 'fiercebiotech.com',
  'fiercepharma.com', 'evaluate.com', 'evaluategroup.com', 'informa.com',
  'pharmaintelligence.informa.com', 'scrip.pharmaintelligence.informa.com',
  'invivoblog.com', 'biocentury.com', 'pinksheet.com', 'reutersplus.com',
];

function isPaywalled(article) {
  if (!article.link) return false;
  try { const hostname = new URL(article.link).hostname.replace('www.', ''); return PAYWALLED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d)); }
  catch { return false; }
}

async function fetchEuropePMC(query, rows = 10) {
  try {
    const url = `/api/europepmc?query=${encodeURIComponent(query)}&rows=${rows}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);
    return await res.json();
  } catch (e) { console.error('fetchEuropePMC error:', e); return []; }
}

function matchesTopic(pub, topicKey) {
  if (!topicKey) return true;
  const topic = TOPIC_FILTERS.find(t => t.key === topicKey);
  if (!topic || !topic.keywords) return true;
  const haystack = ((pub.title || '') + ' ' + (pub.journalTitle || '') + ' ' + (pub.abstract || '')).toLowerCase();
  return topic.keywords.some(kw => haystack.includes(kw));
}

// ─── STATIC COMPETITIVE LANDSCAPE DATA ──────────────────────────────────────
const COMPETITIVE_LANDSCAPE_DATA = [
  {
    id: 'cl-1',
    area: 'Oncology',
    target: 'PIK3CA / PI3Kα',
    indication: 'HR+/HER2- Breast Cancer',
    entries: [
      { company: 'Roche', product: 'Inavolisib', stage: 'Commercial', markets: ['US', 'EU', 'JP'], htaStatus: 'G-BA: Considerable benefit', mechanism: 'PI3Kα inhibitor', notes: 'Biomarker-selected. Strong G-BA result Q1 2025.' },
      { company: 'Novartis', product: 'Alpelisib', stage: 'Commercial', markets: ['US', 'EU'], htaStatus: 'NICE: Not rec. (prior ver.)', mechanism: 'PI3Kα inhibitor', notes: 'SOLAR-1 approval. Hyperglycemia limits uptake.' },
      { company: 'Relay Therapeutics', product: 'Lirafugratinib', stage: 'Phase 3', markets: [], htaStatus: '—', mechanism: 'PI3Kα mutant-selective', notes: 'More selective; potentially cleaner safety.' },
    ],
  },
  {
    id: 'cl-2',
    area: 'Rare Disease',
    target: 'Factor IX (FIX)',
    indication: 'Haemophilia B',
    entries: [
      { company: 'Pfizer', product: 'Beqvez', stage: 'Commercial', markets: ['US', 'EU'], htaStatus: 'HAS: ASMR III', mechanism: 'AAV gene therapy', notes: 'HAS moderate SMR. MEA likely in France.' },
      { company: 'uniQure / CSL Behring', product: 'Hemgenix', stage: 'Commercial', markets: ['US', 'EU'], htaStatus: 'NICE: Rec. (HST)', mechanism: 'AAV gene therapy', notes: 'First approved FIX gene therapy. Pricing ~$3.5M.' },
      { company: 'Spark Therapeutics', product: 'SPK-9001', stage: 'Phase 3', markets: [], htaStatus: '—', mechanism: 'AAV gene therapy', notes: 'Competing long-term durability data pending.' },
    ],
  },
  {
    id: 'cl-3',
    area: 'Neurology',
    target: 'Amyloid-β / tau',
    indication: 'Early Alzheimer\'s Disease',
    entries: [
      { company: 'Eisai / Biogen', product: 'Lecanemab', stage: 'Commercial', markets: ['US', 'JP'], htaStatus: 'NICE: Not recommended', mechanism: 'Anti-Aβ mAb', notes: 'NICE rejection May 2025. EU submission ongoing.' },
      { company: 'Eli Lilly', product: 'Donanemab', stage: 'Commercial', markets: ['US'], htaStatus: 'EU: Under review', mechanism: 'Anti-Aβ mAb', notes: 'FDA approved Jul 2024. CHMP opinion pending.' },
      { company: 'Roche', product: 'Trontinemab', stage: 'Phase 3', markets: [], htaStatus: '—', mechanism: 'Brain shuttle anti-Aβ mAb', notes: 'Novel delivery; lower ARIA risk claimed.' },
    ],
  },
  {
    id: 'cl-4',
    area: 'Immunology',
    target: 'IL-31Rα',
    indication: 'Atopic Dermatitis',
    entries: [
      { company: 'Galderma', product: 'Nemolizumab', stage: 'Commercial', markets: ['US', 'JP'], htaStatus: 'NICE: Submission pending', mechanism: 'Anti-IL-31Rα mAb', notes: 'Strong itch endpoint. EU submission expected mid-2025.' },
      { company: 'Sanofi / Regeneron', product: 'Dupilumab', stage: 'Commercial', markets: ['US', 'EU', 'JP'], htaStatus: 'NICE: Rec. (multiple)', mechanism: 'Anti-IL-4Rα mAb', notes: 'Market leader. Multiple label expansions ongoing.' },
      { company: 'Kymera', product: 'KY1005', stage: 'Phase 2', markets: [], htaStatus: '—', mechanism: 'STAT6 protein degrader', notes: '68% EASI-75 at wk 16. Phase 3 design TBD.' },
    ],
  },
];

const s = {
  app: { maxWidth: 1400, margin: '0 auto', padding: '1.75rem 2.5rem 3rem', minHeight: '100vh', background: '#fbfaf7', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", color: '#1a1a1a' },
  card: { background: '#fff', border: '1px solid #e5e0d8', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: 10 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: '1.25rem' },
  metric: { background: '#fff', borderRadius: 8, padding: '12px 14px', border: '1px solid #e5e0d8' },
  metricLabel: { fontSize: 12.5, color: '#888', marginBottom: 4, },
  metricVal: { fontSize: 22, fontWeight: 700, color: '#1a1a1a' },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  ticker: { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 600, color: '#c8102e', background: 'rgba(200,16,46,0.07)', padding: '2px 7px', borderRadius: 4, border: '0.5px solid rgba(200,16,46,0.2)' },
  muted: { fontSize: 13, color: '#555' },
  badge: (type) => {
    const map = {
      green: ['rgba(22,163,74,0.08)', '#15803d', 'rgba(22,163,74,0.25)'],
      red: ['rgba(200,16,46,0.08)', '#c8102e', 'rgba(200,16,46,0.25)'],
      amber: ['rgba(161,98,7,0.08)', '#a16207', 'rgba(161,98,7,0.25)'],
      purple: ['rgba(109,40,217,0.08)', '#6d28d9', 'rgba(109,40,217,0.25)'],
      blue: ['rgba(29,78,216,0.08)', '#1d4ed8', 'rgba(29,78,216,0.25)'],
      teal: ['rgba(5,150,105,0.08)', '#065f46', 'rgba(5,150,105,0.25)'],
    };
    const [bg, color, border] = map[type] || map.blue;
    return { fontSize: 12.5, padding: '3px 8px', borderRadius: 20, background: bg, color, border: `0.5px solid ${border}`, fontWeight: 600, whiteSpace: 'nowrap' };
  },
  input: { background: '#fff', border: '1px solid #d1ccc4', borderRadius: 8, padding: '9px 14px', color: '#1a1a1a', fontSize: 13, outline: 'none', width: '100%' },
  btn: { background: '#1a1a1a', border: 'none', borderRadius: 3, padding: '8px 14px', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  btnSm: { background: 'transparent', border: '1px solid #d1ccc4', borderRadius: 3, padding: '5px 10px', color: '#555', fontSize: 12.5, cursor: 'pointer' },
  aiBox: { background: '#faf8f4', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#444', marginTop: 10, lineHeight: 1.7, border: '1px solid #e5e0d8' },
  divider: { border: 'none', borderTop: '1px solid #e5e0d8', margin: '10px 0' },
  priceUp: { color: '#16a34a', fontWeight: 600 },
  priceDown: { color: '#c8102e', fontWeight: 600 },
};

const np = {
  wrapper: { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  datebar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '3px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', paddingTop: '0.4rem', paddingBottom: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 6 },
  datebarText: { fontSize: 12.5, color: '#555', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  sectionLabel: { fontSize: 13, fontWeight: 700, color: '#c8102e', marginBottom: 8, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", borderBottom: '1px solid #e5e0d8', paddingBottom: 4 },
  featuredHeadline: { fontSize: 28, fontWeight: 700, lineHeight: 1.15, color: '#111', marginBottom: 10, letterSpacing: '-0.3px', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  featuredByline: { fontSize: 12.5, color: '#777', marginBottom: 10, letterSpacing: '0.3px', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  featuredSummary: { fontSize: 15, lineHeight: 1.75, color: '#333', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  // News category: plain small caps in grey, no colour.
  tagPill: () => ({ display: 'inline-block', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b6760', marginBottom: 8, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }),
  filterBar: { display: 'flex', gap: 8, marginBottom: '1.25rem', alignItems: 'center' },
  filterInput: { background: '#fff', border: '1px solid #d1ccc4', borderRadius: 6, padding: '7px 12px', color: '#1a1a1a', fontSize: 13, outline: 'none', flex: 1, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  npAiBox: { background: '#faf8f4', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#333', marginTop: 10, lineHeight: 1.75, border: '1px solid #e5e0d8', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", borderLeft: '3px solid #c8102e' },
};

const NEWS_FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// Competitors and products named in the story, then the other outlets that ran it.
function StoryMeta({ story }) {
  const who = [...(story.competitors || []), ...(story.products || [])];
  const also = story.alsoIn || [];
  if (!who.length && !also.length) return null;
  return (
    <div style={{ fontSize: 12.5, color: '#777', margin: '0 0 8px 0', fontFamily: NEWS_FONT, lineHeight: 1.6 }}>
      {who.length > 0 && <span style={{ color: '#444', fontWeight: 500 }}>{who.join(' · ')}</span>}
      {who.length > 0 && also.length > 0 && <span> · </span>}
      {also.length > 0 && <span>Also in: {also.map((o, i) => (
        <React.Fragment key={o.source}>{i > 0 && ', '}{o.link ? <a href={o.link} target="_blank" rel="noopener noreferrer" style={{ color: '#777' }}>{o.source}</a> : o.source}</React.Fragment>
      ))}</span>}
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
    body: JSON.stringify({ prompt }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || 'Could not generate response.';
}

// ─── STAGE BADGE HELPER ──────────────────────────────────────────────────────
function stagePill(stage) {
  if (!stage) return { bg: '#f0ede8', color: '#888', label: '—' };
  if (stage === 'Commercial') return { bg: 'rgba(22,163,74,0.09)', color: '#15803d', label: 'Commercial' };
  if (stage.startsWith('Phase 3')) return { bg: 'rgba(29,78,216,0.09)', color: '#1d4ed8', label: stage };
  if (stage.startsWith('Phase 2')) return { bg: 'rgba(161,98,7,0.09)', color: '#a16207', label: stage };
  if (stage.startsWith('Phase 1')) return { bg: 'rgba(109,40,217,0.09)', color: '#6d28d9', label: stage };
  if (stage === 'Preclinical') return { bg: '#f0ede8', color: '#888', label: 'Preclinical' };
  return { bg: '#f0ede8', color: '#666', label: stage };
}

function CompetitorRow({ entry, isLast }) {
  const sp = stagePill(entry.stage);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 140px auto 1fr 180px', gap: 12, padding: '10px 16px', borderBottom: isLast ? 'none' : '1px solid #f0ede8', alignItems: 'start', fontSize: 13 }}>
      <div>
        <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: 13 }}>{entry.company}</div>
        <div style={{ color: '#888', fontSize: 12.5, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{entry.product}</div>
      </div>
      <div>
        <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 10, background: sp.bg, color: sp.color, fontSize: 13, fontWeight: 700, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{sp.label}</span>
      </div>
      <div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {entry.markets.length > 0 ? entry.markets.map(m => (
            <span key={m} style={{ fontSize: 13, padding: '1px 6px', borderRadius: 4, background: '#f0ede8', color: '#555', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", fontWeight: 600 }}>{m}</span>
          )) : <span style={{ fontSize: 13, color: '#bbb', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>Not yet marketed</span>}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12.5, color: '#555', lineHeight: 1.5 }}>{entry.notes}</div>
        <div style={{ fontSize: 13, color: '#999', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", marginTop: 3 }}>MoA: {entry.mechanism}</div>
      </div>
      <div>
        {entry.htaStatus !== '—'
          ? <span style={{ fontSize: 13, padding: '2px 8px', borderRadius: 4, background: 'rgba(5,150,105,0.07)', color: '#065f46', border: '0.5px solid rgba(5,150,105,0.2)', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", fontWeight: 600 }}>{entry.htaStatus}</span>
          : <span style={{ fontSize: 13, color: '#ccc', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>No HTA yet</span>
        }
      </div>
    </div>
  );
}

// ─── COMPETITIVE LANDSCAPE CARD ──────────────────────────────────────────────
function CompetitiveLandscapeCard({ item, callClaude }) {
  const [expanded, setExpanded] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const commercialCount = item.entries.filter(e => e.stage === 'Commercial').length;
  const lateStageCount = item.entries.filter(e => e.stage && (e.stage.startsWith('Phase 3') || e.stage.startsWith('Phase 2'))).length;

  const handleAI = async () => {
    if (aiAnalysis) { setExpanded(true); return; }
    setLoadingAI(true);
    setExpanded(true);
    try {
      const entriesText = item.entries.map(e => `- ${e.company}: ${e.product} (${e.stage}). Markets: ${e.markets.join(', ') || 'none yet'}. HTA: ${e.htaStatus}. ${e.notes}`).join('\n');
      const text = await callClaude(
        `You are a market access strategist at a small pharma entering the ${item.indication} space. Analyze this competitive landscape in 4 bullet points (use • as bullet):
        Target: ${item.target}
        Indication: ${item.indication}
        Competitors:
        ${entriesText}
        
        Address: (1) biggest market access threats from existing commercial products, (2) HTA precedents set by already-reviewed compounds (what they signal about evidence requirements), (3) white space or unmet need remaining, (4) recommended differentiation strategy for a late entrant. Be specific and actionable.`
      );
      setAiAnalysis(text);
    } catch { setAiAnalysis('Could not generate analysis.'); }
    setLoadingAI(false);
  };

  const AREA_COLORS = { 'Oncology': '#c8102e', 'Rare Disease': '#7c3aed', 'Neurology': '#1d4ed8', 'Immunology': '#0369a1' };
  const areaColor = AREA_COLORS[item.area] || '#555';

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderLeft: `4px solid ${areaColor}`, cursor: 'pointer' }} onClick={() => setExpanded(x => !x)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: areaColor, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", background: `rgba(${areaColor === '#c8102e' ? '200,16,46' : areaColor === '#7c3aed' ? '124,58,237' : areaColor === '#1d4ed8' ? '29,78,216' : '3,105,161'},0.07)`, padding: '2px 8px', borderRadius: 4 }}>{item.area}</span>
              <span style={{ fontSize: 12.5, color: '#999', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>· {item.target}</span>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 6px 0', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{item.indication}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: '#888', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{item.entries.length} competitors tracked</span>
              {commercialCount > 0 && <span style={{ fontSize: 12.5, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", color: '#15803d', fontWeight: 600 }}>· {commercialCount} commercial</span>}
              {lateStageCount > 0 && <span style={{ fontSize: 12.5, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", color: '#a16207', fontWeight: 600 }}>· {lateStageCount} late-stage pipeline</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button style={{ ...s.btn, fontSize: 13, padding: '5px 12px', background: areaColor }} onClick={e => { e.stopPropagation(); handleAI(); }}>
              {loadingAI ? <><Spinner />Analyzing…</> : aiAnalysis ? 'MA Strategy ✓' : 'MA Strategy →'}
            </button>
            <span style={{ fontSize: 18, color: '#bbb', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
          </div>
        </div>
      </div>

      {/* Table */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f0ede8' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '160px 140px auto 1fr 180px', gap: 12, padding: '8px 16px', background: '#f8f6f2', borderBottom: '1px solid #e5e0d8', fontSize: 11.5, color: '#aaa', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", }}>
            <span>Company / Product</span><span>Stage</span><span>Markets</span><span>Notes</span><span>HTA Status</span>
          </div>
          {item.entries.map((entry, i) => <CompetitorRow key={i} entry={entry} isLast={i === item.entries.length - 1} />)}

          {/* AI Analysis */}
          {(loadingAI || aiAnalysis) && (
            <div style={{ padding: '16px 18px', borderTop: '1px solid #f0ede8', background: '#fdfcfa' }}>
              {loadingAI && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 13 }}><Spinner />Generating market access strategy analysis…</div>}
              {aiAnalysis && (
                <div style={{ ...np.npAiBox, marginTop: 0, borderLeft: `3px solid ${areaColor}`, whiteSpace: 'pre-line' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: areaColor, marginBottom: 8, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>AI · Competitive MA Strategy</div>
                  {aiAnalysis}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── COMPETITIVE LANDSCAPE TAB ───────────────────────────────────────────────
function CompetitiveLandscapeTab({ callClaude }) {
  const [areaFilter, setAreaFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  const areas = [...new Set(COMPETITIVE_LANDSCAPE_DATA.map(d => d.area))];

  const filtered = COMPETITIVE_LANDSCAPE_DATA.filter(item => {
    if (areaFilter && item.area !== areaFilter) return false;
    if (searchText) {
      const hay = (item.indication + ' ' + item.target + ' ' + item.area + ' ' + item.entries.map(e => e.company + ' ' + e.product + ' ' + e.mechanism).join(' ')).toLowerCase();
      if (!hay.includes(searchText.toLowerCase())) return false;
    }
    return true;
  });

  const totalCompetitors = COMPETITIVE_LANDSCAPE_DATA.reduce((acc, d) => acc + d.entries.length, 0);
  const commercialTotal = COMPETITIVE_LANDSCAPE_DATA.reduce((acc, d) => acc + d.entries.filter(e => e.stage === 'Commercial').length, 0);

  return (
    <div>
      <div style={{ borderTop: '3px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: '0.5rem 0', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#555', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>Competitive Landscape · Market Access View</span>
        <span style={{ fontSize: 13, color: '#1d4ed8', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", fontWeight: 700 }}>Pipeline · HTA · Pricing signals</span>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: '1.25rem' }} className="metric-grid">
        {[
          { label: 'Therapy areas', val: COMPETITIVE_LANDSCAPE_DATA.length, color: '#1a1a1a' },
          { label: 'Competitors tracked', val: totalCompetitors, color: '#1d4ed8' },
          { label: 'Commercial products', val: commercialTotal, color: '#15803d' },
          { label: 'Pipeline entries', val: totalCompetitors - commercialTotal, color: '#a16207' },
        ].map(m => (
          <div key={m.label} style={s.metric}>
            <div style={s.metricLabel}>{m.label}</div>
            <div style={{ ...s.metricVal, color: m.color, fontSize: 26 }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 8, padding: '14px 16px', marginBottom: '1.25rem' }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#aaa', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", marginBottom: 6 }}>Therapy area</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['', ...areas].map(a => (
              <button key={a} onClick={() => setAreaFilter(a)} style={{ padding: '4px 12px', borderRadius: 4, border: areaFilter === a ? '1.5px solid #1a1a1a' : '1px solid #d1ccc4', background: areaFilter === a ? '#1a1a1a' : 'transparent', color: areaFilter === a ? '#fff' : '#555', fontSize: 12.5, fontWeight: areaFilter === a ? 700 : 400, cursor: 'pointer', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
                {a || 'All areas'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={np.filterInput} value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search by indication, company, product, MoA…" />
          {searchText && <button style={s.btnSm} onClick={() => setSearchText('')}>Clear</button>}
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: '#c8102e', marginBottom: 12, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", borderBottom: '1px solid #e5e0d8', paddingBottom: 4 }}>
        Landscape snapshots · {filtered.length} areas
      </div>
      {filtered.map(item => <CompetitiveLandscapeCard key={item.id} item={item} callClaude={callClaude} />)}

      <div style={{ marginTop: '2rem', padding: '12px 16px', background: '#faf8f4', borderRadius: 6, border: '1px solid #e5e0d8', fontSize: 12.5, color: '#999', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", lineHeight: 1.6 }}>
        Data sourced from <strong style={{ color: '#555' }}>ClinicalTrials.gov, EMA, company press releases, HTA body databases</strong>. Production version would pull live pipeline data and HTA decisions automatically.
      </div>
    </div>
  );
}

// ─── Publication Card ────────────────────────────────────────────────────────
function PubCard({ pub, companyName, showCompany }) {
  const [expanded, setExpanded] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const badge = getSourceBadge(pub);
  const congress = detectCongress(pub);
  const isConference = congress !== null || (pub.pubType || '').toLowerCase().includes('conference') || (pub.pubType || '').toLowerCase().includes('abstract');
  const pubLink = pub.doi ? `https://doi.org/${pub.doi}` : pub.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/` : null;

  const handleAI = async () => {
    if (aiSummary) return;
    setLoadingAI(true);
    try {
      const text = await callClaude(`You are a clinical data expert and biotech analyst. In 3 concise sentences, summarize the key findings and clinical significance of this publication for a pharma professional: "${pub.title}". Journal: ${pub.journalTitle || 'N/A'}. Be specific, avoid hedging, focus on what matters clinically or commercially.`);
      setAiSummary(text);
    } catch { setAiSummary('Could not generate summary.'); }
    setLoadingAI(false);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 8, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{badge.label}</span>
        {isConference && <span style={{ fontSize: 13, padding: '2px 7px', borderRadius: 3, background: 'rgba(190,18,60,0.07)', color: '#be123c', border: '1px solid rgba(190,18,60,0.2)', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", fontWeight: 600 }}>CONGRESS</span>}
        {showCompany && companyName && <span style={{ fontSize: 13, padding: '2px 7px', borderRadius: 3, background: 'rgba(200,16,46,0.07)', color: '#c8102e', border: '0.5px solid rgba(200,16,46,0.2)', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", fontWeight: 600 }}>{companyName}</span>}
        {pub.isOpenAccess && <span style={{ fontSize: 13, padding: '2px 7px', borderRadius: 3, background: 'rgba(21,128,61,0.07)', color: '#15803d', border: '0.5px solid rgba(21,128,61,0.2)', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", fontWeight: 600 }}>OA</span>}
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#999', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{pub.pubDate || pub.pubYear || ''}</span>
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#111', lineHeight: 1.4, margin: '0 0 6px 0', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", cursor: pubLink ? 'pointer' : 'default' }} onClick={() => pubLink && window.open(pubLink, '_blank')}>
        {pub.title}{pubLink && <span style={{ color: '#c8102e', fontSize: 12.5, marginLeft: 6, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>↗</span>}
      </p>
      <div style={{ fontSize: 12.5, color: '#888', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", marginBottom: 8 }}>
        {pub.authors && <span>{pub.authors.split(',').slice(0,3).join(', ')}{pub.authors.split(',').length > 3 ? ' et al.' : ''}</span>}
        {pub.journalTitle && <span style={{ marginLeft: 8, color: '#bbb' }}>· {pub.journalTitle}</span>}
        {pub.citedByCount > 0 && <span style={{ marginLeft: 8, color: '#aaa' }}>· {pub.citedByCount} citations</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={{ ...s.btn, fontSize: 13, padding: '4px 10px' }} onClick={handleAI}>
          {loadingAI ? <><Spinner />Analyzing…</> : aiSummary ? 'Analysis' : 'AI analysis →'}
        </button>
        {pub.abstract && <button style={{ ...s.btnSm, fontSize: 12.5 }} onClick={() => setExpanded(x => !x)}>{expanded ? 'Hide abstract' : 'Abstract ↓'}</button>}
        {pubLink && <a href={pubLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: '#c8102e', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", textDecoration: 'none', fontWeight: 600 }}>Full text ↗</a>}
      </div>
      {expanded && pub.abstract && <div style={{ marginTop: 10, fontSize: 13, color: '#444', lineHeight: 1.7, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", background: '#faf8f4', borderRadius: 6, padding: '10px 14px', border: '1px solid #e5e0d8' }}>{pub.abstract}</div>}
      {aiSummary && <div style={{ ...np.npAiBox, marginTop: 10, fontSize: 13 }}>{aiSummary}</div>}
    </div>
  );
}

function PublicationsTab({ watchlist }) {
  const [topicFilter, setTopicFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [pubTypeFilter, setPubTypeFilter] = useState('all');
  const [watchlistPubs, setWatchlistPubs] = useState([]);
  const [otherPubs, setOtherPubs] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [loadingOther, setLoadingOther] = useState(false);
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const [activeSection, setActiveSection] = useState('watchlist');

  const fetchPublications = useCallback(async () => {
    if (fetchedOnce) return;
    setFetchedOnce(true);
    setLoadingWatchlist(true);
    setLoadingOther(true);
    const wResults = [];
    for (const stock of watchlist) {
      const shortName = stock.name.replace(/\s+(Inc\.?|Therapeutics|Pharmaceuticals?|Pharma|Medicine|Sciences?|Biosciences?|Biotech|Bio)$/i, '').trim();
      const pubs = await fetchEuropePMC(shortName, 8);
      pubs.forEach(p => wResults.push({ ...p, _company: stock.name }));
    }
    wResults.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
    setWatchlistPubs(wResults);
    setLoadingWatchlist(false);
    const oResults = [];
    for (const co of OTHER_COMPANIES) {
      const pubs = await fetchEuropePMC(co.query, 5);
      pubs.forEach(p => oResults.push({ ...p, _company: co.name }));
    }
    oResults.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
    setOtherPubs(oResults);
    setLoadingOther(false);
  }, [watchlist, fetchedOnce]);

  React.useEffect(() => { fetchPublications(); }, [fetchPublications]);

  const applyFilters = (pubs) => pubs.filter(pub => {
    if (!matchesTopic(pub, topicFilter)) return false;
    if (pubTypeFilter === 'congress') { const isCong = detectCongress(pub) !== null || (pub.pubType || '').toLowerCase().includes('conference') || (pub.pubType || '').toLowerCase().includes('abstract'); if (!isCong) return false; }
    if (pubTypeFilter === 'journal') { if (detectCongress(pub) !== null) return false; }
    if (searchText) { const hay = ((pub.title || '') + ' ' + (pub.authors || '') + ' ' + (pub.journalTitle || '') + ' ' + (pub._company || '')).toLowerCase(); if (!hay.includes(searchText.toLowerCase())) return false; }
    return true;
  });

  const filteredWatchlist = applyFilters(watchlistPubs);
  const filteredOther = applyFilters(otherPubs);
  const activePubs = activeSection === 'watchlist' ? filteredWatchlist : filteredOther;
  const activeLoading = activeSection === 'watchlist' ? loadingWatchlist : loadingOther;
  const congressCount = (activeSection === 'watchlist' ? watchlistPubs : otherPubs).filter(p => detectCongress(p) !== null).length;

  return (
    <div>
      <div style={{ borderTop: '3px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: '0.5rem 0', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#555', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>Scientific Publications & Congress Abstracts</span>
        <span style={{ fontSize: 13, color: '#c8102e', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", fontWeight: 700 }}>via Europe PMC · PubMed · Preprints</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: '1.25rem' }} className="metric-grid">
        {[
          { label: 'Watchlist pubs', val: loadingWatchlist ? '…' : watchlistPubs.length, color: '#1a1a1a' },
          { label: 'Other sector', val: loadingOther ? '…' : otherPubs.length, color: '#1a1a1a' },
          { label: 'Congress abstracts', val: activeLoading ? '…' : congressCount, color: '#c8102e' },
          { label: 'Showing', val: activeLoading ? '…' : activePubs.length, color: '#1d4ed8' },
        ].map(m => (
          <div key={m.label} style={s.metric}>
            <div style={s.metricLabel}>{m.label}</div>
            <div style={{ ...s.metricVal, color: m.color, fontSize: 26 }}>{m.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', background: '#f5f2ed', borderRadius: 8, padding: 4 }}>
        {[{ key: 'watchlist', label: 'My Watchlist', count: filteredWatchlist.length }, { key: 'other', label: 'Sector (Other)', count: filteredOther.length }].map(sec => (
          <button key={sec.key} onClick={() => setActiveSection(sec.key)} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: activeSection === sec.key ? '#fff' : 'transparent', color: activeSection === sec.key ? '#1a1a1a' : '#888', fontWeight: activeSection === sec.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", boxShadow: activeSection === sec.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
            {sec.label}<span style={{ marginLeft: 6, fontSize: 13, color: activeSection === sec.key ? '#c8102e' : '#bbb' }}>({sec.count})</span>
          </button>
        ))}
      </div>
      <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 8, padding: '14px 16px', marginBottom: '1.25rem' }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#aaa', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", marginBottom: 6 }}>Topic area</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TOPIC_FILTERS.map(t => (
              <button key={t.key} onClick={() => setTopicFilter(t.key)} style={{ padding: '5px 12px', borderRadius: 4, border: topicFilter === t.key ? '1.5px solid #1a1a1a' : '1px solid #d1ccc4', background: topicFilter === t.key ? '#1a1a1a' : 'transparent', color: topicFilter === t.key ? '#fff' : '#555', fontSize: 12.5, fontWeight: topicFilter === t.key ? 600 : 400, cursor: 'pointer', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", transition: 'all 0.15s' }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#aaa', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", marginBottom: 6 }}>Publication type</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ key: 'all', label: 'All' }, { key: 'congress', label: 'Congresses only' }, { key: 'journal', label: 'Journals only' }].map(t => (
              <button key={t.key} onClick={() => setPubTypeFilter(t.key)} style={{ padding: '5px 12px', borderRadius: 4, border: pubTypeFilter === t.key ? '1.5px solid #c8102e' : '1px solid #d1ccc4', background: pubTypeFilter === t.key ? 'rgba(200,16,46,0.07)' : 'transparent', color: pubTypeFilter === t.key ? '#c8102e' : '#555', fontSize: 12.5, fontWeight: pubTypeFilter === t.key ? 700 : 400, cursor: 'pointer', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", transition: 'all 0.15s' }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...np.filterInput, fontSize: 13 }} value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search by title, author, company…" />
          {searchText && <button style={s.btnSm} onClick={() => setSearchText('')}>Clear</button>}
        </div>
      </div>
      {activeLoading && <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}><Spinner /><span style={{ fontSize: 13, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>Fetching publications from Europe PMC…</span></div>}
      {!activeLoading && activePubs.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: '#888', fontSize: 13, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>No publications found for current filters.</div>}
      {!activeLoading && activePubs.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#c8102e', marginBottom: 12, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", borderBottom: '1px solid #e5e0d8', paddingBottom: 4 }}>
            {activeSection === 'watchlist' ? 'Publications from your watchlist companies' : 'Publications from sector leaders'} · {activePubs.length} results
          </div>
          {activePubs.map((pub, i) => <PubCard key={pub.id || i} pub={pub} companyName={pub._company} showCompany={true} />)}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [watchlist] = useState(getInitialWatchlist);

  const [tab, setTab] = useState('news');
  const [newsFilter, setNewsFilter] = useState('');
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState({});
  const [realNews, setRealNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [pressReleases, setPressReleases] = useState([]);
  const [loadingPress, setLoadingPress] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [companySel, setCompanySel] = useState(null);
  const [productSel, setProductSel] = useState(null);
  // Weekly brief: written once a day on the server (/api/brief) and shared by every visitor.
  const [brief, setBrief] = useState('');
  const [briefState, setBriefState] = useState('loading');

  React.useEffect(() => {
    const fetchNews = async () => {
      setLoadingNews(true);
      try { const res = await fetch('/api/rss'); const data = await res.json(); if (Array.isArray(data) && data.length > 0) setRealNews(data); } catch {}
      setLoadingNews(false);
    };
    fetchNews();
  }, []);

  React.useEffect(() => {
    fetch('/api/brief').then(r => r.json())
      .then(d => { setBrief(d.brief || ''); setBriefState(d.brief ? 'ok' : d.error ? 'error' : 'none'); })
      .catch(() => setBriefState('error'));
  }, []);

  React.useEffect(() => {
    const fetchPress = async () => {
      try { const res = await fetch('/api/press'); const data = await res.json(); if (Array.isArray(data) && data.length > 0) setPressReleases(data); } catch {}
      setLoadingPress(false);
    };
    fetchPress();
  }, []);

  const getSummary = useCallback(async (key, prompt) => {
    if (summaries[key]) return;
    setLoading(prev => ({ ...prev, [key]: true }));
    try { const text = await callClaude(prompt); setSummaries(prev => ({ ...prev, [key]: text })); }
    catch { setSummaries(prev => ({ ...prev, [key]: 'Error generating summary.' })); }
    setLoading(prev => ({ ...prev, [key]: false }));
  }, [summaries]);

  const newsSource = realNews;
  const companyOptions = ['Gilead', 'ViiV/GSK', 'MSD', 'J&J'];
  const productOptions = [...new Set(newsSource.flatMap(n => n.products || []))].sort();
  const CATEGORY_KEYWORDS = {
    'Treatment': ['treatment', 'antiretroviral', 'regimen', 'switch', 'suppress', 'biktarvy', 'dovato', 'cabenuva', 'sunlenca', 'bixlenvo', 'idvynso'],
    'Prevention / PrEP': ['prep', 'prevention', 'prophylaxis', 'yeztugo', 'yeytuo', 'apretude', 'descovy', 'truvada', 'mk-8527'],
    'Regulatory': ['fda', 'ema', 'chmp', 'swissmedic', 'regulatory', 'approv', 'pdufa', 'nda', 'filing'],
    'Access & Policy': ['access', 'price', 'pricing', 'reimburs', 'nice', 'g-ba', 'pepfar', 'unaids', 'global fund', 'generic', 'guideline'],
    'Clinical Trials': ['trial', 'phase', 'clinical', 'readout', 'efficacy', 'endpoint', 'data'],
    'Conferences': ['croi', 'ias ', 'aids 20', 'idweek', 'eacs', 'glasgow', 'conference', 'congress'],
    'Deals': ['deal', 'partner', 'acqui', 'merger', 'licens', 'collaboration'],
  };

  const filteredNews = newsSource.filter(n => {
    if (isPaywalled(n)) return false;
    if (categoryFilter) {
      const kws = CATEGORY_KEYWORDS[categoryFilter] || [];
      const hay = (n.headline + ' ' + (n.tag || '') + ' ' + (n.summary || '')).toLowerCase();
      if (!kws.some(kw => hay.includes(kw)) && !(n.tag && n.tag.toLowerCase().includes(categoryFilter.toLowerCase()))) return false;
    }
    if (companySel?.length && !(n.competitors || []).some(c => companySel.includes(c))) return false;
    if (productSel?.length && !(n.products || []).some(p => productSel.includes(p))) return false;
    if (newsFilter) { if (!(n.headline + ' ' + (n.ticker || '') + ' ' + (n.tag || '') + ' ' + (n.companies || []).map(c => c.companyName).join(' ')).toLowerCase().includes(newsFilter.toLowerCase())) return false; }
    return true;
  });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const featured = filteredNews[0];
  const secondary = filteredNews.slice(1);

  const TABS = [
    { key: 'news', label: 'News' },
    { key: 'publications', label: 'Publications' },
    { key: 'landscape', label: 'HIV Competitive Intelligence', short: 'HIV CI' },
    { key: 'launch', label: 'HIV Launch Map', short: 'Launch map' },
  ];

  return (
    <div style={s.app} className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; }
        body { background: #fbfaf7; margin: 0; }
        input:focus { border-color: #c8102e !important; }
        button:hover { opacity: 0.85; }

        @media (max-width: 680px) {
          .app-root { padding: 1rem !important; }
          .app-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .app-tabs { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; scrollbar-width: none !important; width: 100% !important; }
          .app-tabs::-webkit-scrollbar { display: none; }
          .app-tabs button { padding: 10px 12px !important; font-size: 13px !important; white-space: nowrap !important; flex-shrink: 0 !important; }
          .news-layout { grid-template-columns: 1fr !important; }
          .news-sidebar { position: static !important; max-height: none !important; overflow: visible !important; margin-top: 2rem; }
          .featured-grid { grid-template-columns: 1fr !important; display: flex !important; flex-direction: column !important; }
          .featured-headline { font-size: 22px !important; }
          .story-row { flex-direction: column !important; gap: 10px !important; }
          .cat-filter-bar { flex-wrap: wrap !important; overflow-x: visible !important; padding-bottom: 0 !important; }
          .cat-filter-bar button { padding: 5px 11px !important; font-size: 12.5px !important; }
          .app-header-right { display: flex; align-items: center; gap: 10px; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ borderBottom: '1px solid #e6e2db' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.1rem' }} className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, background: '#0f1923', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="28" height="20" viewBox="0 0 44 28" fill="none">
                <polyline points="2,20 9,20 13,5 20,23 25,13 29,17 34,8 40,8" stroke="#c8102e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="20" cy="23" r="2.2" fill="#c8102e"/>
                <circle cx="13" cy="5" r="2.2" fill="#c8102e"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.3px', color: '#1a1a1a', lineHeight: 1.1 }}>Catalyst</div>
              <div style={{ fontSize: 12.5, color: '#6b6760', marginTop: 2 }}>Biotech and pharma intelligence</div>
            </div>
          </div>
          <span className="app-header-right" style={{ fontSize: 12.5, color: '#6b6760' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4 }} className="app-tabs" role="tablist">
          {TABS.map(t => (
            <button key={t.key} role="tab" aria-label={t.label} aria-selected={tab === t.key} style={{ padding: '10px 14px', fontSize: 13.5, cursor: 'pointer', border: 'none', background: 'none', color: tab === t.key ? '#1a1a1a' : '#6b6760', borderBottom: tab === t.key ? '2px solid #c8102e' : '2px solid transparent', marginBottom: -1, fontWeight: tab === t.key ? 600 : 400, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", whiteSpace: 'nowrap' }} onClick={() => setTab(t.key)}>
              {t.short ? <><span className="tab-long">{t.label}</span><span className="tab-short">{t.short}</span></> : t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '1.75rem' }} />

      {/* ══ NEWS ══ */}
      {tab === 'news' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '2rem', alignItems: 'flex-start' }} className="news-layout">
          <div style={np.wrapper}>
            <div style={np.datebar}>
              <span style={np.datebarText}>{today}</span>
              <span style={{ ...np.datebarText, color: '#c8102e' }}>{filteredNews.length} {filteredNews.length === 1 ? 'story' : 'stories'} · HIV · Live</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: 4 }} className="cat-filter-bar">
              {['All', ...Object.keys(CATEGORY_KEYWORDS)].map(cat => (
                <button key={cat} onClick={() => setCategoryFilter(cat === 'All' ? '' : cat)} style={{ padding: '5px 14px', borderRadius: 4, border: (categoryFilter === cat || (cat === 'All' && !categoryFilter)) ? '1.5px solid #1a1a1a' : '1px solid #d1ccc4', background: (categoryFilter === cat || (cat === 'All' && !categoryFilter)) ? '#1a1a1a' : 'transparent', color: (categoryFilter === cat || (cat === 'All' && !categoryFilter)) ? '#fff' : '#555', fontSize: 13, fontWeight: (categoryFilter === cat || (cat === 'All' && !categoryFilter)) ? 600 : 400, cursor: 'pointer', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}>{cat}</button>
              ))}
            </div>
            <div style={np.filterBar}>
              <input style={np.filterInput} value={newsFilter} onChange={e => setNewsFilter(e.target.value)} placeholder="Search by keyword or company…" />
              {newsFilter && <button style={{ ...s.btnSm, fontSize: 12.5 }} onClick={() => setNewsFilter('')}>Clear</button>}
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <MultiSelect label="Competitor" allLabel="All competitors" selected={companySel} onChange={setCompanySel} options={companyOptions} />
              {productOptions.length > 0 && <MultiSelect label="Product" allLabel="All products" selected={productSel} onChange={setProductSel} options={productOptions} />}
            </div>
            {(briefState === 'loading' || briefState === 'ok') && (
              <div style={{ border: '1px solid #e5e0d8', borderRadius: 6, padding: '12px 16px', marginBottom: '1.5rem', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#c8102e', fontFamily: NEWS_FONT }}>What matters this week</div>
                </div>
                {brief
                  ? <div style={{ fontSize: 14, lineHeight: 1.7, color: '#333', marginTop: 8, whiteSpace: 'pre-line', fontFamily: NEWS_FONT }}>{brief}</div>
                  : <div style={{ fontSize: 13, color: '#888', marginTop: 6, fontFamily: NEWS_FONT }}>{briefState === 'loading' ? <><Spinner />Summarising the last 7 days…</> : 'The summary could not be written right now.'}</div>}
                {brief && <div style={{ fontSize: 12, color: '#999', marginTop: 8, fontFamily: NEWS_FONT }}>AI-generated from this week's headlines. Check the sources before sharing.</div>}
              </div>
            )}
            {loadingNews && <div style={{ textAlign: 'center', color: '#888', padding: '3rem', fontSize: 13 }}><Spinner />Loading HIV news…</div>}
            {!loadingNews && filteredNews.length === 0 && <div style={{ textAlign: 'center', color: '#555', padding: '3rem', fontSize: 14 }}>{realNews.length === 0 ? 'No HIV news could be loaded right now.' : 'No stories match your filter.'}</div>}
            {!loadingNews && featured && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={np.sectionLabel}>Top Story</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', borderBottom: '1px solid #d1ccc4', paddingBottom: '1.5rem', marginBottom: '1.5rem' }} className="featured-grid">
                  <div>
                    <div style={np.tagPill(featured.tag)}>{featured.tag}</div>
                    <h2 style={np.featuredHeadline} className="featured-headline">{featured.headline}</h2>
                    <div style={np.featuredByline}>{featured.source} · {featured.date}{featured.link && <a href={featured.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 10, color: '#c8102e', fontSize: 12.5, textDecoration: 'none', fontWeight: 600 }}>Read full article ↗</a>}</div>
                    <StoryMeta story={featured} />
                    {featured.summary && <p style={np.featuredSummary}>{featured.summary}</p>}
                    <div style={{ marginTop: 14 }}>
                      <button style={s.btn} onClick={() => getSummary('news-0', `You are a competitive intelligence analyst covering HIV treatment and prevention. Explain this news in 3-4 sentences, including what it means for the HIV market: "${featured.headline}". Context: ${featured.summary || 'none'}. Be direct.`)}>
                        {loading['news-0'] ? <><Spinner />Analyzing…</> : 'AI analysis →'}
                      </button>
                    </div>
                    {summaries['news-0'] && <div style={np.npAiBox}>{summaries['news-0']}</div>}
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
                      <div key={idx} style={{ display: 'flex', gap: '1.25rem', padding: '1.1rem 0', borderBottom: '1px solid #e5e0d8', alignItems: 'flex-start' }} className="story-row"
                        onMouseOver={e => e.currentTarget.style.background = '#faf8f5'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                            <span style={np.tagPill(n.tag)}>{n.tag}</span>
                            <span style={{ fontSize: 12.5, color: '#999', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{n.source} · {n.date}</span>
                            {n.link && <a href={n.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: '#c8102e', textDecoration: 'none', fontWeight: 600 }}>↗</a>}
                          </div>
                          <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, color: '#111', margin: '0 0 6px 0', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{n.headline}</p>
                          <StoryMeta story={n} />
                          {n.summary && <p style={{ fontSize: 13, lineHeight: 1.7, color: '#555', margin: '0 0 10px 0', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{n.summary}</p>}
                          <button style={{ ...s.btn, fontSize: 13, padding: '4px 10px' }} onClick={() => getSummary(`news-${idx}`, `You are a competitive intelligence analyst covering HIV treatment and prevention. Explain this news in 3-4 sentences, including what it means for the HIV market: "${n.headline}". Context: ${n.summary || 'none'}.`)}>
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
          <div style={{ position: 'sticky', top: '1rem', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', paddingRight: 4 }} className="news-sidebar">
            <div style={{ borderTop: '3px solid #1a1a1a', paddingTop: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#c8102e', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>HIV Company Announcements</div>
            </div>
            {pressReleases.length === 0 && <div style={{ fontSize: 13, color: '#aaa', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{loadingPress ? 'Loading…' : 'No recent HIV announcements.'}</div>}
            {pressReleases.map((pr, i) => (
              <div key={i} style={{ paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid #e5e0d8' }}>
                <a href={pr.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4, margin: '0 0 5px 0', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{pr.headline}</p>
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#888', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{pr.company || pr.source}</span>
                  {pr.date && <span style={{ fontSize: 13, color: '#bbb', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>· {pr.date}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ PUBLICATIONS ══ */}
      {tab === 'publications' && <PublicationsTab watchlist={watchlist} />}

      {/* ══ COMPETITIVE LANDSCAPE ══ */}
      {tab === 'landscape' && <CompetitiveLandscape />}

      {/* ══ HIV LAUNCH MAP ══ */}
      {tab === 'launch' && <HivLaunchMap />}
    </div>
  );
}
