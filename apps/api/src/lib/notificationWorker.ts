import { processNotification } from './notificationProcessor.js';
import { validPushSubject } from './webPushTransport.js';

export function pushSettings() {
  const subject = process.env.WEB_PUSH_SUBJECT || process.env.CORS_ORIGIN || '';
  return { enabled: process.env.WEB_PUSH_ENABLED === 'true' && validPushSubject(subject), subject };
}

// Reuse the API process; completion-based scheduling never overlaps invocations.
export function startNotificationWorker(
  run: () => Promise<{ processed: boolean }>,
  onError: () => void,
  delays = { active: 15000, idle: 60000, failure: 60000 },
) {
  if (Object.values(delays).some(delay => !Number.isInteger(delay) || delay < 1)) throw new Error('INVALID_PUSH_WORKER_DELAY');
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let current: Promise<void> | undefined;
  const schedule = (delay: number) => {
    if (stopped) return;
    timer = setTimeout(() => {
      timer = undefined;
      current = step();
    }, delay);
    timer.unref();
  };
  async function step() {
    let delay = delays.idle;
    try { const result = await run(); delay = result.processed ? delays.active : delays.idle; }
    catch { delay = delays.failure; try { onError(); } catch { /* Keep scheduler alive without logging secrets. */ } }
    finally { schedule(delay); }
  }
  schedule(1);
  return {
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      await current;
    },
  };
}

export function startConfiguredNotificationWorker() {
  const settings = pushSettings();
  if (!settings.enabled) return { stop: async () => {} };
  return startNotificationWorker(() => processNotification(settings.subject), () => console.error('Notification worker pass failed'));
}
