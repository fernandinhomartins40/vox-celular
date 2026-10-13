import assert from 'node:assert/strict';
import { notificationRetentionCutoff } from './notificationRetention.js';
const now = new Date('2026-10-12T12:00:00.000Z');
assert.equal(notificationRetentionCutoff(now).toISOString(), '2026-09-12T12:00:00.000Z');
assert.equal(now.toISOString(), '2026-10-12T12:00:00.000Z');
assert.throws(() => notificationRetentionCutoff(new Date('invalid')), /INVALID_RETENTION_DATE/);
console.log('Notification retention cutoff and invalid-date rejection passed.');
