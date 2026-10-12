import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
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
  const parsed = z.object({ chaveResgate: z.string().uuid().optional(), pontosEsperados: z.number().int().positive().optional() }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Confira a confirmação do resgate.' }); return; }
  const cliente = await prisma.cliente.findFirst({ where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId } });
  if (!cliente) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }

  const recompensaId = String(req.params.recompensaId);
  try {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cliente.id}))`;
    const chaveResgate = parsed.data.chaveResgate;
    if (chaveResgate) {
      const existing = await tx.resgateRecompensa.findUnique({ where: { clienteId_chaveResgate: { clienteId: cliente.id, chaveResgate } } });
      if (existing) {
        if (existing.recompensaId !== recompensaId) throw new Error('CHAVE_DIFERENTE');
        return { codigo: existing.codigo, saldo: (await tx.cliente.findUniqueOrThrow({ where: { id: cliente.id }, select: { pontos: true } })).pontos };
      }
    }
    const recompensa = await tx.recompensaCatalogo.findFirst({ where: { id: recompensaId, lojaId: req.user!.lojaId, ativo: true, pontos: { gt: 0 } } });
    if (!recompensa) throw new Error('NAO_ENCONTRADA');
    if (parsed.data.pontosEsperados !== undefined && parsed.data.pontosEsperados !== recompensa.pontos) throw new Error('CUSTO_ALTERADO');
    const codigo = 'VOX-' + nanoid(6).toUpperCase();
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
      data: { clienteId: cliente.id, recompensaId: recompensa.id, codigo, chaveResgate }
    });
    return { codigo, saldo: (await tx.cliente.findUniqueOrThrow({ where: { id: cliente.id }, select: { pontos: true } })).pontos };
  });
  res.set('Cache-Control', 'no-store').json(result);
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    res.status(reason === 'SALDO_INSUFICIENTE' ? 400 : reason === 'NAO_ENCONTRADA' ? 404 : ['CHAVE_DIFERENTE', 'CUSTO_ALTERADO'].includes(reason) ? 409 : 500)
      .json({ error: reason === 'SALDO_INSUFICIENTE' ? 'Pontos insuficientes' : reason === 'NAO_ENCONTRADA' ? 'Recompensa não encontrada' : reason === 'CUSTO_ALTERADO' ? 'O custo em pontos mudou. Atualize as recompensas.' : reason === 'CHAVE_DIFERENTE' ? 'Esta confirmação pertence a outra recompensa.' : 'Não foi possível resgatar a recompensa' });
    return;
  }

});
