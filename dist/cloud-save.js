import { initialState } from './game.js';
import { normalizeSave, equalSave } from './save-format.js';

export const LEGACY_KEY = 'mistbound-letters-v1';
export const CLAIM_KEY = LEGACY_KEY + ':claimed-by';
export const CACHE_PREFIX = 'mistbound-letters-cloud-v1:';
export const cacheKey = userId => CACHE_PREFIX + (userId === null ? 'guest' : 'user:' + encodeURIComponent(userId));
const fresh = userId => ({format: 1, userId, save: initialState(), revision: null, syncedSave: null, pending: null});
const validRevision = v => Number.isSafeInteger(v) && v >= 0;

export class CloudSave {
  constructor({storage, fetcher, apply, changed = () => {}, timers = globalThis, makeId = () => crypto.randomUUID(), timeout = 8000, debounce = 650}) {
    this.storage = storage;
    this.fetcher = fetcher;
    this.apply = apply;
    this.changed = changed;
    this.timers = timers;
    this.makeId = makeId;
    this.timeout = timeout;
    this.debounce = debounce;
    this.user = null;
    this.record = fresh(null);
    this.status = '正在核对存档账号…';
    this.canPlay = false;
    this.ready = false;
    this.busy = false;
    this.localIssue = false;
    this.conflict = null;
    this.legacy = null;
    this.epoch = 0;
    this.retryCount = 0;
    this.timer = null;
    this.connecting = null;
    this.closed = false;
    this.loaded = false;
    this.lastPersisted = new Map();
  }

  notify(text) {
    if (text) this.status = text;
    this.changed(this);
  }

  read(key) {
    try { return this.storage?.getItem(key) ?? null; }
    catch { this.localIssue = true; return null; }
  }

  write(key, value) {
    try {
      if (!this.storage) throw new Error('Browser storage unavailable');
      this.storage.setItem(key, value);
      return true;
    } catch { this.localIssue = true; return false; }
  }

  readCache(userId) {
    const raw = this.read(cacheKey(userId));
    this.lastPersisted.set(cacheKey(userId), raw);
    if (!raw) {
      // Preserve unacknowledged saves left by the deployed v2 client.
      if (userId) try {
        const old = JSON.parse(this.read('mistbound-cloud-pending:' + userId) || 'null');
        const save = normalizeSave(old?.state);
        if (old?.user === userId && save && validRevision(old.revision) && typeof old.operationId === 'string' && /^[a-zA-Z0-9_-]{16,80}$/.test(old.operationId)) {
          return {format: 1, userId, save, revision: old.revision, syncedSave: null, pending: {save, expectedRevision: old.revision, writeId: old.operationId}};
        }
      } catch { /* Keep old bytes untouched. */ }
      return fresh(userId);
    }
    try {
      const r = JSON.parse(raw), save = normalizeSave(r.save);
      const syncedSave = r.syncedSave === null ? null : normalizeSave(r.syncedSave);
      if (r.format !== 1 || r.userId !== userId || !save || r.syncedSave !== null && !syncedSave ||
          r.revision !== null && !validRevision(r.revision)) throw new Error('Invalid cache');
      let pending = null;
      if (r.pending) {
        const pendingSave = normalizeSave(r.pending.save);
        if (!pendingSave || typeof r.pending.writeId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(r.pending.writeId) ||
            !validRevision(r.pending.expectedRevision) || r.pending.expectedRevision !== r.revision) throw new Error('Invalid pending write');
        pending = {save: pendingSave, writeId: r.pending.writeId, expectedRevision: r.pending.expectedRevision};
      }
      return {format: 1, userId, save, revision: r.revision, syncedSave, pending};
    } catch {
      // Keep the bad bytes available for diagnosis/export rather than replacing them silently.
      if (!this.write(cacheKey(userId) + ':invalid:' + this.makeId(), raw)) this.localIssue = true;
      this.localIssue = true;
      return fresh(userId);
    }
  }

  persist() {
    const key = cacheKey(this.record.userId), previous = this.read(key);
    if (previous && previous !== this.lastPersisted.get(key)) {
      try {
        const other = JSON.parse(previous), save = normalizeSave(other.save);
        if (other.userId === this.record.userId && save && !equalSave(save, other.syncedSave) && !equalSave(save, this.record.save) &&
            !this.backup(save, other.revision, 'other-window-before-cache-update')) return false;
      } catch {}
    }
    const raw = JSON.stringify(this.record), ok = this.write(key, raw);
    if (ok) this.lastPersisted.set(key, raw);
    if (ok) this.localIssue = false;
    return ok;
  }

