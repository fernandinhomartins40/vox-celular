import 'dotenv/config';
import { androidAssociation, appleAssociation } from './lib/mobileAssociation.js';
import express from 'express';
import cors from 'cors';
import { allowedWebOrigin } from './lib/webOrigins.js';
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
import { assistenteRouter } from './routes/assistente.js';
import { servicosRouter } from './routes/servicos.js';
import { agendaRouter } from './routes/agenda.js';
import { guiasRouter } from './routes/guias.js';
import { iaConfigRouter } from './routes/iaConfig.js';
import { emailConfigRouter } from './routes/emailConfig.js';
import { notificacoesRouter } from './routes/notificacoes.js';
import { pushRouter } from './routes/push.js';
import { compatibilidadesRouter } from './routes/compatibilidades.js';
import { novidadesRouter } from './routes/novidades.js';
import { orcamentosServicoRouter } from './routes/orcamentosServico.js';
import { pruneExpiredNotifications } from './lib/notificationRetention.js';
import { pruneExpiredAccountTokens } from './lib/accountTokenRetention.js';
import { startConfiguredNotificationWorker } from './lib/notificationWorker.js';

const app = express();
const androidLinks = androidAssociation(process.env.MOBILE_ANDROID_SHA256);
const appleLinks = appleAssociation(process.env.MOBILE_APPLE_TEAM_ID);
app.get('/.well-known/assetlinks.json', (_req, res) => res.set('Cache-Control', 'public, max-age=300').json(androidLinks));
app.get('/.well-known/apple-app-site-association', (_req, res) => res.set('Cache-Control', 'public, max-age=300').json(appleLinks));
const PORT = process.env.PORT || 3001;
const uploadsDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');

app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedWebOrigin(origin)), credentials: true }));
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(uploadsDir, { maxAge: '1y', immutable: true, dotfiles: 'deny', index: false }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/meta', (_req, res) => res.set('Cache-Control', 'no-store').json({ contrato: 1, capacidades: ['checkout-preco-confirmado', 'resgate-idempotente'] }));
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
app.use('/api/assistente', assistenteRouter);
app.use('/api/servicos', servicosRouter);
app.use('/api/agenda', agendaRouter);
app.use('/api/guias', guiasRouter);
app.use('/api/ia/config', iaConfigRouter);
app.use('/api/email/config', emailConfigRouter);
app.use('/api/notificacoes', notificacoesRouter);
app.use('/api/push', pushRouter);
app.use('/api/compatibilidades', compatibilidadesRouter);
app.use('/api/novidades', novidadesRouter);
app.use('/api/orcamentos-servico', orcamentosServicoRouter);

const server = app.listen(PORT, () => console.log(`API running on port ${PORT}`));
const notificationWorker = startConfiguredNotificationWorker();
let retentionRunning = false;
const retentionTimer = setInterval(async () => {
  if (retentionRunning) return;
  retentionRunning = true;
  try { await pruneExpiredNotifications(); }
  catch { console.error('Notification retention pass failed'); }
  try { await pruneExpiredAccountTokens(); }
  catch { console.error('Account token retention pass failed'); }
  finally { retentionRunning = false; }
}, 6 * 3600000);
retentionTimer.unref();
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const workerStopping = notificationWorker.stop();
  clearInterval(retentionTimer);
  const timeout = setTimeout(() => process.exit(1), 25000);
  timeout.unref();
  server.close(async () => {
    await workerStopping;
    await prisma.$disconnect();
    clearTimeout(timeout);
    process.exit(0);
  });
  server.closeIdleConnections();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
