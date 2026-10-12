import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

// This script writes only to a disposable CI/local Docker project. Never run on VPS.
const env = { ...process.env, ADMIN_EMAIL: 'ci-admin@example.com', ADMIN_PASSWORD: 'ci-admin-password-only-123' };
const docker = (args, input) => execFileSync('docker', args, { env, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] });
const compose = (...args) => docker(['compose', ...args]);
const sql = (query) => docker(['exec', '-i', 'vox_db', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'vox', '-d', 'voxcelular', '-tA'], query).trim();
const base = `http://127.0.0.1:${env.DEPLOY_PORT || 3196}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function json(path, { token, body, method = 'GET', status = 200 } = {}) {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, status, `${method} ${path}`);
  return response.json();
}

assert.equal(docker(['ps', '-aq', '--filter', 'name=^/?vox_']).trim(), '', 'Refuse to touch existing Vox containers');
for (const volume of ['voxcelular_pgdata', 'voxcelular_uploads', 'voxcelular_secrets']) {
  assert.equal(docker(['volume', 'ls', '-q', '--filter', `name=^${volume}$`]).trim(), '', 'Refuse existing persistent volumes');
}
compose('up', '-d', '--no-build', '--wait', '--wait-timeout', '120', 'db');
compose('--profile', 'tools', 'run', '--rm', '--no-deps', 'migrate');
const bootstrap = () => compose('--profile', 'tools', 'run', '--rm', '--no-deps', '-e', 'ADMIN_EMAIL', '-e', 'ADMIN_PASSWORD', 'migrate', 'node', 'dist/bootstrap.js');
bootstrap();
const original = sql('SELECT id FROM "Loja";');
bootstrap();
assert.equal(sql('SELECT id FROM "Loja";'), original, 'Bootstrap must preserve existing store');
compose('--profile', 'tools', 'run', '--rm', '--no-deps', 'migrate');
compose('up', '-d', '--no-build', '--wait', '--wait-timeout', '180', 'api', 'web');
assert.deepEqual(await json('/api/ready'), { ok: true });
const spa = await fetch(base + '/admin/login');
assert.equal(spa.status, 200);
assert.equal(spa.headers.get('x-frame-options'), 'SAMEORIGIN');
assert.equal(spa.headers.get('x-content-type-options'), 'nosniff');
assert.match(await spa.text(), /<!doctype html>/i);
assert.equal((await fetch(base + '/assets/missing-file.js')).status, 404);
const unauthorized = await fetch(base + '/api/dashboard');
assert.equal(unauthorized.status, 401);
const admin = await json('/api/auth/login', { method: 'POST', body: { email: env.ADMIN_EMAIL, senha: env.ADMIN_PASSWORD } });
const loja = await json('/api/loja');
const testSeed = (password) => compose('--profile', 'tools', 'run', '--rm', '--no-deps', '-e', 'ALLOW_TEST_ADMIN_SEED=true',
  '-e', 'TEST_ADMIN_PASSWORD=' + password, 'migrate', 'node', 'dist/seed.js');
const userCount = sql('SELECT count(*) FROM "Usuario";');
testSeed('ci-test-operator-password');
testSeed('ci-second-password-preserved');
assert.equal(Number(sql('SELECT count(*) FROM "Usuario";')), Number(userCount) + 1);
assert.equal(sql('SELECT id FROM "Loja";'), loja.id);
const testOperator = await json('/api/auth/login', { method: 'POST', body: { email: 'teste.lojista@voxcelular.com.br', senha: 'ci-test-operator-password' } });
assert.equal(testOperator.user.role, 'LOJISTA');
await json('/api/auth/senha', { token: testOperator.token, method: 'PATCH', status: 400, body: { senhaAtual: 'wrong', novaSenha: 'ci-new-test-password' } });
await json('/api/auth/senha', { token: testOperator.token, method: 'PATCH', body: { senhaAtual: 'ci-test-operator-password', novaSenha: 'ci-new-test-password' } });
await json('/api/auth/login', { method: 'POST', status: 401, body: { email: testOperator.user.email, senha: 'ci-test-operator-password' } });
await json('/api/auth/login', { method: 'POST', body: { email: testOperator.user.email, senha: 'ci-new-test-password' } });
const customer = await json('/api/auth/register', { method: 'POST', status: 201, body: {
  nome: 'CI Customer', email: 'ci-customer@example.com', senha: 'ci-customer-password', lojaId: loja.id,
} });
const me = await json('/api/auth/me', { token: customer.token });
assert.ok(me.cliente.id);
assert.match(loja.id, /^[a-z0-9]+$/);
assert.match(me.cliente.id, /^[a-z0-9]+$/);
await json('/api/dashboard', { token: customer.token, status: 403 });
const product = await json('/api/produtos', { method: 'POST', token: admin.token, status: 201, body: {
  nome: 'CI product', sub: 'Integration', categoria: 'Acessórios', preco: 10.25,
  descricao: 'Real database and persistent upload test', estoque: 20,
  image: { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAGUlEQVQokWMQstpDEmIY1WA1GkpCwzVpAACwrQgQ1m/4jwAAAABJRU5ErkJggg==' },
} });
assert.equal((await fetch(base + product.imgUrl)).status, 200);
const savedPhoto = await fetch(base + product.imgUrl);
assert.match(savedPhoto.headers.get('content-type'), /image\/webp/);
assert.match(savedPhoto.headers.get('cache-control'), /immutable/);
const landingPhoto = { dataUrl: 'data:image/webp;base64,' + Buffer.from(await savedPhoto.arrayBuffer()).toString('base64'), profile: 'category' };
const landingOne = await json('/api/config/image', { method: 'POST', token: admin.token, status: 201, body: landingPhoto });
const landingTwo = await json('/api/config/image', { method: 'POST', token: admin.token, status: 201, body: landingPhoto });
assert.equal(landingOne.url, landingTwo.url, 'Repeated landing images must reuse stored file');
await json('/api/config/image', { method: 'POST', token: admin.token, status: 400, body: { ...landingPhoto, profile: 'unbounded' } });
assert.equal((await json(`/api/produtos?lojaId=${loja.id}`))[0].id, product.id);

// Product improvements use the same real, isolated database as deployment verification.
const config = await json('/api/config', { method: 'PUT', token: admin.token, body: {
  lojaId: 'attempted-other-store', id: 'attempted-id', horarioSemana: 'CI hours',
} });
assert.equal(config.lojaId, loja.id, 'Config cannot change store ownership');
assert.notEqual(config.id, 'attempted-id');
assert.equal((await json('/api/loja')).config.horarioSemana, 'CI hours');
await json('/api/config', { method: 'PUT', token: customer.token, status: 403, body: { landingPage: { hero: { title: 'Forbidden' } } } });
await json('/api/config', { method: 'PUT', token: admin.token, status: 400, body: { landingPage: { hero: { image: 'javascript:alert(1)' } } } });
await json('/api/config', { method: 'PUT', token: admin.token, status: 400, body: { landingPage: { testimonials: { items: [{ nome: 'Broken' }] } } } });
await json('/api/config/image', { method: 'POST', token: customer.token, status: 403, body: { dataUrl: 'data:image/webp;base64,AAAA' } });
await json('/api/config/image', { method: 'POST', token: admin.token, status: 400, body: { dataUrl: 'data:image/webp;base64,AAAA' } });
const editorContent = { hero: { title: 'CI persisted hero' }, footer: { description: 'CI persisted footer' } };
await json('/api/config', { method: 'PUT', token: admin.token, body: { landingPage: editorContent } });
assert.deepEqual((await json('/api/loja')).config.landingPage, editorContent);
sql(`UPDATE "Cliente" SET pontos=100 WHERE id='${me.cliente.id}';
 INSERT INTO "RecompensaCatalogo" (id,"lojaId",titulo,pontos,ativo) VALUES
 ('ci-reward','${loja.id}','CI reward',100,true),
 ('ci-inactive','${loja.id}','CI inactive',1,false);
 INSERT INTO "Loja" (id,nome,telefone,endereco,cidade,"mapsUrl") VALUES ('ci-other-store','CI other','','','','');
 INSERT INTO "RecompensaCatalogo" (id,"lojaId",titulo,pontos,ativo) VALUES ('ci-foreign','ci-other-store','Other',1,true);`);
await json('/api/fidelidade/resgatar/ci-inactive', { method: 'POST', token: customer.token, body: {}, status: 404 });
await json('/api/fidelidade/resgatar/ci-foreign', { method: 'POST', token: customer.token, body: {}, status: 404 });
const redemptions = await Promise.all(Array.from({ length: 6 }, () => fetch(base + '/api/fidelidade/resgatar/ci-reward', {
  method: 'POST', headers: { Authorization: `Bearer ${customer.token}`, 'Content-Type': 'application/json' }, body: '{}',
})));
assert.deepEqual(redemptions.map(r => r.status).sort(), [200, 400, 400, 400, 400, 400]);
const savedPoints = await json('/api/fidelidade/pontos', { token: customer.token });
assert.equal(savedPoints.saldo, 0);
assert.equal(savedPoints.resgates.length, 1, 'Receipt can be recovered after closing/reloading');
assert.equal(savedPoints.resgates[0].recompensa.titulo, savedPoints.recompensas.find(r => r.id === 'ci-reward').titulo);
assert.match(savedPoints.resgates[0].codigo, /^VOX-/);
const otherCustomer = await json('/api/auth/register', { method: 'POST', status: 201, body: {
  nome: 'CI Isolated Customer', email: 'ci-isolated@example.com', senha: 'ci-isolated-password', lojaId: loja.id,
} });
assert.deepEqual((await json('/api/fidelidade/pontos', { token: otherCustomer.token })).resgates, [], 'Other customers cannot see reward codes');
assert.equal(sql(`SELECT count(*) FROM "ResgateRecompensa" WHERE "clienteId"='${me.cliente.id}';`), '1');
const invalidImage = await json(`/api/produtos/${product.id}`, { method: 'PATCH', token: admin.token, status: 400,
  body: { image: { dataUrl: 'data:image/gif;base64,AAAA' } } });
assert.ok(invalidImage.error);
assert.equal((await fetch(base + product.imgUrl)).status, 200, 'Invalid replacement must preserve previous photo');

// Known fixture, equivalent sums, no mocks. Exercise dashboard bounded aggregation.
sql(`INSERT INTO "Pedido" (id,"lojaId","clienteId",codigo,pagamento,total,"updatedAt")
 SELECT 'ci-order-' || n, '${loja.id}', '${me.cliente.id}', 'CI-' || n, 'PIX', 10.25, NOW()
 FROM generate_series(1,2000) AS n;`);
sql(`INSERT INTO "TimelinePedido" (id,"pedidoId",status,data,ok,ordem) VALUES
 ('ci-timeline-1','ci-order-1','Pedido recebido','2020-01-01',true,0),
 ('ci-timeline-2','ci-order-1','Em preparo',NULL,false,1);`);
const progressed = await json('/api/pedidos/ci-order-1/status', { method: 'PATCH', token: admin.token, body: { status: 'EM_PREPARO' } });
assert.equal(progressed.timeline[0].data, '2020-01-01T00:00:00.000Z');
assert.equal(progressed.timeline[1].ok, true);
const repeated = await json('/api/pedidos/ci-order-1/status', { method: 'PATCH', token: admin.token, body: { status: 'EM_PREPARO' } });
assert.equal(repeated.timeline[1].data, progressed.timeline[1].data);
await json('/api/pedidos/ci-order-1/status', { method: 'PATCH', token: admin.token, status: 409, body: { status: 'PRONTO', expectedStatus: 'NOVO' } });
assert.equal((await json('/api/pedidos?status=EM_PREPARO', { token: admin.token })).length, 1, 'Stale action leaves the actual order unchanged');
await json('/api/pedidos?status=invalid', { token: admin.token, status: 400 });
assert.equal((await json(`/api/pedidos?cliente=${me.cliente.id}`, { token: admin.token })).length, 2000);
assert.deepEqual(await json('/api/pedidos?cliente=not-this-store', { token: admin.token }), []);
assert.deepEqual(await json('/api/pedidos/meus', { token: otherCustomer.token }), []);
const ownHistory = (await json('/api/clientes', { token: admin.token })).find(c => c.id === me.cliente.id).historicoPedidos;
assert.equal(ownHistory.length, 2000);
assert(ownHistory.every(p => p.codigo.startsWith('CI-')), 'Customer links receive the real order code');
const before = performance.now();
const results = await Promise.all(Array.from({ length: 12 }, () => json('/api/dashboard', { token: admin.token })));
for (const result of results) {
  assert.equal(result.pedidosMes, 2000);
  assert.equal(result.faturamentoMes, 20500);
  assert.equal(result.ticketMedio, 10);
}
console.log(`MEASURED CI dashboard: 12 concurrent requests, 2000 orders, ${(performance.now() - before).toFixed(0)} ms total`);
console.log(docker(['stats', '--no-stream', '--format', '{{.Name}} {{.CPUPerc}} {{.MemUsage}}', 'vox_db', 'vox_api', 'vox_web']));
assert.equal(sql("SELECT count(*) FROM pg_stat_activity WHERE application_name <> 'psql' AND datname='voxcelular';") <= 5, true);

// Recreate only the API: DB and uploaded file must persist; DNS must recover.
compose('up', '-d', '--no-build', '--force-recreate', '--wait', '--wait-timeout', '120', 'api');
let recovered = false;
for (let n = 0; n < 15; n++) {
  try { assert.equal((await fetch(base + product.imgUrl)).status, 200); recovered = true; break; }
  catch { await sleep(1000); }
}
assert.ok(recovered, 'Upload and proxy DNS recover after API replacement');
assert.equal((await json('/api/dashboard', { token: admin.token })).faturamentoMes, 20500);
const dump = docker(['exec', 'vox_db', 'pg_dump', '-U', 'vox', '-d', 'voxcelular', '--schema-only']);
assert.match(dump, /Pedido_lojaId_createdAt_idx/);
// Restore a real binary dump into a separate disposable database.
const archive = execFileSync('docker', ['exec', 'vox_db', 'pg_dump', '-U', 'vox', '-d', 'voxcelular', '-Fc'], { env });
docker(['exec', 'vox_db', 'createdb', '-U', 'vox', 'vox_restore_ci']);
execFileSync('docker', ['exec', '-i', 'vox_db', 'pg_restore', '-U', 'vox', '-d', 'vox_restore_ci', '--exit-on-error'], { env, input: archive });
assert.equal(docker(['exec', 'vox_db', 'psql', '-U', 'vox', '-d', 'vox_restore_ci', '-tAc', 'SELECT count(*) FROM "Pedido"']).trim(), '2000');
for (const name of ['vox_db', 'vox_api', 'vox_web']) {
  assert.equal(docker(['inspect', name, '--format', '{{.State.OOMKilled}}']).trim(), 'false');
}
// Exercise the demo batch in its own tenant; business/browser fixtures stay untouched.
sql(`INSERT INTO "Loja" (id,nome,telefone,endereco,cidade,"mapsUrl","createdAt") VALUES ('ci-demo-store','CI demo','','','Palmital','',NOW());`);
const demoSeed = password => compose('--profile', 'tools', 'run', '--rm', '--no-deps', '-e', 'ALLOW_DEMO_SEED=true', '-e', 'DEMO_STORE_ID=ci-demo-store', '-e', 'TEST_CUSTOMER_PASSWORD=' + password, 'migrate', 'node', 'dist/seed-demo.js');
demoSeed('ci-demo-customer-password');
assert.equal(sql(`SELECT count(*) FROM "Produto" WHERE "lojaId"='ci-demo-store'`), '32');
assert.equal(sql(`SELECT count(*) FROM "Cliente" WHERE "lojaId"='ci-demo-store'`), '30');
assert.equal(sql(`SELECT count(*) FROM "Pedido" WHERE "lojaId"='ci-demo-store'`), '90');
assert.equal(sql(`SELECT count(*) FROM "Promocao" WHERE "lojaId"='ci-demo-store'`), '12');
assert.equal(sql(`SELECT count(*) FROM "RecompensaCatalogo" WHERE "lojaId"='ci-demo-store'`), '8');
assert.equal(sql(`SELECT count(*) FROM "Produto" WHERE "lojaId"='ci-demo-store' AND ativo`), '0');
assert.equal(sql(`SELECT count(*) FROM "Pedido" p WHERE p."lojaId"='ci-demo-store' AND p.total <> (SELECT sum(i.qty*i.preco) FROM "ItemPedido" i WHERE i."pedidoId"=p.id)`), '0');
assert.equal(sql(`SELECT count(*) FROM "Cliente" c WHERE c."lojaId"='ci-demo-store' AND c.pontos <> (SELECT sum(h.pontos) FROM "HistoricoPontos" h WHERE h."clienteId"=c.id)`), '0');
sql(`UPDATE "Produto" SET estoque=123 WHERE id='vox-demo-v1-ci-demo-store-produto-0';`);
demoSeed('ci-another-password-preserved');
assert.equal(sql(`SELECT estoque FROM "Produto" WHERE id='vox-demo-v1-ci-demo-store-produto-0'`), '123');
assert.equal(sql(`SELECT count(*) FROM "Pedido" WHERE "lojaId"='ci-demo-store'`), '90');
const demoLogin = await json('/api/auth/login', { method: 'POST', body: { email: 'teste.cliente@voxcelular.example', senha: 'ci-demo-customer-password' } });
assert.equal(demoLogin.user.role, 'CLIENTE');
assert.equal((await json('/api/pedidos/meus', { token: demoLogin.token })).length, 3);
assert.equal((await json('/api/fidelidade/pontos', { token: demoLogin.token })).saldo, 150);
const present = () => compose('--profile', 'tools', 'run', '--rm', '--no-deps', '-e', 'ALLOW_PRESENTATION_SEED=true', '-e', 'DEMO_STORE_ID=ci-demo-store', 'migrate', 'node', 'dist/seed-presentation.js');
present();
assert.equal(sql(`SELECT count(*) FROM "Produto" WHERE "lojaId"='ci-demo-store' AND ativo AND "imgUrl" LIKE '/uploads/catalogo/%' AND nome NOT LIKE '[TESTE]%'`), '32');
assert.equal(sql(`SELECT estoque FROM "Produto" WHERE id='vox-demo-v1-ci-demo-store-produto-0'`), '123');
const pictures = await json('/api/produtos?lojaId=ci-demo-store');
assert.equal(pictures.length, 32);
assert.equal((await fetch(base + pictures[0].imgUrl)).status, 200);
sql(`UPDATE "Produto" SET ativo=false, nome='Edited catalog name' WHERE id='vox-demo-v1-ci-demo-store-produto-0';`);
present(); demoSeed('ci-another-password-preserved');
assert.equal(sql(`SELECT nome FROM "Produto" WHERE id='vox-demo-v1-ci-demo-store-produto-0'`), 'Edited catalog name');
assert.equal(sql(`SELECT count(*) FROM "Pedido" WHERE "lojaId"='ci-demo-store'`), '90');
// Checkout writes only to this disposable CI store, never to production.
const checkoutProduct = 'vox-demo-v1-ci-demo-store-produto-1';
sql(`UPDATE "Produto" SET estoque=1, ativo=true WHERE id='${checkoutProduct}';`);
const checkoutBody = { checkoutKey: '39ad53a0-a649-4e70-8e15-5e455841ef06', itens: [{ produtoId: checkoutProduct, qty: 1 }] };
const purchases = await Promise.all(Array.from({ length: 2 }, () => json('/api/pedidos', { method: 'POST', token: demoLogin.token, body: checkoutBody, status: 201 })));
assert.equal(purchases[0].id, purchases[1].id, 'Concurrent retries return the same persisted order');
assert.equal(sql(`SELECT estoque FROM "Produto" WHERE id='${checkoutProduct}'`), '0');
assert.equal(purchases[0].pagamento, 'Aguardando confirmação');
await json('/api/pedidos', { method: 'POST', token: demoLogin.token, body: { ...checkoutBody, checkoutKey: '7a0a3ac4-7514-4250-8ad7-d2b2be969a99' }, status: 409 });
assert.equal(sql(`SELECT count(*) FROM "Pedido" WHERE "checkoutKey"='${checkoutBody.checkoutKey}'`), '1');
await json(`/api/pedidos/${purchases[0].id}/cancelar`, { method: 'POST', token: demoLogin.token, body: {}, status: 403 });
await json(`/api/pedidos/${purchases[0].id}/cancelar`, { method: 'POST', token: admin.token, body: {}, status: 404 });
sql(`INSERT INTO "Usuario" (id, "lojaId", nome, email, "senhaHash", role, "updatedAt") SELECT 'ci-demo-merchant', 'ci-demo-store', 'CI merchant', 'ci-demo-merchant@example.test', "senhaHash", 'LOJISTA', NOW() FROM "Usuario" WHERE email='ci-admin@example.com';`);
const demoMerchant = await json('/api/auth/login', { method: 'POST', body: { email: 'ci-demo-merchant@example.test', senha: env.ADMIN_PASSWORD, lojaId: 'ci-demo-store' } });
for (let i = 0; i < 2; i++) await json(`/api/pedidos/${purchases[0].id}/cancelar`, { method: 'POST', token: demoMerchant.token, body: {} });
assert.equal(sql(`SELECT estoque FROM "Produto" WHERE id='${checkoutProduct}'`), '1', 'Cancellation releases inventory exactly once');
await json(`/api/pedidos/${purchases[0].id}/status`, { method: 'PATCH', token: demoMerchant.token, body: { status: 'EM_PREPARO', expectedStatus: 'NOVO' }, status: 409 });
await json('/api/auth/senha', { method: 'PATCH', token: demoLogin.token, body: { senhaAtual: 'ci-demo-customer-password', novaSenha: 'ci-revoked-password-123' } });
await json('/api/auth/me', { token: demoLogin.token, status: 401 });
const renewed = await json('/api/auth/login', { method: 'POST', body: { email: 'teste.cliente@voxcelular.example', senha: 'ci-revoked-password-123', lojaId: 'ci-demo-store' } });
assert.equal((await json('/api/auth/me', { token: renewed.token })).id, demoLogin.user.id);
console.log('PASS: real migrations, checkout concurrency/idempotency, stock availability, password revocation, bootstrap/demo, auth/roles, upload, dashboard, persistence, backup restore and no OOM.');

await json('/api/integracoes', { token: renewed.token, status: 403 });
const integrationCatalog = await json('/api/integracoes', { token: admin.token });
assert.equal(integrationCatalog.canais.length, 7);
const secretFixture = 'ci-private-marketplace-token-not-a-real-credential';
await json('/api/integracoes/mercadolivre', { method: 'PUT', token: admin.token, body: { ambiente: 'homologacao', credenciais: { accessToken: secretFixture, clientId: 'ci-app' } } });
assert.ok(!sql('SELECT credenciais FROM "IntegracaoMarketplace";').includes(secretFixture), 'Database must contain authenticated ciphertext only');
await json('/api/integracoes/mercadolivre', { method: 'PUT', token: admin.token, body: { ambiente: 'homologacao', credenciais: { accessToken: '', clientSecret: 'ci-secret' } } });
const savedCredentials = await json('/api/integracoes', { token: admin.token });
assert.deepEqual(savedCredentials.conexoes[0].campos.sort(), ['accessToken','clientId','clientSecret'].sort());
assert.ok(!JSON.stringify(savedCredentials).includes(secretFixture));
assert.equal((await json('/api/integracoes', { token: demoMerchant.token })).conexoes.length, 0);
assert.ok(!JSON.stringify(await json('/api/loja')).includes(secretFixture));
compose('restart', 'api');
for (let i = 0; i < 30; i++) { try { if ((await fetch(base + '/api/ready')).ok) break; } catch {} await sleep(1000); }
await json('/api/integracoes/mercadolivre', { method: 'PUT', token: admin.token, body: { ambiente: 'homologacao', credenciais: { clientSecret: 'updated-after-restart' } } });
// A missing key must never silently replace the key for existing ciphertext.
const ciphertextBeforeKeyLoss = sql('SELECT credenciais FROM "IntegracaoMarketplace";');
docker(['exec', 'vox_api', 'node', '-e', "require('node:fs').renameSync('/app/secrets/marketplace.key','/app/secrets/marketplace.key.ci-backup')"]);
compose('restart', 'api');
for (let i = 0; i < 30; i++) { try { if ((await fetch(base + '/api/ready')).ok) break; } catch {} await sleep(1000); }
const lostKey = await json('/api/integracoes/mercadolivre', { method: 'PUT', token: admin.token, body: { ambiente: 'homologacao', credenciais: { clientSecret: 'must-not-overwrite' } }, status: 400 });
assert.match(lostKey.error, /backup do cofre/);
assert.equal(sql('SELECT credenciais FROM "IntegracaoMarketplace";'), ciphertextBeforeKeyLoss);
assert.equal(docker(['exec', 'vox_api', 'node', '-e', "process.stdout.write(String(require('node:fs').existsSync('/app/secrets/marketplace.key')))"]).trim(), 'false');
docker(['exec', 'vox_api', 'node', '-e', "require('node:fs').renameSync('/app/secrets/marketplace.key.ci-backup','/app/secrets/marketplace.key')"]);
compose('restart', 'api');
for (let i = 0; i < 30; i++) { try { if ((await fetch(base + '/api/ready')).ok) break; } catch {} await sleep(1000); }
await json('/api/integracoes/mercadolivre', { method: 'PUT', token: admin.token, body: { ambiente: 'homologacao', credenciais: { clientSecret: 'restored-key-works' } } });
await json('/api/integracoes/mercadolivre', { method: 'DELETE', token: demoMerchant.token });
assert.equal((await json('/api/integracoes', { token: admin.token })).conexoes.length, 1);
await json('/api/integracoes/mercadolivre', { method: 'DELETE', token: admin.token });
assert.equal((await json('/api/integracoes', { token: admin.token })).conexoes.length, 0);
console.log('PASS: marketplace credential encryption, masked metadata, tenant isolation, secret-volume persistence and removal; no external requests.');

// Favorites are account/tenant scoped and never reserve stock.
await json('/api/favoritos', { status: 401 });
await json('/api/favoritos', { token: admin.token, status: 403 });
const favoriteProduct = 'vox-demo-v1-ci-demo-store-produto-1';
const stockBeforeFavorite = sql(`SELECT estoque FROM "Produto" WHERE id='${favoriteProduct}'`);
for (let i = 0; i < 2; i++) await json(`/api/favoritos/${favoriteProduct}`, { method: 'PUT', token: renewed.token, body: {} });
assert.equal(sql(`SELECT count(*) FROM "Favorito" WHERE "produtoId"='${favoriteProduct}'`), '1');
assert.equal(sql(`SELECT estoque FROM "Produto" WHERE id='${favoriteProduct}'`), stockBeforeFavorite);
const favorites = await json('/api/favoritos', { token: renewed.token });
assert.equal(favorites.length, 1);
assert.equal(favorites[0].id, favoriteProduct);
assert.equal(typeof favorites[0].preco, 'number');
await json(`/api/favoritos/${product.id}`, { method: 'PUT', token: renewed.token, body: {}, status: 404 });
sql(`UPDATE "Produto" SET ativo=false WHERE id='${favoriteProduct}'`);
assert.equal((await json('/api/favoritos', { token: renewed.token })).length, 0);
sql(`UPDATE "Produto" SET ativo=true WHERE id='${favoriteProduct}'`);
for (let i = 0; i < 2; i++) await json(`/api/favoritos/${favoriteProduct}`, { method: 'DELETE', token: renewed.token });
assert.equal((await json('/api/favoritos', { token: renewed.token })).length, 0);
console.log('PASS: favorites authentication, idempotency, tenant isolation, current prices, hidden products and no inventory side effects.');

const sessionLogin = await json('/api/auth/login', { method: 'POST', body: { email: env.ADMIN_EMAIL, senha: env.ADMIN_PASSWORD, plataforma: 'native' } });
assert.ok(sessionLogin.refreshToken);
assert.ok(!sql('SELECT token FROM "Sessao";').includes(sessionLogin.refreshToken), 'Refresh secrets are stored only as hashes');
const claims = JSON.parse(Buffer.from(sessionLogin.token.split('.')[1], 'base64url'));
assert.equal(claims.exp - claims.iat, 900);
const rotated = await json('/api/auth/refresh', { method: 'POST', body: { plataforma: 'native', refreshToken: sessionLogin.refreshToken } });
const sessionList = await json('/api/auth/sessoes', { token: rotated.token });
assert.ok(sessionList.some(row => row.atual));
assert.ok(!JSON.stringify(sessionList).includes('token'));
await json(`/api/auth/sessoes/${sessionList.find(row => row.atual).id}`, { method: 'DELETE', token: rotated.token, status: 409 });
const anotherSession = await json('/api/auth/login', { method: 'POST', body: { email: env.ADMIN_EMAIL, senha: env.ADMIN_PASSWORD, plataforma: 'native' } });
const anotherClaims = JSON.parse(Buffer.from(anotherSession.token.split('.')[1], 'base64url'));
await json(`/api/auth/sessoes/${anotherClaims.sessionId}`, { method: 'DELETE', token: renewed.token });
await json('/api/auth/me', { token: anotherSession.token });
await json(`/api/auth/sessoes/${anotherClaims.sessionId}`, { method: 'DELETE', token: rotated.token });
await json('/api/auth/me', { token: anotherSession.token, status: 401 });
assert.notEqual(rotated.refreshToken, sessionLogin.refreshToken);
await json('/api/auth/refresh', { method: 'POST', body: { plataforma: 'native', refreshToken: sessionLogin.refreshToken }, status: 401 });
await json('/api/auth/me', { token: rotated.token });
await json('/api/auth/logout', { method: 'POST', token: rotated.token, body: {} });
await json('/api/auth/me', { token: rotated.token, status: 401 });
await json('/api/auth/refresh', { method: 'POST', body: { plataforma: 'native', refreshToken: rotated.refreshToken }, status: 401 });
await json('/api/auth/refresh', { method: 'POST', body: {}, status: 403 });
const webLoginResponse = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: env.CORS_ORIGIN }, body: JSON.stringify({ email: env.ADMIN_EMAIL, senha: env.ADMIN_PASSWORD, plataforma: 'web' }) });
assert.equal(webLoginResponse.status, 200);
const webCookie = webLoginResponse.headers.get('set-cookie');
assert.match(webCookie, /HttpOnly/);
assert.match(webCookie, /SameSite=Strict/);
const webLogin = await webLoginResponse.json();
assert.equal(webLogin.refreshToken, undefined);
const webRefreshResponse = await fetch(base + '/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: env.CORS_ORIGIN, Cookie: webCookie.split(';')[0] }, body: '{}' });
assert.equal(webRefreshResponse.status, 200);
assert.ok(webRefreshResponse.headers.get('set-cookie'));
console.log('PASS: short access tokens, hashed rotating refresh, replay rejection, logout revocation, web HttpOnly cookie and origin enforcement.');

await json(`/api/produtos/${product.id}`, { method: 'PATCH', token: admin.token, body: { atributosTecnicos: { verificado: true } }, status: 400 });
const technicalProduct = await json(`/api/produtos/${product.id}`, { method: 'PATCH', token: admin.token, body: { atributosTecnicos: { tipo: 'celular', marca: 'CI brand', modelo: 'CI model', ramGB: 8, fonte: 'https://example.com/ci-specification', verificado: true } } });
assert.equal(technicalProduct.atributosTecnicos.ramGB, 8);
assert.ok(technicalProduct.atributosVerificadosEm);
assert.equal((await json(`/api/produtos?lojaId=${loja.id}`)).find(p => p.id === product.id).atributosTecnicos.modelo, 'CI model');
const uncheckedProduct = await json(`/api/produtos/${product.id}`, { method: 'PATCH', token: admin.token, body: { atributosTecnicos: { tipo: 'celular', verificado: false } } });
assert.equal(uncheckedProduct.atributosVerificadosEm, null);
console.log('PASS: real catalog attribute persistence, public serialization, source requirement and verification timestamp.');

await json('/api/privacidade/exportar', { status: 401 });
await json('/api/privacidade/exportar', { token: admin.token, status: 403 });
const personalExport = await json('/api/privacidade/exportar', { token: renewed.token });
assert.equal(personalExport.perfil.usuario.email, 'teste.cliente@voxcelular.example');
assert.equal(personalExport.pedidos.length, 4);
assert.equal(personalExport.pedidos.map(order => order.id).sort().join(','), sql(`SELECT string_agg(id, ',' ORDER BY id) FROM "Pedido" WHERE "clienteId"='${personalExport.perfil.id}'`));
assert.ok(!JSON.stringify(personalExport).includes('senhaHash'));
assert.ok(!JSON.stringify(personalExport).includes('refreshToken'));
assert.ok(!JSON.stringify(personalExport).includes('ci-admin@example.com'));
assert.ok(personalExport.historicoPontos.length > 0);
console.log('PASS: personal-data export authentication, customer-only scope, own orders/history and no password or session secrets.');

await json('/api/privacidade/preferencias', { token: admin.token, status: 403 });
const initialPreferences = await json('/api/privacidade/preferencias', { token: renewed.token });
assert.equal(initialPreferences.personalizacao, false);
assert.equal(initialPreferences.notificacoes, false);
const preferenceChoice = { personalizacao: true, notificacoes: true, versaoAviso: initialPreferences.versaoAviso };
for (let i = 0; i < 2; i++) await json('/api/privacidade/preferencias', { method: 'PUT', token: renewed.token, body: preferenceChoice });
assert.equal(sql(`SELECT count(*) FROM "ConsentimentoCliente" WHERE "clienteId"='${personalExport.perfil.id}'`), '1');
await json('/api/privacidade/preferencias', { method: 'PUT', token: renewed.token, body: { ...preferenceChoice, personalizacao: false, notificacoes: false } });
assert.equal((await json('/api/privacidade/preferencias', { token: renewed.token })).notificacoes, false);
assert.equal((await json('/api/privacidade/exportar', { token: renewed.token })).consentimentos.length, 2);
await json('/api/privacidade/preferencias', { method: 'PUT', token: renewed.token, body: { ...preferenceChoice, versaoAviso: 'unknown-version' }, status: 400 });
console.log('PASS: default-denied preferences, customer authorization, consent version, idempotent audit trail, withdrawal and own-data export.');
