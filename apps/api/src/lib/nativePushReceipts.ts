import { prisma } from './prisma.js';
import { readNativePushReceipt, type NativePushResult } from './nativePushTransport.js';

export async function claimNativeReceipt(now = new Date()) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`
      WITH exhausted AS (
        SELECT id FROM "EntregaPush" WHERE status = 'AGUARDANDO_RECIBO'
          AND "consultasRecibo" >= 5 AND "proximaTentativaEm" <= ${now.toISOString()}::timestamp
        ORDER BY "proximaTentativaEm", id LIMIT 25 FOR UPDATE SKIP LOCKED
      )
      UPDATE "EntregaPush" d SET status = 'INCERTA' FROM exhausted WHERE d.id = exhausted.id`;
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT d.id FROM "EntregaPush" d
      JOIN "NotificacaoCliente" n ON n.id = d."notificacaoId"
      JOIN "AssinaturaPush" s ON s.id = d."assinaturaId" AND s."lojaId" = n."lojaId" AND s."clienteId" = n."clienteId"
      JOIN "Cliente" c ON c.id = n."clienteId" AND c."lojaId" = n."lojaId"
      WHERE d.status = 'AGUARDANDO_RECIBO' AND d."expoTicketId" IS NOT NULL
        AND d."proximaTentativaEm" <= ${now.toISOString()}::timestamp AND d."consultasRecibo" < 5
        AND n.status = 'PROCESSANDO' AND n."expiresAt" > ${now.toISOString()}::timestamp
        AND c.notificacoes = true AND s.ativo = true AND s.canal IN ('EXPO_ANDROID', 'EXPO_IOS')
      ORDER BY d."proximaTentativaEm", d.id LIMIT 1 FOR UPDATE OF d SKIP LOCKED`;
    if (!rows.length) return null;
    // Receipt lookup is read-only at Expo: a lost lookup may be repeated safely.
    return tx.entregaPush.update({ where: { id: rows[0].id }, data: { consultasRecibo: { increment: 1 }, proximaTentativaEm: new Date(now.getTime() + 15 * 60_000) } });
  });
}

export async function settleNativeReceipt(id: string, attempt: number, result: NativePushResult, now = new Date()) {
  return prisma.$transaction(async tx => {
    const owner = await tx.entregaPush.findUnique({ where: { id }, select: { notificacao: { select: { cliente: { select: { usuarioId: true } } } } } });
    if (!owner) return false;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${owner.notificacao.cliente.usuarioId}))`;
    const row = await tx.entregaPush.findUnique({ where: { id }, include: { assinatura: true, notificacao: { include: { cliente: true } } } });
    if (!row || row.status !== 'AGUARDANDO_RECIBO' || row.consultasRecibo !== attempt) return false;
    const notice = row.notificacao, subscription = row.assinatura;
    const valid = notice.status === 'PROCESSANDO' && notice.cliente.notificacoes && subscription.ativo
      && subscription.clienteId === notice.clienteId && subscription.lojaId === notice.lojaId
      && notice.cliente.lojaId === notice.lojaId && ['EXPO_ANDROID', 'EXPO_IOS'].includes(subscription.canal);
    const status = !valid ? 'CANCELADA' : notice.expiresAt <= now ? 'INCERTA'
      : result.status === 'provider-accepted' ? 'ACEITA'
      : result.status === 'invalid-subscription' ? 'INVALIDA'
      : result.status === 'rejected' ? 'FALHA'
      : attempt >= 5 ? 'INCERTA' : 'AGUARDANDO_RECIBO';
    await tx.entregaPush.update({ where: { id }, data: { status, ...(status === 'ACEITA' ? { confirmadaEm: now } : {}) } });
    if (valid && result.status === 'invalid-subscription') {
      await tx.assinaturaPush.update({ where: { id: subscription.id }, data: { ativo: false } });
      await tx.entregaPush.updateMany({ where: { assinaturaId: subscription.id, status: { in: ['PENDENTE', 'PROCESSANDO', 'AGUARDANDO_RECIBO'] } }, data: { status: 'CANCELADA' } });
    }
    return true;
  });
}

export async function processNativeReceipt(accessToken: string) {
  const row = await claimNativeReceipt();
  if (!row?.expoTicketId) return false;
  const result = await readNativePushReceipt(row.expoTicketId, accessToken);
  await settleNativeReceipt(row.id, row.consultasRecibo, result);
  return true;
}
