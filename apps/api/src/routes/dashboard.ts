import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireLojista, AuthRequest } from '../middleware/auth.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', requireLojista, async (req: AuthRequest, res) => {
  const lojaId = req.user!.lojaId;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [pedidosHoje, pedidosMes, clientesNovos, estoqueBaixo, grafico] = await Promise.all([
    prisma.pedido.count({ where: { lojaId, createdAt: { gte: hoje } } }),
    prisma.pedido.findMany({ where: { lojaId, createdAt: { gte: inicioMes } }, select: { total: true } }),
    prisma.cliente.count({ where: { lojaId, createdAt: { gte: inicioMes } } }),
    prisma.produto.count({ where: { lojaId, estoque: { lte: 5 }, ativo: true } }),
    prisma.$queryRaw`
      SELECT DATE("createdAt") as dia, SUM(total)::float as valor
      FROM "Pedido"
      WHERE "lojaId" = ${lojaId}
        AND "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE("createdAt")
      ORDER BY dia ASC
    `,
  ]);

  const faturamentoMes = pedidosMes.reduce((s: number, p: { total: unknown }) => s + Number(p.total), 0);

  res.json({
    pedidosHoje,
    pedidosMes: pedidosMes.length,
    faturamentoMes,
    clientesNovos,
    estoqueBaixo,
    ticketMedio: pedidosMes.length ? Math.round(faturamentoMes / pedidosMes.length) : 0,
    grafico,
  });
});
