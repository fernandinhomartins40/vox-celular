import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const base = process.env.PANEL_BASE ?? 'http://127.0.0.1:3196';
// Disconnect the actual test origin: works for worker-owned requests too,
// without depending on browser-specific offline emulation.
let networkDown = false;
const origin = createServer(async (req, res) => {
  if (networkDown) { req.socket.destroy(); return; }
  try {
    const upstream = await fetch(base + req.url, { redirect: 'manual' });
    res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch { res.writeHead(503); res.end(); }
});
await new Promise(resolve => origin.listen(0, '127.0.0.1', resolve));
const testBase = `http://127.0.0.1:${origin.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(testBase + '/instalar');
  await page.getByRole('heading', { name: 'A Vox na sua tela inicial' }).waitFor();
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, '/');
  for (const icon of manifest.icons) {
    const response = await page.request.get(testBase + icon.src);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'], /image\/png/);
  }
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.evaluate(async () => { await fetch('/api/ready'); });
  assert.deepEqual(await page.evaluate(async () => {
    const names = (await caches.keys()).filter(name => name.startsWith('vox-offline-'));
    if (names.length !== 1) throw new Error('Expected one active public offline cache');
    const cache = await caches.open(names[0]);
    return (await cache.keys()).map(request => new URL(request.url).pathname).sort();
  }), ['/brand/icon-192.png', '/offline-catalog.js', '/offline-guides.js', '/offline.html']);
  networkDown = true;
  await page.goto(testBase + '/area-cliente/pedidos');
  try { await page.getByRole('heading', { name: 'Vamos reconectar?' }).waitFor(); }
  catch (error) {
    console.error('Offline navigation diagnostics:', { url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1000) });
    throw error;
  }
  await page.getByText('Nenhuma compra é confirmada sem conexão com a loja.').waitFor();
  assert.equal(await page.evaluate(async () => { try { await fetch('/api/ready'); return false; } catch { return true; } }), true);
  networkDown = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await page.waitForURL('**/area-cliente/login');
  await context.close();
  console.log('PASS: PWA manifest/icons, registration, public-only cache, offline navigation, uncached API and reconnection.');
} finally {
  await browser.close();
  origin.closeAllConnections();
  await new Promise(resolve => origin.close(resolve));
}
