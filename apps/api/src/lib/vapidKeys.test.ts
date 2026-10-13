import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, unlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createVapidKeyStore } from './vapidKeys.js';

const directory = await mkdtemp(path.join(tmpdir(), 'vox-vapid-test-'));
const file = path.join(directory, 'vapid.json');
try {
  const load = createVapidKeyStore(file, async () => false);
  const [first, second] = await Promise.all([load(), load()]);
  assert.deepEqual(first, second, 'Concurrent initialization must use one key pair');
  assert.equal(first.publicKey.length, 87);
  assert.equal(first.privateKey.length, 43);
  second.publicKey = 'modified-by-caller';
  assert.deepEqual(await load(), first, 'Caller mutation must not alter cached keys');
  assert.deepEqual(await createVapidKeyStore(file, async () => true)(), first, 'Restart must retain keys');
  const saved = await readFile(file, 'utf8');
  await writeFile(file, '{}');
  const recover = createVapidKeyStore(file, async () => true);
  await assert.rejects(recover(), /INVALID_VAPID_KEYS/);
  await writeFile(file, saved);
  assert.deepEqual(await recover(), first, 'Failed initialization must permit restoring original keys');
  const other = await createVapidKeyStore(path.join(directory, 'other.json'), async () => false)();
  await writeFile(file, JSON.stringify({ version: 1, publicKey: first.publicKey, privateKey: other.privateKey }));
  await assert.rejects(createVapidKeyStore(file, async () => true)(), /INVALID_VAPID_KEYS/, 'Mismatched key pair must be rejected');
  await unlink(file);
  await assert.rejects(createVapidKeyStore(file, async () => true)(), /VAPID_RESTORE_REQUIRED/);
  console.log('VAPID persistence, initialization concurrency, recovery and key matching passed.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
