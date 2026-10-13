import { prisma } from './prisma.js';
import { decryptCredentials } from './credentialVault.js';
import { accountSmtpSchema, createAccountMailSender } from './accountMailTransport.js';
import { createAccountToken } from './accountTokenStore.js';
import type { AccountTokenPurpose } from './accountToken.js';

type Identity = { email: string } | { userId: string };
type DeliveryDependencies = {
  configuration: (lojaId: string) => Promise<Record<string, string> | null>;
  issue: (lojaId: string, identity: Identity, purpose: AccountTokenPurpose) => Promise<{ email: string; token: string } | null>;
  sender: typeof createAccountMailSender;
};
// No retries: a SMTP timeout can occur after the remote server accepted the message.
// Raw token lives only in this call and the outgoing message, never in API/logs/storage.
export function createAccountMailDelivery(deps: DeliveryDependencies) {
 let pending = 0;
 return async (lojaId: string, identity: Identity, purpose: AccountTokenPurpose) => {
  if (pending >= 2) return;
  pending++;
  let sender: ReturnType<typeof createAccountMailSender> | undefined;
  try {
    const sealed = await deps.configuration(lojaId);
    if (!sealed) return;
    const config = accountSmtpSchema.parse({ ...sealed, port: Number(sealed.port) });
    const issued = await deps.issue(lojaId, identity, purpose);
    if (!issued) return;
    sender = deps.sender(config);
    await sender.send(issued.email, lojaId, issued.token, purpose);
  } catch { /* Public response deliberately does not reveal account or SMTP state. */ }
  finally { try { sender?.close(); } catch { /* Closing must not leak provider errors. */ } finally { pending--; } }
 };
}
export const deliverAccountMail = createAccountMailDelivery({
  async configuration(lojaId) {
    const row = await prisma.configuracaoEmail.findUnique({ where: { lojaId } });
    return row ? decryptCredentials(row.credenciais, `${lojaId}:account-email`) : null;
  },
  async issue(lojaId, identity, purpose) {
    return prisma.$transaction(async tx => {
      const user = await tx.usuario.findFirst({ where: { lojaId, ...('email' in identity ? { email: identity.email } : { id: identity.userId }) }, select: { id: true, email: true, emailVerificadoEm: true } });
      if (!user || (purpose === 'VERIFICAR_EMAIL' && user.emailVerificadoEm)) return null;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      if (await tx.tokenConta.findFirst({ where: { usuarioId: user.id, createdAt: { gte: new Date(Date.now() - 60000) } }, select: { id: true } })) return null;
      const token = await createAccountToken(tx, user.id, lojaId, purpose);
      return token ? { ...token, email: user.email } : null;
    });
  },
  sender: createAccountMailSender,
});
