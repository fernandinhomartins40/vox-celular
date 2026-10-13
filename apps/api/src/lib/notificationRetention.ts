import { prisma } from './prisma.js';
export function notificationRetentionCutoff(now: Date) {
  if (!Number.isFinite(now.getTime())) throw new Error('INVALID_RETENTION_DATE');
  return new Date(now.getTime() - 30 * 86400000);
}
// One bounded pass; callers schedule additional passes instead of an unbounded loop.
export async function pruneExpiredNotifications(now = new Date()) {
  const cutoff = notificationRetentionCutoff(now);
  const rows = await prisma.notificacaoCliente.findMany({ where: { expiresAt: { lt: cutoff } }, select: { id: true }, orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }], take: 100 });
  if (!rows.length) return 0;
  return (await prisma.notificacaoCliente.deleteMany({ where: { id: { in: rows.map(row => row.id) }, expiresAt: { lt: cutoff } } })).count;
}
