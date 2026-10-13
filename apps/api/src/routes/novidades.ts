import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest, requireLojista } from '../middleware/auth.js';
export const novidadesRouter = Router();
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const content = z.object({ titulo: z.string().trim().min(2).max(120), resumo: z.string().trim().min(5).max(500), texto: z.string().trim().min(10).max(10000), fonte: z.string().url().max(2000).refine(value => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }), publicado: z.boolean(), revisadoEm: z.string().datetime(), validoAte: z.string().datetime() }).strict().refine(value => Date.parse(value.revisadoEm) <= Date.now() && Date.parse(value.validoAte) > Date.parse(value.revisadoEm) && (!value.publicado || Date.parse(value.validoAte) > Date.now()), 'Confira revisão e validade antes de publicar.');
novidadesRouter.get('/admin', requireLojista, async (req: AuthRequest, res) => {
  try { res.set('Cache-Control', 'no-store').json(await prisma.novidade.findMany({ where: { lojaId: req.user!.lojaId }, orderBy: { updatedAt: 'desc' }, take: 100 })); }
  catch { res.status(503).json({ error: 'Não foi possível consultar novidades.' }); }
});
novidadesRouter.get('/', async (req, res) => {
  const store = id.safeParse(req.query.lojaId);
  if (!store.success) { res.status(400).json({ error: 'Informe a loja.' }); return; }
  try { res.set('Cache-Control', 'no-store').json(await prisma.novidade.findMany({ where: { lojaId: store.data, publicado: true, validoAte: { gt: new Date() } }, orderBy: { revisadoEm: 'desc' }, take: 30, select: { id: true, titulo: true, resumo: true, fonte: true, revisadoEm: true, validoAte: true } })); }
  catch { res.status(503).json({ error: 'Não foi possível consultar novidades.' }); }
});
novidadesRouter.get('/:id', async (req, res) => {
  const parsed = z.object({ noticia: id, loja: id }).safeParse({ noticia: req.params.id, loja: req.query.lojaId });
  if (!parsed.success) { res.status(400).json({ error: 'Informe loja e notícia.' }); return; }
  try {
    const row = await prisma.novidade.findFirst({ where: { id: parsed.data.noticia, lojaId: parsed.data.loja, publicado: true, validoAte: { gt: new Date() } }, select: { id: true, titulo: true, resumo: true, texto: true, fonte: true, revisadoEm: true, validoAte: true } });
    if (!row) { res.status(404).json({ error: 'Novidade indisponível.' }); return; }
    res.set('Cache-Control', 'no-store').json(row);
  } catch { res.status(503).json({ error: 'Não foi possível consultar a novidade.' }); }
});
novidadesRouter.post('/', requireLojista, async (req: AuthRequest, res) => {
  const parsed = content.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Confira conteúdo, fonte HTTPS, revisão e validade.' }); return; }
  try {
    const row = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.user!.lojaId}))`;
      if (await tx.novidade.count({ where: { lojaId: req.user!.lojaId } }) >= 100) throw new Error('LIMIT');
      return tx.novidade.create({ data: { ...parsed.data, lojaId: req.user!.lojaId, revisadoEm: new Date(parsed.data.revisadoEm), validoAte: new Date(parsed.data.validoAte) } });
    }); res.status(201).json(row);
  } catch { res.status(409).json({ error: 'Não foi possível cadastrar; limite de 100 novidades por loja.' }); }
});
novidadesRouter.put('/:id', requireLojista, async (req: AuthRequest, res) => {
  const parsed = content.safeParse(req.body); const key = id.safeParse(req.params.id);
  if (!parsed.success || !key.success) { res.status(400).json({ error: 'Confira conteúdo, fonte, revisão e validade.' }); return; }
  try {
    const changed = await prisma.novidade.updateMany({ where: { id: key.data, lojaId: req.user!.lojaId }, data: { ...parsed.data, revisadoEm: new Date(parsed.data.revisadoEm), validoAte: new Date(parsed.data.validoAte) } });
    res.status(changed.count ? 200 : 404).json(changed.count ? { ok: true } : { error: 'Novidade não encontrada.' });
  } catch { res.status(503).json({ error: 'Não foi possível salvar.' }); }
});
