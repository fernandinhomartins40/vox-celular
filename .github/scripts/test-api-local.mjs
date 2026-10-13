import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createECDH, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { assertDisposableDatabase } from '../../apps/api/dist/lib/disposableDatabase.js';

assertDisposableDatabase('local-disposable');
const { prisma } = await import('../../apps/api/dist/lib/prisma.js');
const base = 'http://127.0.0.1:3197';
const portCheck = createServer();
portCheck.listen(3197, '127.0.0.1');
await once(portCheck, 'listening'); // Reject any occupied TCP port, including non-HTTP services.
await new Promise((resolve, reject) => portCheck.close(error => error ? reject(error) : resolve()));
assert.equal(await prisma.loja.count(), 0, 'HTTP suite requires a fresh disposable database');
const parent = path.resolve('.git/integration-postgres');
const root = await mkdtemp(path.join(parent, 'http-'));
const env = { ...process.env, PORT: '3197', NODE_ENV: 'test', CORS_ORIGIN: base,
  JWT_SECRET: 'local-disposable-api-secret-never-for-production', WEB_PUSH_ENABLED: 'false',
  UPLOADS_DIR: path.join(root, 'uploads'), MARKETPLACE_KEY_FILE: path.join(root, 'vault.key'),
  ADMIN_EMAIL: 'ci-http-admin@example.invalid', ADMIN_PASSWORD: 'ci-http-admin-password-123' };
