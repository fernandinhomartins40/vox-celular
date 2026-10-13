import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireLojista, AuthRequest } from '../middleware/auth.js';

export const clientesRouter = Router();

type PedidoClienteResumo = {
  id: string;
  codigo: string;
  total: unknown;
  status: string;
  createdAt: Date;
};

type ClienteAdmin = {
  id: string;
  usuario: { nome: string; email: string };
  telefone: string;
  cidade: string;
  pontos: number;
  nivel: string;
  totalGasto: unknown;
  createdAt: Date;
  pedidos: PedidoClienteResumo[];
  encerramentoConta: { id: string; status: string; createdAt: Date } | null;
};

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
      encerramentoConta: { select: { id: true, status: true, createdAt: true } },
      pedidos: { where: { lojaId: req.user!.lojaId }, select: { id: true, codigo: true, total: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const flat = clientes.map((c: ClienteAdmin) => ({
    id: c.id,
    nome: c.usuario.nome,
    email: c.usuario.email,
    telefone: c.telefone,
    cidade: c.cidade,
    pontos: c.pontos,
    nivel: c.nivel,
    totalGasto: c.totalGasto,
    createdAt: c.createdAt,
    encerramentoConta: c.encerramentoConta,
    pedidos: c.pedidos.length,
    historicoPedidos: c.pedidos.map((p: PedidoClienteResumo) => ({
      id: p.id,
      codigo: p.codigo,
      total: p.total,
      status: p.status,
      createdAt: p.createdAt,
    })),
  }));

  res.set('Cache-Control', 'no-store').json(flat);
});
