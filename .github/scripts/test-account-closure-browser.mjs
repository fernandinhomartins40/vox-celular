import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let row = null; let attempts = 0;
    await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ nome: 'Cliente', email: 'fixture@example.invalid', role: 'CLIENTE', lojaId: 'fixture', token: 'fixture-token' })));
    await page.route('**/api/**', route => {
      const request = route.request(); const pathname = new URL(request.url()).pathname;
      if (pathname.endsWith('/encerramento')) {
        if (request.method() === 'POST') {
          const body = request.postDataJSON(); attempts++;
          assert.equal(body.confirmacao, 'SOLICITAR_ENCERRAMENTO');
          if (attempts === 1) return route.fulfill({ status: 400, json: { error: 'Senha atual incorreta.' } });
          assert.equal(body.senhaAtual, 'fixture-current-password');
          row = { id: 'closure-fixture', status: 'SOLICITADA', createdAt: '2026-10-13T00:00:00Z' };
        }
        return route.fulfill({ json: { solicitacao: row } });
      }
      if (pathname.endsWith('/preferencias')) return route.fulfill({ json: { personalizacao: false, notificacoes: false, versaoAviso: '2026-10-12' } });
      if (pathname.endsWith('/sessoes') || pathname.endsWith('/push/web')) return route.fulfill({ json: [] });
      return route.fulfill({ json: { id: 'fixture', nome: 'Cliente', email: 'fixture@example.invalid', role: 'CLIENTE', lojaId: 'fixture' } });
    });
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/area-cliente/conta`);
    const form = page.getByRole('form', { name: 'Solicitar encerramento da conta' });
    await form.waitFor();
    const send = form.getByRole('button', { name: 'Registrar solicitação' });
    assert.equal(await send.isEnabled(), false);
    await form.getByLabel('Senha atual').fill('wrong-password');
    assert.equal(await send.isEnabled(), false);
    await form.getByRole('checkbox').check(); await send.click();
    await page.getByText('Senha atual incorreta.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Consultar status e tentar novamente' }).click();
    await form.waitFor();
    assert.equal(await form.getByLabel('Senha atual').inputValue(), '');
    assert.equal(await form.getByRole('checkbox').isChecked(), false);
    await form.getByLabel('Senha atual').fill('fixture-current-password');
    await form.getByRole('checkbox').check(); await send.click();
    await page.getByText('Solicitação registrada', { exact: true }).waitFor();
    assert.equal(await form.count(), 0);
    await page.getByText('Esta confirmação não significa que a conta foi excluída.', { exact: true }).waitFor();
    await page.reload(); await page.getByText('Protocolo: closure-fixture', { exact: true }).waitFor();
    assert.equal(attempts, 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('Account closure responsive form: explicit consent, password error, cleared retry, confirmation and persisted status UI passed (mock API).');
} finally { await browser.close(); }
