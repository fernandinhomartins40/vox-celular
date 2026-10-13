import { createHash, randomBytes } from 'node:crypto';
export type AccountTokenPurpose = 'RECUPERAR_SENHA' | 'VERIFICAR_EMAIL';
const duration = 20 * 60000;
export function accountTokenDigest(token: string, purpose: AccountTokenPurpose) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Invalid account token');
  if (!['RECUPERAR_SENHA', 'VERIFICAR_EMAIL'].includes(purpose)) throw new Error('Invalid account token purpose');
  return createHash('sha256').update(`vox-account-v1:${purpose}:${token}`).digest('hex');
}
export function issueAccountToken(purpose: AccountTokenPurpose, now = Date.now()) {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('Invalid issue time');
  const token = randomBytes(32).toString('base64url');
  return { token, digest: accountTokenDigest(token, purpose), expiresAt: new Date(now + duration) };
}
export function accountTokenUsable(row: { expiresAt: Date; consumedAt: Date | null; tokenVersion: number }, currentVersion: number, now = Date.now()) {
  return Number.isSafeInteger(now) && Number.isSafeInteger(currentVersion) && currentVersion >= 0 && row.tokenVersion === currentVersion && row.consumedAt === null && Number.isFinite(row.expiresAt.getTime()) && row.expiresAt.getTime() > now;
}
