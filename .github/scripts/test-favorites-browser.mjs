import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const base = process.env.PANEL_BASE ?? 'http://127.0.0.1:3196';
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const rows = Array.from({ length: 4 }, (_, i) => ({ id: `favorite-${i}`, lojaId: 'fixture-store', nome: `Aparelho ${i + 1}`, preco: 1000 + i * 200, estoque: i === 3 ? 0 : 5, specs: [], imgUrl: '', sub: 'Versão cadastrada' }));
    let deleted;
    await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ id: 'fixture-user', nome: 'Cliente', role: 'CLIENTE', lojaId: 'fixture-store', token: 'fixture-token' })));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'DELETE') { deleted = url.pathname.split('/').at(-1); return route.fulfill({ json: { ok: true } }); }
      if (url.pathname === '/api/favoritos') return route.fulfill({ json: rows });
      if (url.pathname === '/api/produtos') return route.fulfill({ json: rows.map(row => ({ ...row, preco: row.preco + 50 })) });
      return route.fulfill({ json: { id: 'fixture-store' } });
    });
    await page.goto(base + '/area-cliente/favoritos');
    await page.getByRole('heading', { name: 'Meus favoritos', exact: true }).waitFor();
    await page.getByRole('checkbox', { name: 'Comparar Aparelho 1', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Comparar Aparelho 2', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Comparar Aparelho 3', exact: true }).check();
    assert.equal(await page.getByRole('checkbox', { name: 'Comparar Aparelho 4', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('cell', { name: 'Ainda não informadas', exact: true }).count(), 3);
    assert.equal(await page.locator('article').last().getByRole('button', { name: 'Adicionar ao carrinho' }).isDisabled(), true);
    await page.locator('article').first().getByRole('button', { name: 'Adicionar ao carrinho' }).click();
    await page.getByRole('button', { name: 'Confirmar pedido', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('vox_cart'))[0].preco), 1050);
    await page.getByRole('button', { name: 'Fechar carrinho' }).click();
    await page.locator('article').first().getByRole('button', { name: 'Remover dos favoritos' }).click();
    await page.waitForFunction(() => document.querySelectorAll('article').length === 3);
    assert.equal(deleted, 'favorite-0');
    assert.equal(await page.getByRole('checkbox', { name: 'Comparar Aparelho 4', exact: true }).isDisabled(), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: favorites UI, comparison limit, missing attributes, live cart price, unavailable products, removal and responsive layouts. API fixtures only.');
} finally { await browser.close(); }
