import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const source = stripTypeScriptTypes(await readFile(new URL('../../apps/mobile/src/notificationDestination.ts', import.meta.url), 'utf8'));
const { notificationDestination } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
for (const destino of ['/pedidos', '/servicos', '/beneficios']) assert.equal(notificationDestination({ id: 'notice_1', destino, redirect: 'https://evil.invalid', token: 'secret' }), destino);
for (const data of [null, [], '', {}, { id: 'notice', destino: '/admin' }, { id: 'notice', destino: 'https://evil.invalid' }, { id: 'notice', destino: '/pedidos?token=secret' }, { id: 'x'.repeat(101), destino: '/pedidos' }, { id: '../secret', destino: '/pedidos' }, { id: 1, destino: '/pedidos' }]) assert.equal(notificationDestination(data), null);
console.log('Native notification destinations: three fixed account routes, validated notice ID and untrusted/private redirect rejection passed.');
let key, effect, listener, resolveInitial, removed = false;
const opened = [];
globalThis.__notificationNavigationFixture = {
  useEffect: callback => { effect = callback; },
  useRef: initial => ({ current: initial }),
  useRootNavigationState: () => key ? { key } : undefined,
  useRouter: () => ({ push: route => opened.push(route) }),
  notificationDestination,
  Notifications: {
    DEFAULT_ACTION_IDENTIFIER: 'default',
    addNotificationResponseReceivedListener: callback => { listener = callback; return { remove: () => { removed = true; } }; },
    getLastNotificationResponseAsync: async () => new Promise(resolve => { resolveInitial = resolve; }),
    clearLastNotificationResponseAsync: async () => {},
  },
};
let navigationSource = (await readFile(new URL('../../apps/mobile/src/NotificationNavigation.tsx', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
navigationSource = `const {useEffect,useRef,useRootNavigationState,useRouter,Notifications,notificationDestination}=globalThis.__notificationNavigationFixture;\n${navigationSource}`;
const { default: Navigation } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(navigationSource)).toString('base64')}`);
Navigation(); assert.equal(effect(), undefined); assert.equal(listener, undefined, 'Do not navigate before root navigation is ready');
key = 'ready'; Navigation(); const cleanup = effect();
const response = (identifier, destino) => ({ actionIdentifier: 'default', notification: { request: { identifier, content: { data: { id: 'notice_1', destino } } } } });
listener(response('new', '/pedidos')); listener(response('new', '/pedidos'));
assert.deepEqual(opened, ['/pedidos'], 'Duplicate tap must not create another screen');
resolveInitial(response('old', '/servicos')); await new Promise(resolve => setImmediate(resolve));
assert.deepEqual(opened, ['/pedidos'], 'An old startup response must not override a live tap');
listener(response('invalid', '/admin')); assert.equal(opened.length, 1);
cleanup(); assert.equal(removed, true);
listener(response('after-unmount', '/servicos')); assert.equal(opened.length, 1);
Navigation(); const coldCleanup = effect();
resolveInitial(response('cold-start', '/beneficios')); await new Promise(resolve => setImmediate(resolve));
assert.deepEqual(opened, ['/pedidos', '/beneficios'], 'Cold-start tap must navigate once root is ready');
coldCleanup();
console.log('Native notification listener: navigation readiness, duplicate response, cold-start/live race and cleanup passed with native/router mocks.');
