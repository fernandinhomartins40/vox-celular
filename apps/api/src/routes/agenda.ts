import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest, requireLojista } from '../middleware/auth.js';

export const agendaRouter = Router();
const slotSchema = z.object({ servicoId: z.string().min(1).max(100), inicio: z.string().datetime(), fim: z.string().datetime(), capacidade: z.number().int().min(1).max(20) }).strict().refine(data => Date.parse(data.inicio) > Date.now() && Date.parse(data.fim) > Date.parse(data.inicio) && Date.parse(data.fim) - Date.parse(data.inicio) <= 86400000 && Date.parse(data.inicio) < Date.now() + 180 * 86400000, 'Use um horário futuro dentro de 180 dias, com duração de até um dia.');
agendaRouter.get('/', async (req, res) => {
  if (typeof req.query.servicoId !== 'string' || typeof req.query.lojaId !== 'string') { res.status(400).json({ error: 'Informe loja e serviço.' }); return; }
  const slots = await prisma.horarioServico.findMany({ where: { servicoId: req.query.servicoId, servico: { lojaId: req.query.lojaId, ativo: true, agendamento: true }, ativo: true, inicio: { gt: new Date() } }, orderBy: { inicio: 'asc' }, take: 100,
    select: { id: true, inicio: true, fim: true, capacidade: true, _count: { select: { solicitacoes: { where: { status: { not: 'CANCELADA' } } } } } } });
  res.set('Cache-Control', 'no-store').json(slots.map(({ _count, capacidade, ...row }) => ({ ...row, vagas: Math.max(0, capacidade - _count.solicitacoes) })));
});
agendaRouter.get('/admin', requireLojista, async (req: AuthRequest, res) => {
  res.json(await prisma.horarioServico.findMany({ where: { servico: { lojaId: req.user!.lojaId }, inicio: { gte: new Date(Date.now() - 86400000) } }, orderBy: { inicio: 'asc' }, take: 200, include: { servico: { select: { titulo: true } }, _count: { select: { solicitacoes: { where: { status: { not: 'CANCELADA' } } } } } } }));
});
agendaRouter.post('/', requireLojista, async (req: AuthRequest, res) => {
  const parsed = slotSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors }); return; }
  const data = parsed.data;
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.servicoId}))`;
    if (!await tx.servico.findFirst({ where: { id: data.servicoId, lojaId: req.user!.lojaId, ativo: true, agendamento: true } })) return 'missing';
    if (await tx.horarioServico.count({ where: { servicoId: data.servicoId, fim: { gt: new Date() } } }) >= 200) return 'limit';
    if (await tx.horarioServico.findFirst({ where: { servicoId: data.servicoId, inicio: { lt: new Date(data.fim) }, fim: { gt: new Date(data.inicio) } } })) return 'conflict';
    return tx.horarioServico.create({ data: { ...data, inicio: new Date(data.inicio), fim: new Date(data.fim) } });
  });
  if (typeof result === 'string') { res.status(result === 'missing' ? 404 : 409).json({ error: result === 'missing' ? 'Habilite agendamento em um serviço desta loja.' : result === 'limit' ? 'Limite de horários futuros atingido.' : 'Este horário se sobrepõe a outro deste serviço.' }); return; }
  res.status(201).json(result);
});
agendaRouter.patch('/:id', requireLojista, async (req: AuthRequest, res) => {
  const parsed = z.object({ ativo: z.boolean() }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Informe se o horário está disponível.' }); return; }
  const id = String(req.params.id);
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    return tx.horarioServico.updateMany({ where: { id, servico: { lojaId: req.user!.lojaId } }, data: parsed.data });
  });
  res.status(result.count ? 200 : 404).json(result.count ? { ok: true } : { error: 'Horário não encontrado.' });
});
