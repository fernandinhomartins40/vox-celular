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
    const next = () => page.getByRole('button', { name: 'Continuar', exact: true }).click();
    const choose = label => page.getByRole('button', { name: label, exact: true }).click();
    async function budget(value = '2000') {
      await page.locator('.discovery-question').waitFor();
      if (await page.getByRole('heading', { name: 'Qual vai ser seu upgrade?' }).count()) await next();
      await page.getByLabel('Valor máximo em reais').fill(value);
      await next();
    }
    async function recommendations() {
      await page.getByRole('button', { name: 'Mostrar opções', exact: true }).click();
      await page.getByRole('heading', { name: 'Seu próximo match.' }).waitFor();
    }
    await page.goto(`${base}/assistente`);
    await budget(); await choose('Produzir'); await next();
    assert.equal(await page.getByRole('checkbox').isChecked(), false);
    await recommendations();
    await page.getByRole('button', { name: 'Por que combina comigo?' }).click();
    await page.getByText('Capa compatível fixture', { exact: true }).waitFor();
    assert.equal(submitted.orcamento, 2000);
    assert.equal(externalSubmitted, undefined);
    assert.equal(submitted.uso, 'trabalho');
    assert.equal(submitted.ramMinima, undefined);
    assert.equal(await page.getByRole('cell', { name: 'Não informado', exact: true }).count(), 3);
    await page.getByRole('button', { name: 'Fechar detalhes' }).click();
    await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('vox_cart'))?.[0]?.preco === 1800);
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('vox_cart'))[0].qty), 1);
    await page.reload(); await budget(); await next(); await recommendations();
    currentPrice = 2100;
    await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'ultrapassa seu orçamento' }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('vox_cart'))[0].qty), 1);
    await choose('Ajustar escolhas');
    assert.equal(await page.getByLabel('Valor máximo em reais').inputValue(), '2000');
    currentPrice = 1800;
    await next(); await next();
    await choose('Ajustes opcionais');
    await page.getByLabel('RAM mínima').selectOption('8');
    await choose('Fechar detalhes'); await recommendations();
    await choose('Adicionar ao carrinho');
    await page.getByRole('alert').filter({ hasText: 'informações técnicas mudaram' }).waitFor();
    currentAttributes = { tipo: 'celular', ramGB: 8, verificado: true, fonte: 'https://manufacturer.example/specs' };
    await choose('Adicionar ao carrinho');
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('vox_cart'))[0].qty === 2);
    await page.reload(); await choose('Tablet'); await budget(); await next(); await recommendations();
    await page.getByText('Não encontramos opções que atendam aos critérios.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).count(), 0);
    assert.equal(new URL(await page.getByRole('link', { name: 'Pedir ajuda à Vox' }).getAttribute('href')).hostname, 'wa.me');
    await choose('Ajustar escolhas'); await next(); await next();
    await page.getByRole('checkbox').check(); await recommendations();
    await page.getByText('IA indisponível ou não configurada. Seleção pelas regras do catálogo.', { exact: true }).waitFor();
    assert.equal(externalSubmitted.autorizaProcessamentoExterno, true);
    assert.equal(externalSubmitted.necessidades.lojaId, 'store');
    assert.deepEqual(Object.keys(externalSubmitted).sort(), ['autorizaProcessamentoExterno', 'necessidades']);
    for (const [uso, label] of [['fotos', 'Criar'], ['estudos', 'Aprender'], ['redes-sociais', 'Compartilhar']]) {
      await choose('Ajustar escolhas'); await next(); await choose(label); await next();
      assert.equal(await page.getByRole('checkbox').isChecked(), false);
      await choose('Bateria'); await recommendations();
      assert.equal(submitted.uso, uso); assert.equal(submitted.prioridade, 'bateria');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.close();
  }
  // A clipped canvas is not a passing no-scroll experience: every primary control must fit.
  for (const [width, height] of [[320, 568], [390, 667], [390, 844], [768, 900], [1440, 900], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const device = { id: 'real-fixture', lojaId: 'store', nome: 'Aparelho de teste com nome longo', preco: 1800, estoque: 1, categoria: 'Celulares' };
    await page.route('**/api/**', route => route.fulfill({ json: new URL(route.request().url()).pathname === '/api/loja' ? { id: 'store' } : { aviso: 'Seleção pelas regras do catálogo, sem inteligência artificial.', resultados: [1, 2, 3].map(id => ({ produto: { ...device, id: String(id) }, motivos: ['Dentro do orçamento informado.'] })) } }));
    await page.goto(`${base}/assistente`);
    await page.getByRole('heading', { name: 'Qual vai ser seu upgrade?' }).waitFor();
    const fit = async scene => {
      const problems = await page.evaluate(() => {
        const out = [];
        if (document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1) out.push('document overflow');
        for (const el of document.querySelectorAll('.discovery-header a,.discovery-header button,.discovery-scene button,.discovery-scene input,.discovery-product button,.discovery-actions button,.discovery-actions a,.discovery-pager button')) {
          const r = el.getBoundingClientRect();
          if (r.width && r.height && (r.top < -1 || r.left < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1)) out.push(`${el.textContent}: ${JSON.stringify(r.toJSON())}`);
        }
        return out;
      });
      assert.deepEqual(problems, [], `${width}x${height} ${scene} must fit without scrolling or clipping`);
      if (width === 390 && height === 844) await page.screenshot({ path: `.git/discovery-${scene}.png` });
    };
    await fit('type');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await fit('budget');
    await page.getByLabel('Valor máximo em reais').fill('2000');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await fit('usage');
    await page.getByRole('button', { name: 'Criar', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await fit('priority');
    await page.getByRole('button', { name: 'Mostrar opções', exact: true }).click();
    await page.getByRole('heading', { name: 'Seu próximo match.' }).waitFor(); await fit('result');
    await page.getByRole('button', { name: /Ver opção 2:/ }).click();
    assert.equal(await page.locator('.discovery-product').count(), 1);
    assert.equal(await page.getByRole('button', { name: /Ver opção 2:/ }).getAttribute('aria-pressed'), 'true');
    await page.close();
  }
  console.log('PASS: single-choice full-screen discovery; criteria, consent, fallback, current cart prices, budget and empty results; six viewport layouts without scrolling or clipped controls. API fixtures only.');
} finally { await browser.close(); }
