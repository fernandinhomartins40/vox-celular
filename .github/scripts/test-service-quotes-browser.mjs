import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let decisions = 0;
    const quote = { id: 'quote', versao: 1, valorCentavos: 12550, descricao: 'Componente e mão de obra conferidos', validoAte: '2100-01-01T12:00:00Z', status: 'PENDENTE' };
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ nome: 'Cliente', role: 'CLIENTE', lojaId: 'fixture', token: 'fixture-token' })));
    await page.route('**/api/**', route => {
      const req = route.request(); const path = new URL(req.url()).pathname;
      if (path.endsWith('/orcamentos-servico/quote/decisao')) { assert.deepEqual(req.postDataJSON(), { aceitar: true }); decisions++; quote.status = 'ACEITO'; return route.fulfill({ json: { ok: true } }); }
      if (path.endsWith('/orcamentos-servico')) return route.fulfill({ json: [quote] });
      if (path.endsWith('/servicos/solicitacoes')) return route.fulfill({ json: [{ id: 'ticket', protocolo: 'VOX-SVC-1', status: 'AGUARDANDO_CLIENTE', aparelho: 'Aparelho fixture', problema: 'Problema fixture', servico: { titulo: 'Diagnóstico' }, historico: [] }] });
      if (path.endsWith('/servicos')) return route.fulfill({ json: [] });
      return route.fulfill({ json: { id: 'fixture' } });
    });
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/area-cliente/servicos`);
    await page.getByRole('button', { name: 'Consultar orçamentos', exact: true }).click();
    await page.getByText(quote.descricao, { exact: true }).waitFor();
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Aceitar orçamento' }).click();
    assert.equal(decisions, 0);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Aceitar orçamento' }).click();
    await page.getByText('Aceito', { exact: true }).waitFor();
    assert.equal(decisions, 1);
    assert.equal(await page.getByRole('button', { name: 'Aceitar orçamento' }).count(), 0);
    quote.status = 'PENDENTE'; quote.validoAte = '2000-01-01T12:00:00Z';
    await page.getByRole('button', { name: 'Consultar orçamentos', exact: true }).click();
    await page.getByText('Orçamento vencido. Peça uma nova proposta à loja.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Aceitar orçamento' }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('Customer service quote consultation, confirmation, acceptance and expiry UI passed with mock API.');
} finally { await browser.close(); }
