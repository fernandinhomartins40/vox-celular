import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireLojista, AuthRequest } from '../middleware/auth.js';

export const configRouter = Router();

configRouter.get('/', requireLojista, async (req: AuthRequest, res) => {
  const config = await prisma.lojaConfig.findUnique({ where: { lojaId: req.user!.lojaId } });
  res.json(config);
});

configRouter.put('/', requireLojista, async (req: AuthRequest, res) => {
  const config = await prisma.lojaConfig.upsert({
    where: { lojaId: req.user!.lojaId },
    update: req.body,
    create: { lojaId: req.user!.lojaId, ...req.body }
  });
  res.json(config);
});
