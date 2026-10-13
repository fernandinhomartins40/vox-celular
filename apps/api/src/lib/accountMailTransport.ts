import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { z } from 'zod';
import { accountMail } from './accountMail.js';
import type { AccountTokenPurpose } from './accountToken.js';

export const accountSmtpSchema = z.object({
  host: z.string().min(1).max(253).regex(/^[a-zA-Z0-9.-]+$/),
  port: z.union([z.literal(465), z.literal(587)]),
  user: z.string().min(1).max(320).refine(value => !/[\r\n]/.test(value)),
  password: z.string().min(1).max(1024),
  from: z.string().email().max(254),
  origin: z.string().max(300),
}).strict().superRefine((value, context) => {
  try { accountMail(value.origin, 'validation', 'a'.repeat(43), 'VERIFICAR_EMAIL'); }
  catch { context.addIssue({ code: z.ZodIssueCode.custom, path: ['origin'], message: 'Use a fixed HTTPS application origin.' }); }
});
export type AccountSmtpConfig = z.infer<typeof accountSmtpSchema>;
type Sender = { sendMail: (message: { from: string; to: string; subject: string; text: string }) => Promise<{ accepted?: unknown[]; rejected?: unknown[] }>; close: () => void };
export function createAccountMailSender(config: AccountSmtpConfig, factory: (options: SMTPTransport.Options) => Sender = options => nodemailer.createTransport(options)) {
  const parsed = accountSmtpSchema.parse(config);
  const transport = factory({
    host: parsed.host, port: parsed.port, secure: parsed.port === 465,
    requireTLS: true, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    auth: { user: parsed.user, pass: parsed.password },
    pool: false, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, dnsTimeout: 10000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
  });
  let pending = 0;
  let closed = false;
  return {
    async send(to: string, lojaId: string, token: string, purpose: AccountTokenPurpose) {
      if (closed || pending >= 2) return { status: 'unavailable' as const };
      if (!z.string().email().max(254).safeParse(to).success) return { status: 'rejected' as const };
      const message = accountMail(parsed.origin, lojaId, token, purpose);
      pending++;
      try {
        const result = await transport.sendMail({ from: parsed.from, to, ...message });
        return { status: result.accepted?.length === 1 && !result.rejected?.length ? 'accepted' as const : 'rejected' as const };
      } catch { return { status: 'failed' as const }; }
      finally { pending--; }
    },
    close() { closed = true; transport.close(); },
  };
}
