import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from './prisma.js';
import { assertDisposableDatabase } from './disposableDatabase.js';
import { claimNotificationDelivery } from './notificationDeliveryClaim.js';

assertDisposableDatabase(process.env.PUSH_DELIVERY_TEST);
const id = `ci-delivery-${randomUUID()}`;
const now = new Date('2026-10-12T12:00:00Z');
try {
  await prisma.loja.create({ data: { id, nome: 'Delivery fixture', telefone: '', endereco: '', cidade: '', mapsUrl: '' } });
  await prisma.usuario.create({ data: { id, lojaId: id, nome: 'Fixture', email: `${id}@example.invalid`, senhaHash: 'not-a-login-hash', cliente: { create: { id, lojaId: id, telefone: '', cidade: '', notificacoes: true } } } });
  await prisma.assinaturaPush.create({ data: { id, lojaId: id, clienteId: id, endpointHash: id, credenciais: 'fixture-not-real-credentials' } });
  await prisma.notificacaoCliente.create({ data: { id, lojaId: id, clienteId: id, chaveEvento: id, titulo: 'Fixture', mensagem: 'Fixture', destino: '/pedidos', status: 'PROCESSANDO', expiresAt: new Date('2100-01-01T00:00:00Z') } });
  await prisma.entregaPush.create({ data: { id, notificacaoId: id, assinaturaId: id, proximaTentativaEm: new Date('2000-01-01T00:00:00Z') } });
  const claims = await Promise.all([claimNotificationDelivery(now), claimNotificationDelivery(now)]);
  assert.equal(claims.filter(row => row?.id === id).length, 1, 'Concurrent claims must not claim a delivery twice');
  assert.equal((await prisma.entregaPush.findUniqueOrThrow({ where: { id } })).tentativas, 1);
  await prisma.entregaPush.update({ where: { id }, data: { status: 'PENDENTE' } });
  await prisma.assinaturaPush.update({ where: { id }, data: { ativo: false } });
  assert.notEqual((await claimNotificationDelivery(now))?.id, id, 'Inactive subscription must not be claimed');
  await prisma.assinaturaPush.update({ where: { id }, data: { ativo: true } });
  await prisma.cliente.update({ where: { id }, data: { notificacoes: false } });
  assert.notEqual((await claimNotificationDelivery(now))?.id, id, 'Revoked consent must not be claimed');
  assert.equal((await prisma.entregaPush.findUniqueOrThrow({ where: { id } })).tentativas, 1);
  console.log('Delivery claim concurrency and consent/subscription checks passed.');
} finally {
  await prisma.notificacaoCliente.deleteMany({ where: { lojaId: id } });
  await prisma.assinaturaPush.deleteMany({ where: { lojaId: id } });
  await prisma.cliente.deleteMany({ where: { id } });
  await prisma.usuario.deleteMany({ where: { id } });
  await prisma.loja.deleteMany({ where: { id } });
  await prisma.$disconnect();
}
