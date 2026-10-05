import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, act } from '../dist/game.js';
import { CACHE_PREFIX, CLAIM_KEY, LEGACY_KEY, cacheKey } from '../dist/cloud-save.js';
import { client, database, MemoryStorage } from './helpers.js';

const play = c => {assert.equal(act(c.state, 'explore').ok, true); c.cloud.save(c.state);};

test('guest stays local; signed users migrate legacy only after explicit selection', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  const storage = new MemoryStorage(), old = initialState(); old.day = 8;
  storage.setItem(LEGACY_KEY, JSON.stringify(old));
  const c = client(t, {DB: env.DB, storage});
  await c.cloud.connect();
  assert.equal(c.state.day, 1);
  assert.equal(c.cloud.legacy.day, 8);
  await c.cloud.flush();
  assert.equal(env.sqlite.prepare('SELECT count(*) AS n FROM game_saves').get().n, 0);
  assert.equal(c.cloud.prepareLegacy(), true);
  assert.equal(c.cloud.resolve('local'), true);
  await c.cloud.flush();
  assert.equal(c.state.day, 8);
  assert.equal(storage.getItem(CLAIM_KEY), 'A');
  assert.equal(JSON.parse(storage.getItem(LEGACY_KEY)).day, 8);
  assert.equal(env.sqlite.prepare('SELECT revision FROM game_saves').get().revision, 1);
  c.identity.id = 'B'; await c.cloud.connect();
  assert.equal(c.state.day, 1); assert.equal(c.cloud.legacy, null);
  c.identity.id = null; await c.cloud.connect();
  assert.equal(c.state.day, 1); play(c); await c.cloud.flush();
  assert.equal(env.sqlite.prepare('SELECT count(*) AS n FROM game_saves').get().n, 1);
  assert.ok(storage.getItem(cacheKey('A')));
  assert.ok(storage.getItem(cacheKey(null)));
});

test('offline signed progress resumes with the same base revision, including after reload', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  const storage = new MemoryStorage(); let offline = false;
  const c = client(t, {DB: env.DB, storage, intercept: (path, options, run) => {
    if (offline && options.method === 'PUT') throw new TypeError('offline'); return run();
  }});
  await c.cloud.connect(); play(c); await c.cloud.flush();
  offline = true; play(c); await c.cloud.flush();
  const pending = c.cloud.record.pending;
  assert.equal(pending.expectedRevision, 1);
  assert.equal(c.state.explorations, 2);
  c.cloud.dispose();
  const reopened = client(t, {DB: env.DB, storage}); await reopened.cloud.connect();
  assert.equal(reopened.state.explorations, 2);
  assert.equal(reopened.cloud.record.pending.writeId, pending.writeId);
  await reopened.cloud.flush();
  assert.equal(reopened.cloud.record.revision, 2);
  assert.equal(reopened.cloud.record.pending, null);
});

test('acknowledgement loss plus new local actions preserves both snapshots and recovers across reload', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  const storage = new MemoryStorage(); let lose = true;
  const c = client(t, {DB: env.DB, storage, intercept: async (path, options, run) => {
    const response = await run();
    if (options.method === 'PUT' && lose) {lose = false; throw new TypeError('response lost');} return response;
  }});
  await c.cloud.connect(); play(c); await c.cloud.flush();
  assert.ok(c.cloud.record.pending);
  play(c); c.cloud.dispose();
  const reopened = client(t, {DB: env.DB, storage}); await reopened.cloud.connect();
  assert.equal(reopened.cloud.record.revision, 1);
  assert.equal(reopened.state.explorations, 2);
  assert.equal(reopened.cloud.conflict, null);
  await reopened.cloud.flush();
  assert.equal(reopened.cloud.record.revision, 2);
  assert.equal(env.sqlite.prepare('SELECT revision FROM game_saves').get().revision, 2);
});

test('late responses cannot save old-account progress into a new account', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  const c = client(t, {DB: env.DB}); await c.cloud.connect(); play(c);
  c.identity.id = 'B'; await c.cloud.flush();
  assert.equal(c.cloud.ready, false);
  await c.cloud.connect();
  assert.equal(c.cloud.record.userId, 'B');
  assert.equal(c.state.explorations, 0);
  assert.equal(env.sqlite.prepare('SELECT count(*) AS n FROM game_saves').get().n, 0);
  assert.equal(JSON.parse(c.storage.getItem(cacheKey('A'))).save.explorations, 1);
});

