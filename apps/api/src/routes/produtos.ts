import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireLojista, AuthRequest } from '../middleware/auth.js';

export const produtosRouter = Router();

produtosRouter.get('/', async (req, res) => {
  const lojaId = req.query.lojaId as string;
  if (!lojaId) { res.status(400).json({ error: 'lojaId obrigatório' }); return; }
  const produtos = await prisma.produto.findMany({
    where: { lojaId, ativo: true },
    orderBy: { destaque: 'desc' }
  });
  res.json(produtos);
});

produtosRouter.get('/admin', requireLojista, async (req: AuthRequest, res) => {
  const produtos = await prisma.produto.findMany({
    where: { lojaId: req.user!.lojaId },
    orderBy: { createdAt: 'desc' }
  });
  res.json(produtos);
});

const updateSchema = z.object({
  preco: z.number().optional(),
  precoOriginal: z.number().nullable().optional(),
  estoque: z.number().optional(),
  descricao: z.string().optional(),
  ativo: z.boolean().optional(),
  destaque: z.boolean().optional(),
});

produtosRouter.patch('/:id', requireLojista, async (req: AuthRequest, res) => {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors }); return; }

  const produto = await prisma.produto.findFirst({
    where: { id: req.params.id, lojaId: req.user!.lojaId }
  });
  if (!produto) { res.status(404).json({ error: 'Produto não encontrado' }); return; }

  const updated = await prisma.produto.update({
    where: { id: req.params.id },
    data: parse.data
  });
  res.json(updated);
});
