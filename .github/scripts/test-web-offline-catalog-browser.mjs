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
    const now = Date.now();
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/loja')) return route.fulfill({ json: { id: 'fixture', config: {} } });
      if (path.endsWith('/produtos')) return route.fulfill({ json: [{ id: 'phone', lojaId: 'fixture', nome: 'Celular de demonstração', categoria: 'Celulares', preco: 999, estoque: 1, sub: '', imgUrl: '' }, { id: 'case', lojaId: 'fixture', nome: '<img src=x onerror="window.injected=true">', categoria: 'Acessórios', preco: 49, estoque: 1, sub: '', imgUrl: '' }] });
      if (path.endsWith('/guias')) return route.fulfill({ json: [{ id: 'guide', operadora: 'TIM', topico: 'chip-esim', titulo: '<img src=x onerror="window.injected=true">', resumo: 'Guia de demonstração', passos: ['Confira o chip'], fonte: 'https://tim.com.br/ajuda', canalOficial: 'https://tim.com.br/ajuda', revisadoEm: new Date(now - 86400000).toISOString(), validoAte: new Date(now + 86400000).toISOString() }] });
      return route.fulfill({ json: {} });
    });
    await page.goto(base);
    await page.waitForFunction(() => Boolean(localStorage.getItem('vox.public.catalog.v1')));
    await page.goto(`${base}/ajuda`);
    await page.waitForFunction(() => Boolean(localStorage.getItem('vox.public.guides.v1')));
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
    await page.getByRole('heading', { name: 'Guias salvos' }).waitFor();
    assert.equal(await page.evaluate(() => Boolean(window.injected)), false);
    assert.equal(await page.getByRole('button', { name: /comprar|carrinho/i }).count(), 0);
    await page.getByLabel('Buscar no catálogo salvo').fill('acessórios');
    assert.equal(await page.locator('#offline-catalog article').count(), 1);
    await page.getByLabel('Filtrar guias por operadora').selectOption('TIM');
    assert.equal(await page.locator('#offline-guides article').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('Actual service worker offline catalogue and guides: online copies, cached modules, safe text, search/filter and no purchase controls passed at three widths.');
} finally { await browser.close(); }
