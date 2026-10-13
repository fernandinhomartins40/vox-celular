import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
let version = 1;
const upstream = process.env.PANEL_BASE || 'http://127.0.0.1:3196';
const server = createServer(async (req, res) => {
  try {
    const response = await fetch(upstream + req.url);
    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, { 'content-type': response.headers.get('content-type') || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(req.url === '/sw.js' ? Buffer.concat([body, Buffer.from(`\n// Browser test revision ${version}\n`)]) : body);
  } catch { res.writeHead(503); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/instalar');
  await page.evaluate(() => navigator.serviceWorker.ready);
  assert.equal(await page.getByText('Uma nova versão está disponível', { exact: true }).count(), 0);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const tab = await context.newPage(); await tab.goto(base + '/instalar');
  await page.evaluate(() => { window.__updateMarker = 'unchanged'; });
  version = 2;
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/')).update());
  await page.getByText('Uma nova versão está disponível', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__updateMarker), 'unchanged', 'Update must not reload active page');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole('button', { name: 'Dispensar aviso de atualização' }).click();
  assert.equal(await page.getByText('Uma nova versão está disponível', { exact: true }).count(), 0);
  assert.equal(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration('/')).waiting), true);
  await page.close(); await tab.close();
  const reopened = await context.newPage(); await reopened.goto(base + '/instalar');
  await reopened.waitForFunction(async () => !(await navigator.serviceWorker.getRegistration('/'))?.waiting);
  assert.equal(await reopened.getByText('Uma nova versão está disponível', { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('Real service worker: first install, waiting update, dismiss without reload and activation after closing tabs passed.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
