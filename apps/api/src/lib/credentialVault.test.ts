import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
const directory = await mkdtemp(path.join(tmpdir(), 'vox-vault-test-'));
const file = path.join(directory, 'fixture.key');
process.env.MARKETPLACE_KEY_FILE = file;
try {
  await writeFile(file, Buffer.alloc(1));
  const { encryptCredentials, decryptCredentials } = await import('./credentialVault.js');
  await assert.rejects(encryptCredentials({ apiKey: 'fictional' }, 'store-a:ai'), /Invalid vault key/);
  await writeFile(file, randomBytes(32));
  const sealed = await encryptCredentials({ apiKey: 'fictional' }, 'store-a:ai');
  assert.deepEqual(await decryptCredentials(sealed, 'store-a:ai'), { apiKey: 'fictional' });
  await assert.rejects(decryptCredentials(sealed, 'store-b:ai'));
  assert.equal(sealed.includes('fictional'), false);
  console.log('Vault recovery after failed initialization and tenant context authentication passed.');
} finally { await rm(directory, { recursive: true, force: true }); }
