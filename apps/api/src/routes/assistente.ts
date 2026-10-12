import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AttemptWindow } from '../lib/authLimits.js';
import { rankProducts, recommendationSchema } from '../lib/recommendations.js';

export const assistenteRouter = Router();
const capacity = new AttemptWindow(180, 60000, 1);
assistenteRouter.post('/recomendar', async (req, res) => {
  const wait = capacity.consume('recommendations');
  if (wait) { res.set('Retry-After', String(wait)); res.status(429).json({ error: 'Aguarde um minuto e tente novamente.' }); return; }
  const parsed = recommendationSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors }); return; }
  const needs = parsed.data;
  if (!await prisma.loja.findUnique({ where: { id: needs.lojaId }, select: { id: true } })) {
    res.status(404).json({ error: 'Loja não encontrada.' }); return;
  }
  // Bounded query, no customer identity or history, no remote model call.
  const products = await prisma.produto.findMany({
    where: { lojaId: needs.lojaId, ativo: true, estoque: { gt: 0 }, preco: { lte: needs.orcamento } },
    orderBy: [{ preco: 'asc' }, { id: 'asc' }], take: 501,
  });
  const limited = products.length > 500;
  const results = rankProducts(products.slice(0, 500).map(p => ({ ...p, preco: Number(p.preco), precoOriginal: p.precoOriginal === null ? null : Number(p.precoOriginal) })), needs);
  res.set('Cache-Control', 'no-store').json({ modo: 'regras', resultados: results,
    catalogoLimitado: limited,
    aviso: 'Seleção pelas regras do catálogo, sem inteligência artificial. Preço e estoque são confirmados no pedido.',
    mensagem: !results.length ? 'Não encontramos opções que atendam aos critérios. Ajuste suas escolhas ou fale com a Vox.' : null });
});
