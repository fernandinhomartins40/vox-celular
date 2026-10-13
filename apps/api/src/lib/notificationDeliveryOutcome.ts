import { notificationRetry } from './notificationRetry.js';
import type { PushTransportResult } from './webPushTransport.js';

export function notificationDeliveryOutcome(attempt: number, result: PushTransportResult, expiresAt: Date, now = new Date()) {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > 5 || !Number.isFinite(expiresAt.getTime()) || !Number.isFinite(now.getTime())) throw new Error('INVALID_DELIVERY_OUTCOME');
  switch (result.status) {
    case 'cancelled': return { status: 'CANCELADA' };
    case 'accepted': return { status: 'ACEITA', confirmadaEm: now };
    case 'invalid-subscription': return { status: 'INVALIDA' };
    case 'ambiguous': return { status: 'INCERTA' };
    case 'expired': return { status: 'EXPIRADA' };
    case 'rejected': return { status: 'FALHA' };
    case 'temporary': {
      if (result.retryAfter && !Number.isFinite(result.retryAfter.getTime())) throw new Error('INVALID_DELIVERY_OUTCOME');
      const retry = notificationRetry(attempt, 'temporary', expiresAt, now);
      if (retry.action !== 'retry') return { status: 'FALHA' };
      const next = new Date(Math.max(retry.next!.getTime(), result.retryAfter?.getTime() ?? 0));
      return next < expiresAt ? { status: 'PENDENTE', proximaTentativaEm: next } : { status: 'FALHA' };
    }
    default: throw new Error('INVALID_DELIVERY_OUTCOME');
  }
}
