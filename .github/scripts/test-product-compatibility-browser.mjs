import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let fail = false;
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const product = { id: 'accessory', lojaId: 'fixture', nome: 'Capa fixture', categoria: 'Acessórios', descricao: 'Fixture', sub: 'Conferida', preco: 20, estoque: 5, imgUrl: '/brand/icon-192.png', specs: [] };
    const phone = { ...product, id: 'phone', nome: 'Aparelho fixture', categoria: 'Celulares', preco: 100 };
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/loja')) return route.fulfill({ json: { id: 'fixture', config: {} } });
      if (url.pathname.endsWith('/produtos')) return route.fulfill({ json: [product] });
      if (url.pathname.endsWith('/produtos/phone')) return route.fulfill({ json: phone });
      if (url.pathname.endsWith('/compatibilidades')) {
        assert.equal(url.searchParams.get('lojaId'), 'fixture');
        if (fail) return route.fulfill({ status: 503, json: { error: 'Consulta indisponível fixture' } });
        return route.fulfill({ json: url.searchParams.get('produtoId') === 'accessory' ? [{ id: 'pair', observacao: 'Encaixe conferido', aprovadoEm: '2026-10-13T12:00:00Z', acessorio: { id: product.id, nome: product.nome }, aparelho: { id: phone.id, nome: phone.nome } }] : [] });
      }
      return route.fulfill({ json: [] });
    });
    await page.goto(process.env.PANEL_BASE || 'http://127.0.0.1:3196');
    await page.getByRole('button', { name: 'Ver detalhes de Capa fixture', exact: true }).click();
    await page.getByText('Encaixe conferido', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ver este produto', exact: true }).click();
    await page.getByRole('heading', { name: phone.nome, exact: true, level: 2 }).waitFor();
    await page.getByText('Compatibilidade não informada. Confirme com a loja antes de escolher um acessório.', { exact: true }).waitFor();
    fail = true; await page.reload();
    await page.getByRole('button', { name: 'Ver detalhes de Capa fixture', exact: true }).click();
    await page.getByText('Consulta indisponível fixture', { exact: true }).waitFor();
    assert.equal(await page.getByText('Compatibilidade não informada. Confirme com a loja antes de escolher um acessório.', { exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('Product compatibility navigation, unknown vs failure and responsive UI passed with mock API.');
} finally { await browser.close(); }
