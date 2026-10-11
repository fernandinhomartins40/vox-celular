import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireLojista, AuthRequest } from '../middleware/auth.js';
import { encryptCredentials, decryptCredentials } from '../lib/credentialVault.js';

const field = (key: string, label: string) => ({ key, label });
export const canais = [
  { id: 'mercadolivre', nome: 'Mercado Livre', docs: 'https://developers.mercadolivre.com.br/', fields: [field('clientId','App ID'), field('clientSecret','Client Secret'), field('accessToken','Access Token'), field('refreshToken','Refresh Token')] },
  { id: 'magalu', nome: 'Magalu', docs: 'https://developers.magalu.com/', fields: [field('clientId','Client ID'), field('clientSecret','Client Secret'), field('accessToken','Access Token'), field('refreshToken','Refresh Token'), field('tenantId','ID da organização')] },
  { id: 'shopee', nome: 'Shopee', docs: 'https://open.shopee.com/', fields: [field('partnerId','Partner ID'), field('partnerKey','Partner Key'), field('shopId','Shop ID'), field('accessToken','Access Token'), field('refreshToken','Refresh Token')] },
  { id: 'amazon', nome: 'Amazon', docs: 'https://developer-docs.amazon.com/sp-api/', fields: [field('clientId','LWA Client ID'), field('clientSecret','LWA Client Secret'), field('refreshToken','LWA Refresh Token'), field('sellerId','Seller ID'), field('marketplaceId','Marketplace ID do Brasil')] },
  { id: 'casasbahia', nome: 'Casas Bahia', docs: 'https://developers.grupocasasbahia.com.br/', fields: [field('appToken','App:Token'), field('sellerId','Seller ID')] },
  { id: 'americanas', nome: 'Americanas / SkyHub', docs: 'https://desenvolvedores.skyhub.com.br/', fields: [field('email','X-User-Email'), field('apiKey','X-Api-Key'), field('accountmanagerKey','X-Accountmanager-Key')] },
  { id: 'shein', nome: 'SHEIN', docs: 'https://open.sheincorp.com/', fields: [field('appId','App ID'), field('appSecret','App Secret'), field('openKeyId','Open Key ID'), field('secretKey','Secret Key')] },
];
export const integracoesRouter = Router();
integracoesRouter.use(requireLojista);
const safe = (row: { canal: string; ambiente: string; campos: string[]; status: string; verificadoEm: Date | null; updatedAt: Date }) => ({ canal: row.canal, ambiente: row.ambiente, campos: row.campos, status: row.status, verificadoEm: row.verificadoEm, updatedAt: row.updatedAt });
integracoesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const rows = await prisma.integracaoMarketplace.findMany({ where: { lojaId: req.user!.lojaId } });
    res.json({ canais, conexoes: rows.map(safe) });
  } catch { res.status(503).json({ error: 'Não foi possível carregar as integrações.' }); }
});
integracoesRouter.put('/:canal', async (req: AuthRequest, res) => {
  const canal = canais.find(c => c.id === req.params.canal);
  const parsed = z.object({ ambiente: z.enum(['producao','homologacao']), credenciais: z.record(z.string().trim().max(8000)) }).strict().safeParse(req.body);
  if (!canal || !parsed.success || Object.keys(parsed.data.credenciais).some(k => !canal.fields.some(f => f.key === k))) { res.status(400).json({ error: 'Configuração de canal inválida.' }); return; }
  const lojaId = req.user!.lojaId, context = `${lojaId}:${canal.id}`;
  try {
    const row = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lojaId}), hashtext(${canal.id}))`;
      const previous = await tx.integracaoMarketplace.findUnique({ where: { lojaId_canal: { lojaId, canal: canal.id } } });
      const values = previous ? await decryptCredentials(previous.credenciais, context) : {};
      for (const [key, value] of Object.entries(parsed.data.credenciais)) if (value) values[key] = value;
      if (!Object.keys(values).length) throw new Error('EMPTY');
      const data = { ambiente: parsed.data.ambiente, credenciais: await encryptCredentials(values, context), campos: Object.keys(values), status: 'CONFIGURADO', verificadoEm: null };
      return tx.integracaoMarketplace.upsert({ where: { lojaId_canal: { lojaId, canal: canal.id } }, create: { lojaId, canal: canal.id, ...data }, update: data });
    });
    res.json(safe(row));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error && error.message === 'VAULT_RESTORE_REQUIRED'
      ? 'A chave de proteção está ausente. Restaure o backup do cofre antes de alterar credenciais.'
      : 'Não foi possível salvar. Preencha as credenciais ou tente novamente.' });
  }
});
integracoesRouter.delete('/:canal', async (req: AuthRequest, res) => {
  try { await prisma.integracaoMarketplace.deleteMany({ where: { lojaId: req.user!.lojaId, canal: String(req.params.canal) } }); res.json({ ok: true }); }
  catch { res.status(503).json({ error: 'Não foi possível remover a configuração.' }); }
});
let nextVerification = 0;
integracoesRouter.post('/:canal/verificar', async (req: AuthRequest, res) => {
  const canal = String(req.params.canal), lojaId = req.user!.lojaId;
  if (!['mercadolivre','americanas'].includes(canal)) { res.status(422).json({ error: 'Credenciais podem ser salvas. A verificação automática deste canal ainda não foi implementada; configuração não significa autorização ou homologação.' }); return; }
  if (Date.now() < nextVerification) { res.status(429).json({ error: 'Aguarde alguns segundos antes de verificar novamente.' }); return; }
  nextVerification = Date.now() + 12000;
  try {
    const row = await prisma.integracaoMarketplace.findUnique({ where: { lojaId_canal: { lojaId, canal } } });
    if (!row || row.ambiente !== 'producao') { res.status(400).json({ error: 'Salve as credenciais de produção antes de verificar.' }); return; }
    const c = await decryptCredentials(row.credenciais, `${lojaId}:${canal}`);
    const headers: Record<string,string> = canal === 'mercadolivre' ? { Authorization: `Bearer ${c.accessToken || ''}` } : { 'X-User-Email': c.email || '', 'X-Api-Key': c.apiKey || '', 'X-Accountmanager-Key': c.accountmanagerKey || '', Accept: 'application/json' };
    if (canal === 'mercadolivre' ? !c.accessToken : !c.email || !c.apiKey || !c.accountmanagerKey) { res.status(400).json({ error: 'Preencha o token e os campos necessários para a consulta.' }); return; }
    const response = await fetch(canal === 'mercadolivre' ? 'https://api.mercadolibre.com/users/me' : 'https://api.skyhub.com.br/orders?limit=1', { headers, redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!response.ok) { res.status(400).json({ error: response.status === 429 ? 'O canal limitou as consultas. Aguarde antes de tentar novamente.' : 'O canal recusou a consulta. Confira a autorização e as credenciais.' }); return; }
    // Check identity response, never expose buyer/order payloads or secrets.
    if (canal === 'mercadolivre') { const identity = await response.json() as { id?: number }; if (!identity.id) throw new Error('IDENTITY'); }
    else await response.body?.cancel();
    const changed = await prisma.integracaoMarketplace.updateMany({ where: { id: row.id, updatedAt: row.updatedAt }, data: { status: 'ACESSO_VERIFICADO', verificadoEm: new Date() } });
    if (changed.count !== 1) { res.status(409).json({ error: 'A configuração mudou durante o teste. Verifique novamente.' }); return; }
    res.json({ ok: true, message: 'Acesso de leitura verificado. Sincronização e publicação ainda não estão ativadas.' });
  } catch { res.status(503).json({ error: 'Não foi possível verificar o canal. Tente novamente mais tarde.' }); }
});
