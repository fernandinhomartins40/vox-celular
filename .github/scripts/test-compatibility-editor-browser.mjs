import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const accessory = { id: 'accessory', nome: 'Capa fixture', categoria: 'Acessórios', preco: 20, estoque: 5, ativo: true, destaque: false, specs: [], atributosTecnicos: { tipo: 'acessorio' } };
    const phone = { ...accessory, id: 'phone', nome: 'Aparelho fixture', categoria: 'Celulares', atributosTecnicos: { tipo: 'celular' } };
    let rows = []; let approvals = 0; let removals = 0;
    await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ nome: 'Lojista', role: 'LOJISTA', lojaId: 'fixture', token: 'fixture-token' })));
    await page.route('**/api/**', route => {
      const req = route.request(); const pathname = new URL(req.url()).pathname;
      if (pathname.endsWith('/produtos/admin')) return route.fulfill({ json: [accessory, phone] });
      if (pathname.endsWith('/compatibilidades/admin')) return route.fulfill({ json: rows });
      if (pathname.endsWith('/compatibilidades') && req.method() === 'PUT') {
        approvals++; assert.deepEqual(req.postDataJSON(), { acessorioId: 'accessory', aparelhoId: 'phone', observacao: 'Encaixe conferido fixture' });
        rows = [{ id: 'pair', atual: true, observacao: 'Encaixe conferido fixture', acessorio: accessory, aparelho: phone }];
        return route.fulfill({ json: { id: 'pair' } });
      }
      if (pathname.endsWith('/compatibilidades/pair') && req.method() === 'DELETE') { removals++; rows = []; return route.fulfill({ json: { ok: true } }); }
      return route.fulfill({ json: { id: 'fixture' } });
    });
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/admin/produtos`);
    await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
    await page.getByText('Compatibilidade com outros produtos', { exact: true }).click();
    const approve = page.getByRole('button', { name: 'Aprovar compatibilidade', exact: true });
    assert.equal(await approve.isEnabled(), false);
    await page.getByLabel('Produto relacionado').selectOption('phone');
    await page.getByLabel('O que foi conferido').fill('Encaixe conferido fixture');
    await approve.click(); await page.getByText('Conferência atual', { exact: true }).waitFor();
    assert.equal(approvals, 1);
    assert.equal(await page.getByLabel('O que foi conferido').inputValue(), '');
    await page.getByRole('button', { name: 'Remover relação', exact: true }).click();
    await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Remover relação'));
    assert.equal(removals, 1);
    await page.getByRole('button', { name: 'Fechar produto' }).click();
    rows = [{ id: 'pair-stale', atual: false, observacao: 'Conferência anterior', acessorio: accessory, aparelho: phone }];
    await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
    await page.getByText('Compatibilidade com outros produtos', { exact: true }).click();
    await page.getByText('Oculta na loja: confira novamente ou remova', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('Merchant compatibility editor approval/removal and responsive UI passed with mock API.');
} finally { await browser.close(); }
