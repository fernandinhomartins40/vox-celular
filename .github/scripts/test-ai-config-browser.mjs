import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    let payload;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ role: 'LOJISTA', nome: 'Fixture merchant', lojaId: 'fixture', token: 'fixture-token' })));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/ia/config' && route.request().method() === 'PUT') { payload = route.request().postDataJSON(); await route.fulfill({ json: { ok: true, ativo: false } }); return; }
      await route.fulfill({ json: path.endsWith('/orcamento') ? { mes: '2026-10', limiteMicroUsd: 25000000, gastoMicroUsd: 0, reservadoMicroUsd: 0 } : null });
    });
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/admin/configuracoes/ia`);
    await page.getByLabel('Chave de API', { exact: true }).fill('fixture-never-real-key');
    await page.getByLabel('Tarifa de entrada em US$ por milhão de tokens').fill('0.30');
    await page.getByLabel('Tarifa de saída em US$ por milhão de tokens').fill('1.20');
    await page.getByRole('button', { name: 'Salvar configuração' }).click();
    await page.getByRole('status').waitFor();
    assert.equal(payload.limiteMicroUsd, 25000000);
    assert.equal(payload.tarifaEntradaMicroUsd, 300000);
    assert.equal(payload.tarifaSaidaMicroUsd, 1200000);
    assert.equal(await page.getByLabel('Chave de API', { exact: true }).inputValue(), '');
    assert.equal(await page.getByLabel('Chave de API', { exact: true }).getAttribute('type'), 'password');
    assert.equal((await page.locator('body').innerText()).includes('fixture-never-real-key'), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('AI merchant form payload, secret clearing and responsive layout passed.');
} finally { await browser.close(); }