  backup(save, revision, reason) {
    if (!save) return true;
    // Separate immutable keys also preserve two simultaneous conflict resolutions.
    return this.write(cacheKey(this.record.userId) + ':backup:' + this.makeId(), JSON.stringify({save, revision, reason, savedAt: new Date().toISOString()}));
  }

  loadLegacy() {
    if (this.read(CLAIM_KEY)) return null;
    const oldOwner = this.read('mistbound-letters-migration-owner');
    if (oldOwner && oldOwner !== this.user?.id) return null;
    const raw = this.read(LEGACY_KEY);
    if (!raw) return null;
    try {const save = normalizeSave(JSON.parse(raw)); if (!save) throw new Error(); return save;}
    catch {this.localIssue = true; return null;}
  }

  async request(path, options = {}) {
    const controller = new AbortController();
    let timer;
    const expired = new Promise((_, reject) => {
      timer = this.timers.setTimeout(() => {controller.abort(); reject(new Error('request_timeout'));}, this.timeout);
    });
    try {
      const completed = (async () => {
        const response = await this.fetcher(path, {credentials: 'same-origin', cache: 'no-store', ...options, signal: controller.signal});
        const data = await response.json();
        return {ok: response.ok, status: response.status, json: async () => data};
      })();
      return await Promise.race([completed, expired]);
    } finally {this.timers.clearTimeout(timer);}
  }

  cancelTimer() {
    if (this.timer !== null) this.timers.clearTimeout(this.timer);
    this.timer = null;
  }

  // Identity must be established before reading an account's cache.
  async connect() {
    if (this.closed) return;
    if (this.connecting) return this.connecting;
    const epoch = ++this.epoch;
    this.cancelTimer();
    this.ready = false;
    this.canPlay = false;
    this.notify('正在核对存档账号…');
    this.connecting = this.connectNow(epoch);
    try {await this.connecting;} finally {
      this.connecting = null;
      if (this.ready && !this.conflict && this.needsUpload()) this.queue();
    }
  }

  async connectNow(epoch) {
    try {
      const session = await this.request('/api/session');
      if (!session.ok) throw new Error('session_unavailable');
      const {user} = await session.json();
      if (this.epoch !== epoch || this.closed) return;
      if (user !== null && (!user || typeof user.id !== 'string' || !user.id || typeof user.displayName !== 'string')) throw new Error('invalid_session');
      const owner = user?.id ?? null;
      const changedOwner = owner !== this.record.userId;
      if (changedOwner || !this.loaded) {
        if (this.loaded) this.persist();
        this.record = this.readCache(owner);
        this.conflict = null;
        this.loaded = true;
      }
      this.user = user;
      this.legacy = this.loadLegacy();
      if (owner === null) {
        if (this.legacy && equalSave(this.record.save, initialState())) this.record.save = this.legacy;
        this.canPlay = true;
        this.apply(structuredClone(this.record.save));
        this.notify('本机已保存；登录 ChatGPT 可同步旅途');
        return;
      }
      this.apply(structuredClone(this.record.save));
      this.canPlay = true;
      this.notify('正在读取此账号的云端旅途…');
      const response = await this.request('/api/save');
      const remote = await response.json();
      if (this.epoch !== epoch || this.closed) return;
      if (response.status === 401 || remote.userId && remote.userId !== owner) {
        this.canPlay = false;
        this.notify('账号已变化，请重新连接云端');
        this.deferConnect();
        return;
      }
      if (!response.ok) throw new Error(remote.error || 'load_failed');
      this.acceptRemote(this.remote(remote));
    } catch {
      if (this.epoch !== epoch || this.closed) return;
      this.canPlay = true;
      if (this.record.userId === null) {
        if (!this.loaded) this.record = this.readCache(null);
        this.loaded = true;
        this.legacy = this.loadLegacy();
        if (this.legacy && equalSave(this.record.save, initialState())) this.record.save = this.legacy;
      }
      this.apply(structuredClone(this.record.save));
      this.notify('云端暂不可用，继续在此设备保存；联网后可重试');
    }
  }

