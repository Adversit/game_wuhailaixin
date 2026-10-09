import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.js';
import { initialState } from '../dist/game.js';
import { MAX_SAVE_BYTES } from '../dist/save-format.js';
import { database, request } from './helpers.js';

const put = (save, expectedRevision = 0, writeId = crypto.randomUUID(), accountId = 'A') => ({save, expectedRevision, writeId, accountId});

test('schema, identity isolation, no-store and CAS use the real generated SQL', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  const state = initialState(); state.day = 7;
  const created = await worker.fetch(request('/api/save', {method: 'PUT', body: put(state)}), env);
  assert.equal(created.status, 200);
  assert.equal((await created.json()).revision, 1);
  const a = await worker.fetch(request(), env), b = await worker.fetch(request('/api/save', {user: 'B'}), env);
  assert.equal((await a.json()).save.day, 7);
  assert.equal((await b.json()).save, null);
  assert.match(a.headers.get('cache-control'), /no-store/);
  assert.equal(env.sqlite.prepare('SELECT count(*) AS n FROM game_saves').get().n, 1);
  assert.match(env.sqlite.prepare('EXPLAIN QUERY PLAN SELECT state_json AS payload FROM game_saves WHERE user_id = ?').get('A').detail, /INDEX/);
  const stolen = await worker.fetch(request('/api/save', {user: 'B', method: 'PUT', body: put(state, 0, crypto.randomUUID(), 'A')}), env);
  assert.equal(stolen.status, 409);
  assert.equal((await stolen.json()).error, 'account_changed');
  assert.equal(env.sqlite.prepare('SELECT count(*) AS n FROM game_saves').get().n, 1);
});

test('simultaneous creates and updates have one winner and preserve the other snapshot', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  for (const expectedRevision of [0, 1]) {
    const a = initialState(), b = initialState(); a.day = 3; b.day = 4;
    const results = await Promise.all([a, b].map(s => worker.fetch(request('/api/save', {method: 'PUT', body: put(s, expectedRevision)}), env)));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    const conflict = await results.find(r => r.status === 409).json();
    assert.equal(conflict.revision, expectedRevision + 1);
    assert.equal(conflict.save.day, 3);
  }
});

test('lost-response retry is idempotent; reused write IDs cannot change the payload', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  const payload = put(initialState());
  for (let i = 0; i < 3; i++) {
    const response = await worker.fetch(request('/api/save', {method: 'PUT', body: payload}), env);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).revision, 1);
  }
  payload.save.day = 2; payload.expectedRevision = 1;
  assert.equal((await worker.fetch(request('/api/save', {method: 'PUT', body: payload}), env)).status, 409);
  assert.equal(env.sqlite.prepare('SELECT revision FROM game_saves').get().revision, 1);
});

test('API rejects missing identity, cross-origin writes, malformed shapes and UTF-8 byte overflow', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  assert.equal((await worker.fetch(request('/api/save', {user: null}), env)).status, 401);
  assert.equal((await worker.fetch(request('/api/save', {method: 'POST'}), env)).status, 405);
  assert.equal((await worker.fetch(request('/api/missing'), env)).status, 404);
  const cases = [
    [put(initialState()), {Origin: 'https://attacker.example'}, 403],
    [put(initialState()), {'sec-fetch-site': 'cross-site'}, 403],
    [put(initialState()), {'Content-Type': 'text/plain'}, 415],
    ['{', {}, 400], [null, {}, 400],
    [put({...initialState(), progress: {harbor: 100, forest: 0, bay: 0, stars: 0, light: 0}}), {}, 400],
    [put({...initialState(), relics: ['unknown']}), {}, 400],
    [put(initialState(), -1), {}, 400],
    [put(initialState(), 0, 'short'), {}, 400],
    [JSON.stringify({padding: '汉'.repeat(Math.ceil(MAX_SAVE_BYTES / 3))}), {}, 413],
  ];
  for (const [body, headers, status] of cases) assert.equal((await worker.fetch(request('/api/save', {method: 'PUT', body, headers}), env)).status, status);
  assert.equal(env.sqlite.prepare('SELECT count(*) AS n FROM game_saves').get().n, 0);
});

test('missing DB reports a recoverable 503 without exposing data; identity lookup still works', async () => {
  const response = await worker.fetch(request(), {});
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {error: 'storage_unavailable', userId: 'A'});
  const session = await worker.fetch(request('/api/session'), {});
  assert.deepEqual(await session.json(), {user: {id: 'A', displayName: 'A@example.test'}});
});

test('Worker keeps the existing static game and delegates assets to ASSETS', async () => {
  const response = await worker.fetch(request('/'), {ASSETS: {fetch: r => new Response('game:' + new URL(r.url).pathname)}});
  assert.equal(await response.text(), 'game:/');
});
