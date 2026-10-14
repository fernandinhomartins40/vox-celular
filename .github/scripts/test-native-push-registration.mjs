import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
let revision = 1, consent = true, allowed = true, switchDuringPermission = false;
const calls = [];
const fixture = {
  Notifications: {
    AndroidImportance: { DEFAULT: 3 }, AndroidNotificationVisibility: { PRIVATE: 0 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
    setNotificationChannelAsync: async name => { calls.push(`channel:${name}`); },
    getPermissionsAsync: async () => { calls.push('permission'); if (switchDuringPermission) revision++; return { granted: allowed, canAskAgain: false }; },
    getExpoPushTokenAsync: async () => { calls.push('token'); return { data: 'ExpoPushToken[fixture_device_token]' }; },
  },
  Constants: { expoConfig: { extra: { eas: { projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } } } },
  Platform: { OS: 'android' }, sessionRevision: () => revision,
  rememberNativePushDevice: async (id, expected) => { assert.equal(expected, revision); assert.equal(id, 'device'); calls.push('remember-device'); },
  requestForSession: async (expected, path, body, method) => {
    assert.equal(expected, revision);
    if (path === '/privacidade/preferencias') { calls.push('consent'); return { notificacoes: consent }; }
    assert.equal(path, '/push/native'); assert.equal(method, 'PUT'); assert.deepEqual(body, { token: 'ExpoPushToken[fixture_device_token]', plataforma: 'android' }); calls.push('register'); return { id: 'device' };
  },
};
globalThis.__nativePushFixture = fixture;
let source = await readFile(new URL('../../apps/mobile/src/nativePush.ts', import.meta.url), 'utf8');
source = source.replace(/^import .*;\r?\n/gm, '');
source = `const { Notifications, Constants, Platform, requestForSession, sessionRevision, rememberNativePushDevice } = globalThis.__nativePushFixture;\n${source}`;
const { registerNativePush } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
assert.deepEqual(await registerNativePush(revision, () => true), { id: 'device' });
assert.deepEqual(calls, ['consent', 'channel:vox-updates', 'permission', 'token', 'register', 'remember-device']);
calls.length = 0; consent = false;
await assert.rejects(registerNativePush(revision, () => true), /autorização/); assert.deepEqual(calls, ['consent']);
consent = true; calls.length = 0; allowed = false;
await assert.rejects(registerNativePush(revision, () => true), /não autorizadas/); assert.ok(!calls.includes('token') && !calls.includes('register'));
allowed = true; calls.length = 0; switchDuringPermission = true;
await assert.rejects(registerNativePush(revision, () => true), /conta mudou/); assert.ok(!calls.includes('register'));
switchDuringPermission = false; calls.length = 0;
await assert.rejects(registerNativePush(revision, () => false), /conta mudou/); assert.deepEqual(calls, []);
console.log('Native push registration: explicit consent, channel before permission, denial and account-change rejection passed with native module mocks.');
