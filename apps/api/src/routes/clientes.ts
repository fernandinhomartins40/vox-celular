import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireLojista, AuthRequest } from '../middleware/auth.js';

export const clientesRouter = Router();

clientesRouter.get('/', requireLojista, async (req: AuthRequest, res) => {
  const search = Array.isArray(req.query.search) ? String(req.query.search[0]) : (req.query.search as string | undefined);
  const clientes = await prisma.cliente.findMany({
    where: {
      lojaId: req.user!.lojaId,
      ...(search ? { usuario: { OR: [
        { nome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]}} : {})
    },
    include: {
      usuario: { select: { nome: true, email: true } },
      pedidos: { select: { id: true, total: true, status: true, createdAt: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const flat = clientes.map(c => ({
    id: c.id,
    nome: c.usuario.nome,
    email: c.usuario.email,
    telefone: c.telefone,
    cidade: c.cidade,
    pontos: c.pontos,
    nivel: c.nivel,
    totalGasto: c.totalGasto,
    createdAt: c.createdAt,
    pedidos: c.pedidos.length,
    historicoPedidos: c.pedidos.map(p => ({
      id: p.id,
      total: p.total,
      status: p.status,
      createdAt: p.createdAt,
    })),
  }));

  res.json(flat);
});
