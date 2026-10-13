import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const base = process.env.PANEL_BASE ?? 'http://127.0.0.1:3196';
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let submitted;
    let externalSubmitted;
    let currentPrice = 1800;
    let currentAttributes = {};
    const device = { id: 'device', lojaId: 'store', nome: 'Aparelho da loja', categoria: 'Celulares', sub: '128 GB', preco: 1700, estoque: 4, atributosTecnicos: {} };
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/loja') return route.fulfill({ json: { id: 'store' } });
      if (path === '/api/compatibilidades') {
        const url = new URL(route.request().url());
        assert.equal(url.searchParams.get('lojaId'), 'store');
        assert.equal(url.searchParams.get('produtoId'), 'device');
        return route.fulfill({ json: [{ id: 'pair', aprovadoEm: '2026-10-13T12:00:00Z', observacao: 'Encaixe conferido pela loja fixture', acessorio: { id: 'case', nome: 'Capa compatível fixture' }, aparelho: { id: 'device', nome: device.nome } }] });
      }
      if (path === '/api/produtos') return route.fulfill({ json: [{ ...device, preco: currentPrice, atributosTecnicos: currentAttributes }] });
      if (path === '/api/assistente/recomendar-ia') {
        externalSubmitted = route.request().postDataJSON();
        return route.fulfill({ json: { modo: 'regras', aviso: 'IA indisponível ou não configurada. Seleção pelas regras do catálogo.', resultados: [], mensagem: 'Não encontramos opções que atendam aos critérios.' } });
      }
      if (path === '/api/assistente/recomendar') {
        submitted = route.request().postDataJSON();
        return route.fulfill({ json: { modo: 'regras', aviso: 'Seleção pelas regras do catálogo, sem inteligência artificial.', resultados: submitted.tipo === 'tablet' ? [] : [{ produto: device, motivos: ['Dentro do orçamento informado.'], observacao: 'Características não conferidas.', fonte: null }], mensagem: 'Não encontramos opções que atendam aos critérios.' } });
      }
      throw new Error(`Unexpected assistant fixture: ${path}`);
    });
    await page.goto(`${base}/assistente`);
    await page.getByLabel('Valor máximo em reais').fill('2000');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByLabel('Uso principal').selectOption('trabalho');
    assert.equal(await page.getByRole('checkbox').isChecked(), false);
    await page.getByRole('button', { name: 'Mostrar opções', exact: true }).click();
    await page.getByRole('heading', { name: 'Suas opções' }).waitFor();
    await page.getByText('Capa compatível fixture', { exact: true }).waitFor();
    assert.equal(submitted.orcamento, 2000);
    assert.equal(externalSubmitted, undefined, 'Default consultation must not use external AI');
    assert.equal(submitted.uso, 'trabalho');
    assert.equal(submitted.ramMinima, undefined);
    assert.equal(await page.getByRole('cell', { name: 'Não informado', exact: true }).count(), 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('vox_cart'))?.[0]?.preco === 1800);
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('vox_cart'))[0].qty), 1);
    await page.reload();
    await page.getByLabel('Valor máximo em reais').fill('2000');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Mostrar opções', exact: true }).click();
    currentPrice = 2100;
    await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'ultrapassa seu orçamento' }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('vox_cart'))[0].qty), 1);
    await page.getByRole('button', { name: 'Ajustar escolhas', exact: true }).click();
    assert.equal(await page.getByLabel('Valor máximo em reais').inputValue(), '2000');
    currentPrice = 1800;
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByText('Já sabe a memória que precisa? (opcional)', { exact: true }).click();
    await page.getByLabel('RAM mínima').selectOption('8');
    await page.getByRole('button', { name: 'Mostrar opções', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'informações técnicas mudaram' }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('vox_cart'))[0].qty), 1);
    currentAttributes = { tipo: 'celular', ramGB: 8, verificado: true, fonte: 'https://manufacturer.example/specs' };
    await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('vox_cart'))[0].qty === 2);
    await page.reload();
    await page.getByLabel('Valor máximo em reais').fill('2000');
    await page.getByLabel('O que procura?').selectOption('tablet');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Mostrar opções', exact: true }).click();
    await page.getByText('Não encontramos opções que atendam aos critérios.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).count(), 0);
    assert.equal(new URL(await page.getByRole('link', { name: 'Pedir ajuda à Vox' }).getAttribute('href')).hostname, 'wa.me');
    await page.getByRole('button', { name: 'Ajustar escolhas', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Mostrar opções', exact: true }).click();
    await page.getByText('IA indisponível ou não configurada. Seleção pelas regras do catálogo.', { exact: true }).waitFor();
    assert.equal(externalSubmitted.autorizaProcessamentoExterno, true);
    assert.equal(externalSubmitted.necessidades.lojaId, 'store');
    assert.deepEqual(Object.keys(externalSubmitted).sort(), ['autorizaProcessamentoExterno', 'necessidades']);
    await page.getByRole('button', { name: 'Ajustar escolhas', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    assert.equal(await page.getByRole('checkbox').isChecked(), false, 'New choices require new explicit authorization');
    await page.close();
  }
  console.log('PASS: public three-step assistant, retained criteria, unknown specifications, fresh cart prices, budget changes and empty tablet results at three viewports. Browser fixtures only.');
} finally { await browser.close(); }
