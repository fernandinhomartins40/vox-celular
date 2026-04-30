import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireLojista, AuthRequest } from '../middleware/auth.js';

export const clientesRouter = Router();

clientesRouter.get('/', requireLojista, async (req: AuthRequest, res) => {
  const search = req.query.search as string | undefined;
  const clientes = await prisma.cliente.findMany({
    where: {
      lojaId: req.user!.lojaId,
      ...(search ? { usuario: { OR: [
        { nome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]}} : {})
    },
    include: {
      usuario: { select: { nome: true, email: true, createdAt: true } },
      pedidos: { select: { id: true, total: true, status: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(clientes);
});
