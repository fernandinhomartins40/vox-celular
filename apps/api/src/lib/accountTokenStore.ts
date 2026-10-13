import type { Prisma } from '@prisma/client';
import { accountTokenDigest, accountTokenUsable, issueAccountToken } from './accountToken.js';
import type { AccountTokenPurpose } from './accountToken.js';
// Callers must deliver the returned token through the verified private delivery channel.
// Never include it in API responses, logs or a notification visible to another device.
export async function createAccountToken(tx: Prisma.TransactionClient, usuarioId: string, lojaId: string, purpose: AccountTokenPurpose) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${usuarioId}))`;
  const user = await tx.usuario.findFirst({ where: { id: usuarioId, lojaId } });
  if (!user) return null;
  const now = new Date();
  if (await tx.tokenConta.count({ where: { usuarioId, createdAt: { gte: new Date(now.getTime() - 86400000) } } }) >= 5) return null;
  const issued = issueAccountToken(purpose, now.getTime());
  await tx.tokenConta.updateMany({ where: { usuarioId, finalidade: purpose, consumedAt: null }, data: { consumedAt: now } });
  await tx.tokenConta.create({ data: { usuarioId, finalidade: purpose, digest: issued.digest, tokenVersion: user.tokenVersion, expiresAt: issued.expiresAt } });
  return { token: issued.token, expiresAt: issued.expiresAt };
}
export async function consumeAccountToken(tx: Prisma.TransactionClient, lojaId: string, token: string, purpose: AccountTokenPurpose, apply: (userId: string) => Promise<void>) {
  const digest = accountTokenDigest(token, purpose);
  const candidate = await tx.tokenConta.findUnique({ where: { digest }, select: { usuarioId: true } });
  if (!candidate) return false;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${candidate.usuarioId}))`;
  const row = await tx.tokenConta.findUnique({ where: { digest }, include: { usuario: true } });
  const now = new Date();
  if (!row || row.usuario.lojaId !== lojaId || row.finalidade !== purpose || !accountTokenUsable(row, row.usuario.tokenVersion, now.getTime())) return false;
  await tx.tokenConta.update({ where: { id: row.id }, data: { consumedAt: now } });
  await apply(row.usuarioId);
  return true;
}
