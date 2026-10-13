import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest, requireAuth, requireLojista } from '../middleware/auth.js';
export const orcamentosServicoRouter = Router();
orcamentosServicoRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  const id = z.string().min(1).max(100).safeParse(req.query.solicitacaoId);
  if (!id.success) { res.status(400).json({ error: 'Informe o atendimento.' }); return; }
  try {
    const rows = await prisma.orcamentoServico.findMany({ where: { solicitacaoId: id.data, solicitacao: { lojaId: req.user!.lojaId, ...(req.user!.role === 'CLIENTE' ? { cliente: { usuarioId: req.user!.userId } } : {}) } }, orderBy: { versao: 'desc' }, take: 20, select: { id: true, versao: true, valorCentavos: true, descricao: true, validoAte: true, status: true, decididoEm: true, createdAt: true } });
    res.set('Cache-Control', 'no-store').json(rows);
  } catch { res.status(503).json({ error: 'Não foi possível consultar orçamentos.' }); }
});
const proposal = z.object({ solicitacaoId: z.string().min(1).max(100), valorCentavos: z.number().int().min(0).max(100000000), descricao: z.string().trim().min(5).max(2000), validoAte: z.string().datetime() }).strict().refine(value => Date.parse(value.validoAte) > Date.now() && Date.parse(value.validoAte) <= Date.now() + 90 * 86400000, 'Use validade futura de até 90 dias.');
orcamentosServicoRouter.post('/', requireLojista, async (req: AuthRequest, res) => {
  const parsed = proposal.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Confira valor, descrição e validade do orçamento.' }); return; }
  try {
    const row = await prisma.$transaction(async tx => {
      const data = parsed.data;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.solicitacaoId}))`;
      const request = await tx.solicitacaoServico.findFirst({ where: { id: data.solicitacaoId, lojaId: req.user!.lojaId } });
      if (!request) throw new Error('MISSING');
      if (!['EM_ANALISE', 'AGUARDANDO_CLIENTE'].includes(request.status)) throw new Error('STATE');
      const last = await tx.orcamentoServico.findFirst({ where: { solicitacaoId: request.id }, orderBy: { versao: 'desc' } });
      if ((last?.versao || 0) >= 20) throw new Error('LIMIT');
      await tx.orcamentoServico.updateMany({ where: { solicitacaoId: request.id, status: 'PENDENTE' }, data: { status: 'SUBSTITUIDO' } });
      const row = await tx.orcamentoServico.create({ data: { ...data, validoAte: new Date(data.validoAte), versao: (last?.versao || 0) + 1, emitidoPorId: req.user!.userId } });
      await tx.solicitacaoServico.update({ where: { id: request.id }, data: { status: 'AGUARDANDO_CLIENTE', historico: { create: { status: 'AGUARDANDO_CLIENTE', mensagem: `Orçamento versão ${row.versao} disponível para sua decisão.` } } } });
      return { id: row.id, versao: row.versao, status: row.status };
    }); res.status(201).json(row);
  } catch (e) { res.status(e instanceof Error && e.message === 'MISSING' ? 404 : 409).json({ error: 'Solicitação indisponível para orçamento ou limite de revisões atingido.' }); }
});
orcamentosServicoRouter.post('/:id/decisao', requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Decisão exclusiva do cliente.' }); return; }
  const parsed = z.object({ aceitar: z.boolean() }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Confirme sua decisão.' }); return; }
  try {
    const row = await prisma.$transaction(async tx => {
      const found = await tx.orcamentoServico.findFirst({ where: { id: String(req.params.id), solicitacao: { lojaId: req.user!.lojaId, cliente: { usuarioId: req.user!.userId } } }, select: { solicitacaoId: true } });
      if (!found) throw new Error('MISSING');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${found.solicitacaoId}))`;
      const quote = await tx.orcamentoServico.findUniqueOrThrow({ where: { id: String(req.params.id) }, include: { solicitacao: true } });
      const status = parsed.data.aceitar ? 'ACEITO' : 'RECUSADO';
      if (quote.status === status) return { ok: true };
      if (quote.status !== 'PENDENTE' || quote.validoAte <= new Date() || quote.solicitacao.status !== 'AGUARDANDO_CLIENTE') throw new Error('STATE');
      await tx.orcamentoServico.update({ where: { id: quote.id }, data: { status, decididoEm: new Date() } });
      await tx.solicitacaoServico.update({ where: { id: found.solicitacaoId }, data: { status: parsed.data.aceitar ? 'AGUARDANDO_CLIENTE' : 'EM_ANALISE', historico: { create: { status: parsed.data.aceitar ? 'AGUARDANDO_CLIENTE' : 'EM_ANALISE', mensagem: `Cliente ${parsed.data.aceitar ? 'aceitou' : 'recusou'} o orçamento versão ${quote.versao}.` } } } });
      return { ok: true };
    }); res.json(row);
  } catch (e) { res.status(e instanceof Error && e.message === 'MISSING' ? 404 : 409).json({ error: 'Orçamento indisponível, vencido ou já decidido.' }); }
});
