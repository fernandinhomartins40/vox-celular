import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireLojista, AuthRequest } from '../middleware/auth.js';

export const configRouter = Router();

configRouter.get('/', requireLojista, async (req: AuthRequest, res) => {
  const config = await prisma.lojaConfig.findUnique({ where: { lojaId: req.user!.lojaId } });
  res.json(config);
});

configRouter.put('/', requireLojista, async (req: AuthRequest, res) => {
  const schema = z.object({
    heroSlide1Titulo: z.string().max(300).optional(),
    heroSlide1Sub: z.string().max(1000).optional(),
    heroSlide1Preco: z.string().max(30).optional(),
    instagramUrl: z.string().max(500).optional(),
    facebookUrl: z.string().max(500).optional(),
    horarioSemana: z.string().max(200).optional(),
    horarioSabado: z.string().max(200).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Configurações inválidas' }); return; }
  const config = await prisma.lojaConfig.upsert({
    where: { lojaId: req.user!.lojaId },
    update: parsed.data,
    create: { ...parsed.data, lojaId: req.user!.lojaId }
  });
  res.json(config);
});
