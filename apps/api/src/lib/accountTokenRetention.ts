import { prisma } from './prisma.js';
// Keep one day beyond expiration so pruning cannot bypass daily issuance limits.
export async function pruneExpiredAccountTokens(now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error('INVALID_RETENTION_DATE');
  const cutoff = new Date(now.getTime() - 86400000);
  const rows = await prisma.tokenConta.findMany({ where: { expiresAt: { lt: cutoff } }, select: { id: true }, orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }], take: 100 });
  if (!rows.length) return 0;
  return (await prisma.tokenConta.deleteMany({ where: { id: { in: rows.map(row => row.id) }, expiresAt: { lt: cutoff } } })).count;
}
