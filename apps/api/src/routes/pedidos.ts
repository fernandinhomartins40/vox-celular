import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireLojista, AuthRequest } from '../middleware/auth.js';

export const pedidosRouter = Router();

type PedidoAdmin = {
  cliente: {
    telefone: string;
    usuario: { nome: string; email: string };
  } | null;
  [key: string]: unknown;
};

pedidosRouter.get('/', requireLojista, async (req: AuthRequest, res) => {
  const status = Array.isArray(req.query.status) ? String(req.query.status[0]) : String(req.query.status ?? '');
  const search = Array.isArray(req.query.search) ? String(req.query.search[0]) : String(req.query.search ?? '');

  const where: Record<string, unknown> = { lojaId: req.user!.lojaId };
  if (status && !['Todos', 'TODOS', 'undefined'].includes(status)) {
    const normalized = status.replace(' ', '_').toUpperCase();
    if (!['NOVO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE'].includes(normalized)) {
      res.status(400).json({ error: 'Escolha uma situação de pedido válida.' }); return;
    }
    where.status = normalized;
  }
  const clienteId = typeof req.query.cliente === 'string' ? req.query.cliente : '';
  if (clienteId) where.clienteId = clienteId;
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

  const flat = pedidos.map(({ cliente, ...p }: PedidoAdmin) => ({
    ...p,
    clienteNome: cliente?.usuario?.nome ?? '',
    clienteEmail: cliente?.usuario?.email ?? '',
    clienteTelefone: cliente?.telefone ?? '',
  }));
  res.json(flat);
});

pedidosRouter.get('/meus', requireAuth, async (req: AuthRequest, res) => {
  const cliente = await prisma.cliente.findFirst({
    where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId },
  });
  if (!cliente) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }

  const pedidos = await prisma.pedido.findMany({
    where: { clienteId: cliente.id, lojaId: req.user!.lojaId },
    include: { itens: true, timeline: { orderBy: { ordem: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(pedidos);
});

pedidosRouter.patch('/:id/status', requireLojista, async (req: AuthRequest, res) => {
  const pedidoId = String(req.params.id);
  const { status, expectedStatus } = req.body as { status: string; expectedStatus?: string };

  const validStatuses = ['NOVO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Status inválido' });
    return;
  }
  if (expectedStatus !== undefined && !validStatuses.includes(expectedStatus)) {
    res.status(400).json({ error: 'Situação anterior inválida.' }); return;
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

  try {
  const updated = await prisma.$transaction(async (tx) => {
  const changed = await tx.pedido.updateMany({
    where: { id: pedidoId, lojaId: req.user!.lojaId, ...(expectedStatus ? { status: expectedStatus as 'NOVO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' } : {}) },
    data: { status: status as 'NOVO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' },
  });
  if (changed.count !== 1) throw new Error('PEDIDO_ALTERADO');

  for (const s of statusOrder.slice(0, novoIdx + 1)) {
    await tx.timelinePedido.updateMany({
      where: { pedidoId, status: statusToLabel[s], ok: false },
      data: { ok: true, data: new Date() },
    });
  }

  return tx.pedido.findUnique({
    where: { id: pedidoId },
    include: { itens: true, timeline: { orderBy: { ordem: 'asc' } } },
  });
  });
  res.json(updated);
  } catch (error) {
    res.status(error instanceof Error && error.message === 'PEDIDO_ALTERADO' ? 409 : 500).json({ error: error instanceof Error && error.message === 'PEDIDO_ALTERADO' ? 'Este pedido foi atualizado em outra sessão. Atualize os pedidos antes de continuar.' : 'Não foi possível atualizar o pedido.' });
  }
});
