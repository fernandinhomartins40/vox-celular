import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { authLimits } from '../lib/authLimits.js';

export const privacidadeRouter = Router();
privacidadeRouter.get('/exportar', requireAuth, authLimits, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'CLIENTE') { res.status(403).json({ error: 'Exportação disponível para o titular da conta de cliente.' }); return; }
  const snapshot = new Date();
  let closed = false;
  res.on('close', () => { closed = true; });
  try {
    const profile = await prisma.cliente.findFirst({ where: { usuarioId: req.user!.userId, lojaId: req.user!.lojaId }, select: { id: true, telefone: true, cidade: true, pontos: true, nivel: true, createdAt: true, usuario: { select: { nome: true, email: true } } } });
    if (!profile) { res.status(404).json({ error: 'Cadastro não encontrado.' }); return; }
    res.set({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="vox-meus-dados.json"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.write(JSON.stringify({ exportadoEm: snapshot.toISOString(), perfil: profile }).slice(0, -1));
    // Batches keep memory bounded. A cutoff prevents newly created rows from
    // continually extending an export. Data changed during export is not frozen.
    const collections = ['pedidos', 'favoritos', 'historicoPontos', 'resgates'] as const;
    for (const collection of collections) {
      res.write(`,"${collection}":[`);
      let cursor: string | undefined, first = true;
      while (!closed) {
        let rows: { id: string; [key: string]: unknown }[];
        const where = { clienteId: profile.id, createdAt: { lte: snapshot }, ...(cursor ? { id: { gt: cursor } } : {}) };
        if (collection === 'pedidos') rows = await prisma.pedido.findMany({ where: { ...where, lojaId: req.user!.lojaId }, orderBy: { id: 'asc' }, take: 100, select: { id: true, codigo: true, status: true, pagamento: true, total: true, createdAt: true, canceladoEm: true, itens: { select: { nome: true, qty: true, preco: true } }, timeline: { select: { status: true, data: true, ok: true, ordem: true } } } });
        else if (collection === 'historicoPontos') rows = await prisma.historicoPontos.findMany({ where, orderBy: { id: 'asc' }, take: 100, select: { id: true, pontos: true, tipo: true, descricao: true, createdAt: true } });
        else if (collection === 'resgates') rows = await prisma.resgateRecompensa.findMany({ where, orderBy: { id: 'asc' }, take: 100, select: { id: true, codigo: true, usadoEm: true, createdAt: true, recompensa: { select: { titulo: true, pontos: true } } } });
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