let api;
async function request(route, token, body, method = body ? 'POST' : 'GET', statuses = [200]) {
  const response = await fetch(base + '/api' + route, { method, signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  assert.ok(statuses.includes(response.status), `${method} ${route}: ${response.status}; expected ${statuses}`);
  return { status: response.status, data };
}
try {
  execFileSync(process.execPath, ['apps/api/dist/bootstrap.js'], { env, stdio: 'inherit' });
  api = spawn(process.execPath, ['apps/api/dist/index.js'], { env, stdio: ['ignore', 'ignore', 'inherit'], windowsHide: true });
  for (let i = 0; i < 100; i++) {
    if (api.exitCode !== null) throw new Error('Test API exited before readiness');
    try { if ((await fetch(base + '/api/ready')).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await request('/ready');
  const loja = (await request('/loja')).data;
  const admin = (await request('/auth/login', null, { email: env.ADMIN_EMAIL, senha: env.ADMIN_PASSWORD, plataforma: 'native' })).data;
  const register = async name => (await request('/auth/register', null, { nome: name, email: `${name}@example.invalid`, senha: 'ci-http-client-password-123', lojaId: loja.id, plataforma: 'native' }, 'POST', [201])).data;
  const customer = await register('cliente-one');
  const other = await register('cliente-two');
  await request('/dashboard', customer.token, null, 'GET', [403]);
  const me = (await request('/auth/me', customer.token)).data;
  assert.equal((await request('/privacidade/encerramento', customer.token)).data.solicitacao, null);
  await request('/privacidade/encerramento', admin.token, null, 'GET', [403]);
  await request('/privacidade/encerramento', customer.token, { senhaAtual: 'wrong', confirmacao: 'SOLICITAR_ENCERRAMENTO' }, 'POST', [400]);
  const closure = { senhaAtual: 'ci-http-client-password-123', confirmacao: 'SOLICITAR_ENCERRAMENTO' };
  const closures = await Promise.all(Array.from({ length: 2 }, () => request('/privacidade/encerramento', customer.token, closure)));
  assert.equal(closures[0].data.solicitacao.id, closures[1].data.solicitacao.id);
  assert.equal(await prisma.solicitacaoEncerramentoConta.count({ where: { clienteId: me.cliente.id } }), 1);
  assert.equal((await request('/privacidade/encerramento', other.token)).data.solicitacao, null);
  await request('/clientes', customer.token, null, 'GET', [403]);
  const merchantClients = (await request('/clientes', admin.token)).data;
  assert.equal(merchantClients.find(client => client.id === me.cliente.id).encerramentoConta.id, closures[0].data.solicitacao.id);
  const analysisPath = `/privacidade/encerramento/${closures[0].data.solicitacao.id}/analisar`;
  await request(analysisPath, customer.token, {}, 'POST', [403]);
  await request('/privacidade/encerramento/missing/analisar', admin.token, {}, 'POST', [404]);
  const analyses = await Promise.all([request(analysisPath, admin.token, {}), request(analysisPath, admin.token, {})]);
  assert.ok(analyses.every(result => result.data.solicitacao.status === 'EM_ANALISE'));
  const audit = await prisma.solicitacaoEncerramentoConta.findUniqueOrThrow({ where: { id: closures[0].data.solicitacao.id } });
  assert.equal(audit.analisadoPorId, admin.user.id);
  assert.ok(audit.analiseIniciadaEm instanceof Date);
  await request(analysisPath, admin.token, {});
  assert.equal((await prisma.solicitacaoEncerramentoConta.findUniqueOrThrow({ where: { id: audit.id } })).analiseIniciadaEm.getTime(), audit.analiseIniciadaEm.getTime());
  assert.equal((await request('/privacidade/encerramento', customer.token)).data.solicitacao.status, 'EM_ANALISE');
  await request('/auth/me', customer.token); // Request alone must not claim completed deletion.
  const product = (await request('/produtos', admin.token, { nome: 'Local accessory', sub: 'Integration', categoria: 'Acessórios', preco: 10.25, descricao: 'Disposable HTTP fixture', estoque: 1 }, 'POST', [201])).data;
  assert.equal((await request(`/produtos/${product.id}?lojaId=${loja.id}`)).data.id, product.id);
  await request(`/produtos/${product.id}?lojaId=other-store`, null, null, 'GET', [404]);
  await prisma.produto.update({ where: { id: product.id }, data: { atributosTecnicos: { tipo: 'acessorio' } } });
  const phone = await prisma.produto.create({ data: { lojaId: loja.id, nome: 'Fixture phone', sub: 'Local', categoria: 'Celulares', preco: 100, imgUrl: '', descricao: 'Fixture', specs: [], atributosTecnicos: { tipo: 'celular' } } });
  const compatibility = { acessorioId: product.id, aparelhoId: phone.id, observacao: 'Encaixe conferido pelo lojista fixture' };
  await request('/compatibilidades', customer.token, compatibility, 'PUT', [403]);
  await request('/compatibilidades', admin.token, { ...compatibility, aparelhoId: product.id }, 'PUT', [409]);
  const savedPair = (await request('/compatibilidades', admin.token, compatibility, 'PUT')).data;
  assert.equal((await request('/compatibilidades', admin.token, compatibility, 'PUT')).data.id, savedPair.id);
  const pairs = (await request(`/compatibilidades?lojaId=${loja.id}&produtoId=${phone.id}`)).data;
  assert.equal(pairs.length, 1); assert.equal(pairs[0].acessorio.id, product.id);
  assert.equal(pairs[0].aprovadoPorId, undefined);
  await prisma.produto.update({ where: { id: phone.id }, data: { atributosTecnicos: { tipo: 'celular', modelo: 'Changed fixture' } } });
  assert.deepEqual((await request(`/compatibilidades?lojaId=${loja.id}&produtoId=${phone.id}`)).data, []);
  await request('/compatibilidades', admin.token, compatibility, 'PUT');
  await prisma.produto.update({ where: { id: phone.id }, data: { preco: 120 } });
  assert.equal((await request(`/compatibilidades?lojaId=${loja.id}&produtoId=${phone.id}`)).data.length, 1);
  assert.deepEqual((await request(`/compatibilidades?lojaId=other-store&produtoId=${phone.id}`)).data, []);
  await prisma.produto.update({ where: { id: phone.id }, data: { ativo: false } });
  assert.deepEqual((await request(`/compatibilidades?lojaId=${loja.id}&produtoId=${product.id}`)).data, []);
  await request(`/compatibilidades/${savedPair.id}`, customer.token, null, 'DELETE', [403]);
  await request(`/compatibilidades/${savedPair.id}`, admin.token, null, 'DELETE');
  assert.equal(await prisma.compatibilidadeProduto.count({ where: { id: savedPair.id } }), 0);
  await Promise.all(Array.from({ length: 3 }, () => request(`/favoritos/${product.id}`, customer.token, {}, 'PUT')));
  assert.equal((await request('/favoritos', customer.token)).data.length, 1, 'Repeated favorite must remain unique');
  assert.deepEqual((await request('/favoritos', other.token)).data, []);
  await request(`/favoritos/${product.id}`, other.token, null, 'DELETE');
  assert.equal((await request('/favoritos', customer.token)).data.length, 1, 'Another client cannot delete favorite');
  await request('/favoritos', admin.token, null, 'GET', [403]);
  const checkoutKey = randomUUID();
  const checkout = { checkoutKey, itens: [{ produtoId: product.id, qty: 1, precoCentavos: 1025 }] };
  const purchases = await Promise.all(Array.from({ length: 3 }, () => request('/pedidos', customer.token, checkout, 'POST', [200, 201])));
  assert.ok(purchases.every(row => row.data.id === purchases[0].data.id), 'Concurrent retry must produce the same order');
  assert.equal(await prisma.pedido.count({ where: { checkoutKey } }), 1);
  assert.equal((await prisma.produto.findUniqueOrThrow({ where: { id: product.id } })).estoque, 0);
  await request(`/pedidos/${purchases[0].data.id}/cancelar`, customer.token, {}, 'POST', [403]);
  for (let i = 0; i < 2; i++) await request(`/pedidos/${purchases[0].data.id}/cancelar`, admin.token, {});
  assert.equal((await prisma.produto.findUniqueOrThrow({ where: { id: product.id } })).estoque, 1);
  const service = (await request('/servicos', admin.token, { titulo: 'Diagnóstico local', descricao: 'Fixture only', preco: null, ativo: true, agendamento: true }, 'POST', [201])).data;
  const inicio = new Date(Date.now() + 86400000).toISOString();
  const fim = new Date(Date.now() + 90000000).toISOString();
  const slot = (await request('/agenda', admin.token, { servicoId: service.id, inicio, fim, capacidade: 1 }, 'POST', [201])).data;
  const reservation = { servicoId: service.id, horarioId: slot.id, aparelho: 'Fixture phone', problema: 'Test appointment only' };
  const bookings = await Promise.all([customer, other].map(client => request('/servicos/solicitacoes', client.token, { ...reservation, chaveIdempotencia: randomUUID() }, 'POST', [201, 409])));
  assert.deepEqual(bookings.map(row => row.status).sort(), [201, 409]);
  const booked = bookings.find(row => row.status === 201).data;
  await request(`/servicos/solicitacoes/${booked.id}/status`, admin.token, { status: 'CANCELADA', mensagem: 'Fixture cancellation' }, 'PATCH');
  assert.equal((await request(`/agenda?lojaId=${loja.id}&servicoId=${service.id}`)).data[0].vagas, 1);
  const key = createECDH('prime256v1'); key.generateKeys();
  const subscription = { endpoint: 'https://fcm.googleapis.com/local-fixture', keys: { p256dh: key.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
  await request('/push/web', customer.token, subscription, 'PUT', [403]);
  await request('/privacidade/preferencias', customer.token, { personalizacao: false, notificacoes: true, versaoAviso: '2026-10-12' }, 'PUT');
  await request('/push/web', customer.token, subscription, 'PUT');
  await request('/push/web', customer.token, { ...subscription, endpoint: 'https://fcm.googleapis.com/local-other-device' }, 'PUT');
  const metadata = (await request('/push/web', customer.token)).data;
  assert.equal(metadata.length, 2);
  assert.ok(metadata.every(row => !row.credenciais && !row.endpoint && !row.endpointHash));
  const exported = (await request('/privacidade/exportar', customer.token)).data;
  assert.equal(exported.assinaturasPush.length, 2);
  assert.ok(exported.assinaturasPush.every(row => !row.credenciais && !row.endpointHash && !row.endpoint));
  assert.deepEqual((await request('/privacidade/exportar', other.token)).data.assinaturasPush, []);
  const notice = await prisma.notificacaoCliente.create({ data: { lojaId: loja.id, clienteId: me.cliente.id, chaveEvento: randomUUID(), titulo: 'Fixture', mensagem: 'Fixture', destino: '/servicos', status: 'PROCESSANDO', expiresAt: new Date(Date.now() + 86400000) } });
  await prisma.entregaPush.createMany({ data: metadata.map((row, index) => ({ notificacaoId: notice.id, assinaturaId: row.id, status: index ? 'PROCESSANDO' : 'PENDENTE' })) });
  await request('/privacidade/preferencias', customer.token, { personalizacao: false, notificacoes: false, versaoAviso: '2026-10-12' }, 'PUT');
  assert.equal((await prisma.notificacaoCliente.findUniqueOrThrow({ where: { id: notice.id } })).status, 'CANCELADA');
  assert.ok((await prisma.entregaPush.findMany({ where: { notificacaoId: notice.id } })).every(row => row.status === 'CANCELADA'));
  assert.ok((await request('/push/web', customer.token)).data.every(row => !row.ativo));
  await request('/push/web', customer.token, subscription, 'PUT', [403]);
  await request('/privacidade/preferencias', customer.token, { personalizacao: false, notificacoes: true, versaoAviso: '2026-10-12' }, 'PUT');
  assert.equal((await prisma.notificacaoCliente.findUniqueOrThrow({ where: { id: notice.id } })).status, 'CANCELADA', 'Renewed consent must not resurrect cancelled work');
  await request('/auth/logout', other.token, { pushEndpoint: subscription.endpoint });
  assert.equal((await request('/push/web', customer.token)).data.length, 2);
  await request('/auth/logout', customer.token, { pushEndpoint: subscription.endpoint });
  await request('/auth/me', customer.token, null, 'GET', [401]);
  assert.equal(await prisma.assinaturaPush.count({ where: { clienteId: me.cliente.id } }), 1);
  const rotated = (await request('/auth/refresh', null, { plataforma: 'native', refreshToken: admin.refreshToken })).data;
  assert.notEqual(rotated.refreshToken, admin.refreshToken);
  await request('/auth/refresh', null, { plataforma: 'native', refreshToken: admin.refreshToken }, 'POST', [401]);
  await request('/auth/logout', rotated.token, {});
  await request('/auth/me', rotated.token, null, 'GET', [401]);
  console.log('Real HTTP/PostgreSQL: registration, roles, scoped catalog, checkout concurrency, cancellation, appointment capacity, consent, private push metadata, logout ownership and refresh rotation passed.');
} finally {
  if (api && api.exitCode === null) {
    const exited = once(api, 'exit'); api.kill(); await exited;
  }
  await prisma.$disconnect();
  const relative = path.relative(parent, root);
  assert.ok(relative.startsWith('http-') && !relative.includes(path.sep) && !path.isAbsolute(relative), 'Cleanup must stay inside the exclusive fixture directory');
  await rm(root, { recursive: true, force: true }); // Exclusive mkdtemp directory, never supplied by user.
}
