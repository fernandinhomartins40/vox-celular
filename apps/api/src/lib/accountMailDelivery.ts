import { prisma } from './prisma.js';
import { decryptCredentials } from './credentialVault.js';
import { accountSmtpSchema, createAccountMailSender } from './accountMailTransport.js';
import { createAccountToken } from './accountTokenStore.js';
import type { AccountTokenPurpose } from './accountToken.js';

let pending = 0;
// No retries: a SMTP timeout can occur after the remote server accepted the message.
// Raw token lives only in this call and the outgoing message, never in API/logs/storage.
export async function deliverAccountMail(lojaId: string, identity: { email: string } | { userId: string }, purpose: AccountTokenPurpose) {
  if (pending >= 2) return;
  pending++;
  let sender: ReturnType<typeof createAccountMailSender> | undefined;
  try {
    const row = await prisma.configuracaoEmail.findUnique({ where: { lojaId } });
    if (!row) return;
    const sealed = await decryptCredentials(row.credenciais, `${lojaId}:account-email`);
    const config = accountSmtpSchema.parse({ ...sealed, port: Number(sealed.port) });
    const issued = await prisma.$transaction(async tx => {
      const user = await tx.usuario.findFirst({ where: { lojaId, ...('email' in identity ? { email: identity.email } : { id: identity.userId }) }, select: { id: true, email: true, emailVerificadoEm: true } });
      if (!user || (purpose === 'VERIFICAR_EMAIL' && user.emailVerificadoEm)) return null;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      if (await tx.tokenConta.findFirst({ where: { usuarioId: user.id, createdAt: { gte: new Date(Date.now() - 60000) } }, select: { id: true } })) return null;
      const token = await createAccountToken(tx, user.id, lojaId, purpose);
      return token ? { ...token, email: user.email } : null;
    });
    if (!issued) return;
    sender = createAccountMailSender(config);
    await sender.send(issued.email, lojaId, issued.token, purpose);
  } catch { /* Public response deliberately does not reveal account or SMTP state. */ }
  finally { sender?.close(); pending--; }
}
