import { currentUser } from './auth.js';
import { saveStore } from '../db/game-save.js';
import { normalizeSave, MAX_SAVE_BYTES } from '../dist/save-format.js';

const headers = {'Cache-Control': 'private, no-store', Vary: 'oai-authenticated-user-id, Cookie', 'X-Content-Type-Options': 'nosniff'};
const json = (body, status = 200, extra = {}) => Response.json(body, {status, headers: {...headers, ...extra}});
const revision = v => Number.isSafeInteger(v) && v >= 0 && v < Number.MAX_SAFE_INTEGER;
const writeId = v => typeof v === 'string' && /^[a-zA-Z0-9_-]{16,80}$/.test(v);

function envelope(row, userId) {
  if (!row) return {userId, save: null, revision: 0, updatedAt: null, writeId: null};
  const save = normalizeSave(JSON.parse(row.payload));
  if (!save || !revision(row.revision) || row.revision === 0) throw new Error('Invalid stored save');
  return {userId, save, revision: row.revision, updatedAt: row.updated_at, writeId: row.write_id};
}

async function readBody(request) {
  if (Number(request.headers.get('content-length')) > MAX_SAVE_BYTES) throw Object.assign(new Error(), {status: 413, code: 'save_too_large'});
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(new Error(), {status: 400, code: 'invalid_json'});
  let bytes = 0;
  const chunks = [];
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_SAVE_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error(), {status: 413, code: 'save_too_large'});
      }
      chunks.push(value);
    }
    const raw = new Uint8Array(bytes);
    let offset = 0;
    for (const c of chunks) {raw.set(c, offset); offset += c.byteLength;}
    return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(raw));
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error(), {status: 400, code: 'invalid_json'});
  } finally {reader.releaseLock();}
}

export async function handleApi(request, env) {
  const path = new URL(request.url).pathname;
  if (!['/api/session', '/api/save'].includes(path)) return json({error: 'not_found'}, 404);
  const user = currentUser(request);
  if (path === '/api/session') {
    return request.method === 'GET' ? json({user}) : json({error: 'method_not_allowed'}, 405, {Allow: 'GET'});
  }
  if (!user) return json({error: 'sign_in_required'}, 401);
  if (!['GET', 'PUT'].includes(request.method)) return json({error: 'method_not_allowed'}, 405, {Allow: 'GET, PUT'});
  let body;
  if (request.method === 'PUT') {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') return json({error: 'invalid_origin'}, 403);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({error: 'invalid_type'}, 415);
    try {body = await readBody(request);} catch (e) {return json({error: e.code}, e.status);}
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({error: 'invalid_save'}, 400);
    // An old tab must not save account A's cached data using account B's cookie.
    if (body.accountId !== user.id) return json({error: 'account_changed'}, 409);
    const save = normalizeSave(body.save);
    if (!save || !revision(body.expectedRevision) || !writeId(body.writeId)) return json({error: 'invalid_save'}, 400);
    body = {...body, save};
  }
  try {
    const store = saveStore(env.DB);
    if (request.method === 'GET') return json(envelope(await store.read(user.id), user.id));
    const payload = JSON.stringify(body.save);
    // Repeating a lost-response write acknowledges the same snapshot once.
    const duplicate = row => row?.write_id === body.writeId && row.payload === payload;
    const current = await store.read(user.id);
    if (duplicate(current)) return json(envelope(current, user.id));
    if (current?.write_id === body.writeId) return json({...envelope(current, user.id), error: 'revision_conflict'}, 409);
    const row = await store.write(user.id, payload, body.expectedRevision, body.writeId);
    if (row) return json(envelope(row, user.id));
    const latest = await store.read(user.id);
    return duplicate(latest) ? json(envelope(latest, user.id)) : json({...envelope(latest, user.id), error: 'revision_conflict'}, 409);
  } catch (error) {
    console.error('Mistbound save storage failed', error);
    return json({error: 'storage_unavailable', userId: user.id}, 503);
  }
}
