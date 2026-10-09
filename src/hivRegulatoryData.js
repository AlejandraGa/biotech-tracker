// ─── HIV REGULATORY INTELLIGENCE · CURATED DATASET ──────────────────────────
// Every status and date below was checked against the linked source on
// VERIFIED_ON. Anything that could not be confirmed is marked `none` or
// carries `dateUnverified: true` instead of being filled in.
// To update: edit the product's `reg` cell and add a line to its `events`.

export const VERIFIED_ON = '2026-10-09';

export const AGENCIES = [
  { key: 'fda', label: 'FDA', region: 'United States', hint: 'Approval decision' },
  { key: 'chmp', label: 'EMA · CHMP', region: 'European Union', hint: 'Scientific opinion' },
  { key: 'ec', label: 'European Commission', region: 'European Union', hint: 'Marketing authorisation' },
  { key: 'ch', label: 'Swissmedic', region: 'Switzerland', hint: 'Authorisation decision' },
];

// status → label, glyph and colours. Glyph + label carry the meaning; colour is secondary.
export const STATUS = {
  approved:    { label: 'Approved',          glyph: '✓', color: '#166534', bg: 'rgba(22,101,52,0.08)',  border: 'rgba(22,101,52,0.25)' },
  positive:    { label: 'Positive opinion',  glyph: '▲', color: '#166534', bg: 'rgba(22,101,52,0.08)',  border: 'rgba(22,101,52,0.25)' },
  review:      { label: 'Under review',      glyph: '◔', color: '#92580a', bg: 'rgba(146,88,10,0.08)',  border: 'rgba(146,88,10,0.28)' },
  negative:    { label: 'Negative',          glyph: '✕', color: '#b3122b', bg: 'rgba(179,18,43,0.07)',  border: 'rgba(179,18,43,0.28)' },
  notapproved: { label: 'Not approved',      glyph: '○', color: '#6b6b6b', bg: '#f3f0ea',               border: '#d8d2c8' },
  planned:     { label: 'Filing planned',    glyph: '→', color: '#1e40af', bg: 'rgba(30,64,175,0.07)',  border: 'rgba(30,64,175,0.25)' },
  pending:     { label: 'Awaiting opinion',  glyph: '…', color: '#6b6b6b', bg: '#f3f0ea',               border: '#d8d2c8' },
  none:        { label: 'No public filing',  glyph: '—', color: '#9a948a', bg: 'transparent',           border: '#e5e0d8' },
};

// ─── SOURCES ────────────────────────────────────────────────────────────────
const S = {
  epar: (slug) => `https://www.ema.europa.eu/en/medicines/human/EPAR/${slug}`,
  fdaHistory: (slug) => `https://www.drugs.com/history/${slug}.html`,
  chmpSep26: 'https://www.ema.europa.eu/en/documents/agenda/agenda-chmp-meeting-14-17-september-2026_en.pdf',
  gileadQ2: 'https://s29.q4cdn.com/585078350/files/doc_financials/2026/q2/GILD-Q226-Prepared-Remarks-4-August-2026.pdf',
  bicLenPriority: 'https://www.gilead.com/news/news-details/2026/u-s--fda-grants-priority-review-of-new-drug-application-for-gileads-once-daily-hiv-treatment-of-bictegravir-plus-lenacapavir',
  bixlenvoApproval: 'https://www.natap.org/2026/HIV/082726_03.htm',
  islendTopline: 'https://www.businesswire.com/news/home/20260608276598/en/Gilead-and-Merck-Announce-Positive-Topline-Results-From-Two-Phase-3-Studies-Evaluating-IslatravirLenacapavir-an-Oral-Once-Weekly-HIV-Treatment',
  yeztugoOral: 'https://www.eatg.org/hiv-news/press-release-fda-accepts-gileads-application-for-investigational-once-weekly-oral-yeztugo-potentially-the-first-long-acting-pill-for-hiv-prevention/',
  lenYearly: 'https://www.gilead.com/news/news-details/2026/gilead-accelerates-global-access-planning-for-investigational-once-yearly-lenacapavir-for-hiv-prevention',
  prepwatchCH: 'https://www.prepwatch.org/countries/switzerland/',
  sunlencaCH: 'https://www.swissmedic.ch/swissmedic/en/home/about-us/publications/public-summary-swiss-par/public-summary-swiss-par-sunlenca.html',
  vocabriaCH: 'https://www.swissmedic.ch/dam/swissmedic/en/dokumente/zulassung/swisspar/67740-vocabria-01-swisspar-20220311.pdf.download.pdf/SwissPAR%20Vocabria.pdf',
  biktarvyCH: 'https://compendium.ch/fr/product/1411007-biktarvy-cpr-pell-50-200-25mg/mpro',
  dovatoCH: 'https://compendium.ch/fr/product/1443505-dovato-cpr-pell-50-300-mg',
  viivCroi26: 'https://www.biospace.com/press-releases/viiv-healthcare-showcases-long-acting-hiv-innovation-and-potential-of-ultra-long-acting-pipeline-including-new-data-for-first-third-generation-integrase-inhibitor-at-croi-2026',
  lapalQ4M: 'https://lapal.ch/formulations/cabotegravir-4-monthly-q4m',
  dorIslAccept: 'https://www.merck.com/news/u-s-fda-accepts-new-drug-application-for-mercks-doravirine-islatravir-an-investigational-once-daily-oral-two-drug-regimen-for-treatment-of-adults-with-virologically-suppressed-hiv-1-infe/',
  idvynsoApproval: 'https://www.consultant360.com/fda-alerts/doravirineislatravir-idvynso-fda-approval-virologically-suppressed-hiv-1-adults',
  mk8527: 'https://www.merck.com/news/merck-to-initiate-phase-3-trials-for-investigational-once-monthly-hiv-prevention-pill/',
};

