import { Router } from 'express';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const fidelidadeRouter = Router();

fidelidadeRouter.get('/pontos', requireAuth, async (req: AuthRequest, res) => {
  const cliente = await prisma.cliente.findFirst({
    where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId },
    include: {
      historicoP: { orderBy: { createdAt: 'desc' }, take: 20 },
    }
  });
  if (!cliente) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }

  const recompensas = await prisma.recompensaCatalogo.findMany({
    where: { lojaId: req.user!.lojaId, ativo: true, pontos: { gt: 0 } },
    orderBy: { pontos: 'asc' },
  });
  const resgates = await prisma.resgateRecompensa.findMany({
    where: { clienteId: cliente.id, recompensa: { lojaId: req.user!.lojaId } },
    select: { id: true, codigo: true, createdAt: true, usadoEm: true, recompensa: { select: { titulo: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const NIVEIS = [
    { nivel: 'Bronze', min: 0,    max: 199 },
    { nivel: 'Prata',  min: 200,  max: 599 },
    { nivel: 'Ouro',   min: 600,  max: 1199 },
    { nivel: 'Platina',min: 1200, max: null },
  ];
  const proximo = NIVEIS.find(n => n.min > cliente.pontos);

  res.json({
    saldo: cliente.pontos,
    nivel: cliente.nivel,
    meta: proximo?.min ?? null,
    proximoNivel: proximo?.nivel ?? 'Máximo',
    historico: cliente.historicoP,
    recompensas,
    resgates,
  });
});

fidelidadeRouter.post('/resgatar/:recompensaId', requireAuth, async (req: AuthRequest, res) => {
  const cliente = await prisma.cliente.findFirst({ where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId } });
  if (!cliente) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }

  const recompensaId = String(req.params.recompensaId);
  const recompensa = await prisma.recompensaCatalogo.findFirst({ where: { id: recompensaId, lojaId: req.user!.lojaId, ativo: true, pontos: { gt: 0 } } });
  if (!recompensa) { res.status(404).json({ error: 'Recompensa não encontrada' }); return; }
  if (cliente.pontos < recompensa.pontos) { res.status(400).json({ error: 'Pontos insuficientes' }); return; }

  const codigo = 'VOX-' + nanoid(6).toUpperCase();

  let saldo: number;
  try {
  saldo = await prisma.$transaction(async (tx) => {
    const debito = await tx.cliente.updateMany({
      where: { id: cliente.id, lojaId: req.user!.lojaId, pontos: { gte: recompensa.pontos } },
      data: { pontos: { decrement: recompensa.pontos } },
    });
    if (debito.count !== 1) throw new Error('SALDO_INSUFICIENTE');
    await tx.historicoPontos.create({
      data: {
        clienteId: cliente.id,
        pontos: -recompensa.pontos,
        tipo: 'RESGATE',
        descricao: `Resgate: ${recompensa.titulo}`
      }
    });
    await tx.resgateRecompensa.create({
      data: { clienteId: cliente.id, recompensaId: recompensa.id, codigo }
    });
    return (await tx.cliente.findUniqueOrThrow({ where: { id: cliente.id }, select: { pontos: true } })).pontos;
  });
  } catch (error) {
    res.status(error instanceof Error && error.message === 'SALDO_INSUFICIENTE' ? 400 : 500)
      .json({ error: error instanceof Error && error.message === 'SALDO_INSUFICIENTE' ? 'Pontos insuficientes' : 'Não foi possível resgatar a recompensa' });
    return;
  }

  res.json({ codigo, saldo });
});
