import { notificationRetry } from './notificationRetry.js';
import type { PushTransportResult } from './webPushTransport.js';

export function notificationDeliveryOutcome(attempt: number, result: PushTransportResult, expiresAt: Date, now = new Date()) {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > 5 || !Number.isFinite(expiresAt.getTime()) || !Number.isFinite(now.getTime())) throw new Error('INVALID_DELIVERY_OUTCOME');
  switch (result.status) {
    case 'accepted': return { status: 'ACEITA', confirmadaEm: now };
    case 'invalid-subscription': return { status: 'INVALIDA' };
    case 'ambiguous': return { status: 'INCERTA' };
    case 'expired': return { status: 'EXPIRADA' };
    case 'rejected': return { status: 'FALHA' };
    case 'temporary': {
      const retry = notificationRetry(attempt, 'temporary', expiresAt, now);
      return retry.action === 'retry' ? { status: 'PENDENTE', proximaTentativaEm: retry.next! } : { status: 'FALHA' };
    }
    default: throw new Error('INVALID_DELIVERY_OUTCOME');
  }
}
