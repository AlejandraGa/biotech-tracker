// api/_lib/hivNews.js — shared by /api/rss and /api/press
// Decides whether a news item is about HIV, so the News tab shows only HIV
// and HIV-relevant stories (treatment, prevention, policy, access).
import { isFinanceNoise } from './hivSignals.js';

// Case-insensitive terms: the disease, its drugs and brands, and the bodies
// that shape HIV access (UNAIDS, PEPFAR, Global Fund).
const HIV_TERMS_RE = new RegExp([
  '\\bHIV\\b', 'pre-exposure prophylaxis', 'post-exposure prophylaxis', 'antiretroviral', '\\bviiv\\b',
  'lenacapavir', 'cabotegravir', 'islatravir', 'bictegravir', 'doravirine', 'dolutegravir', 'rilpivirine',
  'lotivibart', 'teropavimab', 'zinlirvimab', 'broadly neutrali[sz]ing antibod',
  'biktarvy', 'bixlenvo', 'sunlenca', 'yeztugo', 'yeytuo', 'descovy', 'truvada', 'idvynso', 'mk-8527',
  'apretude', 'cabenuva', 'vocabria', 'rekambys', 'dovato', 'juluca', 'triumeq', 'rukobia', 'trogarzo',
  'unaids', 'pepfar', 'global fund to fight', 'aidsmap', '\\bCROI\\b', '\\bEACS\\b',
].join('|'), 'i');
// Case-sensitive, so the words "aids" and "prep" do not match.
const HIV_ACRONYMS_RE = /\bAIDS\b|\bPrEP\b|\bPREP\b|\bPEP\b/;

export function isHivRelevant(text) {
  return HIV_TERMS_RE.test(text || '') || HIV_ACRONYMS_RE.test(text || '');
}

// Google News appends " - Publisher" to every title.
export function stripPublisher(title, publisher) {
  return publisher && title.endsWith(` - ${publisher}`) ? title.slice(0, -(publisher.length + 3)) : title;
}

// Job ads and career pages (company sites list HIV roles that match the filter).
const JOB_WORDS_RE = /\b(job opening|job posting|careers? at|we'?re hiring|now hiring|vacanc(y|ies)|apply now|apply today|internship)\b/i;
// Job titles lead with the role, e.g. "Associate Director, HIV Marketing".
const ROLE_FIRST_RE = /^(sr\.?|senior|associate|assistant|executive|principal|lead|head|regional|field|medical)?\s*[A-Za-z&/ -]{0,30}\b(Manager|Director|Specialist|Liaison|Representative|Scientist|Coordinator|Consultant|Associate|Account Executive|MSL)\b\s*[,(|–-]/;
const JOB_SITE_RE = /careers|\bjobs?\b|workday|linkedin|indeed|glassdoor|ziprecruiter|built in|monster|greenhouse|lever\.co/i;
export function isJobPosting(title, publisher = '') {
  return JOB_WORDS_RE.test(title || '') || ROLE_FIRST_RE.test(title || '') || JOB_SITE_RE.test(publisher || '');
}

export function isHivNews(title, summary = '', publisher = '') {
  return isHivRelevant(`${title} ${summary}`) && !isFinanceNoise(title, publisher) && !isJobPosting(title, publisher);
}

export const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:30d`)}&hl=en-US&gl=US&ceid=US:en`;

// ─── STORY DETAILS FOR THE NEWS FILTERS ─────────────────────────────────────
// Competitor products, grouped the way the team talks about them.
const PRODUCTS = [
  ['Lenacapavir (Sunlenca, Yeztugo)', 'Gilead', /lenacapavir|sunlenca|yeztugo|yeytuo/i],
  ['Biktarvy', 'Gilead', /biktarvy|bictegravir/i],
  ['Descovy / Truvada', 'Gilead', /descovy|truvada/i],
  ['Cabotegravir (Apretude, Cabenuva)', 'ViiV/GSK', /cabotegravir|apretude|cabenuva|vocabria|rekambys/i],
  ['Dovato / Triumeq', 'ViiV/GSK', /dovato|triumeq|dolutegravir/i],
  ['Lotivibart / bNAbs', 'ViiV/GSK', /lotivibart|broadly neutrali[sz]ing|\bbnabs?\b/i],
  ['Doravirine / islatravir', 'MSD', /islatravir|doravirine|idvynso/i],
  ['MK-8527', 'MSD', /mk-8527/i],
];
const COMPANIES = [
  ['Gilead', /gilead/i],
  ['ViiV/GSK', /viiv|\bgsk\b|glaxosmithkline/i],
  ['MSD', /\bmerck\b|\bmsd\b/i],
  ['J&J', /johnson & johnson|\bj&j\b|janssen/i],
];
export const COMPANY_NAMES = COMPANIES.map(([name]) => name);

export function storyCompetitors(text) {
  const products = PRODUCTS.filter(([, , re]) => re.test(text || ''));
  const companies = new Set(products.map(([, co]) => co));
  for (const [name, re] of COMPANIES) if (re.test(text || '')) companies.add(name);
  return { products: products.map(([name]) => name), competitors: COMPANY_NAMES.filter((c) => companies.has(c)) };
}

// High: decisions that change a competitor's market (approval, price, guideline, results).
// Medium: other news on a competitor, a trial or a conference. Low: everything else.
const HIGH_RE = /approv|authori[sz]|\bCHMP\b|positive opinion|complete response|\bPDUFA\b|marketing application|phase (3|III)\b|topline|\blaunch|reimburs|pricing|\bprice|guideline|label (update|expansion)|acqui|licens|funding cut|\bcuts?\b.*fund|recall|withdraw/i;
const POLICY_RE = /\bWHO\b|world health organization|pepfar|global fund|unaids|\bNICE\b|G-BA|\bFDA\b|\bEMA\b/i;
const MEDIUM_RE = /trial|study|data|results|\bCROI\b|\bIAS\b|\bEACS\b|idweek|conference|pipeline|filing|submission/i;
export function storyImpact(text, hasCompetitor) {
  if (HIGH_RE.test(text) && (hasCompetitor || POLICY_RE.test(text))) return 'High';
  if (hasCompetitor || MEDIUM_RE.test(text) || POLICY_RE.test(text)) return 'Medium';
  return 'Low';
}

// The same story from several outlets: group headlines that share most of their words.
const STOP = new Set('with from that this have will after their about into over than more what when says said news report reports study shows show could would first year years people living'.split(' '));
function words(title) {
  return new Set((title || '').toLowerCase().replace(/[^a-z0-9 -]+/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)));
}
function overlap(a, b) {
  if (Math.min(a.size, b.size) < 3) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size, b.size);
}
// Keeps the first story of each group (the list is already sorted) and lists the others in alsoIn.
export function groupSameStory(articles, threshold = 0.6) {
  const groups = [];
  for (const a of articles) {
    const w = words(a.headline);
    const g = groups.find((x) => overlap(x.words, w) >= threshold);
    if (g) {
      if (g.story.source !== a.source && !g.story.alsoIn.some((o) => o.source === a.source)) g.story.alsoIn.push({ source: a.source, link: a.link });
    } else {
      groups.push({ words: w, story: { ...a, alsoIn: [] } });
    }
  }
  return groups.map((g) => g.story);
}
