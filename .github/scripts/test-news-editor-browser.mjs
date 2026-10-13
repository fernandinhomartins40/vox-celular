import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let rows = []; const writes = []; const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ nome: 'Lojista', role: 'LOJISTA', lojaId: 'fixture', token: 'fixture-token' })));
    await page.route('**/api/**', route => {
      const req = route.request(); const pathname = new URL(req.url()).pathname;
      if (pathname.endsWith('/novidades/admin')) return route.fulfill({ json: rows });
      if (pathname.endsWith('/novidades') && req.method() === 'POST') {
        const body = req.postDataJSON(); writes.push(body); rows = [{ ...body, id: 'news-one' }];
        return route.fulfill({ status: 201, json: rows[0] });
      }
      if (pathname.endsWith('/novidades/news-one') && req.method() === 'PUT') {
        const body = req.postDataJSON(); writes.push(body); rows = [{ ...body, id: 'news-one' }];
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({ json: { id: 'fixture' } });
    });
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/admin/novidades`);
    await page.getByRole('button', { name: 'Nova novidade', exact: true }).click();
    const form = page.getByRole('form', { name: 'Editar novidade' });
    await form.getByLabel('Título', { exact: true }).fill('Novidade fixture');
    await form.getByLabel('Resumo', { exact: true }).fill('Resumo de conteúdo editorial');
    await form.getByLabel('Texto da novidade', { exact: true }).fill('<script>window.__editorUnsafe=true</script> Conteúdo literal.');
    await form.getByLabel('Fonte HTTPS', { exact: true }).fill('https://example.invalid/source');
    await form.getByLabel('Revisado em', { exact: true }).fill('2026-10-12T10:00');
    await form.getByLabel('Válido até', { exact: true }).fill('2026-11-12T10:00');
    await page.getByText('Conferir prévia do texto', { exact: true }).click();
    assert.equal(await page.evaluate(() => window.__editorUnsafe), undefined);
    await form.getByRole('button', { name: 'Salvar novidade', exact: true }).click();
    await page.getByText('Rascunho salvo.', { exact: true }).waitFor();
    assert.equal(writes[0].publicado, false);
    assert.ok(Number.isFinite(Date.parse(writes[0].revisadoEm)));
    await page.getByRole('button', { name: 'Editar novidade', exact: true }).click();
    assert.equal(await form.getByLabel('Título', { exact: true }).inputValue(), 'Novidade fixture');
    await form.getByRole('checkbox', { name: 'Publicar na loja', exact: true }).check();
    await form.getByRole('button', { name: 'Salvar novidade', exact: true }).click();
    await page.getByText('Novidade publicada.', { exact: true }).waitFor();
    assert.equal(writes[1].publicado, true);
    await page.getByRole('button', { name: 'Editar novidade', exact: true }).click();
    await form.getByRole('checkbox', { name: 'Publicar na loja', exact: true }).uncheck();
    await form.getByRole('button', { name: 'Salvar novidade', exact: true }).click();
    await page.getByText('Rascunho salvo.', { exact: true }).waitFor();
    assert.equal(writes[2].publicado, false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('Editorial editor draft, literal preview, retained fields, publish/unpublish and responsive UI passed with mock API.');
} finally { await browser.close(); }
