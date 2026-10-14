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
      window.matchMedia = query => { const result = matchMedia(query); if (query.includes('display-mode: standalone')) Object.defineProperty(result, 'matches', { value: true }); return result; };
    });
    const user = { id: 'client', nome: 'Maria Cliente', email: 'client@example.invalid', role: 'CLIENTE', lojaId: 'store' };
    const device = { id: 'phone', lojaId: 'store', nome: 'Aparelho do catalogo', categoria: 'Celulares', preco: 1500, estoque: 2, imgUrl: '', sub: '128 GB' };
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const data = path === '/api/loja' ? { id: 'store' } : path === '/api/auth/login' || path === '/api/auth/refresh' ? { token: 'fixture-token', user }
        : path === '/api/produtos' ? [device] : path === '/api/produtos/phone' ? device : [];
      return route.fulfill({ json: data });
    });
    await page.goto(base + '/');
    await page.waitForURL('**/app/login');
    await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).waitFor();
    assert.equal(await page.locator('.store-hero').count(), 0);
    assert.equal(await page.getByRole('navigation', { name: /Navega.*o do aplicativo/ }).count(), 0);
    const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
    assert.equal(manifest.start_url, '/app/login'); assert.equal(manifest.id, '/');
    await page.getByLabel('E-mail', { exact: true }).fill(user.email);
    await page.getByLabel('Senha', { exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click();
    await page.waitForURL('**/app');
    const tabs = page.getByRole('navigation', { name: /Navega.*o do aplicativo/ });
    await tabs.waitFor();
    assert.equal(await tabs.evaluate(el => getComputedStyle(el).position), 'fixed');
    assert.equal(await tabs.getByRole('link').count(), 5);
    if (width === 390) await page.screenshot({ path: '.git/pwa-app-home.png', fullPage: true });
    await page.getByRole('link', { name: /Qual aparelho combina com voc/ }).click();
    await page.getByRole('heading', { name: /Encontre seu pr.*ximo aparelho/ }).waitFor();
    await tabs.getByRole('link', { name: 'Loja', exact: true }).click();
    await page.waitForURL('**/app/loja');
    await page.getByRole('heading', { name: device.nome }).waitFor();
    assert.equal(await page.locator('.product-card, .store-hero, .store-bottom-nav').count(), 0);
    assert.equal(await page.locator('.customer-app-product').count(), 1);
    if (width === 390) await page.screenshot({ path: '.git/pwa-app-store.png', fullPage: true });
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('vox_cart'))?.[0]?.preco === 1500);
    await page.getByLabel('Buscar na loja do aplicativo').fill('inexistente');
    await page.getByText(/Nenhum produto encontrado. Ajuste sua busca./).waitFor();
    await page.getByLabel('Buscar na loja do aplicativo').fill('');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.goto(`${base}/?carrinho=1#produtos`);
    await page.waitForURL('**/app/loja?carrinho=1#produtos');
    await page.goto(`${base}/admin/landing-preview`);
    await page.waitForURL('**/app/loja');
    await page.close();
  }
  const web = await browser.newPage();
  await web.route('**/api/**', route => route.fulfill({ json: new URL(route.request().url()).pathname === '/api/loja' ? { id: 'store' } : [] }));
  await web.goto(base); await web.getByRole('contentinfo').waitFor();
  assert.equal(new URL(web.url()).pathname, '/');
  assert.equal(await web.getByRole('navigation', { name: /Navega.*o do aplicativo/ }).count(), 0);
  console.log('PWA: login launch, app home, prominent assistant, fixed five-tab navigation, separate catalog, live-price cart, return links and website preservation passed at three sizes. API fixtures only.');
} finally { await browser.close(); }
