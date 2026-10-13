import webpush from 'web-push';
import { createHash } from 'node:crypto';
import { webPushSubscriptionSchema } from './pushSubscription.js';

export type PushTransportResult =
  | { status: 'accepted' | 'invalid-subscription' | 'rejected' | 'ambiguous' | 'expired' | 'cancelled' }
  | { status: 'temporary'; retryAfter?: Date };
export function pushRetryAfter(value: string | null, now: Date): Date | undefined {
  if (!value || value.length > 80 || !Number.isFinite(now.getTime())) return undefined;
  const trimmed = value.trim();
  const timestamp = /^\d+$/.test(trimmed) ? Math.min(8640000000000000, now.getTime() + Number(trimmed) * 1000) : Date.parse(trimmed);
  return Number.isFinite(timestamp) && timestamp > now.getTime() ? new Date(timestamp) : undefined;
}
type Notice = { id: string; destino: string; expiresAt: Date };
type Configuration = { subject: string; publicKey: string; privateKey: string };
const destinations = ['/pedidos', '/servicos', '/beneficios'];
export function validPushSubject(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === 'mailto:') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.pathname) && !url.search && !url.hash;
    return url.protocol === 'https:' && !!url.hostname && url.hostname !== 'localhost' && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

// The caller must authorize immediately before invocation. No automatic replay
// after network errors: the remote service may already have accepted the message.
export async function sendWebPush(subscription: unknown, notice: Notice, config: Configuration, fetchImpl: typeof fetch = fetch, now = new Date()): Promise<PushTransportResult> {
  const started = performance.now();
  const parsed = webPushSubscriptionSchema.safeParse(subscription);
  if (!parsed.success || !/^[a-zA-Z0-9_-]{1,100}$/.test(notice.id) || !destinations.includes(notice.destino) || !validPushSubject(config.subject) || !Number.isFinite(now.getTime()) || !Number.isFinite(notice.expiresAt.getTime())) throw new Error('INVALID_PUSH_TRANSPORT_INPUT');
  const remaining = Math.floor((notice.expiresAt.getTime() - now.getTime()) / 1000);
  if (remaining <= 0) return { status: 'expired' };
  const request = webpush.generateRequestDetails(parsed.data, JSON.stringify({ id: notice.id, destino: notice.destino }), {
    vapidDetails: config,
    TTL: Math.min(remaining, 86400),
    urgency: 'normal',
    contentEncoding: 'aes128gcm',
    topic: createHash('sha256').update(notice.id).digest('base64url').slice(0, 32),
  });
  try {
    const response = await fetchImpl(request.endpoint, {
      method: 'POST', headers: request.headers,
      body: request.body ? new Uint8Array(request.body) : undefined,
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    // Response payloads may contain subscription metadata; never read or log them.
    await response.body?.cancel();
    if ([200, 201, 202].includes(response.status)) return { status: 'accepted' };
    if ([404, 410].includes(response.status)) return { status: 'invalid-subscription' };
    if ([429, 500, 502, 503, 504].includes(response.status)) {
      const responseTime = new Date(now.getTime() + Math.ceil(performance.now() - started));
      const retryAfter = pushRetryAfter(response.headers.get('Retry-After'), responseTime);
      return retryAfter ? { status: 'temporary', retryAfter } : { status: 'temporary' };
    }
    return { status: 'rejected' };
  } catch { return { status: 'ambiguous' }; }
}
