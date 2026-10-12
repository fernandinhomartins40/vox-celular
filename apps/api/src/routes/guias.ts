import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { operatorGuideSchema } from '../lib/operatorGuides.js';
import { AuthRequest, requireLojista } from '../middleware/auth.js';

export const guiasRouter = Router();
guiasRouter.get('/', async (req, res) => {
  if (typeof req.query.lojaId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(req.query.lojaId)) { res.status(400).json({ error: 'Informe a loja.' }); return; }
  const rows = await prisma.guiaOperadora.findMany({ where: { lojaId: req.query.lojaId, publicado: true, validoAte: { gt: new Date() } }, orderBy: [{ operadora: 'asc' }, { titulo: 'asc' }], take: 100,
    select: { id: true, operadora: true, topico: true, titulo: true, resumo: true, passos: true, fonte: true, canalOficial: true, revisadoEm: true, validoAte: true } });
  res.set('Cache-Control', 'no-store').json(rows);
});
guiasRouter.get('/admin', requireLojista, async (req: AuthRequest, res) => {
  res.set('Cache-Control', 'no-store').json(await prisma.guiaOperadora.findMany({ where: { lojaId: req.user!.lojaId }, orderBy: { updatedAt: 'desc' }, take: 100 }));
});
guiasRouter.post('/', requireLojista, async (req: AuthRequest, res) => {
  const parsed = operatorGuideSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors }); return; }
  const row = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.user!.lojaId}))`;
    if (await tx.guiaOperadora.count({ where: { lojaId: req.user!.lojaId } }) >= 100) return null;
    return tx.guiaOperadora.create({ data: { ...parsed.data, lojaId: req.user!.lojaId, responsavelId: req.user!.userId } });
  });
  if (!row) { res.status(409).json({ error: 'Limite de 100 guias. Atualize os existentes.' }); return; }
  res.status(201).json(row);
});
guiasRouter.put('/:id', requireLojista, async (req: AuthRequest, res) => {
  const parsed = operatorGuideSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors }); return; }
  const result = await prisma.guiaOperadora.updateMany({ where: { id: String(req.params.id), lojaId: req.user!.lojaId }, data: { ...parsed.data, responsavelId: req.user!.userId } });
  res.status(result.count ? 200 : 404).json(result.count ? { ok: true } : { error: 'Guia não encontrado nesta loja.' });
});
