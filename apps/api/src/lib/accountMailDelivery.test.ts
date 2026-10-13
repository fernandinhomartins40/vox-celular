import assert from 'node:assert/strict';
import { createAccountMailDelivery } from './accountMailDelivery.js';
const config = { host: 'smtp.example.com', port: '587', user: 'fixture', password: 'fixture-only', from: 'vox@example.com', origin: 'https://vox.example.com' };
const token = 'a'.repeat(43);
let release!: () => void;
const gate = new Promise<void>(resolve => { release = resolve; });
let configurations = 0, issues = 0, sends = 0, closes = 0;
const deliver = createAccountMailDelivery({
  async configuration(lojaId) { assert.equal(lojaId, 'store'); configurations++; return config; },
  async issue(lojaId, identity, purpose) { assert.equal(lojaId, 'store'); assert.deepEqual(identity, { userId: 'client' }); assert.equal(purpose, 'VERIFICAR_EMAIL'); issues++; return { token, email: 'client@example.com' }; },
  sender() { return { async send(to, lojaId, raw, purpose) { sends++; assert.equal(to, 'client@example.com'); assert.equal(lojaId, 'store'); assert.equal(raw, token); assert.equal(purpose, 'VERIFICAR_EMAIL'); await gate; return { status: 'accepted' }; }, close() { closes++; throw new Error('private-close-detail'); } }; },
});
const first = deliver('store', { userId: 'client' }, 'VERIFICAR_EMAIL');
const second = deliver('store', { userId: 'client' }, 'VERIFICAR_EMAIL');
assert.equal(await deliver('store', { userId: 'client' }, 'VERIFICAR_EMAIL'), undefined);
release(); await Promise.all([first, second]);
assert.equal(configurations, 2); assert.equal(issues, 2); assert.equal(sends, 2); assert.equal(closes, 2);
await deliver('store', { userId: 'client' }, 'VERIFICAR_EMAIL');
assert.equal(sends, 3, 'close failure must release concurrency slot');
let issued = false;
const absent = createAccountMailDelivery({ async configuration() { return null; }, async issue() { issued = true; return null; }, sender() { throw new Error('must not create transport'); } });
assert.equal(await absent('store', { email: 'unknown@example.com' }, 'RECUPERAR_SENHA'), undefined);
assert.equal(issued, false);
const invalid = createAccountMailDelivery({ async configuration() { return { ...config, port: '25' }; }, async issue() { issued = true; return null; }, sender() { throw new Error('must not create transport'); } });
await invalid('store', { email: 'unknown@example.com' }, 'RECUPERAR_SENHA'); assert.equal(issued, false);
console.log('Account delivery orchestration: bounded concurrency, private result, absent/invalid configuration and release after close failure passed with injected dependencies.');
