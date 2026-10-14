import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const base = process.env.PANEL_BASE ?? 'http://127.0.0.1:3196';
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.addInitScript(() => {
      const matchMedia = window.matchMedia.bind(window);
      window.matchMedia = query => {
        const result = matchMedia(query);
        if (query.includes('display-mode: standalone')) Object.defineProperty(result, 'matches', { value: true });
        return result;
      };
    });
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({ json: path === '/api/loja' ? { id: 'store' } : [] });
    });
    await page.goto(`${base}/?carrinho=1#produtos`);
    await page.getByRole('navigation', { name: 'Navegação do aplicativo' }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/app');
    assert.equal(new URL(page.url()).search, '?carrinho=1');
    assert.equal(new URL(page.url()).hash, '#produtos');
    assert.equal(await page.getByRole('contentinfo').count(), 0);
    const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
    assert.equal(manifest.start_url, '/app');
    assert.equal(manifest.id, '/');
    await page.goto(`${base}/assistente`);
    await page.getByRole('link', { name: 'Voltar à loja Vox' }).click();
    await page.waitForURL('**/app');
    await page.getByRole('navigation', { name: 'Navegação do aplicativo' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.goto(`${base}/admin/landing-preview`);
    await page.waitForURL('**/app');
    await page.close();
  }
  const web = await browser.newPage();
  await web.route('**/api/**', route => route.fulfill({ json: new URL(route.request().url()).pathname === '/api/loja' ? { id: 'store' } : [] }));
  await web.goto(base);
  await web.getByRole('contentinfo').waitFor();
  assert.equal(new URL(web.url()).pathname, '/');
  assert.equal(await web.getByRole('navigation', { name: 'Navegação do aplicativo' }).count(), 0);
  console.log('PWA entry: installed launch, existing root URLs, return links and preview avoid landing at three sizes; browser website preserved.');
} finally { await browser.close(); }
