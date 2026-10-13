import { prisma } from './prisma.js';
// Claims one event without holding a database transaction during network delivery.
// No automatic reclaim: an interrupted delivery can be ambiguous and must not be
// silently replayed until per-subscription receipts/reconciliation are implemented.
export async function claimNotification(now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error('INVALID_NOTIFICATION_DATE');
  return prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT n.id FROM "NotificacaoCliente" n
      JOIN "Cliente" c ON c.id = n."clienteId" AND c."lojaId" = n."lojaId"
      WHERE n.status = 'PENDENTE' AND n."proximaTentativaEm" <= ${now}
        AND n."expiresAt" > ${now} AND n.tentativas < 5 AND c.notificacoes = true
        AND EXISTS (SELECT 1 FROM "AssinaturaPush" s WHERE s."clienteId" = c.id AND s."lojaId" = n."lojaId" AND s.ativo = true)
      ORDER BY n."proximaTentativaEm", n.id
      LIMIT 1 FOR UPDATE OF n SKIP LOCKED`;
    if (!rows.length) return null;
    const event = await tx.notificacaoCliente.update({ where: { id: rows[0].id }, data: { status: 'PROCESSANDO', tentativas: { increment: 1 } } });
    const subscriptions = await tx.assinaturaPush.findMany({ where: { clienteId: event.clienteId, lojaId: event.lojaId, ativo: true }, select: { id: true }, take: 10 });
    await tx.entregaPush.createMany({ data: subscriptions.map(subscription => ({ notificacaoId: event.id, assinaturaId: subscription.id })), skipDuplicates: true });
    return event;
  });
}
