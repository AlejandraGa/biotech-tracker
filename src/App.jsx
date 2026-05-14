import React, { useState, useCallback } from 'react';
import CatalystCalendar from './CatalystCalendar';

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

function saveWatchlist(list) {
  try {
    const toSave = list.map(({ ticker, name, stage, note }) => ({ ticker, name, stage, note }));
    localStorage.setItem(LS_KEY, JSON.stringify(toSave));
  } catch {}
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

const NEWS_DATA = [
  { ticker: 'MRNA', headline: 'Moderna reports positive Phase 3 data for mRNA-1345 RSV vaccine in older adults', source: 'BioPharma Dive', date: 'May 10, 2025', tag: 'Trial Results', summary: "Moderna's RSV vaccine candidate demonstrated 83.7% efficacy against RSV lower respiratory tract disease in adults 60+." },
  { ticker: 'EDIT', headline: 'Editas Medicine announces EDIT-301 patient data showing durable HbF induction', source: 'Fierce Biotech', date: 'May 8, 2025', tag: 'Clinical Data', summary: 'EDIT-301 uses AsCas12a to edit the BCL11A enhancer. Early patient data shows sustained elevation above therapeutic threshold.' },
  { ticker: 'RXRX', headline: 'Recursion and Roche expand AI partnership to neurological disease targets', source: 'Reuters', date: 'May 7, 2025', tag: 'Partnership', summary: "Recursion's platform partnership with Roche is being extended to include CNS targets." },
  { ticker: 'BEAM', headline: 'Beam Therapeutics presents BEAM-302 alpha-1 antitrypsin deficiency data at ATS 2025', source: 'STAT News', date: 'May 6, 2025', tag: 'Conference', summary: 'BEAM-302 uses base editing to correct the Z-allele mutation.' },
  { ticker: 'KYMR', headline: "Kymera's KY1005 shows strong EASI-75 response in atopic dermatitis Phase 2", source: 'Evaluate Pharma', date: 'May 5, 2025', tag: 'Trial Results', summary: '68% EASI-75 response at week 16 vs 18% placebo.' },
  { ticker: 'MRNA', headline: "FDA accepts PDUFA date for Moderna's flu-COVID combination vaccine", source: 'FDA News', date: 'May 3, 2025', tag: 'Regulatory', summary: 'PDUFA date of December 2025 set for mRNA-1083.' },
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

function tagColor(tag) {
  if (!tag) return { bg: 'rgba(109,40,217,0.07)', color: '#5b21b6', border: 'rgba(109,40,217,0.2)' };
  const t = tag.toLowerCase();
  if (t.includes('trial') || t.includes('clinical')) return { bg: 'rgba(22,163,74,0.08)', color: '#15803d', border: 'rgba(22,163,74,0.25)' };
  if (t.includes('regulat') || t.includes('fda') || t.includes('ema') || t.includes('hta')) return { bg: 'rgba(29,78,216,0.07)', color: '#1d4ed8', border: 'rgba(29,78,216,0.2)' };
  if (t.includes('partner') || t.includes('deal')) return { bg: 'rgba(161,98,7,0.07)', color: '#a16207', border: 'rgba(161,98,7,0.2)' };
  if (t.includes('conference')) return { bg: 'rgba(190,18,60,0.07)', color: '#be123c', border: 'rgba(190,18,60,0.2)' };
  if (t.includes('reimburse') || t.includes('pricing') || t.includes('nice') || t.includes('g-ba')) return { bg: 'rgba(5,150,105,0.07)', color: '#065f46', border: 'rgba(5,150,105,0.2)' };
  return { bg: 'rgba(109,40,217,0.07)', color: '#5b21b6', border: 'rgba(109,40,217,0.2)' };
}

function stageBadge(stage) {
  if (stage === 'Commercial') return 'green';
  if (stage && stage.includes('Phase')) return 'amber';
  if (stage === 'Platform') return 'blue';
  return 'purple';
}

// ─── STATIC HTA DATA (seed data; in production would come from NICE/G-BA RSS) ─
const HTA_DATA = [
  {
    id: 'hta-1',
    body: 'NICE',
    country: 'UK',
    date: 'May 9, 2025',
    product: 'Lecanemab (Leqembi)',
    company: 'Eisai / Biogen',
    indication: 'Early Alzheimer\'s disease',
    decision: 'Not recommended',
    outcome: 'negative',
    rationale: 'ICER above £30,000/QALY threshold. Committee concluded clinical benefit insufficient to justify cost at list price.',
    mechanism: 'Anti-amyloid monoclonal antibody',
    stage: 'Commercial',
    source: 'https://www.nice.org.uk',
    maSignal: 'Price negotiation likely needed. Uncertainty around long-term outcomes cited as key barrier.',
  },
  {
    id: 'hta-2',
    body: 'G-BA',
    country: 'DE',
    date: 'May 6, 2025',
    product: 'Inavolisib (Itovebi)',
    company: 'Roche / Genentech',
    indication: 'PIK3CA-mutated HR+/HER2- breast cancer',
    decision: 'Considerable added benefit',
    outcome: 'positive',
    rationale: 'Statistically significant OS benefit vs. standard of care in biomarker-selected population. G-BA granted "beträchtlicher Zusatznutzen".',
    mechanism: 'PI3Kα inhibitor',
    stage: 'Commercial',
    source: 'https://www.g-ba.de',
    maSignal: 'Strong HTA result supports premium pricing in Germany. Expect price negotiations to begin Q3 2025.',
  },
  {
    id: 'hta-3',
    body: 'HAS',
    country: 'FR',
    date: 'Apr 28, 2025',
    product: 'Fidanacogene elaparvovec (Beqvez)',
    company: 'Pfizer',
    indication: 'Haemophilia B (adults)',
    decision: 'ASMR III — Moderate improvement',
    outcome: 'positive',
    rationale: 'One-time gene therapy with durable factor IX expression. HAS acknowledged burden reduction vs. prophylaxis, with residual uncertainty on long-term durability.',
    mechanism: 'AAV-based gene therapy',
    stage: 'Commercial',
    source: 'https://www.has-sante.fr',
    maSignal: 'Moderate SMR/ASMR limits initial reimbursement scope. Managed entry agreement with outcomes-based component likely.',
  },
  {
    id: 'hta-4',
    body: 'NICE',
    country: 'UK',
    date: 'Apr 22, 2025',
    product: 'Selpercatinib (Retsevmo)',
    company: 'Eli Lilly',
    indication: 'RET-mutant thyroid & lung cancers',
    decision: 'Recommended (CDF)',
    outcome: 'conditional',
    rationale: 'Approved via Cancer Drugs Fund pending longer-term OS data. ICER acceptable with commercial discount in place.',
    mechanism: 'RET kinase inhibitor',
    stage: 'Commercial',
    source: 'https://www.nice.org.uk',
    maSignal: 'CDF listing is common for oncology. Companies should prepare for mandatory real-world evidence data collection.',
  },
  {
    id: 'hta-5',
    body: 'EUnetHTA',
    country: 'EU',
    date: 'Apr 15, 2025',
    product: 'Nivolumab + relatlimab (Opdualag)',
    company: 'Bristol-Myers Squibb',
    indication: 'Unresectable / metastatic melanoma',
    decision: 'Joint Clinical Assessment — Class IIb',
    outcome: 'conditional',
    rationale: 'First EU-level joint HTA under HTAR. Moderate certainty evidence for PFS benefit; OS data immature at time of assessment.',
    mechanism: 'PD-1 + LAG-3 dual checkpoint blockade',
    stage: 'Commercial',
    source: 'https://www.eunethta.eu',
    maSignal: 'First HTAR Joint Clinical Assessment result. Sets precedent for EU-wide submissions. National price negotiations remain separate.',
  },
  {
    id: 'hta-6',
    body: 'SMC',
    country: 'SCO',
    date: 'Apr 10, 2025',
    product: 'Lutetium-177 PSMA (Pluvicto)',
    company: 'Novartis',
    indication: 'mCRPC, post-ARPI + taxane',
    decision: 'Accepted (restricted)',
    outcome: 'positive',
    rationale: 'OS benefit of 4 months vs. standard of care. Accepted for use in patients meeting strict prior treatment criteria.',
    mechanism: 'Radioligand therapy targeting PSMA',
    stage: 'Commercial',
    source: 'https://www.scottishmedicines.org.uk',
    maSignal: 'Restricted population typical for RLT at launch. Label expansion studies ongoing; broader reimbursement possible.',
  },
];

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
  app: { maxWidth: 1400, margin: '0 auto', padding: '2rem 2.5rem', minHeight: '100vh', background: '#fefcf9' },
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
      teal: ['rgba(5,150,105,0.08)', '#065f46', 'rgba(5,150,105,0.25)'],
    };
    const [bg, color, border] = map[type] || map.blue;
    return { fontSize: 11, padding: '3px 8px', borderRadius: 20, background: bg, color, border: `0.5px solid ${border}`, fontWeight: 600, whiteSpace: 'nowrap' };
  },
  input: { background: '#fff', border: '1px solid #d1ccc4', borderRadius: 8, padding: '9px 14px', color: '#1a1a1a', fontSize: 13, outline: 'none', width: '100%' },
  btn: { background: '#1a1a1a', border: 'none', borderRadius: 3, padding: '8px 14px', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnSm: { background: 'transparent', border: '1px solid #d1ccc4', borderRadius: 3, padding: '5px 10px', color: '#555', fontSize: 11, cursor: 'pointer' },
  aiBox: { background: '#faf8f4', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#444', marginTop: 10, lineHeight: 1.7, border: '1px solid #e5e0d8' },
  divider: { border: 'none', borderTop: '1px solid #e5e0d8', margin: '10px 0' },
  priceUp: { color: '#16a34a', fontWeight: 600 },
  priceDown: { color: '#c8102e', fontWeight: 600 },
};

const np = {
  wrapper: { fontFamily: "'Georgia', 'Times New Roman', serif" },
  datebar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '3px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', paddingTop: '0.4rem', paddingBottom: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 6 },
  datebarText: { fontSize: 11, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" },
  sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 8, fontFamily: "'DM Mono', monospace", borderBottom: '1px solid #e5e0d8', paddingBottom: 4 },
  featuredHeadline: { fontSize: 28, fontWeight: 700, lineHeight: 1.15, color: '#111', marginBottom: 10, letterSpacing: '-0.3px', fontFamily: "'Georgia', serif" },
  featuredByline: { fontSize: 11, color: '#777', marginBottom: 10, letterSpacing: '0.3px', fontFamily: "'DM Mono', monospace" },
  featuredSummary: { fontSize: 15, lineHeight: 1.75, color: '#333', fontFamily: "'Georgia', serif" },
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

// ─── HTA OUTCOME HELPERS ────────────────────────────────────────────────────
function htaOutcomeBadge(outcome) {
  if (outcome === 'positive') return { bg: 'rgba(22,163,74,0.09)', color: '#15803d', border: 'rgba(22,163,74,0.3)', label: '✓ Recommended' };
  if (outcome === 'negative') return { bg: 'rgba(200,16,46,0.08)', color: '#c8102e', border: 'rgba(200,16,46,0.3)', label: '✕ Not recommended' };
  return { bg: 'rgba(161,98,7,0.08)', color: '#a16207', border: 'rgba(161,98,7,0.3)', label: '◐ Conditional' };
}

function htaBodyColor(body) {
  const map = {
    'NICE': { bg: '#1d3461', text: '#fff' },
    'G-BA': { bg: '#1a1a1a', text: '#fff' },
    'HAS': { bg: '#002395', text: '#fff' },
    'EUnetHTA': { bg: '#003399', text: '#f5c518' },
    'SMC': { bg: '#005EB8', text: '#fff' },
    'PBAC': { bg: '#00843D', text: '#fff' },
    'CADTH': { bg: '#c8102e', text: '#fff' },
  };
  return map[body] || { bg: '#555', text: '#fff' };
}

// ─── HTA Card ────────────────────────────────────────────────────────────────
function HTACard({ item, callClaude }) {
  const [expanded, setExpanded] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const outcome = htaOutcomeBadge(item.outcome);
  const bodyStyle = htaBodyColor(item.body);

  const handleAI = async () => {
    if (aiAnalysis) { setExpanded(true); return; }
    setLoadingAI(true);
    setExpanded(true);
    try {
      const text = await callClaude(
        `You are a market access expert at a pharmaceutical company. Analyze this HTA decision in 4 concise bullet points (use • as bullet):
        Body: ${item.body} (${item.country})
        Product: ${item.product} by ${item.company}
        Indication: ${item.indication}
        Decision: ${item.decision}
        Rationale: ${item.rationale}
        
        Cover: (1) what this means for market access in this country, (2) implications for pricing/reimbursement negotiations, (3) what evidence gaps were highlighted, (4) what other companies in the same space should take away. Be specific and commercial, not academic.`
      );
      setAiAnalysis(text);
    } catch { setAiAnalysis('Could not generate analysis.'); }
    setLoadingAI(false);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 10, marginBottom: 12, overflow: 'hidden', transition: 'box-shadow 0.15s' }}
      onMouseOver={e => e.currentTarget.style.boxShadow = '0 3px 16px rgba(0,0,0,0.07)'}
      onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
      {/* Header row */}
      <div style={{ padding: '14px 18px', borderBottom: expanded ? '1px solid #f0ede8' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          {/* Body badge */}
          <div style={{ flexShrink: 0, background: bodyStyle.bg, color: bodyStyle.text, fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 13, padding: '6px 12px', borderRadius: 6, letterSpacing: '0.5px', minWidth: 56, textAlign: 'center' }}>
            {item.body}
            <div style={{ fontSize: 9, opacity: 0.75, fontWeight: 400, marginTop: 1 }}>{item.country}</div>
          </div>
          {/* Main info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111', fontFamily: "'Georgia', serif" }}>{item.product}</span>
              <span style={{ fontSize: 12, color: '#888', fontFamily: "'DM Mono', monospace" }}>· {item.company}</span>
            </div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 8, lineHeight: 1.4 }}>{item.indication}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: outcome.bg, color: outcome.color, border: `0.5px solid ${outcome.border}`, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                {outcome.label}
              </span>
              <span style={{ fontSize: 11, color: '#aaa', fontFamily: "'DM Mono', monospace" }}>{item.date}</span>
              <span style={{ fontSize: 11, color: '#999', fontFamily: "'DM Mono', monospace", background: '#f5f2ed', padding: '2px 8px', borderRadius: 10 }}>{item.mechanism}</span>
            </div>
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            <button style={{ ...s.btn, fontSize: 10, padding: '5px 12px', background: '#065f46' }} onClick={handleAI}>
              {loadingAI ? <><Spinner />Analyzing…</> : aiAnalysis ? 'MA Analysis ✓' : 'MA Analysis →'}
            </button>
            <button style={{ ...s.btnSm, fontSize: 11 }} onClick={() => setExpanded(x => !x)}>
              {expanded ? '▲' : '▼'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '16px 18px', background: '#fdfcfa' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>Committee Rationale</div>
            <p style={{ fontSize: 13, color: '#333', lineHeight: 1.7, margin: 0, fontFamily: "'Georgia', serif" }}>{item.rationale}</p>
          </div>
          <div style={{ marginBottom: aiAnalysis ? 12 : 0, padding: '10px 14px', background: 'rgba(5,150,105,0.05)', borderRadius: 6, border: '1px solid rgba(5,150,105,0.15)', borderLeft: '3px solid #065f46' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#065f46', marginBottom: 5, fontFamily: "'DM Mono', monospace" }}>Market Access Signal</div>
            <p style={{ fontSize: 13, color: '#2d4a3e', lineHeight: 1.65, margin: 0, fontFamily: "'Georgia', serif" }}>{item.maSignal}</p>
          </div>
          {loadingAI && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 13, padding: '12px 0' }}><Spinner />Generating market access analysis…</div>}
          {aiAnalysis && (
            <div style={{ ...np.npAiBox, marginTop: 12, borderLeft: '3px solid #065f46', whiteSpace: 'pre-line' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#065f46', marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>AI · Market Access Analysis</div>
              {aiAnalysis}
            </div>
          )}
          {item.source && (
            <a href={item.source} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 10, fontSize: 11, color: '#c8102e', fontFamily: "'DM Mono', monospace", textDecoration: 'none', fontWeight: 600 }}>
              Source: {item.body} ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── HTA TAB ────────────────────────────────────────────────────────────────
function HTATab({ callClaude }) {
  const [bodyFilter, setBodyFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [aiOverview, setAiOverview] = useState('');
  const [loadingOverview, setLoadingOverview] = useState(false);

  const bodies = ['NICE', 'G-BA', 'HAS', 'EUnetHTA', 'SMC'];
  const outcomes = ['positive', 'negative', 'conditional'];

  const filtered = HTA_DATA.filter(item => {
    if (bodyFilter && item.body !== bodyFilter) return false;
    if (outcomeFilter && item.outcome !== outcomeFilter) return false;
    if (searchText) {
      const hay = (item.product + ' ' + item.company + ' ' + item.indication + ' ' + item.body + ' ' + item.mechanism).toLowerCase();
      if (!hay.includes(searchText.toLowerCase())) return false;
    }
    return true;
  });

  const positiveCount = HTA_DATA.filter(d => d.outcome === 'positive').length;
  const negativeCount = HTA_DATA.filter(d => d.outcome === 'negative').length;
  const conditionalCount = HTA_DATA.filter(d => d.outcome === 'conditional').length;

  const handleOverview = async () => {
    if (aiOverview) return;
    setLoadingOverview(true);
    try {
      const text = await callClaude(
        `You are a market access director. Based on these recent HTA decisions, write a 3-sentence strategic overview of current reimbursement trends in Europe for a small pharma company preparing submissions:
        - NICE rejected lecanemab (Alzheimer's) citing ICER above threshold
        - G-BA granted considerable benefit to inavolisib (breast cancer, biomarker-selected)
        - HAS gave moderate ASMR to fidanacogene (gene therapy, haemophilia B)
        - NICE conditionally approved selpercatinib via Cancer Drugs Fund
        - EUnetHTA completed first joint clinical assessment under HTAR
        Focus on: evidence standards trending, biomarker strategy, gene therapy pricing, CDF/MEA patterns. Be direct and actionable.`
      );
      setAiOverview(text);
    } catch { setAiOverview('Could not generate overview.'); }
    setLoadingOverview(false);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ borderTop: '3px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: '0.5rem 0', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>HTA & Reimbursement Decisions · Europe</span>
        <span style={{ fontSize: 10, color: '#065f46', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>NICE · G-BA · HAS · EUnetHTA · SMC</span>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total decisions', val: HTA_DATA.length, color: '#1a1a1a' },
          { label: 'Recommended', val: positiveCount, color: '#15803d' },
          { label: 'Not recommended', val: negativeCount, color: '#c8102e' },
          { label: 'Conditional', val: conditionalCount, color: '#a16207' },
        ].map(m => (
          <div key={m.label} style={s.metric}>
            <div style={s.metricLabel}>{m.label}</div>
            <div style={{ ...s.metricVal, color: m.color, fontSize: 26 }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* AI Overview button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button style={{ ...s.btn, background: '#065f46', fontSize: 11, padding: '8px 16px' }} onClick={handleOverview}>
          {loadingOverview ? <><Spinner />Analyzing trends…</> : aiOverview ? 'Strategic Overview ✓' : '→ Generate strategic overview for small pharma'}
        </button>
        {aiOverview && <div style={{ ...np.npAiBox, marginTop: 10, borderLeft: '3px solid #065f46' }}>{aiOverview}</div>}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 8, padding: '14px 16px', marginBottom: '1.25rem' }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: '#aaa', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>HTA body</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['', ...bodies].map(b => (
              <button key={b} onClick={() => setBodyFilter(b)} style={{ padding: '4px 12px', borderRadius: 4, border: bodyFilter === b ? '1.5px solid #1a1a1a' : '1px solid #d1ccc4', background: bodyFilter === b ? '#1a1a1a' : 'transparent', color: bodyFilter === b ? '#fff' : '#555', fontSize: 11, fontWeight: bodyFilter === b ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Mono', monospace', transition: 'all 0.15s'" }}>
                {b || 'All'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: '#aaa', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Outcome</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ key: '', label: 'All' }, { key: 'positive', label: '✓ Recommended' }, { key: 'negative', label: '✕ Not recommended' }, { key: 'conditional', label: '◐ Conditional' }].map(o => (
              <button key={o.key} onClick={() => setOutcomeFilter(o.key)} style={{ padding: '4px 12px', borderRadius: 4, border: outcomeFilter === o.key ? `1.5px solid ${o.key === 'positive' ? '#15803d' : o.key === 'negative' ? '#c8102e' : o.key === 'conditional' ? '#a16207' : '#1a1a1a'}` : '1px solid #d1ccc4', background: outcomeFilter === o.key ? (o.key === 'positive' ? 'rgba(22,163,74,0.08)' : o.key === 'negative' ? 'rgba(200,16,46,0.08)' : o.key === 'conditional' ? 'rgba(161,98,7,0.08)' : '#1a1a1a') : 'transparent', color: outcomeFilter === o.key ? (o.key === 'positive' ? '#15803d' : o.key === 'negative' ? '#c8102e' : o.key === 'conditional' ? '#a16207' : '#fff') : '#555', fontSize: 11, fontWeight: outcomeFilter === o.key ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...np.filterInput }} value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search by product, company, indication, MoA…" />
          {searchText && <button style={s.btnSm} onClick={() => setSearchText('')}>Clear</button>}
        </div>
      </div>

      {/* Decisions list */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 12, fontFamily: "'DM Mono', monospace", borderBottom: '1px solid #e5e0d8', paddingBottom: 4 }}>
        Recent decisions · {filtered.length} shown
      </div>
      {filtered.map(item => <HTACard key={item.id} item={item} callClaude={callClaude} />)}

      <div style={{ marginTop: '2rem', padding: '12px 16px', background: '#faf8f4', borderRadius: 6, border: '1px solid #e5e0d8', fontSize: 11, color: '#999', fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
        Decisions sourced from <strong style={{ color: '#555' }}>NICE, G-BA, HAS, SMC, EUnetHTA</strong> public databases. Updated weekly. Production version would pull live from official RSS/APIs.
      </div>
    </div>
  );
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
    <div style={{ display: 'grid', gridTemplateColumns: '160px 140px auto 1fr 180px', gap: 12, padding: '10px 16px', borderBottom: isLast ? 'none' : '1px solid #f0ede8', alignItems: 'start', fontSize: 12 }}>
      <div>
        <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: 12 }}>{entry.company}</div>
        <div style={{ color: '#888', fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{entry.product}</div>
      </div>
      <div>
        <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 10, background: sp.bg, color: sp.color, fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{sp.label}</span>
      </div>
      <div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {entry.markets.length > 0 ? entry.markets.map(m => (
            <span key={m} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f0ede8', color: '#555', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{m}</span>
          )) : <span style={{ fontSize: 10, color: '#bbb', fontFamily: "'DM Mono', monospace" }}>Not yet marketed</span>}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>{entry.notes}</div>
        <div style={{ fontSize: 10, color: '#999', fontFamily: "'DM Mono', monospace", marginTop: 3 }}>MoA: {entry.mechanism}</div>
      </div>
      <div>
        {entry.htaStatus !== '—'
          ? <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(5,150,105,0.07)', color: '#065f46', border: '0.5px solid rgba(5,150,105,0.2)', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{entry.htaStatus}</span>
          : <span style={{ fontSize: 10, color: '#ccc', fontFamily: "'DM Mono', monospace" }}>No HTA yet</span>
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
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: areaColor, fontFamily: "'DM Mono', monospace", background: `rgba(${areaColor === '#c8102e' ? '200,16,46' : areaColor === '#7c3aed' ? '124,58,237' : areaColor === '#1d4ed8' ? '29,78,216' : '3,105,161'},0.07)`, padding: '2px 8px', borderRadius: 4 }}>{item.area}</span>
              <span style={{ fontSize: 11, color: '#999', fontFamily: "'DM Mono', monospace" }}>· {item.target}</span>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 6px 0', fontFamily: "'Georgia', serif" }}>{item.indication}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#888', fontFamily: "'DM Mono', monospace" }}>{item.entries.length} competitors tracked</span>
              {commercialCount > 0 && <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: '#15803d', fontWeight: 600 }}>· {commercialCount} commercial</span>}
              {lateStageCount > 0 && <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: '#a16207', fontWeight: 600 }}>· {lateStageCount} late-stage pipeline</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button style={{ ...s.btn, fontSize: 10, padding: '5px 12px', background: areaColor }} onClick={e => { e.stopPropagation(); handleAI(); }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '160px 140px auto 1fr 180px', gap: 12, padding: '8px 16px', background: '#f8f6f2', borderBottom: '1px solid #e5e0d8', fontSize: 9, color: '#aaa', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '1px' }}>
            <span>Company / Product</span><span>Stage</span><span>Markets</span><span>Notes</span><span>HTA Status</span>
          </div>
          {item.entries.map((entry, i) => <CompetitorRow key={i} entry={entry} isLast={i === item.entries.length - 1} />)}

          {/* AI Analysis */}
          {(loadingAI || aiAnalysis) && (
            <div style={{ padding: '16px 18px', borderTop: '1px solid #f0ede8', background: '#fdfcfa' }}>
              {loadingAI && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 13 }}><Spinner />Generating market access strategy analysis…</div>}
              {aiAnalysis && (
                <div style={{ ...np.npAiBox, marginTop: 0, borderLeft: `3px solid ${areaColor}`, whiteSpace: 'pre-line' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: areaColor, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>AI · Competitive MA Strategy</div>
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
        <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>Competitive Landscape · Market Access View</span>
        <span style={{ fontSize: 10, color: '#1d4ed8', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>Pipeline · HTA · Pricing signals</span>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: '1.25rem' }}>
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
          <div style={{ fontSize: 10, color: '#aaa', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Therapy area</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['', ...areas].map(a => (
              <button key={a} onClick={() => setAreaFilter(a)} style={{ padding: '4px 12px', borderRadius: 4, border: areaFilter === a ? '1.5px solid #1a1a1a' : '1px solid #d1ccc4', background: areaFilter === a ? '#1a1a1a' : 'transparent', color: areaFilter === a ? '#fff' : '#555', fontSize: 11, fontWeight: areaFilter === a ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>
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

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 12, fontFamily: "'DM Mono', monospace", borderBottom: '1px solid #e5e0d8', paddingBottom: 4 }}>
        Landscape snapshots · {filtered.length} areas
      </div>
      {filtered.map(item => <CompetitiveLandscapeCard key={item.id} item={item} callClaude={callClaude} />)}

      <div style={{ marginTop: '2rem', padding: '12px 16px', background: '#faf8f4', borderRadius: 6, border: '1px solid #e5e0d8', fontSize: 11, color: '#999', fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
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
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 3, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontFamily: "'DM Mono', monospace" }}>{badge.label}</span>
        {isConference && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: 'rgba(190,18,60,0.07)', color: '#be123c', border: '1px solid rgba(190,18,60,0.2)', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>CONGRESS</span>}
        {showCompany && companyName && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: 'rgba(200,16,46,0.07)', color: '#c8102e', border: '0.5px solid rgba(200,16,46,0.2)', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{companyName}</span>}
        {pub.isOpenAccess && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: 'rgba(21,128,61,0.07)', color: '#15803d', border: '0.5px solid rgba(21,128,61,0.2)', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>OA</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#999', fontFamily: "'DM Mono', monospace" }}>{pub.pubDate || pub.pubYear || ''}</span>
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#111', lineHeight: 1.4, margin: '0 0 6px 0', fontFamily: "'Georgia', serif", cursor: pubLink ? 'pointer' : 'default' }} onClick={() => pubLink && window.open(pubLink, '_blank')}>
        {pub.title}{pubLink && <span style={{ color: '#c8102e', fontSize: 11, marginLeft: 6, fontFamily: "'DM Mono', monospace" }}>↗</span>}
      </p>
      <div style={{ fontSize: 11, color: '#888', fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>
        {pub.authors && <span>{pub.authors.split(',').slice(0,3).join(', ')}{pub.authors.split(',').length > 3 ? ' et al.' : ''}</span>}
        {pub.journalTitle && <span style={{ marginLeft: 8, color: '#bbb' }}>· {pub.journalTitle}</span>}
        {pub.citedByCount > 0 && <span style={{ marginLeft: 8, color: '#aaa' }}>· {pub.citedByCount} citations</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={{ ...s.btn, fontSize: 10, padding: '4px 10px' }} onClick={handleAI}>
          {loadingAI ? <><Spinner />Analyzing…</> : aiSummary ? 'Analysis' : 'AI analysis →'}
        </button>
        {pub.abstract && <button style={{ ...s.btnSm, fontSize: 11 }} onClick={() => setExpanded(x => !x)}>{expanded ? 'Hide abstract' : 'Abstract ↓'}</button>}
        {pubLink && <a href={pubLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#c8102e', fontFamily: "'DM Mono', monospace", textDecoration: 'none', fontWeight: 600 }}>Full text ↗</a>}
      </div>
      {expanded && pub.abstract && <div style={{ marginTop: 10, fontSize: 12, color: '#444', lineHeight: 1.7, fontFamily: "'Georgia', serif", background: '#faf8f4', borderRadius: 6, padding: '10px 14px', border: '1px solid #e5e0d8' }}>{pub.abstract}</div>}
      {aiSummary && <div style={{ ...np.npAiBox, marginTop: 10, fontSize: 12 }}>{aiSummary}</div>}
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
        <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>Scientific Publications & Congress Abstracts</span>
        <span style={{ fontSize: 10, color: '#c8102e', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>via Europe PMC · PubMed · Preprints</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: '1.25rem' }}>
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
          <button key={sec.key} onClick={() => setActiveSection(sec.key)} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: activeSection === sec.key ? '#fff' : 'transparent', color: activeSection === sec.key ? '#1a1a1a' : '#888', fontWeight: activeSection === sec.key ? 700 : 400, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Mono', monospace", boxShadow: activeSection === sec.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
            {sec.label}<span style={{ marginLeft: 6, fontSize: 10, color: activeSection === sec.key ? '#c8102e' : '#bbb' }}>({sec.count})</span>
          </button>
        ))}
      </div>
      <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 8, padding: '14px 16px', marginBottom: '1.25rem' }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: '#aaa', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Topic area</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TOPIC_FILTERS.map(t => (
              <button key={t.key} onClick={() => setTopicFilter(t.key)} style={{ padding: '5px 12px', borderRadius: 4, border: topicFilter === t.key ? '1.5px solid #1a1a1a' : '1px solid #d1ccc4', background: topicFilter === t.key ? '#1a1a1a' : 'transparent', color: topicFilter === t.key ? '#fff' : '#555', fontSize: 11, fontWeight: topicFilter === t.key ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Mono', monospace", transition: 'all 0.15s' }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: '#aaa', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Publication type</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ key: 'all', label: 'All' }, { key: 'congress', label: 'Congresses only' }, { key: 'journal', label: 'Journals only' }].map(t => (
              <button key={t.key} onClick={() => setPubTypeFilter(t.key)} style={{ padding: '5px 12px', borderRadius: 4, border: pubTypeFilter === t.key ? '1.5px solid #c8102e' : '1px solid #d1ccc4', background: pubTypeFilter === t.key ? 'rgba(200,16,46,0.07)' : 'transparent', color: pubTypeFilter === t.key ? '#c8102e' : '#555', fontSize: 11, fontWeight: pubTypeFilter === t.key ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Mono', monospace", transition: 'all 0.15s' }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...np.filterInput, fontSize: 12 }} value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search by title, author, company…" />
          {searchText && <button style={s.btnSm} onClick={() => setSearchText('')}>Clear</button>}
        </div>
      </div>
      {activeLoading && <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}><Spinner /><span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Fetching publications from Europe PMC…</span></div>}
      {!activeLoading && activePubs.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: '#888', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>No publications found for current filters.</div>}
      {!activeLoading && activePubs.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 12, fontFamily: "'DM Mono', monospace", borderBottom: '1px solid #e5e0d8', paddingBottom: 4 }}>
            {activeSection === 'watchlist' ? 'Publications from your watchlist companies' : 'Publications from sector leaders'} · {activePubs.length} results
          </div>
          {activePubs.map((pub, i) => <PubCard key={pub.id || i} pub={pub} companyName={pub._company} showCompany={true} />)}
        </div>
      )}
    </div>
  );
}

function AnalystRatingBar({ buy, hold, sell }) {
  const total = buy + hold + sell;
  if (total === 0) return null;
  const buyPct = Math.round((buy / total) * 100);
  const holdPct = Math.round((hold / total) * 100);
  const sellPct = 100 - buyPct - holdPct;
  let verdict = 'Hold', verdictColor = '#a16207';
  if (buyPct >= 60) { verdict = 'Strong Buy'; verdictColor = '#15803d'; }
  else if (buyPct >= 45) { verdict = 'Buy'; verdictColor = '#16a34a'; }
  else if (sellPct >= 45) { verdict = 'Strong Sell'; verdictColor = '#c8102e'; }
  else if (sellPct >= 30) { verdict = 'Sell'; verdictColor = '#dc2626'; }
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: "'DM Mono', monospace" }}>Analyst Consensus</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: verdictColor, fontFamily: "'DM Mono', monospace" }}>{verdict}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', marginBottom: 8 }}>
        <div style={{ width: `${buyPct}%`, background: '#16a34a' }} />
        <div style={{ width: `${holdPct}%`, background: '#d97706' }} />
        <div style={{ width: `${sellPct}%`, background: '#dc2626' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
        <span style={{ color: '#15803d' }}>Buy {buyPct}%</span>
        <span style={{ color: '#a16207' }}>Hold {holdPct}%</span>
        <span style={{ color: '#dc2626' }}>Sell {sellPct}%</span>
      </div>
    </div>
  );
}

function PriceTarget({ current, target }) {
  if (!target || !current || current === 0) return null;
  const upside = (((target - current) / current) * 100).toFixed(1);
  const isUp = target >= current;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '8px 12px', background: isUp ? 'rgba(22,163,74,0.05)' : 'rgba(220,38,38,0.05)', borderRadius: 6, border: `1px solid ${isUp ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 10, color: '#888', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px' }}>12-mo Price Target</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>${target.toFixed(2)}</div>
      </div>
      <div style={{ borderLeft: '1px solid #e5e0d8', paddingLeft: 10 }}>
        <div style={{ fontSize: 10, color: '#888', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px' }}>vs Current</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: isUp ? '#16a34a' : '#dc2626' }}>{isUp ? '▲' : '▼'} {Math.abs(upside)}%</div>
      </div>
    </div>
  );
}

function SentimentPills({ sentiments }) {
  if (!sentiments || sentiments.length === 0) return null;
  const colorMap = {
    bullish: { bg: 'rgba(22,163,74,0.08)', color: '#15803d', border: 'rgba(22,163,74,0.25)', icon: '↑' },
    bearish: { bg: 'rgba(220,38,38,0.08)', color: '#dc2626', border: 'rgba(220,38,38,0.25)', icon: '↓' },
    neutral: { bg: 'rgba(100,100,100,0.08)', color: '#555', border: 'rgba(100,100,100,0.2)', icon: '→' },
    cautious: { bg: 'rgba(161,98,7,0.08)', color: '#a16207', border: 'rgba(161,98,7,0.25)', icon: '—' },
    speculative: { bg: 'rgba(109,40,217,0.08)', color: '#6d28d9', border: 'rgba(109,40,217,0.25)', icon: '*' },
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      {sentiments.map((sent, i) => { const c = colorMap[sent.tone?.toLowerCase()] || colorMap.neutral; return <span key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: c.bg, color: c.color, border: `0.5px solid ${c.border}`, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{c.icon} {sent.label}</span>; })}
    </div>
  );
}

function StockCard({ stock, onRemove, onLoadDetail, onStageUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) {
      setLoadingDetail(true);
      try { const result = await onLoadDetail(stock, onStageUpdate); setDetail(result); }
      catch { setDetail({ error: 'Could not load details.' }); }
      setLoadingDetail(false);
    }
  };

  return (
    <div style={{ ...s.card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '14px 18px', cursor: 'pointer', borderBottom: expanded ? '1px solid #e5e0d8' : 'none' }} onClick={handleExpand}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={s.ticker}>{stock.ticker}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{stock.name}</span>
              <span style={s.badge(stageBadge(stock.stage))}>{stock.stage}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {stock.price > 0 && <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Mono', monospace" }}>${stock.price.toFixed(2)}</span>}
              {stock.price > 0 && <span style={{ ...(stock.change >= 0 ? s.priceUp : s.priceDown), fontSize: 14, fontFamily: "'DM Mono', monospace" }}>{stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toFixed(1)}%</span>}
              {stock.mktcap !== '—' && <span style={{ fontSize: 12, color: '#888', fontFamily: "'DM Mono', monospace" }}>Mkt cap: {stock.mktcap}</span>}
            </div>
            <p style={{ ...s.muted, marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>{stock.note}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 18, color: '#bbb', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>⌄</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 20, lineHeight: 1, padding: '0 2px' }} onClick={e => { e.stopPropagation(); onRemove(stock.ticker); }}>×</button>
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '16px 18px', background: '#fdfcfa' }}>
          {loadingDetail && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 13, padding: '12px 0' }}><Spinner />Loading company intelligence…</div>}
          {detail && !detail.error && (
            <div>
              {detail.about && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>About</div><p style={{ fontSize: 13, color: '#333', lineHeight: 1.7, margin: 0 }}>{detail.about}</p></div>}
              <hr style={s.divider} />
              {detail.ratings && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>Analyst Ratings</div><AnalystRatingBar buy={detail.ratings.buy} hold={detail.ratings.hold} sell={detail.ratings.sell} /></div>}
              {detail.priceTarget && stock.price > 0 && <div style={{ marginBottom: 16 }}><PriceTarget current={stock.price} target={detail.priceTarget} /></div>}
              <hr style={s.divider} />
              {detail.sentiments && detail.sentiments.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>Investor Sentiment</div>
                  <SentimentPills sentiments={detail.sentiments} />
                  {detail.sentimentSummary && <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>{detail.sentimentSummary}</p>}
                </div>
              )}
              {detail.risks && detail.risks.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c8102e', marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>Key Risks</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detail.risks.map((r, i) => <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#555', lineHeight: 1.5 }}><span style={{ color: '#c8102e', flexShrink: 0 }}>▸</span><span>{r}</span></div>)}
                  </div>
                </div>
              )}
            </div>
          )}
          {detail?.error && <div style={{ color: '#c8102e', fontSize: 13 }}>{detail.error}</div>}
        </div>
      )}
    </div>
  );
}

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
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) { setSuggestions(data.slice(0, 7)); setShowSugg(true); }
      else { setSuggestions([]); setShowSugg(true); }
    } catch { setSuggestions([]); }
    setSearching(false);
  };

  const handleChange = (e) => {
    const v = e.target.value; setVal(v); setError('');
    clearTimeout(debounceRef.current);
    if (v.trim().length >= 2) debounceRef.current = setTimeout(() => searchTickers(v.trim()), 350);
    else { setSuggestions([]); setShowSugg(false); }
  };

  const handleSelect = async (ticker, name) => {
    setVal(''); setSuggestions([]); setShowSugg(false); setError('');
    if (watchlist.find(s => s.ticker === ticker)) { setError(`${ticker} is already in your watchlist.`); return; }
    setAdding(true); await onAdd(ticker, name); setAdding(false);
  };

  const handleManualAdd = async () => {
    const t = val.trim().toUpperCase(); if (!t) return;
    const match = suggestions.find(s => s.ticker === t);
    if (match) { handleSelect(match.ticker, match.name); return; }
    setAdding(true); setError('');
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(t)}`);
      const data = await res.json();
      const exact = Array.isArray(data) && data.find(s => s.ticker === t);
      if (exact) await handleSelect(exact.ticker, exact.name);
      else setError(`"${t}" not found. Check the ticker symbol and try again.`);
    } catch { setError('Search failed. Please try again.'); }
    setAdding(false); setVal('');
  };

  const tickerStyle = { fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: '#c8102e', background: 'rgba(200,16,46,0.07)', padding: '2px 7px', borderRadius: 4, border: '0.5px solid rgba(200,16,46,0.2)', flexShrink: 0 };

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input style={{ ...s.input, borderColor: error ? '#fca5a5' : undefined }} value={val} onChange={handleChange} onKeyDown={e => e.key === 'Enter' && handleManualAdd()} onBlur={() => setTimeout(() => setShowSugg(false), 200)} onFocus={() => suggestions.length > 0 && setShowSugg(true)} placeholder="Search: 'Moderna', 'CRSP', 'Gilead'…" disabled={adding} />
          {showSugg && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e0d8', borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.1)', zIndex: 100, marginTop: 4, overflow: 'hidden' }}>
              {suggestions.length === 0 && !searching && <div style={{ padding: '12px 14px', fontSize: 12, color: '#888', fontFamily: "'DM Mono', monospace" }}>No results for "{val}"</div>}
              {suggestions.map((item, i) => {
                const alreadyIn = watchlist.find(s => s.ticker === item.ticker);
                return <div key={item.ticker} style={{ padding: '10px 14px', cursor: alreadyIn ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < suggestions.length - 1 ? '1px solid #f5f3ef' : 'none', opacity: alreadyIn ? 0.5 : 1 }} onMouseDown={() => !alreadyIn && handleSelect(item.ticker, item.name)} onMouseOver={e => { if (!alreadyIn) e.currentTarget.style.background = '#faf8f4'; }} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={tickerStyle}>{item.ticker}</span>
                  <span style={{ fontSize: 13, color: '#333', flex: 1 }}>{item.name}</span>
                  {alreadyIn ? <span style={{ fontSize: 10, color: '#aaa', fontFamily: "'DM Mono', monospace" }}>already added</span> : <span style={{ fontSize: 11, color: '#c8102e', fontFamily: "'DM Mono', monospace" }}>+ Add</span>}
                </div>;
              })}
            </div>
          )}
        </div>
        <button style={{ ...s.btn, minWidth: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: adding ? 0.7 : 1, flexShrink: 0 }} onClick={handleManualAdd} disabled={adding || !val.trim()}>
          {adding ? <><Spinner />Adding…</> : 'Add →'}
        </button>
      </div>
      {error && <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626', fontFamily: "'DM Mono', monospace" }}>— {error}</div>}
    </div>
  );
}

export default function App() {
  const [watchlist, setWatchlist] = useState(getInitialWatchlist);

  const setAndSaveWatchlist = useCallback((updater) => {
    setWatchlist(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveWatchlist(next);
      return next;
    });
  }, []);

  const [tab, setTab] = useState('news');
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
      try { const res = await fetch('/api/rss'); const data = await res.json(); if (Array.isArray(data) && data.length > 0) setRealNews(data); } catch {}
      setLoadingNews(false);
    };
    fetchNews();
  }, []);

  React.useEffect(() => {
    const fetchPress = async () => {
      try { const res = await fetch('/api/press'); const data = await res.json(); if (Array.isArray(data) && data.length > 0) setPressReleases(data); } catch {}
    };
    fetchPress();
  }, []);

  React.useEffect(() => {
    const fetchPrices = async () => {
      try {
        const tickers = watchlist.map(s => s.ticker);
        const res = await fetch('/api/stocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tickers }) });
        const data = await res.json();
        setAndSaveWatchlist(prev => prev.map(stock => { const updated = data.find(d => d.ticker === stock.ticker); return updated ? { ...stock, ...updated } : stock; }));
      } catch {}
    };
    fetchPrices();
  }, []);

  const addTicker = useCallback(async (val, knownName) => {
    if (!val || watchlist.find(s => s.ticker === val)) return;
    setAndSaveWatchlist(prev => [...prev, { ticker: val, name: knownName || val, price: 0, change: 0, mktcap: '—', stage: 'Unknown', note: 'Loading price data…' }]);
    try {
      const res = await fetch('/api/stocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tickers: [val] }) });
      const data = await res.json();
      if (data[0]) setAndSaveWatchlist(prev => prev.map(s => s.ticker === val ? { ...s, ...data[0], name: data[0].name || knownName || val } : s));
      else setAndSaveWatchlist(prev => prev.map(s => s.ticker === val ? { ...s, note: 'Price data unavailable.' } : s));
    } catch { setAndSaveWatchlist(prev => prev.map(s => s.ticker === val ? { ...s, note: 'Could not fetch price data.' } : s)); }
  }, [watchlist, setAndSaveWatchlist]);

  const removeTicker = useCallback((ticker) => {
    setAndSaveWatchlist(prev => prev.filter(s => s.ticker !== ticker));
  }, [setAndSaveWatchlist]);

  const updateStage = useCallback((ticker, stage) => {
    setAndSaveWatchlist(prev => prev.map(s => s.ticker === ticker ? { ...s, stage } : s));
  }, [setAndSaveWatchlist]);

  const getSummary = useCallback(async (key, prompt) => {
    if (summaries[key]) return;
    setLoading(prev => ({ ...prev, [key]: true }));
    try { const text = await callClaude(prompt); setSummaries(prev => ({ ...prev, [key]: text })); }
    catch { setSummaries(prev => ({ ...prev, [key]: 'Error generating summary.' })); }
    setLoading(prev => ({ ...prev, [key]: false }));
  }, [summaries]);

  const loadStockDetail = useCallback(async (stock, onStageUpdate) => {
    const prompt = `You are a financial data assistant. Return ONLY valid JSON, no markdown, no explanation.
For the biotech/pharma company ${stock.ticker} (${stock.name}), return this exact JSON structure:
{
  "stage": "one of exactly: Preclinical | Phase 1 | Phase 1/2 | Phase 2 | Phase 2/3 | Phase 3 | Commercial | Platform | Private | Unknown",
  "about": "2-3 sentence description",
  "ratings": { "buy": 0, "hold": 0, "sell": 0 },
  "priceTarget": null,
  "sentiments": [{ "label": "tag", "tone": "bullish|bearish|neutral|cautious|speculative" }],
  "sentimentSummary": "1-2 sentences",
  "risks": ["Risk 1", "Risk 2", "Risk 3"]
}
Return ONLY the JSON object.`;
    const raw = await callClaude(prompt);
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      if (parsed.stage && parsed.stage !== 'Unknown' && onStageUpdate) onStageUpdate(stock.ticker, parsed.stage);
      return parsed;
    } catch { return { error: 'Could not parse company data.' }; }
  }, []);

  const newsSource = realNews.length > 0 ? realNews : NEWS_DATA;
  const CATEGORY_KEYWORDS = {
    'Pharma': ['pharma', 'drug', 'medicine', 'therapeutic'],
    'Biotech': ['biotech', 'biologic', 'biosimilar', 'gene', 'cell therapy', 'crispr', 'mrna'],
    'Regulatory': ['fda', 'ema', 'regulatory', 'approval', 'pdufa', 'nda', 'bla', 'chmp'],
    'HTA / Reimbursement': ['nice', 'g-ba', 'has ', 'hta', 'reimburse', 'pricing', 'qaly', 'icer', 'cost-effective'],
    'Clinical Trials': ['trial', 'phase', 'clinical', 'readout', 'efficacy', 'endpoint'],
    'Deals': ['deal', 'partner', 'acqui', 'merger', 'licens', 'collaboration'],
    'Gene Therapy': ['gene therapy', 'gene edit', 'crispr', 'aav', 'base edit', 'prime edit'],
    'AI': ['artificial intel', ' ai ', 'machine learn', 'algorithm', 'digital', 'data-driven'],
    'Oncology': ['cancer', 'oncol', 'tumor', 'immuno-oncol', 'checkpoint', 'car-t'],
  };

  const filteredNews = newsSource.filter(n => {
    if (isPaywalled(n)) return false;
    if (categoryFilter) {
      const kws = CATEGORY_KEYWORDS[categoryFilter] || [];
      const hay = (n.headline + ' ' + (n.tag || '') + ' ' + (n.summary || '')).toLowerCase();
      if (!kws.some(kw => hay.includes(kw)) && !(n.tag && n.tag.toLowerCase().includes(categoryFilter.toLowerCase()))) return false;
    }
    if (newsFilter) { if (!(n.headline + ' ' + (n.ticker || '') + ' ' + (n.tag || '')).toLowerCase().includes(newsFilter.toLowerCase())) return false; }
    return true;
  });

  const gainers = watchlist.filter(s => s.change >= 0).length;
  const losers = watchlist.filter(s => s.change < 0).length;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const featured = filteredNews[0];
  const secondary = filteredNews.slice(1);

  // Updated tabs: FDA removed, HTA and Competitive Landscape added
  const TABS = [
    { key: 'news', label: 'News' },
    { key: 'watchlist', label: 'Watchlist' },
    { key: 'publications', label: 'Publications' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'hta', label: 'HTA & Reimbursement', isNew: true },
    { key: 'landscape', label: 'Competitive Landscape', isNew: true },
  ];

  return (
    <div style={s.app} className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; }
        body { background: #fefcf9; margin: 0; }
        input:focus { border-color: #c8102e !important; }
        button:hover { opacity: 0.85; }

        @media (max-width: 680px) {
          .app-root { padding: 1rem !important; }
          .app-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .app-tabs { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; scrollbar-width: none !important; width: 100% !important; }
          .app-tabs::-webkit-scrollbar { display: none; }
          .app-tabs button { padding: 10px 14px !important; font-size: 9px !important; white-space: nowrap !important; flex-shrink: 0 !important; }
          .news-layout { grid-template-columns: 1fr !important; }
          .news-sidebar { position: static !important; margin-top: 2rem; }
          .featured-grid { grid-template-columns: 1fr !important; display: flex !important; flex-direction: column !important; }
          .featured-headline { font-size: 22px !important; }
          .story-row { flex-direction: column !important; gap: 10px !important; }
          .story-thumb { width: 100% !important; height: 160px !important; }
          .watchlist-top { flex-direction: column !important; align-items: stretch !important; }
          .watchlist-stats { flex-wrap: wrap !important; justify-content: flex-start !important; }
          .cat-filter-bar { flex-wrap: nowrap !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; scrollbar-width: none !important; padding-bottom: 4px; }
          .cat-filter-bar::-webkit-scrollbar { display: none; }
          .cat-filter-bar button { flex-shrink: 0 !important; }
          .app-header-right { display: flex; align-items: center; gap: 10px; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ borderBottom: '1px solid #e0dbd3', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid #ece7df' }} className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, background: '#0f1923', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="34" height="24" viewBox="0 0 44 28" fill="none">
                <polyline points="2,20 9,20 13,5 20,23 25,13 29,17 34,8 40,8" stroke="#c8102e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="20" cy="23" r="2.2" fill="#c8102e"/>
                <circle cx="13" cy="5" r="2.2" fill="#c8102e"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: 30, fontWeight: 400, letterSpacing: '-0.5px', color: '#1a1a1a', lineHeight: 1 }}>Catalyst</div>
              <div style={{ fontSize: 9, color: '#aaa', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace", marginTop: 4 }}>Biotech &amp; Pharma Intelligence</div>
            </div>
          </div>
          <div className="app-header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, color: '#aaa', fontFamily: "'DM Mono', monospace", letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, padding: '5px 12px', borderRadius: 3, background: 'rgba(22,163,74,0.07)', color: '#15803d', border: '0.5px solid rgba(22,163,74,0.2)', fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: '1px', flexShrink: 0 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              LIVE
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0 }} className="app-tabs">
          {TABS.map(t => (
            <button key={t.key} style={{ padding: '10px 18px', fontSize: 10, cursor: 'pointer', border: 'none', background: 'none', color: tab === t.key ? '#1a1a1a' : '#aaa', borderBottom: tab === t.key ? '2px solid #c8102e' : '2px solid transparent', fontWeight: tab === t.key ? 600 : 400, letterSpacing: '1.8px', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace", transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }} onClick={() => setTab(t.key)}>
              {t.label}
              {t.isNew && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: tab === t.key ? 'rgba(200,16,46,0.12)' : 'rgba(100,100,100,0.1)', color: tab === t.key ? '#c8102e' : '#aaa', fontWeight: 700 }}>NEW</span>}
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
              <span style={{ ...np.datebarText, color: '#c8102e' }}>{filteredNews.length} {filteredNews.length === 1 ? 'story' : 'stories'}{realNews.length > 0 ? ' · Live' : ' · Sample'}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: 4 }} className="cat-filter-bar">
              {['All', 'Pharma', 'Biotech', 'Regulatory', 'HTA / Reimbursement', 'Clinical Trials', 'Deals', 'Gene Therapy', 'AI', 'Oncology'].map(cat => (
                <button key={cat} onClick={() => setCategoryFilter(cat === 'All' ? '' : cat)} style={{ padding: '5px 14px', borderRadius: 4, border: (categoryFilter === cat || (cat === 'All' && !categoryFilter)) ? '1.5px solid #1a1a1a' : '1px solid #d1ccc4', background: (categoryFilter === cat || (cat === 'All' && !categoryFilter)) ? '#1a1a1a' : 'transparent', color: (categoryFilter === cat || (cat === 'All' && !categoryFilter)) ? '#fff' : '#555', fontSize: 12, fontWeight: (categoryFilter === cat || (cat === 'All' && !categoryFilter)) ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Mono', monospace", transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}>{cat}</button>
              ))}
            </div>
            <div style={np.filterBar}>
              <input style={np.filterInput} value={newsFilter} onChange={e => setNewsFilter(e.target.value)} placeholder="Search by keyword or ticker…" />
              {newsFilter && <button style={{ ...s.btnSm, fontSize: 11 }} onClick={() => setNewsFilter('')}>Clear</button>}
            </div>
            {loadingNews && <div style={{ textAlign: 'center', color: '#888', padding: '3rem', fontSize: 13 }}><Spinner />Loading news…</div>}
            {!loadingNews && filteredNews.length === 0 && <div style={{ textAlign: 'center', color: '#555', padding: '3rem', fontSize: 14 }}>No stories match your filter.</div>}
            {!loadingNews && featured && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={np.sectionLabel}>Top Story</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1.5rem', borderBottom: '1px solid #d1ccc4', paddingBottom: '1.5rem', marginBottom: '1.5rem' }} className="featured-grid">
                  <div>
                    <div style={np.tagPill(featured.tag)}>{featured.tag}</div>
                    <h2 style={np.featuredHeadline} className="featured-headline">{featured.headline}</h2>
                    <div style={np.featuredByline}>{featured.source} · {featured.date}{featured.link && <a href={featured.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 10, color: '#c8102e', fontSize: 11, textDecoration: 'none', fontWeight: 600 }}>Read full article ↗</a>}</div>
                    {featured.summary && <p style={np.featuredSummary}>{featured.summary}</p>}
                    <div style={{ marginTop: 14 }}>
                      <button style={s.btn} onClick={() => getSummary('news-0', `You are a clinical data expert and biotech analyst. Explain this news in 3-4 sentences: "${featured.headline}". Context: ${featured.summary}. Be direct.`)}>
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
                      <div key={idx} style={{ display: 'flex', gap: '1.25rem', padding: '1.1rem 0', borderBottom: '1px solid #e5e0d8', alignItems: 'flex-start' }} className="story-row"
                        onMouseOver={e => e.currentTarget.style.background = '#faf8f5'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ flexShrink: 0, width: 130, height: 90, borderRadius: 6, overflow: 'hidden' }} className="story-thumb">
                          <NewsImage photoKeyword={n.photoKeyword} seed={idx} height={90} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                            <span style={np.tagPill(n.tag)}>{n.tag}</span>
                            <span style={{ fontSize: 11, color: '#999', fontFamily: "'DM Mono', monospace" }}>{n.source} · {n.date}</span>
                            {n.link && <a href={n.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#c8102e', textDecoration: 'none', fontWeight: 600 }}>↗</a>}
                          </div>
                          <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, color: '#111', margin: '0 0 6px 0', fontFamily: "'Georgia', serif" }}>{n.headline}</p>
                          {n.summary && <p style={{ fontSize: 13, lineHeight: 1.7, color: '#555', margin: '0 0 10px 0', fontFamily: "'Georgia', serif" }}>{n.summary}</p>}
                          <button style={{ ...s.btn, fontSize: 10, padding: '4px 10px' }} onClick={() => getSummary(`news-${idx}`, `Explain this biotech news in 3-4 sentences: "${n.headline}". Context: ${n.summary}.`)}>
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
          <div style={{ position: 'sticky', top: '1rem' }} className="news-sidebar">
            <div style={{ borderTop: '3px solid #1a1a1a', paddingTop: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c8102e', fontFamily: "'DM Mono', monospace" }}>Company Announcements</div>
            </div>
            {pressReleases.length === 0 && <div style={{ fontSize: 12, color: '#aaa', fontFamily: "'DM Mono', monospace" }}>Loading…</div>}
            {pressReleases.map((pr, i) => (
              <div key={i} style={{ paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid #e5e0d8' }}>
                <a href={pr.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4, margin: '0 0 5px 0', fontFamily: "'Georgia', serif" }}>{pr.headline}</p>
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: '#888', fontFamily: "'DM Mono', monospace" }}>{pr.company || pr.source}</span>
                  {pr.date && <span style={{ fontSize: 10, color: '#bbb', fontFamily: "'DM Mono', monospace" }}>· {pr.date}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ WATCHLIST ══ */}
      {tab === 'watchlist' && (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap' }} className="watchlist-top">
            <div style={{ flex: 1, minWidth: 240 }}><SearchBar onAdd={addTicker} watchlist={watchlist} /></div>
            <div style={{ display: 'flex', gap: 12, background: '#f0ede8', borderRadius: 6, padding: '8px 14px', border: '1px solid #e5e0d8', alignItems: 'center', flexShrink: 0 }} className="watchlist-stats">
              {[{ label: 'Watching', val: watchlist.length, color: '#555' }, { label: 'Gainers', val: gainers, color: '#16a34a' }, { label: 'Losers', val: losers, color: '#c8102e' }].map((m, i) => (
                <React.Fragment key={m.label}>
                  {i > 0 && <span style={{ color: '#ddd', fontSize: 12 }}>|</span>}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: m.color, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{m.val}</div>
                    <div style={{ fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{m.label}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>Click any card to expand company details, analyst ratings &amp; investor sentiment</div>
          {watchlist.map(stock => <StockCard key={stock.ticker} stock={stock} onRemove={removeTicker} onLoadDetail={loadStockDetail} onStageUpdate={updateStage} />)}
        </div>
      )}

      {/* ══ PUBLICATIONS ══ */}
      {tab === 'publications' && <PublicationsTab watchlist={watchlist} />}

      {/* ══ CALENDAR ══ */}
      {tab === 'calendar' && <CatalystCalendar watchlist={watchlist} callClaude={callClaude} />}

      {/* ══ HTA & REIMBURSEMENT ══ */}
      {tab === 'hta' && <HTATab callClaude={callClaude} />}

      {/* ══ COMPETITIVE LANDSCAPE ══ */}
      {tab === 'landscape' && <CompetitiveLandscape />}
    </div>
  );
}
