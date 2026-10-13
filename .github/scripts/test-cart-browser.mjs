import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const product = { id: 'phone', nome: 'Aparelho Vox', categoria: 'Celulares', preco: 999.9, estoque: 2, qty: 1, img: '/brand/icon-192.png' };
    await page.addInitScript(({ product }) => {
      localStorage.setItem('vox_user', JSON.stringify({ id: 'customer', role: 'CLIENTE', lojaId: 'fixture', token: 'fixture' }));
      sessionStorage.setItem('vox_cart', JSON.stringify([product]));
    }, { product });
    const posts = [];
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/pedidos') && route.request().method() === 'POST') {
        posts.push(route.request().postDataJSON());
        if (posts.length === 1) return route.fulfill({ status: 409, json: { error: 'Estoque ou preço mudou. Atualize o carrinho.' } });
        return route.fulfill({ json: { codigo: 'VOX-EXEMPLO', total: 1999.8 } });
      }
      return route.fulfill({ json: path.endsWith('/loja') ? { id: 'fixture' } : [] });
    });
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/?carrinho=1`);
    await page.getByRole('button', { name: 'Fechar carrinho' }).waitFor();
    const increase = page.getByRole('button', { name: 'Aumentar quantidade de Aparelho Vox' });
    assert.ok((await increase.boundingBox()).height >= 44);
    await increase.click();
    assert.equal(await increase.isDisabled(), true, 'Stock limit must disable quantity increase');
    await page.getByRole('button', { name: 'Confirmar pedido', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.deepEqual(posts[0].itens, [{ produtoId: 'phone', qty: 2, precoCentavos: 99990 }]);
    assert.equal(await page.getByRole('button', { name: 'Confirmar pedido', exact: true }).isEnabled(), true);
    await page.getByRole('button', { name: 'Confirmar pedido', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'VOX-EXEMPLO' }).waitFor();
    assert.equal(posts[0].checkoutKey, posts[1].checkoutKey, 'Repeated confirmation must preserve its key');
    assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem('vox_cart'))), []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.addInitScript(() => sessionStorage.setItem('vox_cart', JSON.stringify([{ id: 'phone', nome: 'Aparelho Vox', preco: 100, qty: 1, estoque: 2 }])));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.endsWith('/auth/login') ? { token: 'fixture', user: { id: 'customer', role: 'CLIENTE', lojaId: 'fixture' } } : path.endsWith('/loja') ? { id: 'fixture' } : [] });
  });
  await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/?carrinho=1`);
  await page.getByRole('link', { name: 'Entrar para confirmar pedido' }).click();
  await page.getByLabel('E-mail', { exact: true }).fill('customer@example.invalid');
  await page.getByLabel('Senha', { exact: true }).fill('fixture-password');
  await page.locator('button[type="submit"]').click();
  await page.getByRole('button', { name: 'Confirmar pedido', exact: true }).waitFor();
  assert.equal(new URL(page.url()).search, '?carrinho=1', 'Login must return directly to the cart');
  await page.close();
  console.log('Cart: quantity target/stock limit, displayed price validation, rejected order and idempotent confirmation passed with mock API.');
} finally { await browser.close(); }
