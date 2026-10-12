import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from './prisma.js';
import { reserveAiBudget, settleAiBudget } from './aiBudget.js';
if (process.env.AI_BUDGET_TEST !== 'ci-disposable') throw new Error('Run only against the disposable CI database');
const lojaId = `ci-ai-${randomUUID()}`;
await prisma.loja.create({ data: { id: lojaId, nome: 'Disposable AI budget fixture', telefone: '', endereco: '', cidade: '', mapsUrl: '' } });
try {
  const results = await Promise.allSettled(Array.from({ length: 6 }, () => reserveAiBudget(lojaId, '2026-10', 100, 30)));
  const reservations = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
  assert.equal(reservations.length, 3);
  assert.equal((await prisma.orcamentoIa.findUniqueOrThrow({ where: { lojaId_mes: { lojaId, mes: '2026-10' } } })).reservadoMicroUsd, 90n);
  await assert.rejects(settleAiBudget('another-store', reservations[0].id), /NOT_FOUND/);
  await Promise.all([settleAiBudget(lojaId, reservations[0].id, 10), settleAiBudget(lojaId, reservations[0].id, 10)]);
  await settleAiBudget(lojaId, reservations[1].id);
  const budget = await prisma.orcamentoIa.findUniqueOrThrow({ where: { lojaId_mes: { lojaId, mes: '2026-10' } } });
  assert.equal(budget.gastoMicroUsd, 40n);
  assert.equal(budget.reservadoMicroUsd, 30n);
  assert.equal((await prisma.reservaIa.findUniqueOrThrow({ where: { id: reservations[1].id } })).status, 'CUSTO_INCERTO');
  await assert.rejects(reserveAiBudget(lojaId, '2026-10', 100, 31), /EXCEEDED/);
  await reserveAiBudget(lojaId, '2026-11', 100, 100);
  console.log('AI budget concurrency, tenant isolation, monthly boundaries and single settlement passed.');
} finally {
  await prisma.reservaIa.deleteMany({ where: { orcamento: { lojaId } } });
  await prisma.orcamentoIa.deleteMany({ where: { lojaId } });
  await prisma.loja.delete({ where: { id: lojaId } });
  await prisma.$disconnect();
}
