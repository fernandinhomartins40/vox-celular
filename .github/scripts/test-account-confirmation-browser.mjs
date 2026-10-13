import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let attempts = 0, expired = true, mode = 'recovery';
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const token = 'a'.repeat(43), password = 'fixture-password-123';
    await page.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (path.endsWith('/auth/recuperacao/confirmar') || path.endsWith('/auth/email/confirmar')) {
        attempts++;
        assert.deepEqual(req.postDataJSON(), { token, lojaId: 'fixture', ...(mode === 'recovery' ? { novaSenha: password } : {}) });
        return route.fulfill({ status: expired ? 400 : 200, json: expired ? { error: 'Link inválido ou vencido.' } : { ok: true } });
      }
      return route.fulfill({ json: {} });
    });
    const base = process.env.PANEL_BASE || 'http://127.0.0.1:3196';
    await page.goto(`${base}/confirmar-conta#token=${token}&lojaId=fixture`);
    await page.getByRole('heading', { name: 'Crie uma nova senha' }).waitFor();
    assert.equal(new URL(page.url()).hash, '');
    await page.getByLabel('Nova senha', { exact: true }).fill(password);
    await page.getByLabel('Confirme a nova senha').fill('different-password-123');
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();
    await page.getByRole('alert').filter({ hasText: 'precisam ser iguais' }).waitFor(); assert.equal(attempts, 0);
    await page.getByLabel('Confirme a nova senha').fill(password);
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();
    await page.getByRole('alert').filter({ hasText: 'vencido' }).waitFor();
    assert.equal(await page.getByLabel('Nova senha', { exact: true }).inputValue(), '');
    assert.equal(await page.getByLabel('Confirme a nova senha').inputValue(), '');
    expired = false;
    await page.getByLabel('Nova senha', { exact: true }).fill(password);
    await page.getByLabel('Confirme a nova senha').fill(password);
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();
    await page.getByText('Senha alterada. Entre novamente; os acessos anteriores foram encerrados.', { exact: true }).waitFor();
    assert.equal(attempts, 2);
    assert.equal(await page.getByRole('button', { name: 'Salvar nova senha' }).count(), 0);
    assert.equal(await page.evaluate(token => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }).includes(token), token), false);
    mode = 'email';
    await page.goto(`${base}/confirmar-conta#token=${token}&lojaId=fixture&acao=verificar-email`);
    await page.getByRole('button', { name: 'Confirmar e-mail', exact: true }).waitFor(); assert.equal(attempts, 2);
    await page.getByRole('button', { name: 'Confirmar e-mail', exact: true }).click();
    await page.getByText('E-mail confirmado.', { exact: true }).waitFor(); assert.equal(attempts, 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('Account confirmation UI: fragment cleanup, no token storage, mismatch, expired link, success and explicit email confirmation passed with mock API.');
} finally { await browser.close(); }
