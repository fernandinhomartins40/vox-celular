import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { prisma } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import { produtosRouter } from './routes/produtos.js';
import { pedidosRouter } from './routes/pedidos.js';
import { clientesRouter } from './routes/clientes.js';
import { dashboardRouter } from './routes/dashboard.js';
import { fidelidadeRouter } from './routes/fidelidade.js';
import { configRouter } from './routes/config.js';
import { promocoesRouter } from './routes/promocoes.js';
import { lojaRouter } from './routes/loja.js';
import { integracoesRouter } from './routes/integracoes.js';
import { favoritosRouter } from './routes/favoritos.js';
import { privacidadeRouter } from './routes/privacidade.js';

const app = express();
const PORT = process.env.PORT || 3001;
const uploadsDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(uploadsDir, { maxAge: '1y', immutable: true, dotfiles: 'deny', index: false }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/produtos', produtosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/fidelidade', fidelidadeRouter);
app.use('/api/config', configRouter);
app.use('/api/integracoes', integracoesRouter);
app.use('/api/favoritos', favoritosRouter);
app.use('/api/privacidade', privacidadeRouter);
app.use('/api/promocoes', promocoesRouter);
app.use('/api/loja', lojaRouter);

const server = app.listen(PORT, () => console.log(`API running on port ${PORT}`));
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const timeout = setTimeout(() => process.exit(1), 25000);
  timeout.unref();
  server.close(async () => {
    await prisma.$disconnect();
    clearTimeout(timeout);
    process.exit(0);
  });
  server.closeIdleConnections();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
