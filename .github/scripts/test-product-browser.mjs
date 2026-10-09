import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.RUNNER_TEMP}/vox-browser/package.json`);
const { chromium } = require('playwright');
const base = 'http://127.0.0.1:3196';
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    const headerSearch = page.getByRole('textbox', { name: 'Pesquisar no catálogo', exact: true });
    await headerSearch.fill('produto ausente');
    await page.getByText('Nenhum produto corresponde aos filtros.').waitFor();
    await headerSearch.fill('ci product');
    assert.equal(await page.getByRole('textbox', { name: 'Buscar produtos', exact: true }).inputValue(), 'ci product');
    if (width === 390) {
      assert.equal(await page.getByRole('navigation', { name: 'Navegação inferior' }).isVisible(), true);
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      await page.getByRole('navigation', { name: 'Menu mobile' }).getByRole('link', { name: 'Produtos', exact: true }).click();
    }
    assert.equal(await page.getByRole('link', { name: 'Painel do lojista', exact: true }).getAttribute('href'), '/admin/login');
    const search = page.getByRole('textbox', { name: 'Buscar produtos' });
    await search.fill('ci product');
    const card = page.locator('.product-card');
    await card.first().waitFor();
    assert.equal(await card.count(), 1);
    await search.fill('não existe esse produto');
    await page.getByText('Nenhum produto corresponde aos filtros.').waitFor();
    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await card.first().waitFor();
    await page.getByRole('checkbox', { name: 'Disponíveis em estoque' }).check();
    await page.getByRole('combobox', { name: 'Ordenar produtos' }).selectOption('menor');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No horizontal overflow at ${width}px`);
    await card.first().getByRole('button', { name: 'Ver detalhes de CI product' }).click();
    await page.getByRole('heading', { name: 'CI product', exact: true, level: 2 }).waitFor();
    assert.equal(errors.length, 0, errors.join('\n'));
    await page.close();
  }
  const page = await browser.newPage();
  const response = await page.request.post(`${base}/api/auth/login`, { data: { email: 'ci-admin@example.com', senha: 'ci-admin-password-only-123' } });
  const admin = await response.json();
  await page.addInitScript(user => localStorage.setItem('vox_user', JSON.stringify(user)), { ...admin.user, token: admin.token });
  await page.goto(`${base}/admin/pedidos`);
  await page.getByPlaceholder('Buscar pedido ou cliente…').fill('CI-1999');
  await page.getByRole('cell', { name: 'CI-1999', exact: true }).waitFor();
  assert.equal(await page.locator('tbody tr').count(), 1);
  await page.goto(`${base}/admin/configuracoes`);
  await page.locator('input[name="horarioSemana"]').fill('Seg–Sex 9h–18h CI');
  await page.getByRole('button', { name: 'Salvar configurações' }).click();
  await page.getByRole('button', { name: 'Salvo!' }).waitFor();
  await page.goto(base);
  await page.getByText('Seg–Sex 9h–18h CI', { exact: false }).first().waitFor();
  await page.goto(`${base}/admin/conta`);
  await page.getByLabel('Senha atual', { exact: true }).fill('ci-admin-password-only-123');
  await page.getByLabel('Nova senha', { exact: true }).fill('ci-browser-admin-password');
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('ci-browser-admin-password');
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await page.getByText('Senha alterada com sucesso.', { exact: true }).waitFor();
  const customerPage = await browser.newPage();
  await customerPage.goto(`${base}/area-cliente/login`);
  await customerPage.getByRole('button', { name: 'Criar conta grátis' }).click();
  await customerPage.getByLabel('Nome', { exact: true }).fill('CI Browser Customer');
  await customerPage.locator('input[type="email"]').fill('ci-browser-customer@example.com');
  await customerPage.locator('input[type="password"]').fill('ci-browser-password-123');
  await customerPage.getByRole('button', { name: 'Criar minha conta' }).click();
  await customerPage.waitForURL(`${base}/area-cliente`);
  await customerPage.goto(`${base}/area-cliente/fidelidade`);
  await customerPage.getByText('SEU SALDO', { exact: true }).waitFor();
  console.log('PASS: real catalog, search, filter reset, stock, sorting, product details, mobile/desktop, order code search and saved public hours.');
} finally {
  await browser.close();
}
