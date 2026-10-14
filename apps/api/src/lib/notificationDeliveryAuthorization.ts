import { prisma } from './prisma.js';

export type AuthorizedDelivery = {
  id: string;
  notificacaoId: string;
  lojaId: string;
  clienteId: string;
  assinaturaId: string;
  credenciais: string;
  titulo: string;
  mensagem: string;
  destino: string;
  expiresAt: Date;
};

// Internal transport input only; never serialize credentials into an HTTP response.
// Authorization is a point-in-time check, not a guarantee against revocation after
// this query or recall of a message already accepted by the remote push service.
export async function authorizeNotificationDelivery(id: string, now = new Date()): Promise<AuthorizedDelivery | null> {
  if (!id || id.length > 200 || !Number.isFinite(now.getTime())) throw new Error('INVALID_NOTIFICATION_DELIVERY');
  // Prisma DateTime columns use UTC timestamp without time zone. Bind the ISO
  // string explicitly as timestamp to avoid a timestamptz/session-zone shift.
  const rows = await prisma.$queryRaw<AuthorizedDelivery[]>`
    SELECT d.id, d."notificacaoId", n."lojaId", n."clienteId", d."assinaturaId", s.credenciais,
      n.titulo, n.mensagem, n.destino, n."expiresAt"
    FROM "EntregaPush" d
    JOIN "NotificacaoCliente" n ON n.id = d."notificacaoId"
    JOIN "AssinaturaPush" s ON s.id = d."assinaturaId"
      AND s."clienteId" = n."clienteId" AND s."lojaId" = n."lojaId"
    JOIN "Cliente" c ON c.id = n."clienteId" AND c."lojaId" = n."lojaId"
    WHERE d.id = ${id} AND d.status = 'PROCESSANDO'
      AND d.tentativas BETWEEN 1 AND 5 AND n.status = 'PROCESSANDO'
      AND n."expiresAt" > ${now.toISOString()}::timestamp AND c.notificacoes = true AND s.ativo = true AND s.canal = 'WEB'
    LIMIT 1`;
  return rows[0] ?? null;
}
