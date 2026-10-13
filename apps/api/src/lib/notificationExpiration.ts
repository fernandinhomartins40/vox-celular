import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export async function expireNotifications(now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error('INVALID_NOTIFICATION_DATE');
  return prisma.$transaction(async tx => {
    const events = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "NotificacaoCliente"
      WHERE status IN ('PENDENTE', 'PROCESSANDO') AND "expiresAt" <= ${now.toISOString()}::timestamp
      ORDER BY "expiresAt", id LIMIT 25 FOR UPDATE SKIP LOCKED`;
    if (!events.length) return 0;
    const ids = events.map(event => event.id);
    await tx.entregaPush.updateMany({ where: { notificacaoId: { in: ids }, status: 'PENDENTE' }, data: { status: 'EXPIRADA' } });
    // In-flight work may already have reached the service; expiration must not
    // claim a definite failure or turn it into retryable work.
    await tx.entregaPush.updateMany({ where: { notificacaoId: { in: ids }, status: 'PROCESSANDO' }, data: { status: 'INCERTA' } });
    return tx.$executeRaw`
      UPDATE "NotificacaoCliente" n SET status = CASE
        WHEN EXISTS (SELECT 1 FROM "EntregaPush" d WHERE d."notificacaoId" = n.id AND d.status = 'INCERTA') THEN 'INCERTA'
        WHEN EXISTS (SELECT 1 FROM "EntregaPush" d WHERE d."notificacaoId" = n.id AND d.status = 'ACEITA')
          AND NOT EXISTS (SELECT 1 FROM "EntregaPush" d WHERE d."notificacaoId" = n.id AND d.status <> 'ACEITA') THEN 'CONCLUIDA'
        WHEN EXISTS (SELECT 1 FROM "EntregaPush" d WHERE d."notificacaoId" = n.id AND d.status = 'ACEITA') THEN 'PARCIAL'
        ELSE 'EXPIRADA' END
      WHERE n.id IN (${Prisma.join(ids)}) AND n.status IN ('PENDENTE', 'PROCESSANDO')`;
  });
}
