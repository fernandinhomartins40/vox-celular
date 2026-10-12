import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';

export const favoritosRouter = Router();
favoritosRouter.use(requireAuth);
favoritosRouter.use(async (req: AuthRequest, res, next) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Acesso exclusivo do cliente.' }); return; }
  try {
    const cliente = await prisma.cliente.findFirst({ where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId }, select: { id: true } });
    if (!cliente) { res.status(403).json({ error: 'Cadastro de cliente não encontrado.' }); return; }
    res.locals.clienteId = cliente.id;
    next();
  } catch { res.status(503).json({ error: 'Não foi possível consultar os favoritos.' }); }
});
favoritosRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const rows = await prisma.favorito.findMany({ where: { clienteId: res.locals.clienteId, produto: { lojaId: req.user!.lojaId, ativo: true } }, include: { produto: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(rows.map(({ produto }) => ({ ...produto, preco: Number(produto.preco), precoOriginal: produto.precoOriginal === null ? null : Number(produto.precoOriginal) })));
  } catch { res.status(503).json({ error: 'Não foi possível carregar os favoritos.' }); }
});
favoritosRouter.put('/:produtoId', async (req: AuthRequest, res) => {
  const produtoId = String(req.params.produtoId), clienteId = String(res.locals.clienteId);
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${clienteId}))`;
      const produto = await tx.produto.findFirst({ where: { id: produtoId, lojaId: req.user!.lojaId, ativo: true }, select: { id: true } });
      if (!produto) throw new Error('NOT_FOUND');
      const existing = await tx.favorito.findUnique({ where: { clienteId_produtoId: { clienteId, produtoId } } });
      if (!existing && await tx.favorito.count({ where: { clienteId } }) >= 100) throw new Error('LIMIT');
      await tx.favorito.upsert({ where: { clienteId_produtoId: { clienteId, produtoId } }, create: { clienteId, produtoId }, update: {} });
    });
    res.json({ ok: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    res.status(reason === 'NOT_FOUND' ? 404 : reason === 'LIMIT' ? 409 : 503).json({ error: reason === 'LIMIT' ? 'Você pode salvar até 100 favoritos. Remova um para adicionar outro.' : reason === 'NOT_FOUND' ? 'Produto indisponível nesta loja.' : 'Não foi possível salvar o favorito.' });
  }
});
favoritosRouter.delete('/:produtoId', async (req, res) => {
  try {
    await prisma.favorito.deleteMany({ where: { clienteId: res.locals.clienteId, produtoId: String(req.params.produtoId) } });
    res.json({ ok: true });
  } catch { res.status(503).json({ error: 'Não foi possível remover o favorito.' }); }
});
