import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { produtosRouter } from './routes/produtos.js';
import { pedidosRouter } from './routes/pedidos.js';
import { clientesRouter } from './routes/clientes.js';
import { dashboardRouter } from './routes/dashboard.js';
import { fidelidadeRouter } from './routes/fidelidade.js';
import { configRouter } from './routes/config.js';
import { promocoesRouter } from './routes/promocoes.js';
import { lojaRouter } from './routes/loja.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/produtos', produtosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/fidelidade', fidelidadeRouter);
app.use('/api/config', configRouter);
app.use('/api/promocoes', promocoesRouter);
app.use('/api/loja', lojaRouter);

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
