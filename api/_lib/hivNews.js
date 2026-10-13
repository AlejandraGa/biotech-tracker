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

export function isHivNews(title, summary = '', publisher = '') {
  return isHivRelevant(`${title} ${summary}`) && !isFinanceNoise(title, publisher);
}

export const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:30d`)}&hl=en-US&gl=US&ceid=US:en`;
