import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let calls = 0;
    const closure = { id: 'closure-one', status: 'SOLICITADA', createdAt: '2026-10-13T00:00:00Z', analiseIniciadaEm: null, analisadoPor: null };
    const customer = { id: 'client-one', nome: 'Maria Silva', email: 'maria@example.invalid', cidade: 'Palmital', pontos: 0, totalGasto: 0, pedidos: 0, historicoPedidos: [], createdAt: closure.createdAt, encerramentoConta: closure };
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ nome: 'Lojista', role: 'LOJISTA', lojaId: 'fixture', token: 'fixture-token' })));
    await page.route('**/api/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.endsWith('/analisar')) {
        calls++; assert.deepEqual(route.request().postDataJSON(), {});
        Object.assign(closure, { status: 'EM_ANALISE', analiseIniciadaEm: '2026-10-13T10:00:00Z', analisadoPor: { nome: 'Responsável fixture' } });
        return route.fulfill({ json: { solicitacao: closure } });
      }
      if (pathname.endsWith('/clientes')) return route.fulfill({ json: [customer, { ...customer, id: 'client-two', nome: 'Outro cliente', encerramentoConta: null }] });
      return route.fulfill({ json: { id: 'fixture' } });
    });
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/admin/clientes`);
    await page.getByRole('checkbox', { name: /Solicitações de encerramento/ }).click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get('encerramento') === 'solicitado');
    assert.equal(await page.getByRole('button', { name: 'Ver detalhes de Outro cliente' }).count(), 0);
    await page.getByRole('button', { name: 'Ver detalhes de Maria Silva' }).click();
    await page.getByRole('button', { name: 'Iniciar análise do encerramento' }).click();
    await page.getByText('Solicitação de encerramento: Em análise', { exact: true }).waitFor();
    await page.getByText(/Análise iniciada em .*Responsável fixture/).waitFor();
    assert.equal(calls, 1);
    assert.equal(await page.getByRole('button', { name: 'Iniciar análise do encerramento' }).count(), 0);
    await page.getByRole('button', { name: 'Fechar detalhes' }).click();
    await page.getByText('Encerramento em análise', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('Merchant closure analysis filter, action, audit and responsive layout passed with mock API.');
} finally { await browser.close(); }
