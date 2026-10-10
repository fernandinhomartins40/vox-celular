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
for (const volume of ['voxcelular_pgdata', 'voxcelular_uploads']) {
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
  image: { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOVsAAAAASUVORK5CYII=' },
} });
assert.equal((await fetch(base + product.imgUrl)).status, 200);
assert.equal((await json(`/api/produtos?lojaId=${loja.id}`))[0].id, product.id);

// Product improvements use the same real, isolated database as deployment verification.
const config = await json('/api/config', { method: 'PUT', token: admin.token, body: {
  lojaId: 'attempted-other-store', id: 'attempted-id', horarioSemana: 'CI hours',
} });
assert.equal(config.lojaId, loja.id, 'Config cannot change store ownership');
assert.notEqual(config.id, 'attempted-id');
assert.equal((await json('/api/loja')).config.horarioSemana, 'CI hours');
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
console.log('PASS: real migrations, idempotent bootstrap, auth/roles, product upload, dashboard, SPA, persistence, backup restore, DNS recovery and no OOM.');
