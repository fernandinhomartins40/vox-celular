import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import webpush from 'web-push';
import { sendWebPush, pushRetryAfter } from './webPushTransport.js';

const curve = createECDH('prime256v1');
const subscription = { endpoint: 'https://fcm.googleapis.com/fictional-test-endpoint', keys: { p256dh: curve.generateKeys().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
const config = { ...webpush.generateVAPIDKeys(), subject: 'https://vox.example' };
const now = new Date('2026-10-12T12:00:00Z');
const notice = { id: 'notice-1', destino: '/pedidos', expiresAt: new Date(now.getTime() + 90000) };
let calls = 0;
const accepted: typeof fetch = async (url, options) => {
  calls++;
  assert.equal(url, subscription.endpoint);
  assert.equal(options?.redirect, 'error');
  assert.equal(options?.method, 'POST');
  assert.ok(options?.signal instanceof AbortSignal);
  const headers = new Headers(options?.headers);
  assert.equal(headers.get('TTL'), '90');
  assert.equal(headers.get('Content-Encoding'), 'aes128gcm');
  assert.equal(headers.get('Topic')?.length, 32);
  assert.ok(headers.get('Authorization')?.startsWith('vapid '));
  assert.ok(options?.body instanceof Uint8Array);
  assert.ok(!Buffer.from(options.body).toString().includes('notice-1'), 'Payload must be encrypted');
  return new Response(null, { status: 201 });
};
assert.deepEqual(await sendWebPush(subscription, notice, config, accepted, now), { status: 'accepted' });
assert.equal(calls, 1);
for (const [code, expected] of [[410, 'invalid-subscription'], [404, 'invalid-subscription'], [429, 'temporary'], [503, 'temporary'], [403, 'rejected'], [302, 'rejected']] as const) {
  assert.deepEqual(await sendWebPush(subscription, notice, config, async () => new Response(null, { status: code }), now), { status: expected });
}
assert.deepEqual(await sendWebPush(subscription, notice, config, async () => { throw new Error('network-secret-must-not-leak'); }, now), { status: 'ambiguous' });
assert.deepEqual(await sendWebPush(subscription, { ...notice, expiresAt: now }, config, accepted, now), { status: 'expired' });
assert.equal(calls, 1, 'Expired notices must not cause network requests');
await assert.rejects(sendWebPush({ ...subscription, endpoint: 'https://127.0.0.1/private' }, notice, config, accepted, now), /INVALID_PUSH_TRANSPORT_INPUT/);
await assert.rejects(sendWebPush(subscription, { ...notice, destino: 'https://evil.example' }, config, accepted, now), /INVALID_PUSH_TRANSPORT_INPUT/);
await assert.rejects(sendWebPush(subscription, notice, { ...config, subject: 'https://localhost' }, accepted, now), /INVALID_PUSH_TRANSPORT_INPUT/);
console.log('Encrypted push request, TTL, redirect policy, failures and input restrictions passed.');
assert.equal(pushRetryAfter('120', now)?.getTime(), now.getTime() + 120000);
assert.equal(pushRetryAfter('9'.repeat(80), now)?.getTime(), 8640000000000000, 'Very long valid delays must not fall back to an early retry');
assert.equal(pushRetryAfter('Mon, 12 Oct 2026 12:05:00 GMT', now)?.getTime(), now.getTime() + 300000);
for (const value of [null, 'invalid', '-3', '0', 'Mon, 12 Oct 2026 11:00:00 GMT', 'x'.repeat(81)]) assert.equal(pushRetryAfter(value, now), undefined);
const rateLimited = await sendWebPush(subscription, notice, config, async () => new Response(null, { status: 429, headers: { 'Retry-After': '120' } }), now);
assert.equal(rateLimited.status, 'temporary');
assert.ok(rateLimited.status === 'temporary' && rateLimited.retryAfter!.getTime() >= now.getTime() + 120000);
