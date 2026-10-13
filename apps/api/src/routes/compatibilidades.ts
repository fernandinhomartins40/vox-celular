import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest, requireLojista } from '../middleware/auth.js';
export const compatibilidadesRouter = Router();
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const pair = z.object({ acessorioId: id, aparelhoId: id, observacao: z.string().trim().min(2).max(500) }).strict();
compatibilidadesRouter.delete('/:id', requireLojista, async (req: AuthRequest, res) => {
  const parsed = id.safeParse(req.params.id);
  if (!parsed.success) { res.status(400).json({ error: 'Informe a relação.' }); return; }
  try {
    await prisma.compatibilidadeProduto.deleteMany({ where: { id: parsed.data, acessorio: { lojaId: req.user!.lojaId }, aparelho: { lojaId: req.user!.lojaId } } });
    res.set('Cache-Control', 'no-store').json({ ok: true });
  } catch { res.status(503).json({ error: 'Não foi possível remover a compatibilidade.' }); }
});
compatibilidadesRouter.get('/', async (req, res) => {
  const query = z.object({ lojaId: id, produtoId: id }).strict().safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: 'Informe loja e produto.' }); return; }
  const { lojaId, produtoId } = query.data;
  try {
    const rows = await prisma.compatibilidadeProduto.findMany({ where: { OR: [{ acessorioId: produtoId }, { aparelhoId: produtoId }], acessorio: { lojaId, ativo: true }, aparelho: { lojaId, ativo: true } }, orderBy: { aprovadoEm: 'desc' }, take: 100,
      select: { id: true, observacao: true, aprovadoEm: true, acessorio: { select: { id: true, nome: true } }, aparelho: { select: { id: true, nome: true } } } });
    res.set('Cache-Control', 'no-store').json(rows);
  } catch { res.status(503).json({ error: 'Não foi possível consultar compatibilidade.' }); }
});
compatibilidadesRouter.put('/', requireLojista, async (req: AuthRequest, res) => {
  const parsed = pair.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Escolha acessório, aparelho e descreva o que foi conferido.' }); return; }
  try {
    const row = await prisma.$transaction(async tx => {
      const { acessorioId, aparelhoId, observacao } = parsed.data;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${acessorioId}))`;
      const products = await tx.produto.findMany({ where: { id: { in: [acessorioId, aparelhoId] }, lojaId: req.user!.lojaId, ativo: true }, select: { id: true, atributosTecnicos: true } });
      const tipo = (productId: string) => { const attributes = products.find(product => product.id === productId)?.atributosTecnicos; return attributes && typeof attributes === 'object' && !Array.isArray(attributes) ? attributes.tipo : null; };
      if (tipo(acessorioId) !== 'acessorio' || !['celular', 'tablet'].includes(String(tipo(aparelhoId)))) throw new Error('INVALID_PAIR');
      const where = { acessorioId_aparelhoId: { acessorioId, aparelhoId } };
      if (!await tx.compatibilidadeProduto.findUnique({ where }) && await tx.compatibilidadeProduto.count({ where: { acessorioId } }) >= 100) throw new Error('LIMIT');
      return tx.compatibilidadeProduto.upsert({ where, create: { ...parsed.data, aprovadoPorId: req.user!.userId }, update: { observacao, aprovadoEm: new Date(), aprovadoPorId: req.user!.userId }, select: { id: true, aprovadoEm: true } });
    });
    res.set('Cache-Control', 'no-store').json(row);
  } catch { res.status(409).json({ error: 'Confira os tipos e a loja dos produtos. O limite é de 100 aparelhos por acessório.' }); }
});