  deferConnect() {
    this.cancelTimer();
    this.timer = this.timers.setTimeout(() => {this.timer = null; void this.connect();}, 0);
  }

  remote(data) {
    const save = data.save === null ? null : normalizeSave(data.save);
    if (data.userId !== this.record.userId || !validRevision(data.revision) ||
        data.save !== null && !save || (data.revision === 0) !== (save === null)) throw new Error('invalid_remote');
    return {save, revision: data.revision, writeId: data.writeId ?? null, updatedAt: data.updatedAt ?? null};
  }

  dirty() {return !equalSave(this.record.save, this.record.syncedSave);}
  needsUpload() {return Boolean(this.record.pending) || this.dirty() && !(this.record.revision === 0 && this.record.syncedSave === null && equalSave(this.record.save, initialState()));}

  acceptRemote(remote) {
    const r = this.record;
    // A PUT may have committed although its response was lost (including across reloads).
    if (r.pending && remote.writeId === r.pending.writeId && equalSave(remote.save, r.pending.save)) {
      r.syncedSave = remote.save; r.revision = remote.revision; r.pending = null;
      this.ready = true; this.conflict = null; this.persist();
      this.notify(this.dirty() ? '已恢复上次保存，正在同步新进度…' : '旅途已同步到云端');
      if (this.dirty()) this.queue();
      return;
    }
    if (equalSave(r.save, remote.save)) {this.adopt(remote, false); return;}
    if (remote.save === null && (r.revision === null || r.revision === 0)) {
      r.revision = 0; r.syncedSave = null;
      this.ready = true; this.conflict = null; this.persist();
      this.notify(this.legacy ? '此账号还没有云存档；可在设置中迁移旧旅途' : '云端已连接，行动后自动保存');
      // Do not write a brand-new default state just because the page was opened.
      if (!equalSave(r.save, initialState()) || r.pending) this.queue();
      return;
    }
    if (!r.pending && (equalSave(r.save, r.syncedSave) || r.revision === null && equalSave(r.save, initialState()))) {
      this.adopt(remote, false); return;
    }
    if (r.revision === remote.revision && equalSave(r.syncedSave, remote.save)) {
      this.ready = true; this.conflict = null;
      this.notify('正在同步此设备的离线进度…'); this.queue(); return;
    }
    this.setConflict(remote);
  }

  setConflict(remote) {
    this.ready = false;
    this.record.pending = null;
    this.conflict = {kind: 'revision', remote};
    this.cancelTimer(); this.persist();
    this.notify('发现两份不同旅途，请在设置中选择保留哪一份');
  }

  adopt(remote, protectLocal = true) {
    if (protectLocal && !this.backup(this.record.save, this.record.revision, 'before-reading-cloud')) {
      this.notify('本机备份失败，请先导出旅途，再重试读取云端'); return false;
    }
    this.record.save = remote.save ?? initialState();
    this.record.syncedSave = remote.save;
    this.record.revision = remote.revision;
    this.record.pending = null;
    this.conflict = null; this.ready = true;
    this.persist(); this.apply(structuredClone(this.record.save));
    this.notify('旅途已同步到云端');
    return true;
  }

  save(state) {
    const save = normalizeSave(state);
    if (!save) {this.notify('存档格式异常，请导出旅途并重试'); return false;}
    this.record.save = save;
    this.persist();
    if (this.record.userId === null) this.notify('旅途已保存于此设备；登录后可同步');
    else if (!this.conflict && this.ready) {this.notify('本机已保存，等待云端同步…'); this.queue();}
    else this.notify();
    return true;
  }

  queue(delay = this.debounce) {
    if (this.closed || !this.ready || this.conflict || this.record.userId === null) return;
    this.cancelTimer();
    this.timer = this.timers.setTimeout(() => {this.timer = null; void this.flush();}, delay);
  }

