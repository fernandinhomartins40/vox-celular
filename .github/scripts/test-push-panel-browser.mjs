import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createECDH } from 'node:crypto';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const base = process.env.PANEL_BASE ?? 'http://127.0.0.1:3196';
const publicKey = createECDH('prime256v1').generateKeys().toString('base64url');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    let preferences = { personalizacao: false, notificacoes: false, versaoAviso: '2026-10-12' };
    let rows = [];
    let removed = 0;
    await page.addInitScript(({ publicKey }) => {
      localStorage.setItem('vox_user', JSON.stringify({ nome: 'Cliente', email: 'cliente@example.test', role: 'CLIENTE', lojaId: 'fixture-store', token: 'fixture-token' }));
      window.pushFixture = { permissions: 0, unsubscribed: 0 };
      let subscription = null;
      Object.defineProperty(window, 'Notification', { configurable: true, value: {
        permission: 'default', requestPermission: () => { window.pushFixture.permissions++; return Promise.resolve('granted'); },
      } });
      Object.defineProperty(window, 'PushManager', { configurable: true, value: {} });
      navigator.serviceWorker.getRegistration = async () => ({ active: {}, pushManager: {
        getSubscription: async () => subscription,
        subscribe: async () => {
          subscription = {
            endpoint: 'https://fcm.googleapis.com/browser-fixture',
            toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/browser-fixture', expirationTime: null, keys: { p256dh: publicKey, auth: 'AAAAAAAAAAAAAAAAAAAAAA' } }),
            unsubscribe: async () => { window.pushFixture.unsubscribed++; subscription = null; return true; },
          };
          return subscription;
        },
      } });
    }, { publicKey });
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/preferencias')) {
        if (route.request().method() === 'PUT') preferences = route.request().postDataJSON();
        return route.fulfill({ json: preferences });
      }
      if (url.pathname.endsWith('/push/config')) return route.fulfill({ json: { publicKey, entregaConfigurada: true } });
      if (url.pathname.endsWith('/push/web/remover-atual')) {
        assert.equal(route.request().postDataJSON().endpoint, 'https://fcm.googleapis.com/browser-fixture');
        removed++; rows = []; return route.fulfill({ json: { ok: true } });
      }
      if (url.pathname.endsWith('/push/web')) {
        if (route.request().method() === 'PUT') {
          assert.equal(route.request().postDataJSON().expirationTime, undefined);
          rows = [{ id: 'fixture-push', ativo: true, createdAt: '2026-10-12T12:00:00Z' }];
          return route.fulfill({ json: rows[0] });
        }
        return route.fulfill({ json: rows });
      }
      return route.fulfill({ json: { perfil: { nome: 'Cliente' }, pedidos: [], id: 'fixture-store' } });
    });
    await page.goto(base + '/area-cliente/conta');
    await page.getByRole('button', { name: 'Preparar notificações', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: /salve as preferências/ }).waitFor();
    assert.equal(await page.evaluate(() => window.pushFixture.permissions), 0);
    await page.getByRole('checkbox', { name: /Quero receber avisos/ }).check();
    await page.getByRole('button', { name: 'Salvar preferências', exact: true }).click();
    await page.getByText('Preferências salvas. Você pode alterá-las quando quiser.').waitFor();
    await page.getByRole('button', { name: 'Preparar notificações', exact: true }).click();
    await page.getByRole('button', { name: 'Permitir neste aparelho', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.pushFixture.permissions), 0);
    await page.getByRole('button', { name: 'Permitir neste aparelho', exact: true }).click();
    await page.getByText(/Aparelho cadastrado/).waitFor();
    assert.equal(await page.evaluate(() => window.pushFixture.permissions), 1);
    await page.getByRole('button', { name: 'Desativar neste aparelho', exact: true }).click();
    await page.getByText('Avisos desativados neste aparelho.').waitFor();
    assert.equal(removed, 1);
    assert.equal(await page.evaluate(() => window.pushFixture.unsubscribed), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Push panel consent, explicit activation, disable and responsive layout passed. Browser push and API fixtures only.');
} finally { await browser.close(); }
