import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const base = process.env.PANEL_BASE ?? 'http://127.0.0.1:3196';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // Browser offline emulation may leave worker-owned requests connected.
  // Interrupt requests at the context layer too, including SW network fetches.
  let networkDown = false;
  await context.route('**/*', route => networkDown ? route.abort('internetdisconnected') : route.continue());
  const page = await context.newPage();
  await page.goto(base + '/instalar');
  await page.getByRole('heading', { name: 'A Vox na sua tela inicial' }).waitFor();
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, '/');
  for (const icon of manifest.icons) {
    const response = await page.request.get(base + icon.src);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'], /image\/png/);
  }
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.evaluate(async () => { await fetch('/api/ready'); });
  assert.deepEqual(await page.evaluate(async () => {
    const cache = await caches.open('vox-offline-v1');
    return (await cache.keys()).map(request => new URL(request.url).pathname).sort();
  }), ['/brand/icon-192.png', '/offline.html']);
  networkDown = true;
  await context.setOffline(true);
  await page.goto(base + '/area-cliente/pedidos');
  await page.getByRole('heading', { name: 'Vamos reconectar?' }).waitFor();
  await page.getByText('Nenhuma compra é confirmada sem conexão com a loja.').waitFor();
  assert.equal(await page.evaluate(async () => { try { await fetch('/api/ready'); return false; } catch { return true; } }), true);
  networkDown = false;
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await page.waitForURL('**/area-cliente/login');
  await context.close();
  console.log('PASS: PWA manifest/icons, registration, public-only cache, offline navigation, uncached API and reconnection.');
} finally { await browser.close(); }
