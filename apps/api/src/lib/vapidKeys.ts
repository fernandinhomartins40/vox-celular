import { createECDH, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from './prisma.js';

type VapidKeys = { publicKey: string; privateKey: string };
function validateKeys(value: unknown): VapidKeys {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_VAPID_KEYS');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== 'privateKey,publicKey,version' || record.version !== 1 || typeof record.publicKey !== 'string' || typeof record.privateKey !== 'string') throw new Error('INVALID_VAPID_KEYS');
  const privateKey = Buffer.from(record.privateKey, 'base64url');
  const publicKey = Buffer.from(record.publicKey, 'base64url');
  if (privateKey.length !== 32 || publicKey.length !== 65 || publicKey[0] !== 4 || privateKey.toString('base64url') !== record.privateKey || publicKey.toString('base64url') !== record.publicKey) throw new Error('INVALID_VAPID_KEYS');
  const curve = createECDH('prime256v1');
  try { curve.setPrivateKey(privateKey); }
  catch { throw new Error('INVALID_VAPID_KEYS'); }
  if (!timingSafeEqual(curve.getPublicKey(), publicKey)) throw new Error('INVALID_VAPID_KEYS');
  return { publicKey: record.publicKey, privateKey: record.privateKey };
}

export function createVapidKeyStore(file: string, hasSubscriptions: () => Promise<boolean>) {
  let pending: Promise<VapidKeys> | undefined;
  return function load(): Promise<VapidKeys> {
    if (pending) return pending.then(keys => ({ ...keys }));
    const attempt = (async () => {
      await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
      let contents: string;
      try { contents = await readFile(file, 'utf8'); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        // Losing this key must never silently invalidate existing subscriptions.
        if (await hasSubscriptions()) throw new Error('VAPID_RESTORE_REQUIRED');
        const curve = createECDH('prime256v1');
        curve.generateKeys();
        const rawPrivate = curve.getPrivateKey();
        const privateKey = Buffer.alloc(32);
        rawPrivate.copy(privateKey, 32 - rawPrivate.length);
        const created = { version: 1, publicKey: curve.getPublicKey().toString('base64url'), privateKey: privateKey.toString('base64url') };
        try { await writeFile(file, JSON.stringify(created), { flag: 'wx', mode: 0o600 }); }
        catch (writeError) { if ((writeError as NodeJS.ErrnoException).code !== 'EEXIST') throw writeError; }
        contents = await readFile(file, 'utf8');
      }
      if (contents.length > 1024) throw new Error('INVALID_VAPID_KEYS');
      try { return validateKeys(JSON.parse(contents)); }
      catch { throw new Error('INVALID_VAPID_KEYS'); }
    })();
    pending = attempt;
    attempt.catch(() => { if (pending === attempt) pending = undefined; });
    return attempt.then(keys => ({ ...keys }));
  };
}

export const loadVapidKeys = createVapidKeyStore(
  process.env.VAPID_KEY_FILE || path.join(path.dirname(process.env.MARKETPLACE_KEY_FILE || path.resolve('secrets/marketplace.key')), 'vapid.json'),
  async () => await prisma.assinaturaPush.count() > 0,
);
