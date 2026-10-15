import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let approved = true, stock = 5, reads = 0;
    const phone = { id: 'phone', lojaId: 'fixture', nome: 'Celular conferido', sub: '128 GB', preco: 999, estoque: 3, imgUrl: '/brand/icon-192.png', categoria: 'Celulares' };
    const accessory = { id: 'case', lojaId: 'fixture', nome: 'Capa compatível', preco: 49.9, estoque: stock, imgUrl: '/brand/icon-192.png' };
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/assistente/recomendar')) return route.fulfill({ json: { aviso: 'Seleção por regras', resultados: [{ produto: phone, motivos: ['Dentro do orçamento'], observacao: 'Dados conferidos' }] } });
      if (path.endsWith('/compatibilidades')) return route.fulfill({ json: approved ? [{ id: 'pair', aprovadoEm: '2026-01-01T12:00:00Z', observacao: 'Encaixe conferido', aparelho: phone, acessorio: accessory }] : [] });
      if (path.endsWith('/produtos/case')) { reads++; return route.fulfill({ json: { ...accessory, estoque: stock } }); }
      return route.fulfill({ json: { id: 'fixture' } });
    });
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/assistente`);
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByLabel('Valor máximo em reais').fill('1200');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Mostrar opções', exact: true }).click();
    await page.getByRole('button', { name: 'Por que combina comigo?' }).click();
    const add = page.getByRole('button', { name: 'Adicionar acessório', exact: true });
    await add.waitFor();
    approved = false; await add.click();
    await page.getByRole('alert').filter({ hasText: 'A compatibilidade mudou' }).waitFor();
    assert.equal(reads, 0);
    approved = true; stock = 0; await add.click();
    await page.getByRole('alert').filter({ hasText: 'não está disponível' }).waitFor();
    stock = 5;
    const cancelledDialog = page.waitForEvent('dialog'); await add.click();
    const cancelled = await cancelledDialog; assert.match(cancelled.message(), /49,90/); assert.match(cancelled.message(), /adicional ao orçamento/); await cancelled.dismiss();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Adicionar acessório' && !button.disabled));
    assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem('vox_cart'))), []);
    const acceptedDialog = page.waitForEvent('dialog'); await add.click(); await (await acceptedDialog).accept();
    await page.getByRole('button', { name: 'Fechar carrinho' }).waitFor();
    const cart = await page.evaluate(() => JSON.parse(sessionStorage.getItem('vox_cart')));
    assert.equal(cart.length, 1); assert.equal(cart[0].id, 'case'); assert.equal(cart[0].preco, 49.9); assert.equal(cart[0].qty, 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('Assistant accessories: changed compatibility, stock, price confirmation, cancellation and cart insertion passed with mock API.');
} finally { await browser.close(); }
