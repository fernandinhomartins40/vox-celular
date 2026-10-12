import { prisma } from './prisma.js';
function amount(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('AI_INVALID_BUDGET');
  return BigInt(value);
}
export async function reserveAiBudget(lojaId: string, month: string, limitMicroUsd: number, maximumCostMicroUsd: number) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('AI_INVALID_MONTH');
  const limit = amount(limitMicroUsd), maximum = amount(maximumCostMicroUsd);
  if (maximum === 0n) throw new Error('AI_INVALID_RESERVATION');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lojaId}), hashtext(${month}))`;
    const budget = await tx.orcamentoIa.upsert({ where: { lojaId_mes: { lojaId, mes: month } }, create: { lojaId, mes: month, limiteMicroUsd: limit }, update: { limiteMicroUsd: limit } });
    if (budget.gastoMicroUsd + budget.reservadoMicroUsd + maximum > limit) throw new Error('AI_BUDGET_EXCEEDED');
    await tx.orcamentoIa.update({ where: { id: budget.id }, data: { reservadoMicroUsd: { increment: maximum } } });
    return tx.reservaIa.create({ data: { orcamentoId: budget.id, valorMicroUsd: maximum } });
  });
}
// An ambiguous provider failure is charged at the reserved maximum. Never release it
// automatically after a timeout: the remote provider may have billed the request.
export async function settleAiBudget(lojaId: string, reservationId: string, costMicroUsd?: number) {
  return prisma.$transaction(async tx => {
    const reservation = await tx.reservaIa.findFirst({ where: { id: reservationId, orcamento: { lojaId } }, include: { orcamento: { select: { mes: true } } } });
    if (!reservation) throw new Error('AI_RESERVATION_NOT_FOUND');
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lojaId}), hashtext(${reservation.orcamento.mes}))`;
    const current = await tx.reservaIa.findUniqueOrThrow({ where: { id: reservationId } });
    if (current.status !== 'RESERVADA') return current;
    const cost = costMicroUsd === undefined ? current.valorMicroUsd : amount(costMicroUsd);
    await tx.orcamentoIa.update({ where: { id: current.orcamentoId }, data: { reservadoMicroUsd: { decrement: current.valorMicroUsd }, gastoMicroUsd: { increment: cost } } });
    return tx.reservaIa.update({ where: { id: current.id }, data: { status: costMicroUsd === undefined ? 'CUSTO_INCERTO' : 'CONCLUIDA', custoMicroUsd: cost, encerradaEm: new Date() } });
  });
}
