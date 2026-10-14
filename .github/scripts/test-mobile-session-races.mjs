import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const storage = new Map();
let holdWrite;
let writeStarted;
globalThis.__voxSecureStore = {
  getItemAsync: async key => storage.get(key) ?? null,
  setItemAsync: async (key, value) => {
    if (value === 'rotation-held') await new Promise(resolve => { holdWrite = resolve; writeStarted?.(); });
    storage.set(key, value);
  },
  deleteItemAsync: async key => storage.delete(key),
};
const source = (await readFile('apps/mobile/src/api.ts', 'utf8'))
  .replace("import * as SecureStore from 'expo-secure-store';", 'const SecureStore = globalThis.__voxSecureStore;');
const api = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
const session = name => ({ token: name, refreshToken: `${name}-refresh`, user: { id: name, nome: name, email: `${name}@example.invalid`, lojaId: 'loja', role: 'CLIENTE' } });
const ok = data => ({ ok: true, status: 200, json: async () => data });
const unauthorized = () => ({ ok: false, status: 401, json: async () => ({ error: 'Expired' }) });
let releaseRefresh;
let refreshes = 0;
let authorizedMutations = 0;
let refreshStarted;
globalThis.fetch = async (url, options) => {
  if (url.endsWith('/auth/refresh')) {
    refreshes++;
    refreshStarted?.();
    return new Promise(resolve => { releaseRefresh = value => resolve(ok(value)); });
  }
  if (url.endsWith('/auth/logout')) return ok({ ok: true });
  if (options.headers.Authorization === 'Bearer old') return unauthorized();
  if (options.method === 'POST') authorizedMutations++;
  return ok({ ok: true });
};

await api.saveSession(session('old'));
const started = new Promise(resolve => { refreshStarted = resolve; });
const pending = api.request('/servicos/solicitacoes', {}, true).catch(error => error);
const concurrent = api.request('/auth/me', undefined, true).catch(error => error);
await started;
await new Promise(resolve => setImmediate(resolve));
assert.equal(refreshes, 1, 'Concurrent 401 responses must share refresh rotation');
await api.saveSession(session('new'));
releaseRefresh(session('late'));
assert.match((await pending).message, /sessão mudou/);
assert.match((await concurrent).message, /sessão mudou/);
assert.equal(authorizedMutations, 0, 'An old queued write must not run under a new account');
assert.equal(storage.get('vox.refresh'), 'new-refresh');

await api.saveSession(session('old'));
const logoutStarted = new Promise(resolve => { refreshStarted = resolve; });
const logoutRace = api.request('/auth/me', undefined, true).catch(error => error);
await logoutStarted;
await api.logout();
releaseRefresh(session('late-logout'));
assert.match((await logoutRace).message, /sessão mudou/);
assert.equal(storage.has('vox.refresh'), false, 'Late refresh must not restore a logged-out credential');

await api.saveSession(session('old'));
const writing = new Promise(resolve => { writeStarted = resolve; });
const rotationStarted = new Promise(resolve => { refreshStarted = resolve; });
const writingRace = api.request('/auth/me', undefined, true).catch(error => error);
await rotationStarted;
releaseRefresh({ ...session('rotated'), refreshToken: 'rotation-held' });
await writing;
const newAccount = api.saveSession(session('newest'));
holdWrite();
await newAccount;
assert.match((await writingRace).message, /sessão/);
assert.equal(storage.get('vox.refresh'), 'newest-refresh', 'Serialized storage must leave the newest account credential last');
let releaseBody;
let bodyStarted;
const parsing = new Promise(resolve => { bodyStarted = resolve; });
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => {
  bodyStarted();
  return new Promise(resolve => { releaseBody = () => resolve({ privateProfile: 'previous account' }); });
} });
const bodyRace = api.request('/auth/me', undefined, true).catch(error => error);
await parsing;
await api.saveSession(session('after-json'));
releaseBody();
assert.match((await bodyRace).message, /sessão mudou/, 'Account switch while parsing JSON must reject old private data');
for (const metadata of [{}, { contrato: 0, capacidades: ['resgate-idempotente'] }, { contrato: 1, capacidades: [] }, { contrato: 1, capacidades: 'resgate-idempotente' }]) {
  globalThis.fetch = async () => ok(metadata);
  await assert.rejects(api.requireCapability('resgate-idempotente'), /atualização do servidor/);
}
globalThis.fetch = async () => { throw new TypeError('Offline'); };
await assert.rejects(api.requireCapability('resgate-idempotente'), /atualização do servidor/);
globalThis.fetch = async () => ok({ contrato: 1, capacidades: ['resgate-idempotente'] });
await api.requireCapability('resgate-idempotente');
const previousRevision = api.sessionRevision();
await api.saveSession(session('privacy-new-account'));
let preferenceWrites = 0;
globalThis.fetch = async () => { preferenceWrites++; return ok({}); };
await assert.rejects(api.requestForSession(previousRevision, '/privacidade/preferencias', { notificacoes: true }, 'PUT'), /conta mudou/);
assert.equal(preferenceWrites, 0, 'An old preferences screen must not write consent under a new account');
await api.requestForSession(api.sessionRevision(), '/privacidade/preferencias', { notificacoes: false }, 'PUT');
assert.equal(preferenceWrites, 1);
console.log('Native refresh coalescing, queued writes, logout, JSON parsing and SecureStore races passed.');
await api.saveSession(session('push-account'));
await api.rememberNativePushDevice('device-native', api.sessionRevision());
assert.equal(storage.get('vox.push.device'), 'device-native');
globalThis.fetch = async (url, options) => { assert.ok(url.endsWith('/auth/logout')); assert.deepEqual(JSON.parse(options.body), { pushDeviceId: 'device-native' }); return ok({ ok: true }); };
await api.logout();
assert.equal(storage.has('vox.push.device'), false);
assert.equal(storage.has('vox.refresh'), false);
await api.saveSession(session('offline-push-account'));
await api.rememberNativePushDevice('offline-device', api.sessionRevision());
globalThis.fetch = async () => { throw new TypeError('Offline'); };
await assert.rejects(api.logout(), /Offline/);
assert.equal(storage.get('vox.push.device'), 'offline-device', 'Offline failure must preserve the revocation identifier');
assert.equal(storage.has('vox.refresh'), false, 'Local credentials must still be removed');
await api.saveSession(session('logout-old-account'));
let releaseLogout, announceLogout;
const pendingLogout = new Promise(resolve => { announceLogout = resolve; });
globalThis.fetch = async () => { announceLogout(); return new Promise(resolve => { releaseLogout = () => resolve(ok({ ok: true })); }); };
const leaving = api.logout().catch(error => error);
await pendingLogout;
await api.saveSession(session('logout-new-account'));
releaseLogout();
await leaving;
assert.equal(storage.get('vox.refresh'), 'logout-new-account-refresh', 'Old logout must not clear a newer login');
console.log('Native logout: device revocation identifier, offline credential cleanup and new-account preservation passed.');
