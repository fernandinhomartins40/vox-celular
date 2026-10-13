import assert from 'node:assert/strict';
import { prepareBrowserPush, disableBrowserPush } from '../../apps/web/src/lib/browserPush.js';

function fixture() {
  let generation = 1;
  const calls = [];
  const subscription = { toJSON: () => ({ endpoint: 'fixture-endpoint', expirationTime: null, keys: { p256dh: 'fixture-key', auth: 'fixture-auth' } }), unsubscribe: async () => { calls.push('unsubscribe'); return true; } };
  const api = {
    get: async path => { calls.push(path); return path.includes('preferencias') ? { notificacoes: true } : { entregaConfigurada: true, publicKey: Buffer.alloc(65, 4).toString('base64url') }; },
    put: async (path, body) => { calls.push(path); assert.equal(body.expirationTime, undefined); return { id: 'saved' }; },
  };
  const browser = {
    isSecureContext: true, PushManager: {}, atob: value => Buffer.from(value, 'base64').toString('binary'),
    Notification: { permission: 'default', requestPermission: () => { calls.push('permission'); return Promise.resolve('granted'); } },
    navigator: { serviceWorker: { getRegistration: async () => ({ active: {}, pushManager: { getSubscription: async () => null, subscribe: async options => { calls.push('subscribe'); assert.equal(options.userVisibleOnly, true); return subscription; } } }) } },
  };
  return { api, browser, calls, subscription, read: () => generation, change: () => { generation++; } };
}
const valid = fixture();
const prepared = await prepareBrowserPush(valid.api, 1, valid.read, valid.browser);
assert.ok(!valid.calls.includes('permission'), 'Preparation must not request permission');
const saving = prepared.activate();
assert.equal(valid.calls.at(-1), 'permission', 'Permission must be requested synchronously from the click');
assert.deepEqual(await saving, { id: 'saved' });
assert.ok(valid.calls.includes('/push/web'));
assert.ok(!valid.calls.includes('unsubscribe'));
const rejected = fixture(); rejected.browser.Notification.requestPermission = () => Promise.resolve('denied');
await assert.rejects((await prepareBrowserPush(rejected.api, 1, rejected.read, rejected.browser)).activate(), /Permissão não concedida/);
assert.ok(!rejected.calls.includes('subscribe'));
const consent = fixture(); consent.api.get = async () => ({ notificacoes: false });
await assert.rejects(prepareBrowserPush(consent.api, 1, consent.read, consent.browser), /salve as preferências/);
assert.ok(!consent.calls.includes('permission'));
const unavailable = fixture(); unavailable.api.get = async path => path.includes('preferencias') ? { notificacoes: true } : { entregaConfigurada: false };
await assert.rejects(prepareBrowserPush(unavailable.api, 1, unavailable.read, unavailable.browser), /ainda não estão disponíveis/);
const swapped = fixture(); const old = await prepareBrowserPush(swapped.api, 1, swapped.read, swapped.browser); swapped.change();
assert.throws(() => old.activate(), /sessão mudou/);
assert.ok(!swapped.calls.includes('permission'));
const failure = fixture(); failure.api.put = async () => { throw new Error('server-rejected'); };
await assert.rejects((await prepareBrowserPush(failure.api, 1, failure.read, failure.browser)).activate(), /server-rejected/);
assert.ok(failure.calls.includes('unsubscribe'), 'New subscription must be cleaned up after failed registration');
const race = fixture(); race.browser.Notification.requestPermission = () => { race.change(); return Promise.resolve('granted'); };
await assert.rejects((await prepareBrowserPush(race.api, 1, race.read, race.browser)).activate(), /sessão mudou/);
assert.ok(!race.calls.includes('subscribe'));
console.log('Browser push explicit permission, consent, session boundaries and failed registration cleanup passed.');
const outdated = fixture();
outdated.browser.navigator.serviceWorker.getRegistration = async () => ({ active: {}, pushManager: {
  subscribe: async () => { throw new Error('Must not subscribe over an old key'); },
  getSubscription: async () => ({ ...outdated.subscription, options: { applicationServerKey: new Uint8Array(65).buffer } }),
} });
await assert.rejects((await prepareBrowserPush(outdated.api, 1, outdated.read, outdated.browser)).activate(), /assinatura antiga/);
assert.ok(!outdated.calls.includes('/push/web'));
assert.ok(!outdated.calls.includes('unsubscribe'), 'Existing subscriptions must not be deleted implicitly');
const disable = fixture();
disable.subscription.endpoint = 'fixture-endpoint';
disable.browser.navigator.serviceWorker.getRegistration = async () => ({ pushManager: { getSubscription: async () => disable.subscription } });
disable.api.post = async (path, body) => { assert.equal(path, '/push/web/remover-atual'); assert.equal(body.endpoint, 'fixture-endpoint'); disable.calls.push('server-remove'); };
await disableBrowserPush(disable.api, 1, disable.read, disable.browser);
assert.deepEqual(disable.calls, ['server-remove', 'unsubscribe']);
const disableRace = fixture();
disableRace.browser.navigator.serviceWorker.getRegistration = async () => ({ pushManager: { getSubscription: async () => disableRace.subscription } });
disableRace.api.post = async () => { disableRace.change(); };
await assert.rejects(disableBrowserPush(disableRace.api, 1, disableRace.read, disableRace.browser), /sessão mudou/);
assert.ok(!disableRace.calls.includes('unsubscribe'));
