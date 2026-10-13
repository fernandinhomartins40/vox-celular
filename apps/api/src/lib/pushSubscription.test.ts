import assert from 'node:assert/strict';
import { allowedPushEndpoint, webPushSubscriptionSchema } from './pushSubscription.js';
for (const host of ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com']) assert.equal(allowedPushEndpoint(`https://${host}/fixture`), true);
for (const url of ['http://fcm.googleapis.com/fixture', 'https://fcm.googleapis.com.evil.invalid/fixture', 'https://127.0.0.1/fixture', 'https://user@fcm.googleapis.com/fixture', 'https://fcm.googleapis.com:8443/fixture', 'https://fcm.googleapis.com/fixture#fragment', 'https://fcm.googleapis.com/', 'invalid']) assert.equal(allowedPushEndpoint(url), false);
const fixture = { endpoint: 'https://fcm.googleapis.com/fixture', keys: { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) } };
assert.equal(webPushSubscriptionSchema.safeParse(fixture).success, true);
assert.equal(webPushSubscriptionSchema.safeParse({ ...fixture, extra: true }).success, false);
assert.equal(webPushSubscriptionSchema.safeParse({ ...fixture, keys: { ...fixture.keys, auth: 'short' } }).success, false);
console.log('Web push endpoint allowlist and subscription shape passed.');
