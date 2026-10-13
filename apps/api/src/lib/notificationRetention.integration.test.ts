import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from './prisma.js';
import { pruneExpiredNotifications, notificationRetentionCutoff } from './notificationRetention.js';
import { assertDisposableDatabase } from './disposableDatabase.js';
assertDisposableDatabase(process.env.NOTICE_RETENTION_TEST);
const id = `ci-retention-${randomUUID()}`;
const now = new Date('2026-10-12T12:00:00Z');
const cutoff = notificationRetentionCutoff(now);
try {
  await prisma.loja.create({ data: { id, nome: 'Retention fixture', telefone: '', endereco: '', cidade: '', mapsUrl: '' } });
  await prisma.usuario.create({ data: { id, lojaId: id, nome: 'Fixture', email: `${id}@example.invalid`, senhaHash: 'not-a-login-hash', cliente: { create: { id, lojaId: id, telefone: '', cidade: '' } } } });
  // Guarantee these fixture records precede any existing CI notices in expiry order.
  await prisma.notificacaoCliente.createMany({ data: Array.from({ length: 105 }, (_, n) => ({ id: `${id}-${n}`, lojaId: id, clienteId: id, chaveEvento: String(n), titulo: 'Fixture', mensagem: 'Fixture', destino: '/pedidos', expiresAt: new Date('2000-01-01T00:00:00Z') })) });
  await prisma.notificacaoCliente.createMany({ data: [cutoff, new Date(now.getTime() + 86400000)].map((expiresAt, n) => ({ id: `${id}-keep-${n}`, lojaId: id, clienteId: id, chaveEvento: `keep-${n}`, titulo: 'Keep', mensagem: 'Keep', destino: '/pedidos', expiresAt })) });
  assert.equal(await pruneExpiredNotifications(now), 100, 'Single pass must respect batch bound');
  assert.equal(await prisma.notificacaoCliente.count({ where: { lojaId: id } }), 7);
  await pruneExpiredNotifications(now);
  assert.equal(await prisma.notificacaoCliente.count({ where: { lojaId: id } }), 2, 'Exact cutoff and unexpired notices must survive');
  assert.equal(await prisma.cliente.count({ where: { id } }), 1, 'Retention must preserve client');
  console.log('PostgreSQL notice retention batch bound and cutoff preservation passed.');
} finally {
  await prisma.notificacaoCliente.deleteMany({ where: { lojaId: id } });
  await prisma.cliente.deleteMany({ where: { id } });
  await prisma.usuario.deleteMany({ where: { id } });
  await prisma.loja.deleteMany({ where: { id } });
  await prisma.$disconnect();
}
