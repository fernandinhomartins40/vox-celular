import { z } from 'zod';
import { ECDH } from 'node:crypto';
function validPublicKey(value: string) {
  try {
    const bytes = Buffer.from(value, 'base64url');
    if (bytes.length !== 65 || bytes[0] !== 4 || bytes.toString('base64url') !== value) return false;
    ECDH.convertKey(bytes, 'prime256v1');
    return true;
  } catch { return false; }
}
const allowedHosts = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'];
export function allowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash && allowedHosts.includes(url.hostname) && url.pathname.length > 1;
  } catch { return false; }
}
export const webPushSubscriptionSchema = z.object({
  endpoint: z.string().max(2048).refine(allowedPushEndpoint, 'Serviço push não permitido.'),
  keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/).refine(validPublicKey, 'Chave pública inválida.'), auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/).refine(value => Buffer.from(value, 'base64url').toString('base64url') === value, 'Chave de autenticação inválida.') }).strict(),
}).strict();