  async flush({keepalive = false} = {}) {
    if (this.closed || this.busy || this.connecting || !this.ready || this.conflict || !this.needsUpload()) return;
    if (this.record.userId === null || !validRevision(this.record.revision)) return;
    this.cancelTimer();
    this.busy = true;
    const epoch = this.epoch, owner = this.record.userId;
    if (!this.record.pending) this.record.pending = {save: structuredClone(this.record.save), expectedRevision: this.record.revision, writeId: this.makeId()};
    const pending = this.record.pending;
    this.persist(); this.notify('正在保存云端旅途…');
    let retry = false;
    try {
      const raw = JSON.stringify({save: pending.save, expectedRevision: pending.expectedRevision, accountId: owner, writeId: pending.writeId});
      const response = await this.request('/api/save', {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: raw,
        keepalive: keepalive && new TextEncoder().encode(raw).length < 60_000,
      });
      const data = await response.json();
      if (this.epoch !== epoch || this.closed) return;
      if (response.status === 401 || data.error === 'account_changed' || data.userId && data.userId !== owner) {
        this.ready = false; this.canPlay = false; this.notify('账号已变化，正在重新核对旅途…'); this.deferConnect(); return;
      }
      if (response.status === 409 && data.error === 'revision_conflict') {this.setConflict(this.remote(data)); return;}
      if (!response.ok) {
        retry = response.status >= 500 || response.status === 429;
        throw new Error(data.error || 'save_failed');
      }
      const remote = this.remote(data);
      if (remote.writeId !== pending.writeId || !equalSave(remote.save, pending.save) || remote.revision <= pending.expectedRevision) throw new Error('invalid_ack');
      this.record.revision = remote.revision;
      this.record.syncedSave = pending.save;
      this.record.pending = null;
      this.retryCount = 0;
      this.persist();
      this.notify(this.dirty() ? '本机有新进度，继续同步…' : '旅途已同步到云端');
      retry = this.dirty();
    } catch (error) {
      if (this.epoch !== epoch || this.closed) return;
      // Retain the exact pending snapshot/write ID. Never retry with new contents.
      this.persist();
      if (error instanceof TypeError || error.message === 'request_timeout') retry = true;
      this.notify('云端保存未完成，进度仍在此设备；可重试同步');
    } finally {
      this.busy = false;
      if (this.epoch === epoch && this.ready && !this.conflict && retry) this.queue(Math.min(30_000, 1000 * 2 ** Math.min(this.retryCount++, 5)));
      else if (this.epoch !== epoch && this.ready && !this.conflict && this.needsUpload()) this.queue();
    }
  }

  prepareLegacy() {
    this.legacy = this.loadLegacy();
    if (!this.legacy || this.record.userId === null || !this.ready || this.busy) return false;
    this.conflict = {kind: 'legacy', remote: {save: this.record.syncedSave, revision: this.record.revision}};
    this.ready = false; this.cancelTimer();
    this.notify('旧旅途属于此设备，请确认后迁移到当前账号');
    return true;
  }

  resolve(choice) {
    if (!this.conflict || this.busy) return false;
    const {remote, kind} = this.conflict;
    if (kind === 'legacy' && choice === 'remote') {
      this.conflict = null; this.ready = true;
      this.notify('已保留当前旅途'); if (this.dirty()) this.queue(); return true;
    }
    if (choice === 'remote') return this.adopt(remote);
    if (choice !== 'local') return false;
    if (!this.backup(remote.save, remote.revision, 'before-replacing-cloud')) {
      this.notify('云端副本备份失败，请导出后重试'); return false;
    }
    if (kind === 'legacy') {
      const next = {...this.record, save: this.legacy, revision: remote.revision, syncedSave: remote.save, pending: null};
      if (!this.legacy || this.read(CLAIM_KEY) || !this.backup(this.record.save, this.record.revision, 'before-legacy-import') ||
          !this.write(cacheKey(this.record.userId), JSON.stringify(next)) || !this.write(CLAIM_KEY, this.record.userId)) {
        this.notify('旧存档迁移未完成，原文件仍保留在此设备'); return false;
      }
      this.record.save = structuredClone(this.legacy);
      this.apply(structuredClone(this.record.save)); this.legacy = null;
      this.write(cacheKey(null), JSON.stringify(fresh(null)));
    }
    this.record.revision = remote.revision;
    this.record.syncedSave = remote.save;
    this.record.pending = null;
    this.conflict = null; this.ready = true;
    this.persist(); this.notify('已保留此设备旅途，正在保存到云端…'); this.queue(0);
    return true;
  }

  storageChanged(key) {
    if (key === cacheKey(this.record.userId) && !this.conflict && !this.busy && !this.connecting) void this.connect();
  }

  dispose() {this.closed = true; this.epoch++; this.cancelTimer();}
}
