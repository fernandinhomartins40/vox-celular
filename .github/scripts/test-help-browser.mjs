import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/loja') return route.fulfill({ json: { id: 'store' } });
      if (path === '/api/guias') return route.fulfill({ json: [{ id: 'guide', operadora: 'TIM', topico: 'chip-esim', titulo: 'Ajuda revisada sobre eSIM', resumo: 'Consulte as orientações oficiais.', passos: ['Consulte a compatibilidade na fonte oficial.'], fonte: 'https://www.tim.com.br/ajuda/tim-chip/esim', canalOficial: 'https://www.tim.com.br/ajuda', revisadoEm: '2026-10-12T10:00:00Z', validoAte: '2099-01-01T00:00:00Z' }] });
      throw new Error(`Unexpected help request ${path}`);
    });
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/ajuda`);
    await page.getByRole('button', { name: 'TIM', exact: true }).click();
    await page.getByRole('button', { name: 'Chip e eSIM', exact: true }).click();
    await page.getByRole('heading', { name: 'Ajuda revisada sobre eSIM' }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Consultar fonte oficial' }).getAttribute('href'), 'https://www.tim.com.br/ajuda/tim-chip/esim');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: 'Voltar', exact: true }).click();
    await page.getByRole('button', { name: 'Perda ou roubo', exact: true }).click();
    await page.getByText('A Vox ainda não tem um guia vigente para este assunto.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Abrir atendimento oficial da TIM' }).getAttribute('href'), 'https://www.tim.com.br/ajuda');
    assert.equal(await page.getByRole('link', { name: 'Consultar fonte oficial' }).count(), 0);
    await page.close();
  }
  console.log('PASS: public three-step operator help, reviewed guide sources, missing-guide fallback, navigation and responsive layout. Fixtures only.');
} finally { await browser.close(); }
