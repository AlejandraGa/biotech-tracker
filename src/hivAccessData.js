// ─── HIV MARKET ACCESS · CURATED DATASET ────────────────────────────────────
// UK regulator (MHRA) and reimbursement / HTA bodies for the tracked assets.
// Same rule as the regulatory file: every entry was checked against its
// linked source on ACCESS_VERIFIED_ON; anything not confirmed says so.

export const ACCESS_VERIFIED_ON = '2026-10-10';

export const ACCESS_BODIES = [
  { key: 'nice', label: 'NICE', region: 'England', hint: 'Technology appraisal' },
  { key: 'gba', label: 'G-BA', region: 'Germany', hint: 'Added-benefit assessment' },
  { key: 'has', label: 'HAS', region: 'France', hint: 'Transparency Committee opinion' },
  { key: 'sl', label: 'BAG · Spezialitätenliste', region: 'Switzerland', hint: 'Listing and public price' },
  { key: 'eko', label: 'Dachverband · Erstattungskodex', region: 'Austria', hint: 'Reimbursement listing' },
];

const S = {
  epar: (slug) => `https://www.ema.europa.eu/en/medicines/human/EPAR/${slug}`,
  mhraLen: 'https://www.gov.uk/government/news/mhra-approves-lenacapavir-for-the-prevention-of-sexually-transmitted-hiv-1-infection',
  mhraCab: 'https://www.gov.uk/government/news/new-cabotegravir-formulations-approved-to-help-prevent-hiv-1-infection-in-adults-and-adolescents',
  niceLen: 'https://pharmaceutical-journal.com/article/news/nice-rejects-long-acting-hiv-prevention-treatment-lenacapavir-for-nhs-use',
  niceCabPrep: 'https://www.nice.org.uk/guidance/ta1106',
  niceCabRpv: 'https://www.nice.org.uk/guidance/ta757',
  gbaBiktarvy: 'https://www.g-ba.de/downloads/39-261-3616/2018-12-20_AM-RL-XII_Bictegravir-Emtricitabin-Tenofoviralafenamid_D-364.pdf',
  gbaDovato: 'https://www.g-ba.de/downloads/39-1464-4157/2020-02-06_AM-RL-XII_Dolutegravir-Lamivudin_D-465_EN.pdf',
  gbaCab: 'https://www.g-ba.de/downloads/39-261-5067/2021-10-21_AM-RL-XII_Cabotegravir_D-645_BAnz.pdf',
  gbaCabAdol: 'https://www.g-ba.de/downloads/40-268-11800/2025-08-07_AM-RL-XII_Cabotegravir_D-1162_TrG.pdf',
  gileadDe: 'https://www.gilead-dialog.de/statement-nicht-einfuhrung-lenacapavir-deutschland/',
  hasBiktarvy: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/62844771/extrait',
  hasDovato: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/67301231/extrait',
  hasVocabria: 'https://www.has-sante.fr/upload/docs/evamed/CT-21353_VOCABRIA_PIC_EI_AvisDef_CT21353.pdf',
  hasSunlenca: 'https://www.has-sante.fr/jcms/p_3392767/fr/sunlenca-lenacapavir-sodique-vih1-multiresistante-aux-medicaments',
  hasApretude: 'https://www.has-sante.fr/jcms/p_3526084/fr/apretude-cabotegravir-vih-/-prep',
  slVocabria: 'https://www.bag.admin.ch/dam/de/sd-web/TdymJb8dRvnC/vocabria-rekambys-neuaufnahme-01-03-2022.pdf',
  slSunlenca: 'https://www.bag.admin.ch/dam/de/sd-web/BCPn4sUuq4Zc/sunlenca-neuaufnahme-01-11-2024.pdf',
  // Live Spezialitätenliste search; prices read on ACCESS_VERIFIED_ON.
  sl: (name) => `https://sl.bag.admin.ch/sl?search=${name}`,
  ekoDovato: 'https://www.ris.bka.gv.at/Dokumente/Avsv/AVSV_2020_0022/AVSV_2020_0022.html',
  ekoVocabria: 'https://www.medmedia.at/aerzte-krone/langwirksame-injizierbare-hiv-therapie-in-der-gelben-box/',
};

