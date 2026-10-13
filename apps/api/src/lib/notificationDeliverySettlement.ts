import { prisma } from './prisma.js';
import { notificationDeliveryOutcome } from './notificationDeliveryOutcome.js';
import type { PushTransportResult } from './webPushTransport.js';

// Settle only the exact claimed attempt; stale/duplicate results cannot resurrect
// a canceled record or overwrite a later attempt. ACEITA means service acceptance.
export async function settleNotificationDelivery(id: string, attempt: number, result: PushTransportResult, now = new Date()) {
  if (!id || id.length > 200) throw new Error('INVALID_DELIVERY_OUTCOME');
  notificationDeliveryOutcome(attempt, result, now, now);
  return prisma.$transaction(async tx => {
    const owner = await tx.entregaPush.findUnique({ where: { id }, select: { notificacao: { select: { cliente: { select: { usuarioId: true } } } } } });
    if (!owner) return false;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${owner.notificacao.cliente.usuarioId}))`;
    const delivery = await tx.entregaPush.findUnique({ where: { id }, include: { assinatura: true, notificacao: { include: { cliente: true } } } });
    if (!delivery || delivery.status !== 'PROCESSANDO' || delivery.tentativas !== attempt) return false;
    const notice = delivery.notificacao;
    const authorized = notice.status === 'PROCESSANDO' && notice.cliente.notificacoes
      && delivery.assinatura.ativo && delivery.assinatura.clienteId === notice.clienteId
      && delivery.assinatura.lojaId === notice.lojaId && notice.cliente.lojaId === notice.lojaId;
    const data = authorized ? notificationDeliveryOutcome(attempt, result, notice.expiresAt, now) : { status: 'CANCELADA' };
    const updated = await tx.entregaPush.updateMany({ where: { id, status: 'PROCESSANDO', tentativas: attempt }, data });
    if (!updated.count) return false;
    if (authorized && result.status === 'invalid-subscription') {
      await tx.assinaturaPush.updateMany({ where: { id: delivery.assinaturaId, clienteId: notice.clienteId, lojaId: notice.lojaId }, data: { ativo: false } });
      await tx.entregaPush.updateMany({ where: { assinaturaId: delivery.assinaturaId, status: { in: ['PENDENTE', 'PROCESSANDO'] } }, data: { status: 'CANCELADA' } });
    }
    return true;
  });
}
