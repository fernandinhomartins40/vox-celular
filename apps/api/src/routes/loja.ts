import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const lojaRouter = Router();

// Public: get loja info + config (used by frontend to get lojaId)
lojaRouter.get('/', async (_req, res) => {
  const loja = await prisma.loja.findFirst({
    include: { config: true },
  });
  if (!loja) { res.status(404).json({ error: 'Loja não encontrada' }); return; }
  res.json(loja);
});
