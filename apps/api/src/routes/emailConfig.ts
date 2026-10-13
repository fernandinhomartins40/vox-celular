import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { encryptCredentials, decryptCredentials } from '../lib/credentialVault.js';
import { accountSmtpSchema } from '../lib/accountMailTransport.js';
import { requireLojista, type AuthRequest } from '../middleware/auth.js';

export const emailConfigRouter = Router();
emailConfigRouter.use(requireLojista);
emailConfigRouter.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
emailConfigRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const lojaId = req.user!.lojaId;
    const row = await prisma.configuracaoEmail.findUnique({ where: { lojaId } });
    if (!row) { res.json(null); return; }
    const stored = await decryptCredentials(row.credenciais, `${lojaId}:account-email`);
    const config = accountSmtpSchema.parse({ ...stored, port: Number(stored.port) });
    res.json({ host: config.host, port: config.port, user: config.user, from: config.from, origin: config.origin, senhaConfigurada: true, updatedAt: row.updatedAt });
  } catch { res.status(503).json({ error: 'Não foi possível consultar a configuração de e-mail.' }); }
});
emailConfigRouter.put('/', async (req: AuthRequest, res) => {
  const parsed = accountSmtpSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Confira servidor, porta, remetente, senha e endereço HTTPS da aplicação.' }); return; }
  try {
    const lojaId = req.user!.lojaId;
    const credenciais = await encryptCredentials({ ...parsed.data, port: String(parsed.data.port) }, `${lojaId}:account-email`);
    await prisma.configuracaoEmail.upsert({ where: { lojaId }, create: { lojaId, credenciais }, update: { credenciais } });
    res.json({ ok: true });
  } catch { res.status(503).json({ error: 'Não foi possível salvar a configuração de e-mail.' }); }
});
emailConfigRouter.delete('/', async (req: AuthRequest, res) => {
  try {
    await prisma.configuracaoEmail.deleteMany({ where: { lojaId: req.user!.lojaId } });
    res.json({ ok: true });
  } catch { res.status(503).json({ error: 'Não foi possível remover a configuração de e-mail.' }); }
});
