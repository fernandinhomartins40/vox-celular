import { prisma } from './prisma.js';

// A crashed worker cannot know whether the push service accepted an in-flight
// request. Mark old attempts uncertain; never replay them automatically.
export async function reconcileInterruptedDeliveries(now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error('INVALID_NOTIFICATION_DATE');
  const cutoff = new Date(now.getTime() - 10 * 60_000);
  return prisma.$executeRaw`
    WITH interrupted AS (
      SELECT id FROM "EntregaPush"
      WHERE status = 'PROCESSANDO'
        AND ("processandoDesde" IS NULL OR "processandoDesde" <= ${cutoff.toISOString()}::timestamp)
      ORDER BY "processandoDesde" NULLS FIRST, id
      LIMIT 25 FOR UPDATE SKIP LOCKED
    )
    UPDATE "EntregaPush" d SET status = 'INCERTA'
    FROM interrupted WHERE d.id = interrupted.id AND d.status = 'PROCESSANDO'`;
}
