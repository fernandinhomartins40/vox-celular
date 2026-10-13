import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest, requireAuth, requireLojista } from '../middleware/auth.js';
import { enqueueClientNotification } from '../lib/notificationOutbox.js';

export const servicosRouter = Router();
const serviceSchema = z.object({ titulo: z.string().trim().min(2).max(100), descricao: z.string().trim().min(2).max(2000), preco: z.number().nonnegative().max(100000).nullable(), ativo: z.boolean(), agendamento: z.boolean().optional() }).strict();
const requestSchema = z.object({ servicoId: z.string().min(1).max(100), horarioId: z.string().min(1).max(100).optional(), chaveIdempotencia: z.string().uuid(), aparelho: z.string().trim().min(2).max(160), problema: z.string().trim().min(5).max(2000) }).strict();
const serialize = <T extends { preco: unknown }>(row: T) => ({ ...row, preco: row.preco === null ? null : Number(row.preco) });
servicosRouter.get('/', async (req, res) => {
  if (typeof req.query.lojaId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(req.query.lojaId)) { res.status(400).json({ error: 'Informe a loja.' }); return; }
  const rows = await prisma.servico.findMany({ where: { lojaId: req.query.lojaId, ativo: true }, orderBy: { titulo: 'asc' }, take: 100 });
  res.json(rows.map(serialize));
});
servicosRouter.get('/admin', requireLojista, async (req: AuthRequest, res) => {
  res.json((await prisma.servico.findMany({ where: { lojaId: req.user!.lojaId }, orderBy: { titulo: 'asc' }, take: 100 })).map(serialize));
});
servicosRouter.post('/', requireLojista, async (req: AuthRequest, res) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors }); return; }
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.user!.lojaId}))`;
    if (await tx.servico.count({ where: { lojaId: req.user!.lojaId } }) >= 100) return null;
    return tx.servico.create({ data: { ...parsed.data, lojaId: req.user!.lojaId } });
  });
  if (!result) { res.status(409).json({ error: 'Limite de 100 serviços. Edite os existentes.' }); return; }
  res.status(201).json(serialize(result));
});
servicosRouter.patch('/:id', requireLojista, async (req: AuthRequest, res) => {
  const parsed = serviceSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors }); return; }
  const result = await prisma.servico.updateMany({ where: { id: String(req.params.id), lojaId: req.user!.lojaId }, data: parsed.data });
  if (!result.count) { res.status(404).json({ error: 'Serviço não encontrado.' }); return; }
  res.json({ ok: true });
});
servicosRouter.get('/solicitacoes', requireAuth, async (req: AuthRequest, res) => {
  const rows = await prisma.solicitacaoServico.findMany({ where: { lojaId: req.user!.lojaId, ...(req.user!.role === 'CLIENTE' ? { cliente: { usuarioId: req.user!.userId } } : {}) },
    include: { servico: { select: { titulo: true } }, horario: { select: { inicio: true, fim: true } }, historico: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.set('Cache-Control', 'no-store').json(rows);
});
servicosRouter.post('/solicitacoes', requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Acesso exclusivo do cliente.' }); return; }
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors }); return; }
  const cliente = await prisma.cliente.findFirst({ where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId }, select: { id: true } });
  if (!cliente) { res.status(403).json({ error: 'Cadastro de cliente não encontrado.' }); return; }
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cliente.id}))`;
    const existing = await tx.solicitacaoServico.findUnique({ where: { clienteId_chaveIdempotencia: { clienteId: cliente.id, chaveIdempotencia: parsed.data.chaveIdempotencia } } });
    if (existing) return { row: existing, repeated: true };
    const service = await tx.servico.findFirst({ where: { id: parsed.data.servicoId, lojaId: req.user!.lojaId, ativo: true }, select: { id: true, agendamento: true } });
    if (!service) return null;
    const count = await tx.solicitacaoServico.count({ where: { clienteId: cliente.id, createdAt: { gte: new Date(Date.now() - 86400000) } } });
    if (count >= 10) return { limit: true };
    if (parsed.data.horarioId) {
      if (!service.agendamento) return { horarioIndisponivel: true };
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${parsed.data.horarioId}))`;
      const slot = await tx.horarioServico.findFirst({ where: { id: parsed.data.horarioId, servicoId: service.id, ativo: true, inicio: { gt: new Date() } } });
      if (!slot) return { horarioIndisponivel: true };
      const reserved = await tx.solicitacaoServico.count({ where: { horarioId: slot.id, status: { not: 'CANCELADA' } } });
      if (reserved >= slot.capacidade) return { horarioIndisponivel: true };
    }
    const row = await tx.solicitacaoServico.create({ data: { ...parsed.data, lojaId: req.user!.lojaId, clienteId: cliente.id, protocolo: `VOX-S-${randomUUID().toUpperCase()}`, historico: { create: { status: 'RECEBIDA', mensagem: 'Solicitação recebida. A loja vai analisar e entrar em contato.' } } } });
    return { row, repeated: false };
  });
  if (!result) { res.status(404).json({ error: 'Serviço indisponível nesta loja.' }); return; }
  if ('limit' in result) { res.status(429).json({ error: 'Limite diário de solicitações atingido.' }); return; }
  if ('horarioIndisponivel' in result) { res.status(409).json({ error: 'Horário indisponível. Escolha outro ou envie sem agendamento.' }); return; }
  res.status(result.repeated ? 200 : 201).json(result.row);
});
servicosRouter.post('/solicitacoes/:id/horario', requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Acesso exclusivo do cliente.' }); return; }
  const parsed = z.object({ horarioId: z.string().min(1).max(100), horarioAtualId: z.string().min(1).max(100).nullable() }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Informe o novo horário e a reserva atual.' }); return; }
  const id = String(req.params.id);
  if (id.length > 100) { res.status(400).json({ error: 'Solicitação inválida.' }); return; }
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    const current = await tx.solicitacaoServico.findFirst({ where: { id, lojaId: req.user!.lojaId, cliente: { usuarioId: req.user!.userId } }, include: { horario: true } });
    if (!current) return 'missing';
    if (!['RECEBIDA', 'EM_ANALISE', 'AGUARDANDO_CLIENTE'].includes(current.status)) return 'conflict';
    if (current.horarioId === parsed.data.horarioId) return 'ok';
    if (current.horarioId !== parsed.data.horarioAtualId || (current.horario && current.horario.inicio <= new Date())) return 'conflict';
    if (!await tx.servico.findFirst({ where: { id: current.servicoId, lojaId: req.user!.lojaId, ativo: true, agendamento: true } })) return 'conflict';
    // All transfers lock both slots in one stable order, preserving capacity during swaps.
    const slots = [...new Set([current.horarioId, parsed.data.horarioId].filter((slot): slot is string => Boolean(slot)))].sort();
    for (const slot of slots) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slot}))`;
    const target = await tx.horarioServico.findFirst({ where: { id: parsed.data.horarioId, servicoId: current.servicoId, ativo: true, inicio: { gt: new Date() } } });
    if (!target) return 'conflict';
    const reserved = await tx.solicitacaoServico.count({ where: { horarioId: target.id, status: { not: 'CANCELADA' } } });
    if (reserved >= target.capacidade) return 'conflict';
    const changes = await tx.historicoServico.count({ where: { solicitacaoId: id, mensagem: { startsWith: 'Horário alterado pelo cliente:' }, createdAt: { gte: new Date(Date.now() - 86400000) } } });
    if (changes >= 10) return 'limit';
    const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
    await tx.solicitacaoServico.update({ where: { id }, data: { horarioId: target.id, historico: { create: { status: current.status, mensagem: `Horário alterado pelo cliente: ${date.format(target.inicio)} (Brasília).` } } } });
    return 'ok';
  });
  res.status(result === 'missing' ? 404 : result === 'conflict' ? 409 : result === 'limit' ? 429 : 200).json(result === 'ok' ? { ok: true } : { error: result === 'missing' ? 'Atendimento não encontrado.' : result === 'limit' ? 'Limite diário de alterações atingido. Fale com a loja.' : 'Não foi possível trocar o horário. Sua reserva foi mantida; consulte o atendimento e os horários disponíveis.' });
});
servicosRouter.patch('/solicitacoes/:id/status', requireLojista, async (req: AuthRequest, res) => {
  const parsed = z.object({ status: z.enum(['EM_ANALISE', 'AGUARDANDO_CLIENTE', 'EM_EXECUCAO', 'CONCLUIDA', 'CANCELADA']), mensagem: z.string().trim().min(2).max(1000) }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors }); return; }
  const result = await prisma.$transaction(async tx => {
    const id = String(req.params.id);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    const current = await tx.solicitacaoServico.findFirst({ where: { id, lojaId: req.user!.lojaId } });
    if (!current) return 'missing';
    if (current.status === parsed.data.status) return 'ok';
    const transitions: Record<string, string[]> = { RECEBIDA: ['EM_ANALISE', 'CANCELADA'], EM_ANALISE: ['AGUARDANDO_CLIENTE', 'EM_EXECUCAO', 'CANCELADA'], AGUARDANDO_CLIENTE: ['EM_ANALISE', 'EM_EXECUCAO', 'CANCELADA'], EM_EXECUCAO: ['AGUARDANDO_CLIENTE', 'CONCLUIDA', 'CANCELADA'] };
    if (!transitions[current.status]?.includes(parsed.data.status)) return 'conflict';
    if (parsed.data.status === 'EM_EXECUCAO') {
      const quote = await tx.orcamentoServico.findFirst({ where: { solicitacaoId: id }, orderBy: { versao: 'desc' } });
      if (quote && quote.status !== 'ACEITO') return 'conflict';
    }
    if (current.horarioId && parsed.data.status === 'CANCELADA') await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${current.horarioId}))`;
    const changed = await tx.solicitacaoServico.update({ where: { id }, data: { status: parsed.data.status, historico: { create: parsed.data } } });
    await enqueueClientNotification(tx, { lojaId: req.user!.lojaId, clienteId: current.clienteId, chaveEvento: `service:${id}:${changed.updatedAt.toISOString()}:${parsed.data.status}`, titulo: 'Seu atendimento foi atualizado', mensagem: 'Há uma atualização no seu atendimento. Consulte os detalhes na sua conta Vox.', destino: '/servicos' });
    return 'ok';
  });
  res.status(result === 'missing' ? 404 : result === 'conflict' ? 409 : 200).json(result === 'ok' ? { ok: true } : { error: result === 'missing' ? 'Solicitação não encontrada.' : 'Esta mudança de status não está disponível.' });
});
