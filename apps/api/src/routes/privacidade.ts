import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { authLimits } from '../lib/authLimits.js';
import { z } from 'zod';

export const privacidadeRouter = Router();
const preferenceFields = { personalizacao: true, notificacoes: true, versaoPrivacidade: true, preferenciasAtualizadasEm: true } as const;
const aviso = '2026-10-12';
privacidadeRouter.get('/preferencias', requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Acesso exclusivo do cliente.' }); return; }
  try {
    const row = await prisma.cliente.findFirst({ where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId }, select: preferenceFields });
    if (!row) { res.status(404).json({ error: 'Cadastro não encontrado.' }); return; }
    res.set('Cache-Control', 'no-store').json({ ...row, versaoAviso: aviso });
  } catch { res.status(503).json({ error: 'Não foi possível carregar suas preferências.' }); }
});
privacidadeRouter.put('/preferencias', requireAuth, authLimits, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Acesso exclusivo do cliente.' }); return; }
  const parsed = z.object({ personalizacao: z.boolean(), notificacoes: z.boolean(), versaoAviso: z.literal(aviso) }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Confira as opções e a versão do aviso.' }); return; }
  try {
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.user!.userId}))`;
      const cliente = await tx.cliente.findFirst({ where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId } });
      if (!cliente) throw new Error('MISSING');
      const { personalizacao, notificacoes } = parsed.data;
      if (!notificacoes) await tx.notificacaoCliente.updateMany({ where: { clienteId: cliente.id, lojaId: req.user!.lojaId, status: 'PENDENTE' }, data: { status: 'CANCELADA' } });
      if (cliente.personalizacao !== personalizacao || cliente.notificacoes !== notificacoes || cliente.versaoPrivacidade !== aviso) {
        await tx.consentimentoCliente.create({ data: { clienteId: cliente.id, personalizacao, notificacoes, versaoAviso: aviso } });
        return tx.cliente.update({ where: { id: cliente.id }, data: { personalizacao, notificacoes, versaoPrivacidade: aviso, preferenciasAtualizadasEm: new Date() }, select: preferenceFields });
      }
      return tx.cliente.findUnique({ where: { id: cliente.id }, select: preferenceFields });
    });
    res.set('Cache-Control', 'no-store').json({ ...result, versaoAviso: aviso });
  } catch { res.status(503).json({ error: 'Não foi possível salvar suas preferências.' }); }
});
privacidadeRouter.get('/exportar', requireAuth, authLimits, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Exportação disponível para o titular da conta de cliente.' }); return; }
  const snapshot = new Date();
  let closed = false;
  res.on('close', () => { closed = true; });
  try {
    const profile = await prisma.cliente.findFirst({ where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId }, select: { id: true, telefone: true, cidade: true, pontos: true, nivel: true, createdAt: true, ...preferenceFields, usuario: { select: { nome: true, email: true } } } });
    if (!profile) { res.status(404).json({ error: 'Cadastro não encontrado.' }); return; }
    res.set({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="vox-meus-dados.json"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.write(JSON.stringify({ exportadoEm: snapshot.toISOString(), perfil: profile }).slice(0, -1));
    // Batches keep memory bounded. A cutoff prevents newly created rows from
    // continually extending an export. Data changed during export is not frozen.
    const collections = ['pedidos', 'favoritos', 'historicoPontos', 'resgates', 'consentimentos', 'sessoes', 'solicitacoesServico', 'historicoServicos', 'avisos'] as const;
    for (const collection of collections) {
      res.write(`,"${collection}":[`);
      let cursor: string | undefined, first = true;
      while (!closed) {
        let rows: { id: string; [key: string]: unknown }[];
        const where = { clienteId: profile.id, createdAt: { lte: snapshot }, ...(cursor ? { id: { gt: cursor } } : {}) };
        if (collection === 'pedidos') rows = await prisma.pedido.findMany({ where: { ...where, lojaId: req.user!.lojaId }, orderBy: { id: 'asc' }, take: 100, select: { id: true, codigo: true, status: true, pagamento: true, total: true, createdAt: true, canceladoEm: true, itens: { select: { nome: true, qty: true, preco: true } }, timeline: { select: { status: true, data: true, ok: true, ordem: true } } } });
        else if (collection === 'solicitacoesServico') rows = await prisma.solicitacaoServico.findMany({ where: { ...where, lojaId: req.user!.lojaId }, orderBy: { id: 'asc' }, take: 100, select: { id: true, protocolo: true, aparelho: true, problema: true, status: true, createdAt: true, updatedAt: true, horario: { select: { inicio: true, fim: true } }, servico: { select: { titulo: true } } } });
        else if (collection === 'historicoServicos') rows = await prisma.historicoServico.findMany({ where: { solicitacao: { clienteId: profile.id, lojaId: req.user!.lojaId }, createdAt: { lte: snapshot }, ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: 'asc' }, take: 100, select: { id: true, solicitacaoId: true, status: true, mensagem: true, createdAt: true } });
        else if (collection === 'avisos') rows = await prisma.notificacaoCliente.findMany({ where: { ...where, lojaId: req.user!.lojaId }, orderBy: { id: 'asc' }, take: 100, select: { id: true, titulo: true, mensagem: true, destino: true, status: true, createdAt: true, expiresAt: true } });
        else if (collection === 'historicoPontos') rows = await prisma.historicoPontos.findMany({ where, orderBy: { id: 'asc' }, take: 100, select: { id: true, pontos: true, tipo: true, descricao: true, createdAt: true } });
        else if (collection === 'resgates') rows = await prisma.resgateRecompensa.findMany({ where, orderBy: { id: 'asc' }, take: 100, select: { id: true, codigo: true, usadoEm: true, createdAt: true, recompensa: { select: { titulo: true, pontos: true } } } });
        else if (collection === 'consentimentos') rows = await prisma.consentimentoCliente.findMany({ where, orderBy: { id: 'asc' }, take: 100, select: { id: true, personalizacao: true, notificacoes: true, versaoAviso: true, createdAt: true } });
        else if (collection === 'sessoes') rows = await prisma.sessao.findMany({ where: { usuarioId: req.user!.userId, createdAt: { lte: snapshot }, ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: 'asc' }, take: 100, select: { id: true, createdAt: true, expiresAt: true } });
        else rows = (await prisma.favorito.findMany({ where: { clienteId: profile.id, createdAt: { lte: snapshot }, ...(cursor ? { produtoId: { gt: cursor } } : {}) }, orderBy: { produtoId: 'asc' }, take: 100, select: { produtoId: true, createdAt: true, produto: { select: { nome: true } } } })).map(row => ({ id: row.produtoId, ...row }));
        for (const row of rows) {
          if (closed) break;
          if (!res.write(`${first ? '' : ','}${JSON.stringify(row)}`)) await new Promise<void>(resolve => {
            const finish = () => { res.off('drain', finish); res.off('close', finish); resolve(); };
            res.once('drain', finish); res.once('close', finish);
          });
          first = false;
        }
        if (rows.length < 100) break;
        cursor = rows.at(-1)!.id;
      }
      if (closed) return;
      res.write(']');
    }
    res.end('}');
  } catch {
    if (res.headersSent) res.destroy();
    else res.status(503).json({ error: 'Não foi possível exportar seus dados. Tente novamente.' });
  }
});
