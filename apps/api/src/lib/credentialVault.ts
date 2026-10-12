import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from './prisma.js';

let keyPromise: Promise<Buffer> | undefined;
function vaultKey() {
  return keyPromise ??= (async () => {
    const file = process.env.MARKETPLACE_KEY_FILE || path.resolve('secrets/marketplace.key');
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    let key: Buffer;
    try { key = await readFile(file); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      if (await prisma.integracaoMarketplace.count() > 0 || await prisma.configuracaoIa.count() > 0) throw new Error('VAULT_RESTORE_REQUIRED');
      try { await writeFile(file, randomBytes(32), { flag: 'wx', mode: 0o600 }); }
      catch (writeError) { if ((writeError as NodeJS.ErrnoException).code !== 'EEXIST') throw writeError; }
      key = await readFile(file);
    }
    if (key.length !== 32) throw new Error('Invalid vault key');
    return key;
  })();
}
export async function encryptCredentials(value: Record<string, string>, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', await vaultKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}
export async function decryptCredentials(value: string, context: string): Promise<Record<string, string>> {
  const [version, iv, tag, data] = value.split('.');
  if (version !== 'v1') throw new Error('Invalid vault version');
  const cipher = createDecipheriv('aes-256-gcm', await vaultKey(), Buffer.from(iv, 'base64'));
  cipher.setAAD(Buffer.from(context)); cipher.setAuthTag(Buffer.from(tag, 'base64'));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(data, 'base64')), cipher.final()]).toString());
}
