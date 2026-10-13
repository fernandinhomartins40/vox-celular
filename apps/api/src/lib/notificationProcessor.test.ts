import assert from 'node:assert/strict';
import { processNotification } from './notificationProcessor.js';
import type { AuthorizedDelivery } from './notificationDeliveryAuthorization.js';
type Dependencies = NonNullable<Parameters<typeof processNotification>[1]>;
const now = new Date('2026-10-12T12:00:00Z');
const authorized: AuthorizedDelivery = { id: 'delivery', notificacaoId: 'notice', lojaId: 'store', clienteId: 'client', assinaturaId: 'subscription', credenciais: 'sealed-fixture', titulo: 'Private', mensagem: 'Private', destino: '/pedidos', expiresAt: new Date(now.getTime() + 60000) };
function fixture() {
  const calls: string[] = [];
  const deps: Dependencies = {
    keys: async () => { calls.push('keys'); return { publicKey: 'public-fixture', privateKey: 'private-fixture' }; },
    claimEvent: async () => { calls.push('event'); },
    claimDelivery: async () => { calls.push('claim'); return { id: 'delivery', tentativas: 1 }; },
    authorize: async () => { calls.push('authorize'); return authorized; },
    decrypt: async (_sealed, context) => { calls.push('decrypt'); assert.equal(context, 'store:push:client'); return { endpoint: 'fixture', p256dh: 'fixture', auth: 'fixture' }; },
    send: async (_subscription, notice) => { calls.push('send'); assert.equal(notice.id, 'notice'); assert.ok(!('titulo' in notice)); return { status: 'accepted' }; },
    settle: async (_id, attempt, result) => { calls.push(`settle:${result.status}`); assert.equal(attempt, 1); return true; },
    now: () => now,
    finalize: async () => { calls.push('finalize'); return 0; },
    expire: async () => { calls.push('expire'); return 0; },
    recover: async () => { calls.push('recover'); return 0; },
  };
  return { deps, calls };
}
const normal = fixture();
assert.deepEqual(await processNotification('https://vox.example', normal.deps), { processed: true, status: 'accepted', persisted: true });
assert.deepEqual(normal.calls, ['keys', 'expire', 'recover', 'event', 'claim', 'authorize', 'decrypt', 'authorize', 'send', 'settle:accepted', 'finalize']);
for (const change of ['revoked', 'rotated'] as const) {
  const test = fixture(); let reads = 0;
  test.deps.authorize = async () => ++reads === 1 ? authorized : change === 'revoked' ? null : { ...authorized, credenciais: 'rotated' };
  assert.equal((await processNotification('https://vox.example', test.deps)).status, 'cancelled');
  assert.ok(!test.calls.includes('send'));
}
const noAuth = fixture(); noAuth.deps.authorize = async () => null;
assert.equal((await processNotification('https://vox.example', noAuth.deps)).status, 'cancelled');
assert.ok(!noAuth.calls.includes('decrypt'));
const brokenVault = fixture(); brokenVault.deps.decrypt = async () => { throw new Error('private-error'); };
assert.equal((await processNotification('https://vox.example', brokenVault.deps)).status, 'rejected');
assert.ok(!brokenVault.calls.includes('send'));
const lostResult = fixture(); lostResult.deps.send = async () => { throw new Error('private-error'); };
assert.equal((await processNotification('https://vox.example', lostResult.deps)).status, 'ambiguous');
const badConfig = fixture();
await assert.rejects(processNotification('http://localhost', badConfig.deps), /INVALID_PUSH_SUBJECT/);
assert.deepEqual(badConfig.calls, []);
const failedKeys = fixture(); failedKeys.deps.keys = async () => { throw new Error('restore-required'); };
await assert.rejects(processNotification('https://vox.example', failedKeys.deps));
assert.ok(!failedKeys.calls.includes('claim'));
const failedExpiration = fixture(); failedExpiration.deps.expire = async () => { throw new Error('database-unavailable'); };
await assert.rejects(processNotification('https://vox.example', failedExpiration.deps));
assert.ok(!failedExpiration.calls.includes('claim'));
console.log('Notification processing ordering, consent recheck, rotated keys and failure boundaries passed.');
