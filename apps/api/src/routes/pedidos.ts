import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireLojista, AuthRequest } from '../middleware/auth.js';

export const pedidosRouter = Router();

pedidosRouter.get('/', requireLojista, async (req: AuthRequest, res) => {
  const { status, search } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { lojaId: req.user!.lojaId };
  if (status && status !== 'Todos') where.status = status.replace(' ', '_').toUpperCase();
  if (search) where.OR = [
    { codigo: { contains: search, mode: 'insensitive' } },
    { cliente: { usuario: { nome: { contains: search, mode: 'insensitive' } } } }
  ];

  const pedidos = await prisma.pedido.findMany({
    where,
    include: {
      cliente: { include: { usuario: true } },
      itens: true,
      timeline: { orderBy: { ordem: 'asc' } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(pedidos);
});

pedidosRouter.get('/meus', requireAuth, async (req: AuthRequest, res) => {
  const cliente = await prisma.cliente.findFirst({
    where: { usuarioId: req.user!.userId }
  });
  if (!cliente) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }

  const pedidos = await prisma.pedido.findMany({
    where: { clienteId: cliente.id },
    include: { itens: true, timeline: { orderBy: { ordem: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(pedidos);
});

pedidosRouter.patch('/:id/status', requireLojista, async (req: AuthRequest, res) => {
  const { status } = req.body;
  const statusMap: Record<string, string> = {
    'NOVO': 'NOVO',
    'EM_PREPARO': 'EM_PREPARO',
    'PRONTO': 'PRONTO',
    'ENTREGUE': 'ENTREGUE',
  };
  if (!statusMap[status]) { res.status(400).json({ error: 'Status inválido' }); return; }

  const pedido = await prisma.pedido.findFirst({
    where: { id: req.params.id, lojaId: req.user!.lojaId }
  });
  if (!pedido) { res.status(404).json({ error: 'Pedido não encontrado' }); return; }

  const statusOrder = ['NOVO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE'];
  const novoIdx = statusOrder.indexOf(status);
  const statusToLabel: Record<string, string> = {
    NOVO: 'Pedido recebido',
    EM_PREPARO: 'Em preparo',
    PRONTO: 'Pronto para retirada',
    ENTREGUE: 'Entregue',
  };

  await prisma.pedido.update({ where: { id: req.params.id }, data: { status: status as any } });

  for (const s of statusOrder.slice(0, novoIdx + 1)) {
    await prisma.timelinePedido.updateMany({
      where: { pedidoId: req.params.id, status: statusToLabel[s] },
      data: { ok: true, data: new Date() },
    });
  }

  const updated = await prisma.pedido.findUnique({
    where: { id: req.params.id },
    include: { itens: true, timeline: { orderBy: { ordem: 'asc' } } },
  });
  res.json(updated);
});
