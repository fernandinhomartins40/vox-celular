import { Router } from 'express';
import { createHash } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { encryptCredentials } from '../lib/credentialVault.js';
import { webPushSubscriptionSchema } from '../lib/pushSubscription.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { authLimits } from '../lib/authLimits.js';
import { loadVapidKeys } from '../lib/vapidKeys.js';
import { pushSettings } from '../lib/notificationWorker.js';
export const pushRouter = Router();
pushRouter.use(requireAuth, authLimits);
pushRouter.get('/config', async (req: AuthRequest, res) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Acesso exclusivo do cliente.' }); return; }
  try {
    const keys = await loadVapidKeys();
    res.set('Cache-Control', 'no-store').json({ publicKey: keys.publicKey, entregaConfigurada: pushSettings().enabled });
  } catch { res.status(503).json({ error: 'Não foi possível carregar a configuração de notificações.' }); }
});
pushRouter.get('/web', async (req: AuthRequest, res) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Acesso exclusivo do cliente.' }); return; }
  try {
    const rows = await prisma.assinaturaPush.findMany({ where: { lojaId: req.user!.lojaId, cliente: { usuarioId: req.user!.userId } }, select: { id: true, ativo: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: 'desc' }, take: 10 });
    res.set('Cache-Control', 'no-store').json(rows);
  } catch { res.status(503).json({ error: 'Não foi possível consultar as assinaturas.' }); }
});
pushRouter.put('/web', async (req: AuthRequest, res) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Acesso exclusivo do cliente.' }); return; }
  const parsed = webPushSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Assinatura push inválida ou navegador ainda não suportado.' }); return; }
  try {
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.user!.userId}))`;
      const client = await tx.cliente.findFirst({ where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId, notificacoes: true }, select: { id: true } });
      if (!client) throw new Error('CONSENT_REQUIRED');
      const endpointHash = createHash('sha256').update(parsed.data.endpoint).digest('hex');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${endpointHash}))`;
      const previous = await tx.assinaturaPush.findUnique({ where: { endpointHash } });
      if (previous && previous.clienteId !== client.id) throw new Error('OWNERSHIP');
      if (!previous && await tx.assinaturaPush.count({ where: { clienteId: client.id } }) >= 10) throw new Error('LIMIT');
      const credenciais = await encryptCredentials({ endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth }, `${req.user!.lojaId}:push:${client.id}`);
      return tx.assinaturaPush.upsert({ where: { endpointHash }, create: { clienteId: client.id, lojaId: req.user!.lojaId, endpointHash, credenciais }, update: { credenciais, ativo: true } });
    });
    res.set('Cache-Control', 'no-store').json({ id: result.id, ativo: result.ativo, entregaConfigurada: pushSettings().enabled });
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    res.status(reason === 'CONSENT_REQUIRED' ? 403 : ['OWNERSHIP', 'LIMIT'].includes(reason) ? 409 : 503).json({ error: reason === 'CONSENT_REQUIRED' ? 'Autorize notificações nas suas preferências primeiro.' : reason === 'LIMIT' ? 'Limite de dez assinaturas. Remova uma antiga antes de adicionar.' : reason === 'OWNERSHIP' ? 'Esta assinatura já pertence a outro acesso. Remova-a no navegador antes de continuar.' : 'Não foi possível salvar a assinatura.' });
  }
});
pushRouter.delete('/web/:id', async (req: AuthRequest, res) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Acesso exclusivo do cliente.' }); return; }
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.user!.userId}))`;
      await tx.assinaturaPush.deleteMany({ where: { id: String(req.params.id), lojaId: req.user!.lojaId, cliente: { usuarioId: req.user!.userId } } });
    });
    res.set('Cache-Control', 'no-store').json({ ok: true });
  } catch { res.status(503).json({ error: 'Não foi possível remover a assinatura.' }); }
});
