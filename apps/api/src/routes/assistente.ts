import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AttemptWindow } from '../lib/authLimits.js';
import { rankProducts, recommendationSchema } from '../lib/recommendations.js';
import { decryptCredentials } from '../lib/credentialVault.js';
import { budgetedRecommendation } from '../lib/aiRecommendation.js';
import type { AiProviderConfig } from '../lib/aiProvider.js';
import { z } from 'zod';
import { AiSelectionCache } from '../lib/aiCache.js';

export const assistenteRouter = Router();
const capacity = new AttemptWindow(180, 60000, 1);
const aiCapacity = new AttemptWindow(10, 60000, 1);
let aiInFlight = 0;
const aiCache = new AiSelectionCache();
assistenteRouter.post('/recomendar-ia', async (req, res) => {
  const parsed = z.object({ necessidades: recommendationSchema, autorizaProcessamentoExterno: z.literal(true) }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Confira as necessidades e autorize o envio externo dessas escolhas.' }); return; }
  const wait = aiCapacity.consume('ai');
  if (wait || aiInFlight >= 2) { res.status(429).json({ error: 'Assistente ocupado. Use a seleção por regras ou tente novamente depois.' }); return; }
  aiInFlight++;
  try {
    const needs = parsed.data.necessidades;
    const config = await prisma.configuracaoIa.findUnique({ where: { lojaId: needs.lojaId } });
    const products = await prisma.produto.findMany({ where: { lojaId: needs.lojaId, ativo: true, estoque: { gt: 0 }, preco: { lte: needs.orcamento } }, orderBy: [{ preco: 'asc' }, { id: 'asc' }], take: 501 });
    const candidates = products.slice(0, 500).map(product => ({ ...product, preco: Number(product.preco), precoOriginal: product.precoOriginal === null ? null : Number(product.precoOriginal) }));
    let results = rankProducts(candidates, needs);
    let mode = 'regras';
    if (config && results.length) {
      try {
        const secret = await decryptCredentials(config.credenciais, `${needs.lojaId}:ai:${config.provedor}`);
        const provider = { provider: config.provedor, model: config.modelo, apiKey: secret.apiKey, ...(config.provedor === 'qwen' ? { workspace: config.workspace } : {}) } as AiProviderConfig;
        const cacheKey = aiCache.key({ needs, configurationVersion: config.updatedAt.toISOString(), candidates: results.map(row => row.produto) });
        let ids = aiCache.get(cacheKey);
        if (!ids) {
          const output = await budgetedRecommendation(provider, { monthlyLimitMicroUsd: Number(config.limiteMicroUsd), inputRateMicroUsd: Number(config.tarifaEntradaMicroUsd), outputRateMicroUsd: Number(config.tarifaSaidaMicroUsd) }, needs, candidates);
          ids = output.ids;
          aiCache.set(cacheKey, ids);
        }
        results = ids.flatMap(id => results.filter(result => result.produto.id === id));
        mode = config.provedor;
      } catch { /* Explicit deterministic fallback; no secrets or provider error exposed. */ }
    }
    res.set('Cache-Control', 'no-store').json({ modo: mode, resultados: results, catalogoLimitado: products.length > 500, aviso: mode === 'regras' ? 'IA indisponível ou não configurada. Seleção pelas regras do catálogo.' : 'Opções ordenadas com apoio de IA externa. Características e preços vêm do catálogo; confirme antes de comprar.', mensagem: results.length ? null : 'Não encontramos opções que atendam aos critérios.' });
  } catch { res.status(503).json({ error: 'Não foi possível consultar as opções. Tente a seleção por regras.' }); }
  finally { aiInFlight--; }
});
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
