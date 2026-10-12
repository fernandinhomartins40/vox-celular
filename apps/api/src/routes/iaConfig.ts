import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { encryptCredentials, decryptCredentials } from '../lib/credentialVault.js';
import { requireLojista, type AuthRequest } from '../middleware/auth.js';
const money = z.number().int().positive().max(1000000000);
const schema = z.object({ provedor: z.enum(['deepseek', 'qwen']), apiKey: z.string().min(8).max(512).regex(/^[^\s]+$/).optional(), workspace: z.string().regex(/^[a-zA-Z0-9-]{1,64}$/).optional(), limiteMicroUsd: money, tarifaEntradaMicroUsd: money, tarifaSaidaMicroUsd: money }).strict().refine(value => value.provedor !== 'qwen' || Boolean(value.workspace), 'Informe o workspace Qwen de Singapura.');
export const iaConfigRouter = Router();
iaConfigRouter.use(requireLojista);
iaConfigRouter.get('/orcamento', async (req: AuthRequest, res) => {
  try {
    const mes = new Date().toISOString().slice(0, 7);
    const lojaId = req.user!.lojaId;
    const [budget, config] = await Promise.all([
      prisma.orcamentoIa.findUnique({ where: { lojaId_mes: { lojaId, mes } } }),
      prisma.configuracaoIa.findUnique({ where: { lojaId }, select: { limiteMicroUsd: true } }),
    ]);
    res.set('Cache-Control', 'no-store').json({ mes, fuso: 'UTC', limiteMicroUsd: config ? Number(config.limiteMicroUsd) : null, gastoMicroUsd: Number(budget?.gastoMicroUsd ?? 0n), reservadoMicroUsd: Number(budget?.reservadoMicroUsd ?? 0n), ativo: false });
  } catch { res.status(503).json({ error: 'Não foi possível consultar o orçamento de IA.' }); }
});
iaConfigRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const row = await prisma.configuracaoIa.findUnique({ where: { lojaId: req.user!.lojaId } });
    res.set('Cache-Control', 'no-store').json(row ? { provedor: row.provedor, modelo: row.modelo, workspace: row.workspace, limiteMicroUsd: Number(row.limiteMicroUsd), tarifaEntradaMicroUsd: Number(row.tarifaEntradaMicroUsd), tarifaSaidaMicroUsd: Number(row.tarifaSaidaMicroUsd), chaveConfigurada: true, ativo: false } : null);
  } catch { res.status(503).json({ error: 'Não foi possível consultar a configuração de IA.' }); }
});
iaConfigRouter.put('/', async (req: AuthRequest, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Confira provedor, workspace, tarifas e limite.' }); return; }
  try {
    const lojaId = req.user!.lojaId;
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lojaId}), hashtext('ai-config'))`;
      const previous = await tx.configuracaoIa.findUnique({ where: { lojaId } });
      const context = `${lojaId}:ai:${parsed.data.provedor}`;
      const apiKey = parsed.data.apiKey || (previous?.provedor === parsed.data.provedor ? (await decryptCredentials(previous.credenciais, context)).apiKey : undefined);
      if (!apiKey) throw new Error('KEY_REQUIRED');
      const data = { provedor: parsed.data.provedor, modelo: parsed.data.provedor === 'deepseek' ? 'deepseek-flash' : 'qwen3.5-flash', workspace: parsed.data.provedor === 'qwen' ? parsed.data.workspace : null, credenciais: await encryptCredentials({ apiKey }, context), limiteMicroUsd: BigInt(parsed.data.limiteMicroUsd), tarifaEntradaMicroUsd: BigInt(parsed.data.tarifaEntradaMicroUsd), tarifaSaidaMicroUsd: BigInt(parsed.data.tarifaSaidaMicroUsd) };
      await tx.configuracaoIa.upsert({ where: { lojaId }, create: { lojaId, ...data }, update: data });
    });
    res.set('Cache-Control', 'no-store').json({ ok: true, ativo: false });
  } catch (error) { res.status(error instanceof Error && error.message === 'KEY_REQUIRED' ? 400 : 503).json({ error: error instanceof Error && error.message === 'KEY_REQUIRED' ? 'Informe a chave do provedor.' : 'Não foi possível salvar a configuração de IA.' }); }
});
