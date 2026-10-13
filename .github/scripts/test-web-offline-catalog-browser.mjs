import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const base = process.env.PANEL_BASE || 'http://127.0.0.1:3196';
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/loja')) return route.fulfill({ json: { id: 'fixture', config: {} } });
      if (path.endsWith('/produtos')) return route.fulfill({ json: [{ id: 'phone', lojaId: 'fixture', nome: 'Celular de demonstração', categoria: 'Celulares', preco: 999, estoque: 1, sub: '', imgUrl: '' }, { id: 'case', lojaId: 'fixture', nome: '<img src=x onerror="window.injected=true">', categoria: 'Acessórios', preco: 49, estoque: 1, sub: '', imgUrl: '' }] });
      return route.fulfill({ json: {} });
    });
    await page.goto(base);
    await page.waitForFunction(() => Boolean(localStorage.getItem('vox.public.catalog.v1')));
    await page.goto(`${base}/offline.html`);
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.goto(`${base}/offline.html`);
    await page.getByRole('heading', { name: 'Catálogo salvo' }).waitFor();
    await page.getByRole('heading', { name: 'Celular de demonstração' }).waitFor();
    assert.equal(await page.evaluate(() => Boolean(window.injected)), false);
    assert.equal(await page.getByRole('button', { name: /comprar|carrinho/i }).count(), 0);
    await page.getByLabel('Buscar no catálogo salvo').fill('acessórios');
    assert.equal(await page.getByRole('article').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('Actual service worker offline catalogue: cached page and module, search, safe text and no purchase controls passed at three widths.');
} finally { await browser.close(); }