const NONE = { s: 'none', note: 'No assessment found' };
const NOT_CHECKED = { s: 'none', note: 'Not verified' };
const NOT_AUTH = { s: 'none', note: 'Not authorised here' };
const EKO_UNKNOWN = { s: 'none', note: 'Not verified' };

// Per asset: `mhra` joins the regulatory view; the rest form the reimbursement view.
export const ACCESS = {
  biktarvy: {
    mhra: { s: 'approved', date: '2018-06-21', note: 'Via EU authorisation (pre-2021)', src: S.epar('biktarvy') },
    nice: { s: 'none', note: 'No NICE appraisal found' },
    gba: { s: 'noadded', date: '2018-12-20', src: S.gbaBiktarvy },
    has: { s: 'favourable', date: '2018-09-05', note: 'SMR important · ASMR V', src: S.hasBiktarvy },
    sl: { s: 'listed', note: 'No limitation · CHF 1,110.05 for 30 tablets', src: S.sl('Biktarvy') },
    eko: EKO_UNKNOWN,
    events: [
      { date: '2018-09-05', agency: 'HAS', outcome: 'favourable', text: 'Listing opinion: SMR important, ASMR V (no improvement, non-inferior to Triumeq).', src: S.hasBiktarvy },
      { date: '2018-12-20', agency: 'G-BA', outcome: 'noadded', text: 'Added benefit not proven, in therapy-naive and therapy-experienced adults.', src: S.gbaBiktarvy },
    ],
  },
  bixlenvo: { mhra: NONE_REG(), nice: NOT_AUTH, gba: NOT_AUTH, has: NOT_AUTH, sl: NOT_AUTH, eko: NOT_AUTH, events: [] },
  'isl-len': { mhra: NOT_FILED(), nice: NOT_AUTH, gba: NOT_AUTH, has: NOT_AUTH, sl: NOT_AUTH, eko: NOT_AUTH, events: [] },
  sunlenca: {
    mhra: { s: 'none', note: 'Not verified' },
    nice: { s: 'none', note: 'No NICE appraisal found' },
    gba: NONE,
    has: { s: 'favourable', date: '2022-11-09', note: 'SMR important · ASMR III', src: S.hasSunlenca },
    sl: { s: 'limited', date: '2024-11-01', note: 'Time-limited to 31 Oct 2026 · CHF 20,360.15 for 2 vials', src: S.slSunlenca },
    eko: EKO_UNKNOWN,
    events: [
      { date: '2022-11-09', agency: 'HAS', outcome: 'favourable', text: 'Favourable to reimbursement: SMR important, ASMR III (moderate improvement).', src: S.hasSunlenca },
      { date: '2024-11-01', agency: 'BAG', outcome: 'limited', text: 'Added to the Spezialitätenliste with a limitation (multidrug-resistant HIV-1, specialist centres, insurer approval). Listing is time-limited.', src: S.slSunlenca },
      { date: '2026-10-31', agency: 'BAG', outcome: 'expected', expected: true, text: 'Time-limited Spezialitätenliste listing runs out; a renewal decision is due.', src: S.slSunlenca },
    ],
  },
  dovato: {
    mhra: { s: 'approved', date: '2019-07-01', note: 'Via EU authorisation (pre-2021)', src: S.epar('dovato') },
    nice: { s: 'none', note: 'No NICE appraisal found' },
    gba: { s: 'noadded', date: '2020-02-06', src: S.gbaDovato },
    has: { s: 'restricted', label: 'Favourable, restricted', date: '2020-01-08', note: 'ASMR IV naive · V switch', src: S.hasDovato },
    sl: { s: 'listed', note: 'No limitation · CHF 778.20 for 30 tablets', src: S.sl('Dovato') },
    eko: { s: 'limited', label: 'Listed, yellow box', date: '2020-03-01', note: 'Prior approval, valid 6 months (L6)', src: S.ekoDovato },
    events: [
      { date: '2020-01-08', agency: 'HAS', outcome: 'restricted', text: 'SMR important in a restricted population, insufficient elsewhere. ASMR IV in treatment-naive patients, ASMR V in switch.', src: S.hasDovato },
      { date: '2020-02-06', agency: 'G-BA', outcome: 'noadded', text: 'Added benefit not proven in any of four patient groups.', src: S.gbaDovato },
      { date: '2020-03-01', agency: 'Dachverband', outcome: 'limited', text: 'Added to the Austrian Erstattungskodex, yellow box, with long-term approval for 6 months. Treatment to be started and monitored by a physician experienced in HIV.', src: S.ekoDovato },
      { date: '2025-07-09', agency: 'HAS', outcome: 'restricted', text: 'Re-evaluation: SMR important, naive population widened to viral load under 500,000 copies/mL. ASMR unchanged.', src: S.hasDovato },
    ],
  },
  'cab-rpv': {
    mhra: { s: 'approved', date: '2020-12-17', note: 'Via EU authorisation (pre-2021)', src: S.epar('vocabria') },
    nice: { s: 'restricted', label: 'Recommended, restricted', date: '2022-01-05', note: 'TA757', src: S.niceCabRpv },
    gba: { s: 'noadded', date: '2021-10-21', src: S.gbaCab },
    has: { s: 'restricted', label: 'Favourable, restricted', date: '2021-04-21', note: 'SMR important · ASMR V', src: S.hasVocabria },
    sl: { s: 'limited', date: '2022-03-01', note: 'Every-2-month schedule only · CHF 1,256.30 + CHF 547.05 per injection pair', src: S.slVocabria },
    eko: { s: 'limited', label: 'Listed, yellow box', date: '2023-01-01', src: S.ekoVocabria },
    events: [
      { date: '2021-04-21', agency: 'HAS', outcome: 'restricted', text: 'Initial listing: SMR important in a restricted adult population, insufficient elsewhere. ASMR V.', src: S.hasVocabria },
      { date: '2021-10-21', agency: 'G-BA', outcome: 'noadded', text: 'Added benefit not proven in virologically suppressed adults; no suitable data submitted.', src: S.gbaCab },
      { date: '2022-01-05', agency: 'NICE', outcome: 'restricted', text: 'TA757 published for virologically suppressed adults with no resistance to, or prior failure with, NNRTIs or integrase inhibitors.', src: S.niceCabRpv },
      { date: '2022-03-01', agency: 'BAG', outcome: 'limited', text: 'Vocabria and Rekambys added to the Spezialitätenliste. Reimbursed for the every-2-month schedule only.', src: S.slVocabria },
      { date: '2023-01-01', agency: 'Dachverband', outcome: 'limited', text: 'Vocabria + Rekambys reimbursed from the yellow box of the Austrian Erstattungskodex.', src: S.ekoVocabria },
      { date: '2025-08-07', agency: 'G-BA', outcome: 'noadded', text: 'Adolescent extension: added benefit not proven.', src: S.gbaCabAdol },
      { date: '2025-10-08', agency: 'HAS', outcome: 'restricted', text: 'Adolescent extension: favourable, SMR important, ASMR V.', src: S.hasVocabria },
    ],
  },
  idvynso: { mhra: NONE_REG(), nice: NOT_AUTH, gba: NOT_AUTH, has: NOT_AUTH, sl: NOT_AUTH, eko: NOT_AUTH, events: [] },
  yeztugo: {
    mhra: { s: 'approved', date: '2025-12-19', src: S.mhraLen },
    nice: { s: 'unfavourable', label: 'Draft: not recommended', date: '2026-09-09', note: 'Committee meets again 3 Nov 2026', src: S.niceLen },
    gba: { s: 'none', note: 'No assessment found · see Gilead Germany statement', src: S.gileadDe },
    has: { s: 'none', note: 'No opinion found' },
    sl: { s: 'none', note: 'Not listed · awaiting Swissmedic', src: S.sl('Lenacapavir') },
    eko: EKO_UNKNOWN,
    events: [
      { date: '2025-12-19', agency: 'MHRA', outcome: 'approved', text: 'Yeytuo approved in the UK for PrEP in adults and adolescents.', src: S.mhraLen },
      { date: '2026-09-09', agency: 'NICE', outcome: 'unfavourable', text: 'Draft guidance: lenacapavir "should not be used". Cost-effectiveness estimates are above the range NICE accepts; the draft also cites uncertainty in the clinical evidence and the economic model.', src: S.niceLen },
      { date: '2026-11-03', agency: 'NICE', outcome: 'expected', expected: true, text: 'Evaluation committee reconvenes to review the draft decision.', src: S.niceLen },
    ],
    watch: 'NICE committee on 3 Nov 2026, and the Swissmedic decision.',
  },
  'yeztugo-oral': { mhra: NONE_REG(), nice: NOT_AUTH, gba: NOT_AUTH, has: NOT_AUTH, sl: NOT_AUTH, eko: NOT_AUTH, events: [] },
  'len-yearly': { mhra: NOT_FILED(), nice: NOT_AUTH, gba: NOT_AUTH, has: NOT_AUTH, sl: NOT_AUTH, eko: NOT_AUTH, events: [] },
  apretude: {
    mhra: { s: 'approved', date: '2024-05-03', src: S.mhraCab },
    nice: { s: 'restricted', label: 'Recommended, restricted', date: '2025-11-05', note: 'TA1106 · only if oral PrEP is unsuitable', src: S.niceCabPrep },
    gba: NONE,
    has: { s: 'favourable', date: '2024-05-29', note: 'SMR important · ASMR IV', src: S.hasApretude },
    sl: { s: 'none', note: 'Not listed · not authorised in Switzerland', src: S.sl('Apretude') },
    eko: EKO_UNKNOWN,
    events: [
      { date: '2024-05-03', agency: 'MHRA', outcome: 'approved', text: 'Apretude approved in the UK for PrEP in adults and adolescents weighing at least 35 kg.', src: S.mhraCab },
      { date: '2024-05-29', agency: 'HAS', outcome: 'favourable', text: 'Favourable: SMR important, ASMR IV versus daily oral PrEP. Positioned for people who cannot take or adhere to oral PrEP.', src: S.hasApretude },
      { date: '2025-11-05', agency: 'NICE', outcome: 'restricted', text: 'TA1106: recommended only for people who cannot have oral PrEP, at the framework price. Not recommended where oral PrEP is an option.', src: S.niceCabPrep },
    ],
  },
  'cab-q4m': { mhra: NOT_FILED(), nice: NOT_AUTH, gba: NOT_AUTH, has: NOT_AUTH, sl: NOT_AUTH, eko: NOT_AUTH, events: [] },
  'mk-8527': { mhra: NOT_FILED(), nice: NOT_AUTH, gba: NOT_AUTH, has: NOT_AUTH, sl: NOT_AUTH, eko: NOT_AUTH, events: [] },
};

function NONE_REG() { return { s: 'none', note: 'No public announcement found' }; }
function NOT_FILED() { return { s: 'none', note: 'Not filed' }; }

// Extra statuses used by the reimbursement view.
export const ACCESS_STATUS = {
  favourable:   { label: 'Favourable',            glyph: '✓', color: '#166534' },
  restricted:   { label: 'Restricted',            glyph: '◆', color: '#166534' },
  limited:      { label: 'Listed, with limits',   glyph: '◆', color: '#166534' },
  listed:       { label: 'Listed',                glyph: '✓', color: '#166534' },
  noadded:      { label: 'No added benefit',      glyph: '○', color: '#6b6b6b' },
  unfavourable: { label: 'Not recommended',       glyph: '✕', color: '#b3122b' },
};
