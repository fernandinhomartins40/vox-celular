import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
export const notificacoesRouter = Router();
notificacoesRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Avisos disponíveis para clientes.' }); return; }
  try {
    const customer = await prisma.cliente.findFirst({ where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId }, select: { id: true, notificacoes: true } });
    if (!customer) { res.status(404).json({ error: 'Cadastro não encontrado.' }); return; }
    const rows = customer.notificacoes ? await prisma.notificacaoCliente.findMany({ where: { clienteId: customer.id, lojaId: req.user!.lojaId, status: { not: 'CANCELADA' }, expiresAt: { gt: new Date() } }, select: { id: true, titulo: true, mensagem: true, destino: true, createdAt: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 }) : [];
    res.set('Cache-Control', 'no-store').json(rows);
  } catch { res.status(503).json({ error: 'Não foi possível consultar seus avisos.' }); }
});
