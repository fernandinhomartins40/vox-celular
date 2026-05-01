import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireLojista, AuthRequest } from '../middleware/auth.js';

export const pedidosRouter = Router();

pedidosRouter.get('/', requireLojista, async (req: AuthRequest, res) => {
  const status = Array.isArray(req.query.status) ? String(req.query.status[0]) : String(req.query.status ?? '');
  const search = Array.isArray(req.query.search) ? String(req.query.search[0]) : String(req.query.search ?? '');

  const where: Record<string, unknown> = { lojaId: req.user!.lojaId };
  if (status && status !== 'Todos' && status !== 'undefined') {
    where.status = status.replace(' ', '_').toUpperCase();
  }
  if (search && search !== 'undefined') {
    where.OR = [
      { codigo: { contains: search, mode: 'insensitive' } },
      { cliente: { usuario: { nome: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    include: {
      cliente: { include: { usuario: { select: { nome: true, email: true } } } },
      itens: true,
      timeline: { orderBy: { ordem: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const flat = pedidos.map(({ cliente, ...p }) => ({
    ...p,
    clienteNome: cliente?.usuario?.nome ?? '',
    clienteEmail: cliente?.usuario?.email ?? '',
    clienteTelefone: cliente?.telefone ?? '',
  }));
  res.json(flat);
});

pedidosRouter.get('/meus', requireAuth, async (req: AuthRequest, res) => {
  const cliente = await prisma.cliente.findFirst({
    where: { usuarioId: req.user!.userId },
  });
  if (!cliente) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }

  const pedidos = await prisma.pedido.findMany({
    where: { clienteId: cliente.id },
    include: { itens: true, timeline: { orderBy: { ordem: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(pedidos);
});

pedidosRouter.patch('/:id/status', requireLojista, async (req: AuthRequest, res) => {
  const pedidoId = String(req.params.id);
  const { status } = req.body as { status: string };

  const validStatuses = ['NOVO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Status inválido' });
    return;
  }

  const pedido = await prisma.pedido.findFirst({
    where: { id: pedidoId, lojaId: req.user!.lojaId },
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

  await prisma.pedido.update({
    where: { id: pedidoId },
    data: { status: status as 'NOVO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' },
  });

  for (const s of statusOrder.slice(0, novoIdx + 1)) {
    await prisma.timelinePedido.updateMany({
      where: { pedidoId, status: statusToLabel[s] },
      data: { ok: true, data: new Date() },
    });
  }

  const updated = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { itens: true, timeline: { orderBy: { ordem: 'asc' } } },
  });
  res.json(updated);
});
