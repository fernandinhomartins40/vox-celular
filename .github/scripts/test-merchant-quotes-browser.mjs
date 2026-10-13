import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const attempts = []; let quotes = [];
    await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ nome: 'Lojista', role: 'LOJISTA', lojaId: 'fixture', token: 'fixture-token' })));
    await page.route('**/api/**', route => {
      const req = route.request(); const path = new URL(req.url()).pathname;
      if (path.endsWith('/orcamentos-servico') && req.method() === 'POST') {
        const body = req.postDataJSON(); attempts.push(body);
        if (attempts.length === 1) return route.fulfill({ status: 503, json: { error: 'Resposta indisponível fixture' } });
        assert.deepEqual(body, attempts[0]); assert.equal(body.valorCentavos, 12550);
        quotes = [{ id: 'quote', versao: 1, valorCentavos: body.valorCentavos, status: 'PENDENTE' }];
        return route.fulfill({ status: 201, json: quotes[0] });
      }
      if (path.endsWith('/orcamentos-servico')) return route.fulfill({ json: quotes });
      if (path.endsWith('/servicos/solicitacoes')) return route.fulfill({ json: [{ id: 'ticket', protocolo: 'VOX-SVC-1', status: 'EM_ANALISE', aparelho: 'Fixture', problema: 'Fixture', servico: { titulo: 'Diagnóstico' }, historico: [] }] });
      if (path.endsWith('/servicos/admin') || path.endsWith('/agenda/admin')) return route.fulfill({ json: [] });
      return route.fulfill({ json: { id: 'fixture' } });
    });
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/admin/servicos`);
    await page.locator('details summary').last().click();
    const form = page.getByRole('form', { name: 'Emitir orçamento' });
    await form.getByLabel('Valor do orçamento (R$)').fill('125,50');
    await form.getByLabel('Descrição do orçamento').fill('Componente e mão de obra fixture');
    await form.getByLabel('Validade do orçamento').fill('2026-11-01T10:00');
    await form.getByRole('button', { name: 'Enviar orçamento ao cliente' }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await form.getByLabel('Valor do orçamento (R$)').inputValue(), '125,50');
    await form.getByRole('button', { name: 'Enviar orçamento ao cliente' }).click();
    await page.getByText('Orçamento registrado. Aguarde a decisão do cliente antes de executar.', { exact: true }).waitFor();
    assert.equal(attempts.length, 2);
    assert.equal(await form.getByLabel('Valor do orçamento (R$)').inputValue(), '');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('Merchant quote form cents, retained attempt after failure and responsive UI passed with mock API.');
} finally { await browser.close(); }
