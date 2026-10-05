import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../server/worker.js';
import { CloudSave } from '../dist/cloud-save.js';

export function database() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('../drizzle/', import.meta.url)).filter(f => f.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
  }
  const db = {
    prepare(sql) {
      // Run production SQL unmodified against SQLite rather than reimplementing CAS.
      const statement = sqlite.prepare(sql);
      return {bind(...args) {return {async first() {return statement.get(...args) ?? null;}};}};
    },
    withSession(constraint) {if (constraint !== 'first-primary') throw new Error('Unexpected constraint'); return this;},
  };
  return {sqlite, DB: db};
}

export const auth = id => id === null ? {} : {'oai-authenticated-user-id': id, 'oai-authenticated-user-email': id + '@example.test'};
export function request(path = '/api/save', {user = 'A', method = 'GET', body, headers = {}} = {}) {
  return new Request('https://game.example' + path, {
    method, headers: {...auth(user), ...(body !== undefined ? {'Content-Type': 'application/json', Origin: 'https://game.example'} : {}), ...headers},
    ...(body !== undefined ? {body: typeof body === 'string' ? body : JSON.stringify(body)} : {}),
  });
}

export class MemoryStorage {
  constructor() {this.data = new Map(); this.fail = false;}
  getItem(key) {if (this.fail) throw new Error('Storage blocked'); return this.data.get(key) ?? null;}
  setItem(key, value) {if (this.fail) throw new Error('Storage full'); this.data.set(key, value);}
}

export function client(t, {DB, storage = new MemoryStorage(), identity = {id: 'A'}, intercept, timeout = 1000} = {}) {
  let current, sequence = 0;
  const controller = new CloudSave({
    storage, timeout, debounce: 60_000,
    makeId: () => 'write_' + (++sequence).toString().padStart(16, '0') + '_' + crypto.randomUUID(),
    apply: state => {current = state;},
    fetcher: async (path, options = {}) => {
      const run = () => worker.fetch(request(path, {user: identity.id, method: options.method || 'GET', body: options.body}), {DB});
      return intercept ? intercept(path, options, run) : run();
    },
  });
  t.after(() => controller.dispose());
  return {cloud: controller, storage, identity, get state() {return current;}};
}
