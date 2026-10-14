import { z } from 'zod';
import { pushRetryAfter } from './webPushTransport.js';

export const expoPushTokenSchema = z.string().max(200).regex(/^(Expo|Exponent)PushToken\[[a-zA-Z0-9_-]{10,160}\]$/);
const ticketId = z.string().uuid();
const noticeSchema = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), destino: z.enum(['/pedidos', '/servicos', '/beneficios']), expiresAt: z.date() });
const accessTokenSchema = z.string().min(8).max(512).regex(/^[a-zA-Z0-9._-]+$/);
export type NativePushResult =
  | { status: 'queued'; ticketId: string }
  | { status: 'provider-accepted' | 'invalid-subscription' | 'rejected' | 'ambiguous' | 'expired' | 'pending' }
  | { status: 'temporary'; retryAfter?: Date };
const responseEntry = z.object({ status: z.enum(['ok', 'error']), id: ticketId.optional(), details: z.object({ error: z.string().max(100) }).optional() });

async function readEnvelope(response: Response) {
  if (!response.body) throw new Error('EMPTY_PUSH_RESPONSE');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 8192) throw new Error('PUSH_RESPONSE_LIMIT');
      chunks.push(next.value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
function failure(error: string | undefined): NativePushResult {
  return { status: error === 'DeviceNotRegistered' ? 'invalid-subscription' : 'rejected' };
}

// Single bounded request, fixed destination, no automatic resend after ambiguity.
// Security must be enabled for this access token in the Expo project dashboard.
export async function sendNativePush(token: string, notice: z.infer<typeof noticeSchema>, accessToken: string, transport: typeof fetch = fetch, now = new Date()): Promise<NativePushResult> {
  const started = performance.now();
  expoPushTokenSchema.parse(token); noticeSchema.parse(notice); accessTokenSchema.parse(accessToken);
  if (!Number.isFinite(now.getTime())) throw new Error('INVALID_PUSH_DATE');
  const ttl = Math.min(86400, Math.floor((notice.expiresAt.getTime() - now.getTime()) / 1000));
  if (ttl <= 0) return { status: 'expired' };
  try {
    const response = await transport('https://exp.host/--/api/v2/push/send', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title: 'Vox Celular', body: 'Há uma atualização na sua conta. Abra o aplicativo para consultar.', data: { id: notice.id, destino: notice.destino }, ttl, channelId: 'vox-updates' }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 429) return { status: 'temporary', retryAfter: pushRetryAfter(response.headers.get('Retry-After'), new Date(now.getTime() + Math.ceil(performance.now() - started))) };
      return { status: response.status >= 500 ? 'ambiguous' : 'rejected' };
    }
    const envelope = z.object({ data: responseEntry }).parse(await readEnvelope(response));
    if (envelope.data.status === 'error') return failure(envelope.data.details?.error);
    return envelope.data.id ? { status: 'queued', ticketId: envelope.data.id } : { status: 'ambiguous' };
  } catch { return { status: 'ambiguous' }; }
}

// A receipt confirms provider acceptance, never that the customer read the push.
export async function readNativePushReceipt(id: string, accessToken: string, transport: typeof fetch = fetch): Promise<NativePushResult> {
  ticketId.parse(id); accessTokenSchema.parse(accessToken);
  try {
    const response = await transport('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }),
    });
    if (!response.ok) { await response.body?.cancel(); return { status: response.status === 429 || response.status >= 500 ? 'temporary' : 'rejected' }; }
    const envelope = z.object({ data: z.record(responseEntry) }).parse(await readEnvelope(response));
    const receipt = envelope.data[id];
    if (!receipt) return { status: 'pending' };
    return receipt.status === 'ok' ? { status: 'provider-accepted' } : failure(receipt.details?.error);
  } catch { return { status: 'temporary' }; }
}