const NOT_FILED = { s: 'none', note: 'Not filed' };
const NO_INFO = { s: 'none', note: 'No public announcement found' };

// ─── PRODUCTS ───────────────────────────────────────────────────────────────
export const PRODUCTS = [
  // ── GILEAD · TREATMENT ──
  {
    id: 'biktarvy', name: 'Biktarvy', inn: 'bictegravir / emtricitabine / tenofovir alafenamide',
    company: 'Gilead', segment: 'Treatment', klass: 'INSTI-based single-tablet regimen', dosing: 'Oral · once daily',
    stage: 'Marketed',
    position: 'Incumbent standard of care and the active comparator in recent switch trials (ISLEND-1, DOR/ISL trial 052).',
    reg: {
      fda:  { s: 'approved', date: '2018-02-07', src: S.fdaHistory('biktarvy') },
      chmp: { s: 'positive', date: '2018-04-26', src: S.epar('biktarvy') },
      ec:   { s: 'approved', date: '2018-06-21', src: S.epar('biktarvy') },
      ch:   { s: 'approved', dateUnverified: true, note: 'Authorised · date not verified', src: S.biktarvyCH },
    },
    events: [
      { date: '2018-02-07', agency: 'FDA', outcome: 'approved', text: 'First approval for treatment of HIV-1 infection.', src: S.fdaHistory('biktarvy') },
      { date: '2018-04-26', agency: 'CHMP', outcome: 'positive', text: 'CHMP adopted a positive opinion.', src: S.epar('biktarvy') },
      { date: '2018-06-21', agency: 'EC', outcome: 'approved', text: 'EU marketing authorisation issued.', src: S.epar('biktarvy') },
    ],
  },
  {
    id: 'bixlenvo', name: 'Bixlenvo', inn: 'bictegravir / lenacapavir',
    company: 'Gilead', segment: 'Treatment', klass: 'INSTI + capsid inhibitor single-tablet regimen', dosing: 'Oral · once daily',
    stage: 'Marketed (US)',
    position: 'Switch option for virologically suppressed adults, including those on complex regimens. Newest US entrant in the switch segment.',
    trials: 'ARTISTRY-1 (NCT05502341), ARTISTRY-2 (NCT06333808)',
    reg: {
      fda:  { s: 'approved', date: '2026-08-27', src: S.bixlenvoApproval },
      chmp: NO_INFO,
      ec:   NO_INFO,
      ch:   NO_INFO,
    },
    events: [
      { date: '2026-04-29', agency: 'FDA', outcome: 'review', text: 'NDA accepted with priority review; PDUFA date set for 27 Aug 2026.', src: S.bicLenPriority },
      { date: '2026-08-27', agency: 'FDA', outcome: 'approved', text: 'Approved for virologically suppressed adults with HIV-1, on the PDUFA date.', src: S.bixlenvoApproval },
    ],
    watch: 'No EU or Swiss filing has been announced. Gilead said the ARTISTRY data "support global regulatory filings" without giving dates.',
  },
  {
    id: 'isl-len', name: 'Islatravir / lenacapavir', inn: 'islatravir / lenacapavir',
    company: 'Gilead + MSD', segment: 'Treatment', klass: 'NRTTI + capsid inhibitor', dosing: 'Oral · once weekly',
    stage: 'Phase 3 · positive',
    position: 'Would be the first once-weekly oral treatment regimen. Co-developed by Gilead and MSD.',
    trials: 'ISLEND-1 (NCT06630286, vs Biktarvy), ISLEND-2 (NCT06630299, vs standard of care)',
    reg: {
      fda:  { s: 'planned', note: 'Filing "as soon as possible"', src: S.gileadQ2 },
      chmp: NOT_FILED, ec: NOT_FILED, ch: NOT_FILED,
    },
    events: [
      { date: '2026-06-08', agency: 'Company', outcome: 'info', text: 'Both Phase 3 ISLEND trials met the primary endpoint at Week 48 (non-inferior to Biktarvy and to standard of care).', src: S.islendTopline },
      { date: '2026-08-04', agency: 'Company', outcome: 'info', text: 'Gilead Q2 call: filings planned as soon as possible, with potential launch of the first weekly oral in 2027.', src: S.gileadQ2 },
    ],
    watch: 'First regulatory submission. No filing date has been given.',
  },
  {
    id: 'sunlenca', name: 'Sunlenca', inn: 'lenacapavir',
    company: 'Gilead', segment: 'Treatment', klass: 'Capsid inhibitor', dosing: 'Subcutaneous · every 6 months',
    stage: 'Marketed',
    position: 'Heavily treatment-experienced adults with multi-drug resistant HIV-1, with other antiretrovirals.',
    reg: {
      fda:  { s: 'approved', date: '2022-12-22', note: 'After a CRL in Mar 2022', src: S.fdaHistory('sunlenca') },
      chmp: { s: 'positive', date: '2022-06-23', src: S.epar('sunlenca') },
      ec:   { s: 'approved', date: '2022-08-17', src: S.epar('sunlenca') },
      ch:   { s: 'approved', date: '2023-07-07', src: S.sunlencaCH },
    },
    events: [
      { date: '2022-03-01', agency: 'FDA', outcome: 'negative', text: 'Complete Response Letter, citing vial compatibility issues.', src: S.fdaHistory('sunlenca') },
      { date: '2022-06-23', agency: 'CHMP', outcome: 'positive', text: 'CHMP adopted a positive opinion.', src: S.epar('sunlenca') },
      { date: '2022-08-17', agency: 'EC', outcome: 'approved', text: 'EU marketing authorisation issued.', src: S.epar('sunlenca') },
      { date: '2022-12-22', agency: 'FDA', outcome: 'approved', text: 'Approved on resubmission.', src: S.fdaHistory('sunlenca') },
      { date: '2023-07-07', agency: 'Swissmedic', outcome: 'approved', text: 'First authorisation in Switzerland.', src: S.sunlencaCH },
      { date: '2026-09-14', agency: 'CHMP', outcome: 'review', text: 'Type II variations on the Sept 2026 CHMP agenda, including a change of indication to cover oral bridging. Outcome not yet published.', src: S.chmpSep26 },
    ],
  },

  // ── VIIV · TREATMENT ──
  {
    id: 'dovato', name: 'Dovato', inn: 'dolutegravir / lamivudine',
    company: 'ViiV Healthcare', segment: 'Treatment', klass: 'INSTI-based two-drug regimen', dosing: 'Oral · once daily',
    stage: 'Marketed',
    position: 'Established oral two-drug regimen and the reference point for any new 2DR.',
    reg: {
      fda:  { s: 'approved', date: '2019-04-08', src: S.fdaHistory('dovato') },
      chmp: { s: 'positive', date: '2019-04-26', src: S.epar('dovato') },
      ec:   { s: 'approved', date: '2019-07-01', src: S.epar('dovato') },
      ch:   { s: 'approved', dateUnverified: true, note: 'Authorised · date not verified', src: S.dovatoCH },
    },
    events: [
      { date: '2019-04-08', agency: 'FDA', outcome: 'approved', text: 'First approval, for adults with no antiretroviral treatment history.', src: S.fdaHistory('dovato') },
      { date: '2019-04-26', agency: 'CHMP', outcome: 'positive', text: 'CHMP adopted a positive opinion.', src: S.epar('dovato') },
      { date: '2019-07-01', agency: 'EC', outcome: 'approved', text: 'EU marketing authorisation issued.', src: S.epar('dovato') },
    ],
  },
  {
    id: 'cab-rpv', name: 'Cabenuva · Vocabria + Rekambys', inn: 'cabotegravir + rilpivirine (long-acting)',
    company: 'ViiV Healthcare / J&J', segment: 'Treatment', klass: 'INSTI + NNRTI long-acting injectable', dosing: 'Intramuscular · monthly or every 2 months',
    stage: 'Marketed',
    position: 'Only complete long-acting injectable regimen on the market. Sold as Cabenuva in the US and as Vocabria + Rekambys in Europe.',
    reg: {
      fda:  { s: 'approved', date: '2021-01-21', src: S.fdaHistory('cabenuva') },
      chmp: { s: 'positive', date: '2020-10-15', src: S.epar('vocabria') },
      ec:   { s: 'approved', date: '2020-12-17', src: S.epar('vocabria') },
      ch:   { s: 'approved', date: '2021-10-08', note: 'Vocabria', src: S.vocabriaCH },
    },
    events: [
      { date: '2020-10-15', agency: 'CHMP', outcome: 'positive', text: 'CHMP adopted positive opinions for Vocabria and Rekambys.', src: S.epar('rekambys') },
      { date: '2020-12-17', agency: 'EC', outcome: 'approved', text: 'EU marketing authorisations issued for Vocabria and Rekambys.', src: S.epar('vocabria') },
      { date: '2021-01-21', agency: 'FDA', outcome: 'approved', text: 'Cabenuva approved as a long-acting injectable regimen.', src: S.fdaHistory('cabenuva') },
      { date: '2021-10-08', agency: 'Swissmedic', outcome: 'approved', text: 'Vocabria authorised, for use with rilpivirine injections.', src: S.vocabriaCH },
    ],
  },

  // ── GILEAD · PREP ──
  {
    id: 'yeztugo', name: 'Yeztugo · Yeytuo', inn: 'lenacapavir',
    company: 'Gilead', segment: 'PrEP', klass: 'Capsid inhibitor', dosing: 'Subcutaneous · every 6 months',
    stage: 'Marketed',
    position: 'First twice-yearly PrEP. Yeztugo in the US, Yeytuo in the EU.',
    trials: 'PURPOSE 1, PURPOSE 2',
    reg: {
      fda:  { s: 'approved', date: '2025-06-18', src: S.fdaHistory('yeztugo') },
      chmp: { s: 'positive', date: '2025-07-24', src: S.epar('yeytuo') },
      ec:   { s: 'approved', date: '2025-08-25', src: S.epar('yeytuo') },
      ch:   { s: 'review', note: 'Per PrEPWatch, 25 Sep 2026', src: S.prepwatchCH },
    },
    events: [
      { date: '2025-02-18', agency: 'FDA', outcome: 'review', text: 'NDAs accepted under priority review.', src: S.fdaHistory('yeztugo') },
      { date: '2025-06-18', agency: 'FDA', outcome: 'approved', text: 'Approved for PrEP in adults and adolescents weighing at least 35 kg.', src: S.fdaHistory('yeztugo') },
      { date: '2025-07-24', agency: 'CHMP', outcome: 'positive', text: 'CHMP adopted a positive opinion.', src: S.epar('yeytuo') },
      { date: '2025-08-25', agency: 'EC', outcome: 'approved', text: 'EU marketing authorisation issued.', src: S.epar('yeytuo') },
      { date: '2026-09-25', agency: 'Swissmedic', outcome: 'review', text: 'Listed as under review in Switzerland (PrEPWatch country page, updated 25 Sep 2026).', src: S.prepwatchCH },
    ],
    watch: 'Swissmedic decision. No date has been published.',
  },
  {
    id: 'yeztugo-oral', name: 'Yeztugo weekly tablet', inn: 'lenacapavir 300 mg',
    company: 'Gilead', segment: 'PrEP', klass: 'Capsid inhibitor', dosing: 'Oral · once weekly',
    stage: 'Under FDA review',
    position: 'Would be the first long-acting oral PrEP. Filed as a supplement to Yeztugo on the PURPOSE 1 and 2 data.',
    reg: {
      fda:  { s: 'review', date: '2027-02-02', expected: true, note: 'PDUFA date', src: S.yeztugoOral },
      chmp: NO_INFO, ec: NO_INFO, ch: NO_INFO,
    },
    events: [
      { date: '2026-06-15', agency: 'FDA', outcome: 'review', text: 'sNDA accepted for once-weekly oral lenacapavir for PrEP.', src: S.yeztugoOral },
      { date: '2027-02-02', agency: 'FDA', outcome: 'expected', expected: true, text: 'PDUFA target action date.', src: S.yeztugoOral },
    ],
    watch: 'FDA decision due by 2 Feb 2027.',
  },
  {
    id: 'len-yearly', name: 'Lenacapavir once-yearly', inn: 'lenacapavir (intramuscular)',
    company: 'Gilead', segment: 'PrEP', klass: 'Capsid inhibitor', dosing: 'Intramuscular · once yearly',
    stage: 'Phase 3',
    position: 'Extends the lenacapavir PrEP franchise to a single annual dose.',
    trials: 'PURPOSE 365 (NCT07047716)',
    reg: { fda: NOT_FILED, chmp: NOT_FILED, ec: NOT_FILED, ch: NOT_FILED },
    events: [
      { date: '2026-08-04', agency: 'Company', outcome: 'info', text: 'Gilead Q2 call: PURPOSE 365 recruitment complete; update expected in 2027, potential launch in 2028.', src: S.gileadQ2 },
      { date: '2026-09-16', agency: 'Company', outcome: 'info', text: 'Voluntary licences extended to cover the once-yearly formulation in 120 countries.', src: S.lenYearly },
    ],
    watch: 'PURPOSE 365 update, expected in 2027.',
  },

  // ── VIIV · PREP ──
  {
    id: 'apretude', name: 'Apretude', inn: 'cabotegravir (long-acting)',
    company: 'ViiV Healthcare', segment: 'PrEP', klass: 'INSTI long-acting injectable', dosing: 'Intramuscular · every 2 months',
    stage: 'Marketed',
    position: 'First long-acting injectable PrEP. Now competing against twice-yearly lenacapavir.',
    reg: {
      fda:  { s: 'approved', date: '2021-12-20', src: S.fdaHistory('apretude') },
      chmp: { s: 'positive', date: '2023-07-20', src: S.epar('apretude') },
      ec:   { s: 'approved', date: '2023-09-15', src: S.epar('apretude') },
      ch:   { s: 'notapproved', note: 'Per PrEPWatch, 25 Sep 2026', src: S.prepwatchCH },
    },
    events: [
      { date: '2021-12-20', agency: 'FDA', outcome: 'approved', text: 'First approval for HIV PrEP.', src: S.fdaHistory('apretude') },
      { date: '2023-07-20', agency: 'CHMP', outcome: 'positive', text: 'CHMP adopted a positive opinion.', src: S.epar('apretude') },
      { date: '2023-09-15', agency: 'EC', outcome: 'approved', text: 'EU marketing authorisation issued.', src: S.epar('apretude') },
    ],
  },
  {
    id: 'cab-q4m', name: 'Cabotegravir ultra long-acting', inn: 'cabotegravir (CAB-ULA)',
    company: 'ViiV Healthcare', segment: 'PrEP', klass: 'INSTI long-acting injectable', dosing: 'Intramuscular · every 4 months',
    stage: 'Registrational study',
    position: 'ViiV\'s answer to twice-yearly lenacapavir: halves the number of Apretude injections per year.',
    reg: {
      fda:  { s: 'planned', note: 'Preliminary 2026 filing (Shionogi report)', src: S.lapalQ4M },
      chmp: NOT_FILED, ec: NOT_FILED, ch: NOT_FILED,
    },
    events: [
      { date: '2026-02-25', agency: 'Company', outcome: 'info', text: 'Phase 1 dose-selection data for PrEP presented at CROI 2026. No filing timing stated.', src: S.viivCroi26 },
    ],
    watch: 'First filing. A 2026 filing and launch for PrEP was indicated in Shionogi\'s FY2024 interim report (as cited by LAPaL, Aug 2026); ViiV has not confirmed a date.',
  },

  // ── MSD · BENCHMARK ──
  {
    id: 'idvynso', name: 'Idvynso', inn: 'doravirine / islatravir',
    company: 'MSD', segment: 'Treatment', klass: 'NNRTI + NRTTI two-drug regimen', dosing: 'Oral · once daily',
    stage: 'Marketed (US)',
    position: 'First non-INSTI, tenofovir-free two-drug regimen. Switch indication for virologically suppressed adults.',
    trials: 'Trial 051 (NCT05631093), Trial 052 (NCT05630755, vs Biktarvy)',
    reg: {
      fda:  { s: 'approved', date: '2026-04-21', src: S.idvynsoApproval },
      chmp: { s: 'review', note: 'Day 120 questions, Sept 2026', src: S.chmpSep26 },
      ec:   { s: 'pending' },
      ch:   NO_INFO,
    },
    events: [
      { date: '2025-07-10', agency: 'FDA', outcome: 'review', text: 'NDA accepted; PDUFA date set for 28 Apr 2026.', src: S.dorIslAccept },
      { date: '2026-04-21', agency: 'FDA', outcome: 'approved', text: 'Approved for virologically suppressed adults with no history of treatment failure and no known doravirine resistance.', src: S.idvynsoApproval },
      { date: '2026-09-14', agency: 'CHMP', outcome: 'review', text: 'Initial application EMEA/H/C/006642 on the CHMP agenda for adoption of the Day 120 list of questions.', src: S.chmpSep26 },
    ],
    watch: 'CHMP opinion. The procedure reached the Day 120 list of questions in Sept 2026.',
  },
  {
    id: 'mk-8527', name: 'MK-8527', inn: 'MK-8527',
    company: 'MSD', segment: 'PrEP', klass: 'NRTTI', dosing: 'Oral · once monthly',
    stage: 'Phase 3',
    position: 'Once-monthly oral PrEP, positioned between daily pills and injectables.',
    trials: 'EXPrESSIVE-11 (NCT07044297), EXPrESSIVE-10',
    reg: { fda: NOT_FILED, chmp: NOT_FILED, ec: NOT_FILED, ch: NOT_FILED },
    events: [
      { date: '2025-07-14', agency: 'Company', outcome: 'info', text: 'Phase 3 programme announced: two trials against daily FTC/TDF, enrolment from Aug 2025.', src: S.mk8527 },
    ],
  },
];

