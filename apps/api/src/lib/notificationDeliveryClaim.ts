import { prisma } from './prisma.js';

// Select a delivery under the same customer lock used for consent and subscriptions.
// Network calls must happen after this transaction and recheck authorization.
// PROCESSANDO is never reclaimed automatically: the remote result may be ambiguous.
export async function claimNotificationDelivery(now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error('INVALID_NOTIFICATION_DATE');
  return prisma.$transaction(async tx => {
    const candidates = await tx.$queryRaw<{ id: string; usuarioId: string }[]>`
      SELECT d.id, c."usuarioId" FROM "EntregaPush" d
      JOIN "NotificacaoCliente" n ON n.id = d."notificacaoId"
      JOIN "AssinaturaPush" s ON s.id = d."assinaturaId" AND s."clienteId" = n."clienteId" AND s."lojaId" = n."lojaId"
      JOIN "Cliente" c ON c.id = n."clienteId" AND c."lojaId" = n."lojaId"
      WHERE d.status = 'PENDENTE' AND d."proximaTentativaEm" <= ${now}
        AND d.tentativas < 5 AND n.status = 'PROCESSANDO'
        AND n."expiresAt" > ${now} AND c.notificacoes = true AND s.ativo = true
      ORDER BY d."proximaTentativaEm", d.id LIMIT 1`;
    if (!candidates.length) return null;
    const candidate = candidates[0];
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${candidate.usuarioId}))`;
    const eligible = await tx.$queryRaw<{ id: string }[]>`
      SELECT d.id FROM "EntregaPush" d
      JOIN "NotificacaoCliente" n ON n.id = d."notificacaoId"
      JOIN "AssinaturaPush" s ON s.id = d."assinaturaId" AND s."clienteId" = n."clienteId" AND s."lojaId" = n."lojaId"
      JOIN "Cliente" c ON c.id = n."clienteId" AND c."lojaId" = n."lojaId"
      WHERE d.id = ${candidate.id} AND c."usuarioId" = ${candidate.usuarioId}
        AND d.status = 'PENDENTE' AND d."proximaTentativaEm" <= ${now}
        AND d.tentativas < 5 AND n.status = 'PROCESSANDO'
        AND n."expiresAt" > ${now} AND c.notificacoes = true AND s.ativo = true
      FOR UPDATE OF d SKIP LOCKED`;
    if (!eligible.length) return null;
    return tx.entregaPush.update({ where: { id: candidate.id }, data: { status: 'PROCESSANDO', tentativas: { increment: 1 } } });
  });
}
