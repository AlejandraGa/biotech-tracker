import { test } from 'node:test';
import assert from 'node:assert/strict';
import middleware, { config } from '../middleware.js';

const req = (auth) => new Request('https://example.org/', { headers: auth ? { authorization: auth } : {} });
const basic = (user, pass) => 'Basic ' + btoa(`${user}:${pass}`);

test('site stays open when no password is set', () => {
  delete process.env.SITE_PASSWORD;
  assert.equal(middleware(req()), undefined);
});

test('asks for the password when one is set', () => {
  process.env.SITE_PASSWORD = 'launch-team';
  const res = middleware(req());
  assert.equal(res.status, 401);
  assert.match(res.headers.get('WWW-Authenticate'), /Basic/);
  assert.equal(middleware(req(basic('anyone', 'wrong'))).status, 401);
  assert.equal(middleware(req(basic('anyone', 'launch-team'))), undefined);
  assert.equal(middleware(req('Basic !!!')).status, 401);
  delete process.env.SITE_PASSWORD;
});

test('leaves the Monday email job to its own secret', () => {
  const re = new RegExp('^' + config.matcher[0].replace('/(', '/(') + '$');
  assert.ok(!re.test('/api/hiv-digest'));
  assert.ok(re.test('/'));
  assert.ok(re.test('/api/rss'));
});