// Earlier-stage assets: no regulatory interaction yet, tracked for context only.
export const EARLY_PIPELINE = [
  { name: 'Cabotegravir ULA + rilpivirine', company: 'ViiV Healthcare / J&J', segment: 'Treatment', stage: 'In development', note: 'Every-4-month treatment regimen. Preliminary 2027 filing per Shionogi\'s FY2024 interim report.', src: S.lapalQ4M },
  { name: 'Lotivibart (N6LS) + cabotegravir LA', company: 'ViiV Healthcare', segment: 'Treatment', stage: 'Phase 2b', note: 'EMBRACE: broadly neutralising antibody every 4 months. Twice-yearly dosing to be evaluated.', src: S.viivCroi26 },
  { name: 'VH-184', company: 'ViiV Healthcare', segment: 'Treatment', stage: 'Phase 1', note: 'Third-generation integrase inhibitor, long-acting injectable formulations.', src: S.viivCroi26 },
  { name: 'VH-499', company: 'ViiV Healthcare', segment: 'Treatment', stage: 'Early clinical', note: 'Injectable capsid inhibitor for ultra-long-acting dosing.', src: S.viivCroi26 },
  { name: 'Lenacapavir + teropavimab + zinlirvimab', company: 'Gilead', segment: 'Treatment', stage: 'Phase 3 starting', note: 'Twice-yearly regimen with two broadly neutralising antibodies. Potential launch around 2030.', src: S.gileadQ2 },
  { name: 'Lenacapavir + GS-3242 / GS-1720', company: 'Gilead', segment: 'Treatment', stage: 'Phase 2 starting', note: 'Once-weekly oral combinations. Trials start late 2026 and early 2027.', src: S.gileadQ2 },
];
