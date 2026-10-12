import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const lojaRouter = Router();

// Public: get loja info + config (used by frontend to get lojaId)
lojaRouter.get('/', async (req, res) => {
  const requestedId = req.query.lojaId;
  if (requestedId !== undefined && (typeof requestedId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(requestedId))) {
    res.status(400).json({ error: 'Identificação da loja inválida' }); return;
  }
  const loja = await prisma.loja.findUnique({
    where: requestedId ? { id: requestedId } : { chavePublica: process.env.PUBLIC_STORE_KEY || 'vox-celular' },
    include: { config: true },
  });
  if (!loja) { res.status(404).json({ error: 'Loja não encontrada' }); return; }
  res.json(loja);
});
