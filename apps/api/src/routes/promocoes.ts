import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const promocoesRouter = Router();

// Public: get active promotions for a loja
promocoesRouter.get('/', async (req, res) => {
  const lojaId = req.query.lojaId as string;
  if (!lojaId) { res.status(400).json({ error: 'lojaId obrigatório' }); return; }

  const promocoes = await prisma.promocao.findMany({
    where: { lojaId, ativa: true, validade: { gt: new Date() }, produto: { lojaId, ativo: true, estoque: { gt: 0 } } },
    include: { produto: { select: { imgUrl: true, preco: true } } },
    orderBy: { validade: 'asc' },
  });

  type PromoResult = typeof promocoes[number];
  res.json(promocoes.filter(p => Number(p.preco) >= 0 && Number(p.preco) <= Number(p.produto.preco)).map((p: PromoResult) => ({
    id: p.id,
    produtoId: p.produtoId,
    validadeEm: p.validade.toISOString(),
    titulo: p.titulo,
    desc: p.descricao,
    preco: Number(p.preco),
    precoOriginal: Number(p.precoOriginal),
    validade: p.validade.toISOString().slice(0, 10),
    img: p.produto.imgUrl,
  })));
});
