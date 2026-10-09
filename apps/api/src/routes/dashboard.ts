import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireLojista, AuthRequest } from '../middleware/auth.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', requireLojista, async (req: AuthRequest, res) => {
  const lojaId = req.user!.lojaId;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [pedidosHoje, pedidosMes, pedidosOntem, clientesNovos, estoqueBaixo, grafico] = await Promise.all([
    prisma.pedido.count({ where: { lojaId, createdAt: { gte: hoje } } }),
    prisma.pedido.aggregate({ where: { lojaId, createdAt: { gte: inicioMes } }, _sum: { total: true }, _count: { _all: true } }),
    prisma.pedido.aggregate({ where: { lojaId, createdAt: { gte: ontem, lt: hoje } }, _sum: { total: true } }),
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

  const faturamentoMes = Number(pedidosMes._sum.total ?? 0);
  const faturamentoOntem = Number(pedidosOntem._sum.total ?? 0);
  const quantidadeMes = pedidosMes._count._all;

  res.json({
    pedidosHoje,
    pedidosMes: quantidadeMes,
    faturamentoMes,
    faturamentoOntem,
    clientesNovos,
    estoqueBaixo,
    ticketMedio: quantidadeMes ? Math.round(faturamentoMes / quantidadeMes) : 0,
    grafico,
  });
});
