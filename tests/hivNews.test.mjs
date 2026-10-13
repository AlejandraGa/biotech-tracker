// Tests for the News filters: run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHivRelevant, isJobPosting, isHivNews, stripPublisher, storyCompetitors, storyImpact, groupSameStory } from '../api/_lib/hivNews.js';

test('keeps HIV stories and drops unrelated ones', () => {
  assert.ok(isHivRelevant('FDA approves twice-yearly lenacapavir for HIV prevention'));
  assert.ok(isHivRelevant('UNAIDS warns of funding gap'));
  assert.ok(isHivRelevant('New PrEP guidance published'));
  assert.ok(!isHivRelevant('Merck oncology drug wins FDA approval for lung cancer'));
  // The ordinary words "aids" and "prep" are not the acronyms.
  assert.ok(!isHivRelevant('New device aids meal prep for patients'));
});

test('drops job ads', () => {
  assert.ok(isJobPosting('Associate Director, HIV Marketing'));
  assert.ok(isJobPosting('Medical Science Liaison (HIV) - Remote'));
  assert.ok(isJobPosting('HIV research programme', 'Gilead Careers'));
  assert.ok(!isJobPosting('Gilead presents HIV data at IDWeek'));
});

test('drops stock-market coverage', () => {
  assert.ok(!isHivNews('Gilead stock price target raised by analysts', '', 'MarketBeat'));
  assert.ok(isHivNews('Gilead presents new lenacapavir HIV data', '', 'Reuters'));
});

test('strips the publisher Google News appends', () => {
  assert.equal(stripPublisher('ViiV data at IAS - Reuters', 'Reuters'), 'ViiV data at IAS');
  assert.equal(stripPublisher('No publisher here', ''), 'No publisher here');
});

test('names the competitors and products in a story', () => {
  const r = storyCompetitors('Islatravir plus lenacapavir weekly oral: 48-week results');
  assert.deepEqual(r.competitors, ['Gilead', 'MSD']);
  assert.ok(r.products.includes('Lenacapavir (Sunlenca, Yeztugo)'));
  assert.ok(r.products.includes('Doravirine / islatravir'));
  assert.deepEqual(storyCompetitors('Community HIV awareness walk').competitors, []);
});

test('ranks approvals on a competitor above other news', () => {
  assert.equal(storyImpact('FDA approves Gilead lenacapavir label expansion', true), 'High');
  assert.equal(storyImpact('ViiV presents cabotegravir data at IDWeek', true), 'Medium');
  assert.equal(storyImpact('UNAIDS warns of rising infections', false), 'Medium');
  assert.equal(storyImpact('Community group hosts HIV awareness walk', false), 'Low');
});

test('groups the same story from several outlets', () => {
  const out = groupSameStory([
    { headline: 'FDA approves Gilead twice-yearly lenacapavir for HIV PrEP', source: 'Reuters', link: 'a' },
    { headline: 'Gilead wins FDA approval for twice-yearly lenacapavir HIV PrEP shot', source: 'Fierce Pharma', link: 'b' },
    { headline: 'ViiV presents new cabotegravir data at IAS', source: 'aidsmap', link: 'c' },
  ]);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0].alsoIn, [{ source: 'Fierce Pharma', link: 'b' }]);
  assert.deepEqual(out[1].alsoIn, []);
});

test('does not group different stories that share a couple of words', () => {
  const out = groupSameStory([
    { headline: 'HIV PrEP uptake rises', source: 'A' },
    { headline: 'HIV PrEP funding cut', source: 'B' },
  ]);
  assert.equal(out.length, 2);
});
