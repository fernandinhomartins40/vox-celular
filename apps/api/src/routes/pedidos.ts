import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireLojista, AuthRequest } from '../middleware/auth.js';

export const pedidosRouter = Router();

const checkoutSchema = z.object({
  checkoutKey: z.string().uuid(),
  itens: z.array(z.object({ produtoId: z.string().min(1), qty: z.number().int().min(1).max(100) })).min(1).max(30),
});

pedidosRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Confira os produtos e quantidades do carrinho.' }); return; }
  const cliente = await prisma.cliente.findFirst({ where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId } });
  if (!cliente) { res.status(403).json({ error: 'Entre com uma conta de cliente para concluir a compra.' }); return; }
  const quantities = new Map<string, number>();
  for (const item of parsed.data.itens) quantities.set(item.produtoId, (quantities.get(item.produtoId) ?? 0) + item.qty);
  try {
    const pedido = await prisma.$transaction(async tx => {
      // Serialize retries for the same customer/key, including concurrent requests.
      // pg_advisory_xact_lock returns PostgreSQL void, which Prisma cannot deserialize.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cliente.id}), hashtext(${parsed.data.checkoutKey}))`;
      const existing = await tx.pedido.findUnique({ where: { clienteId_checkoutKey: { clienteId: cliente.id, checkoutKey: parsed.data.checkoutKey } }, include: { itens: true } });
      if (existing) return existing;
      const itens = [];
      let cents = 0;
      for (const [produtoId, qty] of [...quantities].sort(([a], [b]) => a.localeCompare(b))) {
        const produto = await tx.produto.findFirst({ where: { id: produtoId, lojaId: cliente.lojaId, ativo: true } });
        if (!produto) throw new Error('Um produto não está mais disponível. Atualize o carrinho.');
        const reserved = await tx.produto.updateMany({ where: { id: produtoId, lojaId: cliente.lojaId, ativo: true, preco: produto.preco, estoque: { gte: qty } }, data: { estoque: { decrement: qty } } });
        if (reserved.count !== 1) throw new Error(`Estoque ou preço de ${produto.nome} mudou. Atualize o carrinho.`);
        cents += Math.round(Number(produto.preco) * 100) * qty;
        itens.push({ produtoId, nome: produto.nome, qty, preco: produto.preco });
      }
      return tx.pedido.create({ data: {
        lojaId: cliente.lojaId, clienteId: cliente.id, checkoutKey: parsed.data.checkoutKey,
        codigo: `VOX-${randomUUID().slice(0, 8).toUpperCase()}`, pagamento: 'Aguardando confirmação',
        estoqueReservado: true, total: cents / 100, itens: { create: itens },
        timeline: { create: [{ status: 'Pedido recebido', ok: true, data: new Date(), ordem: 0 }] },
      }, include: { itens: true } });
    });
    res.status(201).json(pedido);
  } catch (error) {
    const message = error instanceof Error && /^(Um produto não|Estoque ou preço)/.test(error.message) ? error.message : 'Não foi possível registrar o pedido. Tente novamente com o mesmo carrinho.';
    res.status(409).json({ error: message });
  }
});

type PedidoAdmin = {
  cliente: {
    telefone: string;
    usuario: { nome: string; email: string };
  } | null;
  [key: string]: unknown;
};

pedidosRouter.post('/:id/cancelar', requireLojista, async (req: AuthRequest, res) => {
  try {
    const result = await prisma.$transaction(async tx => {
      const pedido = await tx.pedido.findFirst({ where: { id: String(req.params.id), lojaId: req.user!.lojaId }, include: { itens: true } });
      if (!pedido) throw new Error('NOT_FOUND');
      if (pedido.canceladoEm) return pedido;
      // Only new checkouts can be cancelled here: legacy orders lack stock accounting.
      if (!pedido.checkoutKey || pedido.status !== 'NOVO') throw new Error('NOT_CANCELLABLE');
      const changed = await tx.pedido.updateMany({ where: { id: pedido.id, status: 'NOVO', canceladoEm: null }, data: { canceladoEm: new Date(), estoqueReservado: false } });
      if (changed.count !== 1) throw new Error('NOT_CANCELLABLE');
      if (pedido.estoqueReservado) for (const item of pedido.itens) await tx.produto.updateMany({ where: { id: item.produtoId, lojaId: pedido.lojaId }, data: { estoque: { increment: item.qty } } });
      await tx.timelinePedido.create({ data: { pedidoId: pedido.id, status: 'Pedido cancelado', data: new Date(), ok: true, ordem: 99 } });
      return tx.pedido.findUniqueOrThrow({ where: { id: pedido.id }, include: { itens: true, timeline: true } });
    });
    res.json(result);
  } catch (error) {
    res.status(error instanceof Error && error.message === 'NOT_FOUND' ? 404 : 409).json({ error: 'Este pedido não pode ser cancelado nesta etapa. Atualize os pedidos.' });
  }
});

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
    where: { id: pedidoId, lojaId: req.user!.lojaId, canceladoEm: null, ...(expectedStatus ? { status: expectedStatus as 'NOVO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' } : {}) },
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
