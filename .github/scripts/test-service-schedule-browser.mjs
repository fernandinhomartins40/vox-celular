import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let changes = 0, fail = true;
    const ticket = { id: 'ticket', lojaId: 'fixture', servicoId: 'service', horarioId: 'old', horario: { inicio: '2100-01-01T12:00:00Z' }, protocolo: 'VOX-SVC-1', status: 'RECEBIDA', aparelho: 'Aparelho fixture', problema: 'Problema fixture', servico: { titulo: 'Diagnóstico' }, historico: [] };
    await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ nome: 'Cliente', role: 'CLIENTE', lojaId: 'fixture', token: 'fixture-token' })));
    await page.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (path.endsWith('/servicos/solicitacoes/ticket/horario')) {
        assert.deepEqual(req.postDataJSON(), { horarioId: 'new', horarioAtualId: 'old' }); changes++;
        if (fail) return route.fulfill({ status: 409, json: { error: 'Horário ocupado. Sua reserva foi mantida.' } });
        ticket.horarioId = 'new'; ticket.horario.inicio = '2100-01-02T12:00:00Z';
        return route.fulfill({ json: { ok: true } });
      }
      if (path.endsWith('/agenda')) return route.fulfill({ json: [{ id: 'old', inicio: '2100-01-01T12:00:00Z', vagas: 0 }, { id: 'new', inicio: '2100-01-02T12:00:00Z', vagas: 1 }] });
      if (path.endsWith('/servicos/solicitacoes')) return route.fulfill({ json: [ticket] });
      if (path.endsWith('/servicos')) return route.fulfill({ json: [] });
      return route.fulfill({ json: { id: 'fixture' } });
    });
    await page.goto(`${process.env.PANEL_BASE || 'http://127.0.0.1:3196'}/area-cliente/servicos`);
    await page.getByRole('button', { name: 'Trocar horário', exact: true }).click();
    await page.getByLabel('Novo horário', { exact: true }).selectOption('new');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Confirmar novo horário' }).click(); assert.equal(changes, 0);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Confirmar novo horário' }).click();
    await page.getByRole('alert').filter({ hasText: 'Sua reserva foi mantida' }).waitFor();
    assert.equal(ticket.horarioId, 'old');
    assert.equal(await page.getByLabel('Novo horário', { exact: true }).inputValue(), 'new');
    fail = false; page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Confirmar novo horário' }).click();
    await page.getByText('Novo horário confirmado.', { exact: true }).waitFor();
    assert.equal(changes, 2);
    await page.getByText(/Horário reservado: 02\/01\/2100/).waitFor();
    assert.equal(await page.getByLabel('Novo horário', { exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('Schedule UI: explicit confirmation, cancel without POST, conflict preservation and successful refresh passed with mock API.');
} finally { await browser.close(); }
