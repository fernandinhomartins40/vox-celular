import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const saved = new Map();
let failStorage = false;
let revision = 0;
let switchDuringWrite = false;
globalThis.__cartStorage = {
  getItem: async key => saved.get(key) ?? null,
  setItem: async (key, value) => {
    if (failStorage) throw new Error('Storage unavailable');
    saved.set(key, value);
    if (switchDuringWrite) { revision++; switchDuringWrite = false; }
  },
  removeItem: async key => saved.delete(key),
};
class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
let account = { id: 'client-a', lojaId: 'store-a', role: 'CLIENTE' };
const posts = [];
let result = 'network';
let uuid = 0;
let compatible = true;
globalThis.__cartUuid = () => `aaaaaaaa-aaaa-4aaa-8aaa-${String(++uuid).padStart(12, '0')}`;
globalThis.__cartApi = { ApiError, requireCapability: async () => { if (!compatible) throw new Error('Server incompatible'); }, sessionRevision: () => revision, request: async (path, body) => {
  if (path === '/auth/me') return account;
  assert.equal(path, '/pedidos');
  const persisted = JSON.parse(saved.get('vox.cart.v1'));
  assert.equal(persisted.pending.checkoutKey, body.checkoutKey, 'Persist confirmation before dispatch');
  posts.push(structuredClone(body));
  if (result === 'network') throw new TypeError('Network unavailable');
  if (result === 'rejected') throw new ApiError('Price changed', 409);
  return { id: 'order-1', codigo: 'VOX-1', total: 20, pagamento: 'Aguardando confirmação' };
} };
const raw = (await readFile('apps/mobile/src/cart.ts', 'utf8'))
  .replace("import AsyncStorage from '@react-native-async-storage/async-storage';", 'const AsyncStorage = globalThis.__cartStorage;')
  .replace("import { randomUUID } from 'expo-crypto';", 'const randomUUID = globalThis.__cartUuid;')
  .replace("import { ApiError, NativeUser, request, sessionRevision, requireCapability } from './api';", 'const { ApiError, request, sessionRevision, requireCapability } = globalThis.__cartApi;');
const source = stripTypeScriptTypes(raw);
const load = suffix => import(`data:text/javascript;base64,${Buffer.from(source + `\n// ${suffix}`).toString('base64')}`);
const cart = await load('initial');
await Promise.all([cart.addToCart('store-a', 'phone', 3), cart.addToCart('store-a', 'phone', 3)]);
assert.equal((await cart.readCart()).items[0].qty, 2, 'Concurrent adds must not overwrite quantities');
await assert.rejects(cart.addToCart('store-b', 'other', 3), /outra loja/);
await assert.rejects(cart.addToCart('store-a', 'phone', 2), /estoque/);
const reviewed = [{ produtoId: 'phone', qty: 2, precoCentavos: 1000 }];
compatible = false;
await assert.rejects(cart.confirmCart(reviewed), /incompatible/);
assert.equal(posts.length, 0, 'Incompatible server must prevent checkout dispatch');
assert.equal((await cart.readCart()).pending, undefined);
compatible = true;
await assert.rejects(cart.confirmCart(reviewed), /Network/);
const pending = (await cart.readCart()).pending;
assert.ok(pending);
await assert.rejects(cart.changeCart('store-a', 'phone', 1), /pendente/);
const restarted = await load('restart');
account = { ...account, id: 'client-b' };
await assert.rejects(restarted.confirmCart(reviewed), /conta que iniciou/);
assert.equal(posts.length, 1, 'Pending checkout is bound to its original account');
account = { ...account, id: 'client-a' };
result = 'success';
const receipt = await restarted.confirmCart([{ ...reviewed[0], precoCentavos: 9999 }]);
assert.equal(receipt.id, 'order-1');
assert.equal(posts[1].checkoutKey, pending.checkoutKey, 'Restart retry must reuse the original key');
assert.equal(posts[1].itens[0].precoCentavos, 1000, 'Recovery preserves the original reviewed price');
assert.equal((await restarted.readCart()).items.length, 0);
await restarted.addToCart('store-a', 'phone', 3);
const one = [{ produtoId: 'phone', qty: 1, precoCentavos: 1000 }];
failStorage = true;
const before = posts.length;
await assert.rejects(restarted.confirmCart(one), /Storage/);
assert.equal(posts.length, before, 'Failed persistence must prevent dispatch');
failStorage = false;
switchDuringWrite = true;
await assert.rejects(restarted.confirmCart(one), /sessão mudou/);
assert.equal(posts.length, before, 'Account switch during persistence must prevent dispatch');
result = 'rejected';
await assert.rejects(restarted.confirmCart(one), /Price changed/);
assert.equal((await restarted.readCart()).pending, undefined, 'Definitive rejection permits editing');
assert.equal((await restarted.readCart()).items[0].qty, 1);
saved.set('vox.cart.v1', JSON.stringify({ storeId: 'store-a', items: [{ produtoId: 'phone', qty: -1 }] }));
await assert.rejects(restarted.readCart(), /ler o carrinho/);
console.log('Native cart concurrency, persistent retries, price preservation and account isolation passed.');
