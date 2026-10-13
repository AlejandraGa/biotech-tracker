// scripts/watch/sources.mjs — the pages the daily check reads.
//
// Each watch is one page (or API call) for one body. `products` lists the assets
// looked for on it; `terms` are the names whose surrounding text is compared.
// Bodies whose sites forbid automated reading (robots.txt) or need a browser
// are left out and stay curated by hand: TGA, AIFA, Spain's funding search,
// INFARMED, TLV / NT-rådet, RIZIV and the Austrian Erstattungskodex. CDA-AMC refuses
// automated requests (HTTP 403), so it stays curated too.
import { BASE } from '../../src/hivData.js';

const TERMS = {
  biktarvy: ['Biktarvy', 'bictegravir'],
  bixlenvo: ['Bixlenvo', 'bictegravir/lenacapavir', 'bictegravir and lenacapavir', 'bictegravir plus lenacapavir'],
  sunlenca: ['Sunlenca', 'lenacapavir', 'lenakapavir'],
  dovato: ['Dovato', 'dolutegravir/lamivudine', 'dolutegravir / lamivudine', 'Dolutegravir/Lamivudin'],
  'cab-rpv': ['Vocabria', 'Rekambys', 'Cabenuva', 'cabotegravir', 'kabotegravir', 'Cabotegravir/Rilpivirin', 'rilpivirine'],
  yeztugo: ['Yeztugo', 'Yeytuo', 'lenacapavir', 'lenakapavir'],
  apretude: ['Apretude', 'cabotegravir', 'kabotegravir'],
  idvynso: ['Idvynso', 'islatravir'],
};
const IDS = Object.keys(TERMS);
const product = (id, column, type) => {
  const p = BASE.find((x) => x.id === id);
  const current = type === 'access' ? p.access[column] : p.reg[column];
  return { id, name: p.name, inn: p.inn, terms: TERMS[id], current };
};
const all = (column, type, ids = IDS) => ids.map((id) => product(id, column, type));

// One watch per product, from a URL template.
function perProduct(base, ids, url) {
  return ids.map((id) => ({ ...base, id: `${base.column}-${id}`, url: url(id), products: [product(id, base.column, base.type)] }));
}

const INN_QUERY = { biktarvy: 'bictegravir', bixlenvo: 'bictegravir lenacapavir', sunlenca: 'lenacapavir', dovato: 'dolutegravir lamivudine', 'cab-rpv': 'cabotegravir rilpivirine', yeztugo: 'lenacapavir', apretude: 'cabotegravir', idvynso: 'doravirine islatravir' };
const BRAND_QUERY = { biktarvy: 'biktarvy', bixlenvo: 'bixlenvo', sunlenca: 'sunlenca', dovato: 'dovato', 'cab-rpv': 'cabenuva', yeztugo: 'yeztugo', apretude: 'apretude', idvynso: 'idvynso' };
const FR_MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const now = new Date();

// HAS opinions, from the French public medicines database's open-data files:
// the brand names come from CIS_bdpm, the SMR and ASMR ratings from the HAS files.
const BDPM = 'https://base-donnees-publique.medicaments.gouv.fr/download/file/';
async function hasOpinions(getRaw) {
  const [cis, smr, asmr] = await Promise.all(['CIS_bdpm.txt', 'CIS_HAS_SMR_bdpm.txt', 'CIS_HAS_ASMR_bdpm.txt'].map((f) => getRaw(BDPM + f)));
  const brands = Object.values(TERMS).map((t) => t[0].toUpperCase());
  const names = new Map();
  for (const line of cis.split('\n')) {
    const [code, name] = line.split('\t');
    if (name && brands.some((b) => name.toUpperCase().includes(b))) names.set(code, name.trim());
  }
  const rows = (text, kind) => text.split('\n').map((l) => l.split('\t')).filter((c) => names.has(c[0]))
    .map(([code, , reason, date, value, label]) => `${names.get(code)} · ${kind} ${value} · ${date} · ${reason} · ${(label || '').trim()}`);
  return [...new Set([...rows(smr, 'SMR'), ...rows(asmr, 'ASMR')])].sort().join('\n');
}

