import { claimNotification } from './notificationClaim.js';
import { claimNotificationDelivery } from './notificationDeliveryClaim.js';
import { authorizeNotificationDelivery } from './notificationDeliveryAuthorization.js';
import { settleNotificationDelivery } from './notificationDeliverySettlement.js';
import { decryptCredentials } from './credentialVault.js';
import { loadVapidKeys } from './vapidKeys.js';
import { sendWebPush, validPushSubject, type PushTransportResult } from './webPushTransport.js';

type Dependencies = {
  keys: typeof loadVapidKeys;
  claimEvent: () => Promise<unknown>;
  claimDelivery: () => Promise<{ id: string; tentativas: number } | null>;
  authorize: typeof authorizeNotificationDelivery;
  decrypt: typeof decryptCredentials;
  send: typeof sendWebPush;
  settle: typeof settleNotificationDelivery;
  now: () => Date;
};
const defaults: Dependencies = {
  keys: loadVapidKeys, claimEvent: claimNotification, claimDelivery: claimNotificationDelivery,
  authorize: authorizeNotificationDelivery, decrypt: decryptCredentials,
  send: sendWebPush, settle: settleNotificationDelivery, now: () => new Date(),
};

// One event preparation and at most one network request per invocation. Scheduling
// must serialize invocations; no process/timer is started by importing this module.
export async function processNotification(subject: string, deps: Dependencies = defaults) {
  if (!validPushSubject(subject)) throw new Error('INVALID_PUSH_SUBJECT');
  const keys = await deps.keys(); // Fail configuration before claiming work.
  await deps.claimEvent();
  const claimed = await deps.claimDelivery();
  if (!claimed) return { processed: false };
  let outcome: PushTransportResult = { status: 'cancelled' };
  const first = await deps.authorize(claimed.id, deps.now());
  if (first) {
    let credentials: Record<string, string> | undefined;
    try { credentials = await deps.decrypt(first.credenciais, `${first.lojaId}:push:${first.clienteId}`); }
    catch { outcome = { status: 'rejected' }; }
    if (credentials) {
      const current = await deps.authorize(claimed.id, deps.now());
      // A re-registration may rotate encryption keys. Never use the earlier keys.
      if (current && current.credenciais === first.credenciais) {
        try {
          outcome = await deps.send({ endpoint: credentials.endpoint, keys: { p256dh: credentials.p256dh, auth: credentials.auth } },
            { id: current.notificacaoId, destino: current.destino, expiresAt: current.expiresAt },
            { ...keys, subject }, undefined, deps.now());
        } catch { outcome = { status: 'ambiguous' }; }
      }
    }
  }
  const persisted = await deps.settle(claimed.id, claimed.tentativas, outcome, deps.now());
  return { processed: true, status: outcome.status, persisted };
}
