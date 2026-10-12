import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let empty = false;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ role: 'CLIENTE', nome: 'Fixture customer', lojaId: 'fixture', token: 'fixture-token' })));
    await page.route('**/api/**', route => route.fulfill({ json: empty ? [] : [{ id: 'one', titulo: 'Pedido atualizado', mensagem: 'Consulte sua conta.', destino: '/pedidos', createdAt: '2026-10-12T12:00:00Z' }, { id: 'two', titulo: 'Destino inválido', mensagem: 'Não deve abrir link externo.', destino: 'https://attacker.invalid', createdAt: '2026-10-12T12:00:00Z' }] }));
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/area-cliente/avisos`);
    await page.getByRole('heading', { name: 'Pedido atualizado' }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Ver detalhes', exact: true }).count(), 1);
    assert.equal(await page.getByRole('link', { name: 'Ver detalhes', exact: true }).getAttribute('href'), '/area-cliente/pedidos');
    assert.equal(await page.locator('a[href="https://attacker.invalid"]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    empty = true;
    await page.getByRole('button', { name: 'Atualizar avisos' }).click();
    await page.getByText('Nenhum aviso disponível.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Pedido atualizado' }).count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Customer notices responsive layout, allowed links and refresh passed.');
} finally { await browser.close(); }
