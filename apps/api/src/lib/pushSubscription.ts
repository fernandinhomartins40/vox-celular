import { z } from 'zod';
const allowedHosts = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'];
export function allowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash && allowedHosts.includes(url.hostname) && url.pathname.length > 1;
  } catch { return false; }
}
export const webPushSubscriptionSchema = z.object({
  endpoint: z.string().max(2048).refine(allowedPushEndpoint, 'Serviço push não permitido.'),
  keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/), auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/) }).strict(),
}).strict();
