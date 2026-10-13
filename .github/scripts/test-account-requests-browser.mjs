import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let recovery = 0, saves = 0, failure = true;
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (path.endsWith('/auth/recuperacao/solicitar')) {
        recovery++; assert.deepEqual(request.postDataJSON(), { lojaId: 'fixture', email: 'client@example.com' });
        return route.fulfill({ status: failure ? 503 : 202, json: failure ? { error: 'Indisponível agora.' } : { ok: true } });
      }
      if (path.endsWith('/email/config')) {
        if (request.method() === 'PUT') { saves++; assert.equal(request.postDataJSON().password, 'fixture-secret'); return route.fulfill({ status: failure ? 503 : 200, json: failure ? { error: 'Falha ao salvar.' } : { ok: true } }); }
        return route.fulfill({ json: { host: 'smtp.example.com', port: 587, user: 'fixture', from: 'vox@example.com', origin: 'https://vox.example.com', senhaConfigurada: true } });
      }
      if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { token: 'fixture', user: { id: 'merchant', lojaId: 'fixture', role: 'LOJISTA', nome: 'Fixture' } } });
      return route.fulfill({ json: { id: 'fixture' } });
    });
    const base = process.env.PANEL_BASE || 'http://127.0.0.1:3196';
    await page.goto(`${base}/area-cliente/login`);
    await page.getByLabel('E-mail', { exact: true }).fill('client@example.com');
    await page.getByLabel('Senha', { exact: true }).fill('old-fixture-password');
    await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
    assert.equal(await page.getByLabel('E-mail da conta').inputValue(), 'client@example.com');
    await page.getByRole('button', { name: 'Solicitar link' }).click();
    await page.getByRole('alert').filter({ hasText: 'Indisponível' }).waitFor();
    failure = false;
    await page.getByRole('button', { name: 'Solicitar link' }).click();
    await page.getByRole('status').filter({ hasText: 'Se houver uma conta' }).waitFor();
    assert.equal(recovery, 2);
    await page.getByRole('button', { name: 'Voltar para entrar' }).click();
    assert.equal(await page.getByLabel('Senha', { exact: true }).inputValue(), '');
    await page.evaluate(() => localStorage.setItem('vox_user', JSON.stringify({ id: 'merchant', lojaId: 'fixture', role: 'LOJISTA', nome: 'Fixture' })));
    await page.goto(`${base}/admin/configuracoes/email`);
    await page.getByLabel('Servidor SMTP').waitFor();
    assert.equal(await page.getByLabel('Senha SMTP').inputValue(), '');
    failure = true;
    await page.getByLabel('Senha SMTP').fill('fixture-secret');
    await page.getByRole('button', { name: 'Salvar configuração' }).click();
    await page.getByRole('alert').filter({ hasText: 'Falha ao salvar' }).waitFor();
    assert.equal(await page.getByLabel('Senha SMTP').inputValue(), '');
    failure = false;
    await page.getByLabel('Senha SMTP').fill('fixture-secret');
    await page.getByRole('button', { name: 'Salvar configuração' }).click();
    await page.getByRole('status').filter({ hasText: 'Configuração salva' }).waitFor();
    assert.equal(saves, 2);
    assert.equal(await page.getByLabel('Senha SMTP').inputValue(), '');
    assert.equal(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }).includes('fixture-secret')), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Recovery and SMTP settings browser flows passed at three widths with mock API; no external mail delivery tested.');
} finally { await browser.close(); }