export const WATCHES = [
  { id: 'ch-new', body: 'Swissmedic', bodyName: 'Swissmedic', country: 'Switzerland', column: 'ch', type: 'reg',
    url: 'https://www.swissmedic.ch/swissmedic/en/home/humanarzneimittel/authorisations/new-medicines.html', products: all('ch', 'reg') },
  ...perProduct({ body: 'MHRA', bodyName: 'the MHRA', country: 'United Kingdom', column: 'mhra', type: 'reg' }, IDS,
    (id) => `https://www.gov.uk/api/search.json?filter_organisations=medicines-and-healthcare-products-regulatory-agency&q=${encodeURIComponent(INN_QUERY[id])}&count=20&order=-public_timestamp&fields=title,link,public_timestamp,description`),
  ...perProduct({ body: 'Health Canada', bodyName: 'Health Canada', country: 'Canada', column: 'hc', type: 'reg' }, IDS,
    (id) => `https://health-products.canada.ca/api/drug/drugproduct/?brandname=${BRAND_QUERY[id]}&lang=en&type=json`),
  { id: 'gba-list', body: 'G-BA', bodyName: 'the G-BA', country: 'Germany', column: 'gba', type: 'access',
    url: 'https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/', products: all('gba', 'access') },
  ...[['ta757', 'cab-rpv'], ['ta1106', 'apretude'], ['indevelopment/gid-ta11638', 'yeztugo']].map(([path, id]) => (
    { id: `nice-${id}`, body: 'NICE', bodyName: 'NICE', country: 'England', column: 'nice', type: 'access', url: `https://www.nice.org.uk/guidance/${path}`, products: [product(id, 'nice', 'access')] })),
  ...perProduct({ body: 'SMC', bodyName: 'the Scottish Medicines Consortium', country: 'Scotland', column: 'smc', type: 'access' }, IDS,
    (id) => `https://www.scottishmedicines.org.uk/search/?keywords=${encodeURIComponent(INN_QUERY[id].split(' ')[0])}`),
  ...perProduct({ body: 'NCPE', bodyName: 'the NCPE (Ireland)', country: 'Ireland', column: 'ie', type: 'access' }, IDS,
    (id) => `https://www.ncpe.ie/?s=${encodeURIComponent(INN_QUERY[id].split(' ')[0])}`),
  { id: 'has-bdpm', body: 'HAS', bodyName: 'the HAS Transparency Committee', country: 'France', column: 'has', type: 'access',
    url: 'https://base-donnees-publique.medicaments.gouv.fr/telechargement', fetch: hasOpinions, products: all('has', 'access') },
  { id: 'nl-sunlenca', body: 'Zorginstituut', bodyName: 'Zorginstituut Nederland', country: 'Netherlands', column: 'nl', type: 'access',
    url: 'https://english.zorginstituutnederland.nl/documents/2022/09/22/gvs-advice-lenacapavir-sunlenca', products: [product('sunlenca', 'nl', 'access')] },
  { id: 'be-cbip', body: 'RIZIV', bodyName: 'RIZIV / INAMI (as reported by the CBIP monthly update)', country: 'Belgium', column: 'be', type: 'access',
    url: `https://www.cbip.be/fr/nouveautes-medicaments-${FR_MONTHS[now.getUTCMonth()]}-${now.getUTCFullYear()}/`, products: all('be', 'access') },
  { id: 'dk-ongoing', body: 'Medicinradet', bodyName: 'Medicinrådet', country: 'Denmark', column: 'dk', type: 'access',
    url: 'https://medicinraadet.dk/igangvaerende-vurderinger', products: all('dk', 'access') },
  { id: 'dk-biktarvy', body: 'Medicinradet', bodyName: 'Medicinrådet', country: 'Denmark', column: 'dk', type: 'access',
    url: 'https://medicinraadet.dk/anbefalinger-og-vejledninger/laegemidler-og-indikationsudvidelser/b/bictegraviremtricitabinetenofovir-alafenamid-biktarvy-hiv-infektion', products: [product('biktarvy', 'dk', 'access')] },
  { id: 'dk-cab-rpv', body: 'Medicinradet', bodyName: 'Medicinrådet', country: 'Denmark', column: 'dk', type: 'access',
    url: 'https://medicinraadet.dk/anbefalinger-og-vejledninger/laegemidler-og-indikationsudvidelser/revurderinger/cabotegravirrilpivirin-hiv-1-infektion', products: [product('cab-rpv', 'dk', 'access')] },
  ...[['lenacapavir/', ['sunlenca', 'yeztugo']], ['cabotegravir/', ['apretude']], ['kabotegravir-vocabria', ['cab-rpv']]].map(([path, ids]) => (
    { id: `no-${ids[0]}`, body: 'Nye Metoder', bodyName: 'Nye Metoder', country: 'Norway', column: 'no', type: 'access', url: `https://www.nyemetoder.no/metoder/${path}`, products: ids.map((id) => product(id, 'no', 'access')) })),
  ...[['medicinestatus/document/1059.html', 'sunlenca'], ['medicine/item/12937X', 'cab-rpv'], ['medicine/item/12939B', 'apretude']].map(([path, id]) => (
    { id: `pbac-${id}`, body: 'PBAC', bodyName: 'the PBAC / PBS', country: 'Australia', column: 'pbac', type: 'access', url: `https://www.pbs.gov.au/${path}`, products: [product(id, 'pbac', 'access')] })),
];