test('two windows pause on revision conflict, preserve local progress, and require an explicit choice', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  const first = client(t, {DB: env.DB}); await first.cloud.connect(); play(first); await first.cloud.flush();
  const second = client(t, {DB: env.DB}); await second.cloud.connect();
  play(first); play(second); play(second); await first.cloud.flush(); await second.cloud.flush();
  assert.equal(second.cloud.conflict.kind, 'revision');
  assert.equal(second.state.explorations, 3);
  assert.equal(second.cloud.conflict.remote.save.explorations, 2);
  const before = env.sqlite.prepare('SELECT revision FROM game_saves').get().revision;
  await second.cloud.flush();
  assert.equal(env.sqlite.prepare('SELECT revision FROM game_saves').get().revision, before);
  assert.equal(second.cloud.resolve('local'), true); await second.cloud.flush();
  assert.equal(second.cloud.record.revision, 3);
  assert.equal(JSON.parse(env.sqlite.prepare('SELECT payload FROM game_saves').get().payload).explorations, 3);
  assert.ok([...second.storage.data.keys()].some(k => k.startsWith(CACHE_PREFIX) && k.includes(':backup:')));
});

test('choosing cloud makes a local backup; blocked storage prevents destructive conflict resolution', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  const a = client(t, {DB: env.DB}); await a.cloud.connect(); play(a); await a.cloud.flush();
  const b = client(t, {DB: env.DB}); await b.cloud.connect(); play(a); play(b); play(b);
  await a.cloud.flush(); await b.cloud.flush();
  b.storage.fail = true;
  assert.equal(b.cloud.resolve('remote'), false); assert.equal(b.state.explorations, 3);
  b.storage.fail = false;
  assert.equal(b.cloud.resolve('remote'), true); assert.equal(b.state.explorations, 2);
  const backup = [...b.storage.data.entries()].find(([k]) => k.includes(':backup:'));
  assert.equal(JSON.parse(backup[1]).save.explorations, 3);
});

test('read failure and timeout never upload unknown local data; loading actions survive a delayed GET', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  let release;
  const c = client(t, {DB: env.DB, intercept: (path, options, run) => path === '/api/save' && !options.method ? new Promise(resolve => {release = () => resolve(run());}) : run()});
  const connecting = c.cloud.connect();
  for (let i = 0; i < 8 && !release; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(c.cloud.canPlay, true); play(c); release(); await connecting; await c.cloud.flush();
  assert.equal(c.state.explorations, 1);
  const fail = client(t, {DB: env.DB, timeout: 15, intercept: () => new Promise(() => {})});
  await fail.cloud.connect();
  assert.equal(fail.cloud.canPlay, true); assert.equal(fail.cloud.ready, false);
  play(fail); await fail.cloud.flush();
  assert.equal(env.sqlite.prepare('SELECT revision FROM game_saves').get().revision, 1);
});

test('actions during an in-flight write queue a second snapshot; duplicate clicks cannot overlap PUTs', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  let release, calls = 0;
  const c = client(t, {DB: env.DB, intercept: (path, options, run) => {
    if (options.method === 'PUT' && ++calls === 1) return new Promise(resolve => {release = () => resolve(run());}); return run();
  }});
  await c.cloud.connect(); play(c); const saving = c.cloud.flush();
  assert.ok(release); play(c); await c.cloud.flush(); assert.equal(calls, 1);
  release(); await saving;
  assert.equal(c.cloud.record.revision, 1); assert.equal(c.cloud.record.syncedSave.explorations, 1);
  await c.cloud.flush(); assert.equal(calls, 2); assert.equal(c.cloud.record.revision, 2);
  assert.equal(c.cloud.record.syncedSave.explorations, 2);
});

test('shared cache preserves another window\'s unsynced snapshot before overwriting it', async t => {
  const env = database(); t.after(() => env.sqlite.close());
  const storage = new MemoryStorage(), a = client(t, {DB: env.DB, storage}), b = client(t, {DB: env.DB, storage});
  await a.cloud.connect(); await b.cloud.connect(); play(a); play(a); play(b);
  const backups = [...storage.data.entries()].filter(([key]) => key.includes(':backup:')).map(([,raw]) => JSON.parse(raw));
  assert.ok(backups.some(v => v.reason === 'other-window-before-cache-update' && v.save.explorations === 2));
});
