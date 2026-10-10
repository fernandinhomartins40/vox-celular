import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const base = process.env.PANEL_BASE ?? 'http://127.0.0.1:3196';
const browser = await chromium.launch({ headless: true, ...(process.env.PANEL_BROWSER ? { executablePath: process.env.PANEL_BROWSER } : {}) });
try {
  for (const width of [390, 768, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    let config = {};
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ nome: 'CI Editor', role: 'LOJISTA', token: 'fixture-token' })));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/config' && route.request().method() === 'PUT') config = route.request().postDataJSON();
      await route.fulfill({ json: path === '/api/config' ? config : path === '/api/loja' ? { id: 'fixture-store', config } : [] });
    });
    await page.goto(base + '/admin/configuracoes');
    const preview = page.frameLocator('iframe[title="Prévia real da landing page"]');
    await preview.locator('.store-hero').waitFor();
    assert.equal(await page.getByRole('tab').count(), 13);
    const title = page.getByLabel('Título', { exact: true });
    await title.fill('Banner editado em tempo real');
    await preview.getByRole('heading', { name: 'Banner editado em tempo real' }).waitFor();
    assert.equal(config.landingPage, undefined, 'Draft does not mutate saved data');
    await page.getByRole('button', { name: 'Celular', exact: true }).click();
    assert.equal(await page.locator('iframe').evaluate(el => el.contentWindow.innerWidth), 390);
    for (const tab of await page.getByRole('tab').all()) {
      await tab.click();
      const section = new URL(page.url()).searchParams.get('secao');
      await page.waitForFunction(section => document.querySelector('iframe')?.contentDocument?.querySelector('.store-preview'), section);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Editor overflow ${width} ${section}`);
    }
    await page.getByRole('tab', { name: 'Cabeçalho', exact: true }).click();
    await page.getByLabel('Nome da marca', { exact: true }).fill('VOX TESTE');
    await preview.locator('.store-brand strong').getByText('VOX TESTE', { exact: false }).waitFor();
    await page.getByRole('tab', { name: 'Contato e horários', exact: true }).click();
    await page.getByLabel('Segunda a sexta', { exact: true }).fill('9h–18h teste');
    await preview.getByText('9h–18h teste', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Salvar configurações', exact: true }).click();
    await page.getByRole('button', { name: 'Salvo!', exact: true }).waitFor();
    assert.equal(config.landingPage.hero.title, 'Banner editado em tempo real');
    assert.equal(config.landingPage.header.brand, 'VOX TESTE');
    await page.reload();
    await preview.getByText('9h–18h teste', { exact: false }).waitFor();
    await page.goto(base);
    await page.getByRole('heading', { name: 'Banner editado em tempo real' }).waitFor();
    await page.locator('.store-brand strong').getByText('VOX TESTE', { exact: false }).waitFor();
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: full-width editor, 13 section tabs, real shared previews, mobile viewport, drafts, save/reload and public rendering at 4 widths.');
} finally { await browser.close(); }
