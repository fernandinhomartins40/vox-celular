import { prisma } from './prisma.js';

// One SQL statement locks at most 25 events and only closes events whose delivery
// records are all terminal. Unknown states stay open for investigation.
export async function finalizeNotifications() {
  return prisma.$executeRaw`
    WITH ready AS (
      SELECT n.id FROM "NotificacaoCliente" n
      WHERE n.status = 'PROCESSANDO'
        AND NOT EXISTS (
          SELECT 1 FROM "EntregaPush" d WHERE d."notificacaoId" = n.id
            AND d.status NOT IN ('ACEITA', 'INVALIDA', 'FALHA', 'INCERTA', 'EXPIRADA', 'CANCELADA')
        )
      ORDER BY n.id LIMIT 25 FOR UPDATE OF n SKIP LOCKED
    )
    UPDATE "NotificacaoCliente" n SET status = CASE
      WHEN EXISTS (SELECT 1 FROM "EntregaPush" d WHERE d."notificacaoId" = n.id AND d.status = 'INCERTA') THEN 'INCERTA'
      WHEN NOT EXISTS (SELECT 1 FROM "EntregaPush" d WHERE d."notificacaoId" = n.id AND d.status <> 'CANCELADA') THEN 'CANCELADA'
      WHEN NOT EXISTS (SELECT 1 FROM "EntregaPush" d WHERE d."notificacaoId" = n.id AND d.status <> 'ACEITA') THEN 'CONCLUIDA'
      WHEN EXISTS (SELECT 1 FROM "EntregaPush" d WHERE d."notificacaoId" = n.id AND d.status = 'ACEITA') THEN 'PARCIAL'
      ELSE 'FALHA' END
    FROM ready WHERE n.id = ready.id AND n.status = 'PROCESSANDO'`;
}
