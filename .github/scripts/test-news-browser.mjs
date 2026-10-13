import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let empty = false; const errors = []; page.on('pageerror', error => errors.push(error.message));
    const news = { id: 'news-one', titulo: 'Novidade fixture', resumo: 'Resumo editorial conferido', texto: '<script>window.__unsafeNews=true</script>\nTexto literal.', fonte: 'https://example.invalid/source', revisadoEm: '2026-10-13T10:00:00Z', validoAte: '2026-11-13T10:00:00Z' };
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/loja')) return route.fulfill({ json: { id: 'fixture' } });
      assert.equal(url.searchParams.get('lojaId'), 'fixture');
      if (url.pathname.endsWith('/novidades/news-one')) return route.fulfill({ json: news });
      return route.fulfill({ json: empty ? [] : [news] });
    });
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/novidades`);
    await page.getByRole('heading', { name: news.titulo, exact: true }).waitFor();
    await page.getByRole('link', { name: 'Ler novidade', exact: true }).click();
    await page.getByText(news.texto, { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__unsafeNews), undefined, 'Content must remain literal text');
    assert.equal(await page.getByRole('link', { name: 'Consultar fonte' }).getAttribute('href'), news.fonte);
    assert.equal(await page.getByRole('link', { name: 'Consultar fonte' }).getAttribute('rel'), 'noopener noreferrer');
    empty = true; await page.getByRole('link', { name: 'Todas as novidades' }).click();
    await page.getByText('Nenhuma novidade publicada no momento.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('News responsive listing/detail, explicit store, source and literal content passed with mock API.');
} finally { await browser.close(); }
