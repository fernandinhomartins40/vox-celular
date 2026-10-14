import { claimNotification } from './notificationClaim.js';
import { claimNotificationDelivery } from './notificationDeliveryClaim.js';
import { authorizeNotificationDelivery } from './notificationDeliveryAuthorization.js';
import { settleNotificationDelivery } from './notificationDeliverySettlement.js';
import { decryptCredentials } from './credentialVault.js';
import { loadVapidKeys } from './vapidKeys.js';
import { finalizeNotifications } from './notificationFinalization.js';
import { expireNotifications } from './notificationExpiration.js';
import { reconcileInterruptedDeliveries } from './notificationRecovery.js';
import { sendWebPush, validPushSubject } from './webPushTransport.js';
import { sendNativePush, nativePushAccessToken } from './nativePushTransport.js';
import { processNativeReceipt } from './nativePushReceipts.js';
import type { DeliveryResult } from './notificationDeliveryOutcome.js';

type Dependencies = {
  keys: typeof loadVapidKeys;
  claimEvent: (now?: Date, nativeEnabled?: boolean) => Promise<unknown>;
  claimDelivery: (now?: Date, nativeEnabled?: boolean) => Promise<{ id: string; tentativas: number } | null>;
  authorize: typeof authorizeNotificationDelivery;
  decrypt: typeof decryptCredentials;
  send: typeof sendWebPush;
  settle: typeof settleNotificationDelivery;
  now: () => Date;
  finalize: typeof finalizeNotifications;
  expire: typeof expireNotifications;
  recover: typeof reconcileInterruptedDeliveries;
  nativeToken: typeof nativePushAccessToken;
  nativeSend: typeof sendNativePush;
  receipt: typeof processNativeReceipt;
};
const defaults: Dependencies = {
  keys: loadVapidKeys, claimEvent: claimNotification, claimDelivery: claimNotificationDelivery,
  authorize: authorizeNotificationDelivery, decrypt: decryptCredentials,
  send: sendWebPush, settle: settleNotificationDelivery, now: () => new Date(),
  finalize: finalizeNotifications,
  expire: expireNotifications,
  recover: reconcileInterruptedDeliveries,
  nativeToken: nativePushAccessToken, nativeSend: sendNativePush, receipt: processNativeReceipt,
};

// One event preparation and at most one network request per invocation. Scheduling
// must serialize invocations; no process/timer is started by importing this module.
export async function processNotification(subject: string, deps: Dependencies = defaults) {
  if (!validPushSubject(subject)) throw new Error('INVALID_PUSH_SUBJECT');
  const keys = await deps.keys(); // Fail configuration before claiming work.
  await deps.expire(deps.now());
  await deps.recover(deps.now());
  const nativeToken = deps.nativeToken();
  if (nativeToken && await deps.receipt(nativeToken)) { await deps.finalize(); return { processed: true }; }
  await deps.claimEvent(deps.now(), Boolean(nativeToken));
  const claimed = await deps.claimDelivery(deps.now(), Boolean(nativeToken));
  if (!claimed) { await deps.finalize(); return { processed: false }; }
  let outcome: DeliveryResult = { status: 'cancelled' };
  const first = await deps.authorize(claimed.id, deps.now(), Boolean(nativeToken));
  if (first) {
    let credentials: Record<string, string> | undefined;
    try { credentials = await deps.decrypt(first.credenciais, `${first.lojaId}:push:${first.clienteId}`); }
    catch { outcome = { status: 'rejected' }; }
    if (credentials) {
      const current = await deps.authorize(claimed.id, deps.now(), Boolean(nativeToken));
      // A re-registration may rotate encryption keys. Never use the earlier keys.
      if (current && current.credenciais === first.credenciais) {
        try {
          if (current.canal !== 'WEB' && nativeToken) {
            const result = await deps.nativeSend(credentials.token, { id: current.notificacaoId, destino: current.destino as '/pedidos' | '/servicos' | '/beneficios', expiresAt: current.expiresAt }, nativeToken, undefined, deps.now());
            outcome = result.status === 'queued' || ['invalid-subscription', 'rejected', 'ambiguous', 'expired', 'temporary'].includes(result.status) ? result as DeliveryResult : { status: 'ambiguous' };
          } else outcome = await deps.send({ endpoint: credentials.endpoint, keys: { p256dh: credentials.p256dh, auth: credentials.auth } },
            { id: current.notificacaoId, destino: current.destino, expiresAt: current.expiresAt },
            { ...keys, subject }, undefined, deps.now());
        } catch { outcome = { status: 'ambiguous' }; }
      }
    }
  }
  const persisted = await deps.settle(claimed.id, claimed.tentativas, outcome, deps.now());
  await deps.finalize();
  return { processed: true, status: outcome.status, persisted };
}
