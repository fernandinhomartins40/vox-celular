import { z } from 'zod';
import type { Prisma } from '@prisma/client';
const eventSchema = z.object({ lojaId: z.string().min(1).max(100), clienteId: z.string().min(1).max(100), chaveEvento: z.string().min(1).max(160), titulo: z.string().trim().min(1).max(100), mensagem: z.string().trim().min(1).max(300), destino: z.enum(['/pedidos', '/servicos', '/beneficios']) }).strict();
// Invoke from the originating business transaction. No network call in the transaction.
export async function enqueueClientNotification(tx: Prisma.TransactionClient, input: unknown) {
  const event = eventSchema.parse(input);
  const customer = await tx.cliente.findFirst({ where: { id: event.clienteId, lojaId: event.lojaId }, select: { usuarioId: true } });
  if (!customer) throw new Error('NOTIFICATION_CUSTOMER_NOT_FOUND');
  // Same lock as consent changes prevents enqueuing while revocation commits.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${customer.usuarioId}))`;
  const consent = await tx.cliente.findFirst({ where: { id: event.clienteId, lojaId: event.lojaId, notificacoes: true }, select: { id: true } });
  if (!consent) return null;
  return tx.notificacaoCliente.upsert({ where: { clienteId_chaveEvento: { clienteId: event.clienteId, chaveEvento: event.chaveEvento } }, create: event, update: {} });
}
