import { Router } from 'express';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const fidelidadeRouter = Router();

fidelidadeRouter.get('/pontos', requireAuth, async (req: AuthRequest, res) => {
  const cliente = await prisma.cliente.findFirst({
    where: { usuarioId: req.user!.userId },
    include: {
      historicoP: { orderBy: { createdAt: 'desc' }, take: 20 },
    }
  });
  if (!cliente) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }

  const recompensas = await prisma.recompensaCatalogo.findMany({
    where: { lojaId: req.user!.lojaId, ativo: true }
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
    meta: proximo?.min ?? 9999,
    proximoNivel: proximo?.nivel ?? 'Máximo',
    historico: cliente.historicoP,
    recompensas,
  });
});

fidelidadeRouter.post('/resgatar/:recompensaId', requireAuth, async (req: AuthRequest, res) => {
  const cliente = await prisma.cliente.findFirst({ where: { usuarioId: req.user!.userId } });
  if (!cliente) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }

  const recompensa = await prisma.recompensaCatalogo.findUnique({ where: { id: req.params.recompensaId } });
  if (!recompensa) { res.status(404).json({ error: 'Recompensa não encontrada' }); return; }
  if (cliente.pontos < recompensa.pontos) { res.status(400).json({ error: 'Pontos insuficientes' }); return; }

  const codigo = 'VOX-' + nanoid(6).toUpperCase();

  await prisma.$transaction([
    prisma.cliente.update({
      where: { id: cliente.id },
      data: { pontos: { decrement: recompensa.pontos } }
    }),
    prisma.historicoPontos.create({
      data: {
        clienteId: cliente.id,
        pontos: -recompensa.pontos,
        tipo: 'RESGATE',
        descricao: `Resgate: ${recompensa.titulo}`
      }
    }),
    prisma.resgateRecompensa.create({
      data: { clienteId: cliente.id, recompensaId: recompensa.id, codigo }
    })
  ]);

  res.json({ codigo });
});
