import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const handlers = new Map();
const shown = [];
const opened = [];
let focused = 0;
let windows = [];
const self = {
  location: { origin: 'https://vox.example' },
  addEventListener: (name, handler) => handlers.set(name, handler),
  registration: { showNotification: async (title, options) => shown.push({ title, options }) },
  clients: {
    matchAll: async () => windows,
    openWindow: async url => opened.push(url),
  },
};
vm.runInNewContext(await readFile(new URL('../../apps/web/public/sw.js', import.meta.url), 'utf8'), { self, URL });
async function push(text) {
  let pending;
  handlers.get('push')({ data: { text: () => text }, waitUntil: promise => { pending = promise; } });
  await pending;
  return shown.at(-1);
}
const notice = await push(JSON.stringify({ id: 'notice-1', destino: '/pedidos', titulo: 'Private title', mensagem: 'Private customer detail' }));
assert.equal(notice.options.data.path, '/area-cliente/pedidos');
assert.equal(notice.options.tag, 'vox-notice-1');
assert.equal(notice.options.renotify, false);
assert.ok(!JSON.stringify(notice).includes('Private'));
for (const text of ['not-json', 'null', '[]', 'x'.repeat(4097), JSON.stringify({ destino: 'https://evil.example', id: '<unsafe>' }), JSON.stringify({ destino: '__proto__' })]) {
  const fallback = await push(text);
  assert.equal(fallback.options.data.path, '/area-cliente/avisos');
  assert.equal(fallback.options.tag, undefined);
}
async function click(path) {
  let pending;
  let closed = false;
  handlers.get('notificationclick')({ notification: { data: { path }, close: () => { closed = true; } }, waitUntil: promise => { pending = promise; } });
  await pending;
  assert.equal(closed, true);
}
await click('https://evil.example');
assert.equal(opened.at(-1), 'https://vox.example/area-cliente/avisos');
windows = [{ url: 'https://vox.example/area-cliente/pedidos', focus: async () => { focused++; } }];
await click('/area-cliente/pedidos');
assert.equal(focused, 1);
assert.equal(opened.length, 1);
console.log('Push worker privacy, bounded payloads, safe destinations and window reuse passed.');
