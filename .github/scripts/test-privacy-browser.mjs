import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const base = process.env.PANEL_BASE ?? 'http://127.0.0.1:3196';
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let preferences = { personalizacao: false, notificacoes: false, versaoAviso: '2026-10-12' };
    await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ nome: 'Cliente', email: 'cliente@example.test', role: 'CLIENTE', lojaId: 'fixture-store', token: 'fixture-token' })));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/preferencias')) {
        if (route.request().method() === 'PUT') preferences = route.request().postDataJSON();
        return route.fulfill({ json: preferences });
      }
      return route.fulfill({ json: { perfil: { nome: 'Cliente' }, pedidos: [], id: 'fixture-store' } });
    });
    await page.goto(base + '/area-cliente/conta');
    const personalization = page.getByRole('checkbox', { name: /Permitir ofertas personalizadas/ });
    const notifications = page.getByRole('checkbox', { name: /Quero receber avisos/ });
    await personalization.waitFor();
    assert.equal(await personalization.isChecked(), false);
    assert.equal(await notifications.isChecked(), false);
    await personalization.check(); await notifications.check();
    await page.getByRole('button', { name: 'Salvar preferências', exact: true }).click();
    await page.getByText('Preferências salvas. Você pode alterá-las quando quiser.').waitFor();
    assert.equal(preferences.notificacoes, true);
    await page.reload();
    await notifications.waitFor();
    assert.equal(await notifications.isChecked(), true);
    await personalization.uncheck(); await notifications.uncheck();
    await page.getByRole('button', { name: 'Salvar preferências', exact: true }).click();
    await page.getByText('Preferências salvas. Você pode alterá-las quando quiser.').waitFor();
    assert.equal(preferences.notificacoes, false);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar meus dados', exact: true }).click();
    assert.equal((await download).suggestedFilename(), 'vox-meus-dados.json');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.close();
  }
  console.log('PASS: optional preferences, persistence/withdrawal, personal export download and responsive account layout. API fixtures only.');
} finally { await browser.close(); }
