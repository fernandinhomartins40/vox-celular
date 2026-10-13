import assert from 'node:assert/strict';
import { pushSettings, startNotificationWorker } from './notificationWorker.js';

const saved = { enabled: process.env.WEB_PUSH_ENABLED, subject: process.env.WEB_PUSH_SUBJECT, origin: process.env.CORS_ORIGIN };
try {
  process.env.WEB_PUSH_ENABLED = 'true'; process.env.WEB_PUSH_SUBJECT = 'https://vox.example';
  assert.equal(pushSettings().enabled, true);
  process.env.WEB_PUSH_SUBJECT = 'http://localhost';
  assert.equal(pushSettings().enabled, false);
  process.env.WEB_PUSH_ENABLED = 'false'; process.env.WEB_PUSH_SUBJECT = 'https://vox.example';
  assert.equal(pushSettings().enabled, false);
  assert.throws(() => startNotificationWorker(async () => ({ processed: false }), () => {}, { active: 0, idle: 1, failure: 1 }));
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const worker = startNotificationWorker(async () => { calls++; await held; return { processed: true }; }, () => {}, { active: 1, idle: 1, failure: 1 });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(calls, 1, 'Pending invocation must never overlap');
  let stopped = false;
  const stopping = worker.stop().then(() => { stopped = true; });
  await Promise.resolve();
  assert.equal(stopped, false, 'Stop must wait for in-flight work');
  release(); await stopping;
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(calls, 1, 'Stop must prevent future invocations');
  let failures = 0;
  let completed: () => void = () => {};
  let deadline: ReturnType<typeof setTimeout>;
  const retried = new Promise<void>((resolve, reject) => {
    completed = resolve;
    deadline = setTimeout(() => reject(new Error('Worker did not retry within deadline')), 2000);
  });
  const failing = startNotificationWorker(async () => { throw new Error('private-error'); }, () => { failures++; if (failures >= 2) completed(); }, { active: 1, idle: 1, failure: 1 });
  await retried;
  clearTimeout(deadline!);
  await failing.stop();
  assert.ok(failures > 1, 'Failures must not terminate scheduling');
  console.log('Notification worker configuration, serialization, failure recovery and graceful stop passed.');
} finally {
  for (const [key, value] of [['WEB_PUSH_ENABLED', saved.enabled], ['WEB_PUSH_SUBJECT', saved.subject], ['CORS_ORIGIN', saved.origin]] as const) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}
