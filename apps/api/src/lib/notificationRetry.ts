type DeliveryFailure = 'temporary' | 'invalid-subscription' | 'permission-denied';
export function notificationRetry(attempt: number, failure: DeliveryFailure, expiresAt: Date, now = new Date()) {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > 5 || !Number.isFinite(expiresAt.getTime()) || !Number.isFinite(now.getTime())) throw new Error('INVALID_NOTIFICATION_RETRY');
  if (failure === 'invalid-subscription') return { action: 'revoke-subscription' as const, next: null };
  if (failure === 'permission-denied') return { action: 'cancel' as const, next: null };
  if (failure !== 'temporary') throw new Error('INVALID_NOTIFICATION_FAILURE');
  const delay = [60000, 300000, 900000, 3600000][attempt - 1];
  if (attempt === 5 || expiresAt <= now) return { action: 'stop' as const, next: null };
  const next = new Date(now.getTime() + delay);
  return next < expiresAt ? { action: 'retry' as const, next } : { action: 'stop' as const, next: null };
}
