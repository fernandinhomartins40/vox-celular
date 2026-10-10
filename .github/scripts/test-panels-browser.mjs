import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const base = process.env.PANEL_BASE ?? 'http://127.0.0.1:3196';
const browser = await chromium.launch({ headless: true, ...(process.env.PANEL_BROWSER ? { executablePath: process.env.PANEL_BROWSER } : {}) });
const order = { id: 'fixture-order', codigo: 'VOX-123', total: 2299, status: 'NOVO', pagamento: 'Pix', createdAt: '2026-10-10T12:00:00Z', clienteNome: 'Maria Silva', clienteId: 'fixture-customer', clienteTelefone: '5542991031420', cliente: { usuario: { nome: 'Maria Silva' } }, itens: [{ produto: { nome: 'Celular de teste' }, quantidade: 1, precoUnitario: 2299 }] };
const product = { id: 'fixture-product', nome: 'Celular de teste', descricao: 'Descrição de teste', categoria: 'Celulares', preco: 2299, estoque: 5, ativo: true, destaque: false };
const customer = { id: 'fixture-customer', nome: 'Maria Silva', email: 'maria@example.test', pedidos: 1, totalGasto: '2299.00', pontos: 500, cidade: 'Palmital', createdAt: order.createdAt, historicoPedidos: [order] };
const reward = { id: 'fixture-reward', titulo: 'Vale de teste', pontos: 100 };
let points = 500;
let receipts = [];
let failPointsRefresh = false;
const responses = () => ({
  '/loja': { id: 'fixture-store' }, '/config': {},
  '/dashboard': { pedidosHoje: 1, pedidosMes: 1, faturamentoMes: 2299, faturamentoOntem: 0, ticketMedio: 2299, estoqueBaixo: 0, grafico: [{ dia: '10/10', valor: 0 }] },
  '/pedidos': [order], '/pedidos/meus': [order], '/produtos/admin': [product],
  '/clientes': [customer, { ...customer, id: 'fixture-second-customer', nome: 'João Souza', email: 'joao@example.test', totalGasto: '1000.00', historicoPedidos: [] }], '/promocoes': [],
  '/fidelidade/pontos': { saldo: points, nivel: 'Prata', meta: 600, proximoNivel: 'Ouro', recompensas: [reward], historico: [], resgates: receipts },
});
try {
  for (const width of (process.env.PANEL_WIDTHS ?? '320,390,768,1024,1280,1440,1920').split(',').map(Number)) {
    for (const role of ['LOJISTA', 'CLIENTE']) {
      order.status = 'NOVO';
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      let savedProduct;
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(user => localStorage.setItem('vox_user', JSON.stringify(user)), { nome: 'Maria Silva', email: 'maria@example.test', role, lojaId: 'fixture-store', token: 'fixture-token' });
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        const path = url.pathname.replace(/^\/api/, '');
        let data = responses()[path];
        if (path === '/produtos' && route.request().method() === 'POST') { savedProduct = route.request().postDataJSON(); data = { ...savedProduct, id: 'fixture-created-product' }; }
        if (path.endsWith('/status')) { order.status = route.request().postDataJSON().status; data = order; }
        if (path.startsWith('/fidelidade/resgatar/')) { points -= 100; receipts = [{ id: 'receipt-1', codigo: 'REWARD-123', recompensa: { titulo: reward.titulo }, createdAt: order.createdAt }]; data = { codigo: 'REWARD-123', saldo: points }; }
        if (path === '/fidelidade/pontos' && failPointsRefresh) { failPointsRefresh = false; await route.fulfill({ status: 503, json: { error: 'Refresh unavailable' } }); return; }
        if (path === '/auth/senha') data = { ok: true };
        if (data === undefined) throw new Error(`Unexpected fixture API request: ${path}`);
        await route.fulfill({ json: data });
      });
      await page.route('https://fonts.googleapis.com/**', route => route.abort());
      const prefix = role === 'LOJISTA' ? '/admin' : '/area-cliente';
      const routes = role === 'LOJISTA' ? ['', '/pedidos', '/produtos', '/clientes', '/configuracoes', '/conta'] : ['', '/pedidos', '/beneficios', '/fidelidade', '/promocoes', '/conta'];
      for (const route of routes) {
        await page.goto(base + prefix + route);
        await page.locator('main h1').waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${prefix + route} overflow at ${width}`);
        assert.equal(await page.locator('.panel-content').evaluate(el => getComputedStyle(el).fontFamily.includes('DM Sans')), true);
        if (width < 1024) {
          await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
          await page.getByRole('dialog', { name: 'Menu de navegação' }).waitFor();
          await page.keyboard.press('Escape');
          assert.equal(await page.getByRole('button', { name: 'Abrir menu', exact: true }).evaluate(el => document.activeElement === el), true);
        }
        if (process.env.PANEL_SCREENSHOTS && route === '') {
          await mkdir(process.env.PANEL_SCREENSHOTS, { recursive: true });
          await page.screenshot({ path: `${process.env.PANEL_SCREENSHOTS}/${role}-${width}.png`, fullPage: true });
        }
      }
      await page.goto(base + prefix);
      const quick = page.getByRole('navigation', { name: 'Ações rápidas' });
      await quick.getByRole('link').first().click();
      await page.locator('main h1').waitFor();
      const details = role === 'LOJISTA' ? page.getByRole('button', { name: 'Ver detalhes', exact: true }).first() : page.getByRole('button', { name: 'Detalhes', exact: true }).first();
      await details.click();
      const dialog = page.getByRole('dialog', { name: 'Detalhes do pedido' });
      await dialog.waitFor();
      await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await details.evaluate(el => document.activeElement === el), true);
      if (role === 'LOJISTA') {
        await details.click();
        await dialog.getByRole('button', { name: /Iniciar preparo|Marcar como pronto|Confirmar entrega/ }).click();
        await dialog.getByText(order.status === 'EM_PREPARO' ? 'Em preparo' : order.status === 'PRONTO' ? 'Pronto' : 'Entregue', { exact: true }).waitFor();
        await page.keyboard.press('Escape');
        await page.goto(base + '/admin/produtos');
        await page.getByRole('button', { name: 'Novo produto', exact: true }).click();
        await page.getByRole('button', { name: 'Continuar', exact: true }).click();
        await page.getByRole('alert').getByText(/nome do produto/).waitFor();
        await page.getByLabel('Nome do produto', { exact: true }).fill('Produto criado');
        await page.getByLabel('Descrição', { exact: true }).fill('Descrição preenchida');
        await page.getByLabel('Foto do produto').setInputFiles({ name: 'test.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="#0825a3"/></svg>') });
        await page.getByRole('button', { name: 'Ajustar imagem', exact: true }).waitFor();
        assert.equal(await page.getByRole('dialog', { name: 'Ajustar imagem', exact: true }).count(), 0, 'Image ready without mandatory crop');
        await page.getByRole('button', { name: 'Ajustar imagem', exact: true }).click();
        const crop = page.getByRole('dialog', { name: 'Ajustar imagem', exact: true });
        await crop.waitFor();
        await page.getByRole('button', { name: 'Redimensionar canto superior esquerdo' }).focus();
        await page.keyboard.press('-');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Crop overflow at ${width}`);
        await crop.getByRole('button', { name: 'Aplicar Corte', exact: true }).click();
        await page.getByRole('button', { name: 'Continuar', exact: true }).click();
        await page.getByLabel('Preço atual (R$)', { exact: true }).fill('199');
        await page.getByLabel('Estoque disponível', { exact: true }).fill('10');
        await page.getByRole('button', { name: 'Voltar', exact: true }).click();
        assert.equal(await page.getByLabel('Nome do produto', { exact: true }).inputValue(), 'Produto criado');
        assert.equal(await page.getByRole('list', { name: 'Etapas da tarefa' }).getByRole('listitem').count(), 3);
        await page.getByRole('button', { name: 'Continuar', exact: true }).click();
        assert.equal(await page.getByLabel('Preço atual (R$)', { exact: true }).inputValue(), '199');
        await page.getByRole('button', { name: 'Continuar', exact: true }).click();
        await page.getByRole('heading', { name: 'Confira antes de salvar' }).waitFor();
        if (process.env.PANEL_SCREENSHOTS) await page.screenshot({ path: `${process.env.PANEL_SCREENSHOTS}/product-${width}.png`, fullPage: true });
        await page.getByRole('button', { name: 'Cadastrar produto', exact: true }).click();
        await page.getByText('Produto criado', { exact: true }).waitFor();
        assert.equal(savedProduct.preco, 199);
        assert.equal(savedProduct.estoque, 10);
        assert(savedProduct.image.dataUrl.startsWith('data:image/webp'));
        await page.goto(base + '/admin/clientes');
        await page.getByText('R$ 1.649,50', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Ver detalhes de Maria Silva', exact: true }).click();
        const customerDialog = page.getByRole('dialog', { name: 'Detalhes do cliente' });
        await customerDialog.waitFor();
        await customerDialog.getByRole('link', { name: /VOX-123/ }).click();
        await page.getByRole('dialog', { name: 'Detalhes do pedido' }).waitFor();
        assert(new URL(page.url()).searchParams.get('pedido') === order.id);
        await page.keyboard.press('Escape');
        await page.goto(base + '/admin/produtos?estoque=baixo');
        assert.equal(await page.getByLabel('Filtrar estoque').inputValue(), 'baixo');
        await page.getByLabel('Buscar produto').fill('inexistente');
        await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
        await page.getByText(product.nome, { exact: true }).waitFor();
      } else {
        points = 500; receipts = [];
        await page.goto(base + '/area-cliente/fidelidade');
        if (process.env.PANEL_SCREENSHOTS) { await page.getByRole('button', { name: 'Resgatar', exact: true }).waitFor(); await page.screenshot({ path: `${process.env.PANEL_SCREENSHOTS}/benefits-${width}.png`, fullPage: true }); }
        await page.getByRole('button', { name: 'Resgatar', exact: true }).click();
        assert.equal(points, 500, 'Selecting reward cannot debit points before confirmation');
        failPointsRefresh = true;
        await page.getByRole('button', { name: 'Confirmar resgate', exact: true }).click();
        await page.getByRole('dialog', { name: 'Resgate confirmado' }).waitFor();
        await page.getByText('REWARD-123', { exact: true }).waitFor();
        const whatsapp = await page.getByRole('dialog').getByRole('link', { name: 'WhatsApp' }).getAttribute('href');
        assert(new URL(whatsapp).searchParams.get('text').includes('REWARD-123'));
        await page.keyboard.press('Escape');
        assert.equal(points, 400);
        await page.reload();
        await page.getByRole('button', { name: 'Ver código', exact: true }).click();
        await page.getByText('REWARD-123', { exact: true }).waitFor();
        assert.equal(points, 400, 'Reading saved receipt does not debit points again');
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Ofertas da loja', exact: true }).click();
        assert.equal(new URL(page.url()).searchParams.get('aba'), 'ofertas');
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const path of ['/admin/login', '/area-cliente/login']) {
      await page.goto(base + path);
      await page.getByLabel('E-mail', { exact: true }).fill('example@example.test');
      await page.getByLabel('Senha', { exact: true }).fill('test-password');
      await page.getByRole('button', { name: 'Mostrar senha' }).click();
      assert.equal(await page.getByLabel('Senha', { exact: true }).getAttribute('type'), 'text');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.addInitScript(() => localStorage.setItem('vox_user', JSON.stringify({ nome: 'Maria', role: 'LOJISTA', token: 'fixture-token' })));
  await page.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.goto(base + '/admin/pedidos');
  await page.getByText('Nenhum pedido encontrado.', { exact: true }).waitFor();
  await page.route('**/api/pedidos', route => route.fulfill({ status: 503, json: { error: 'Serviço indisponível' } }));
  await page.reload();
  await page.getByRole('alert').waitFor();
  await page.getByRole('button', { name: 'Tentar novamente' }).waitFor();
  await page.close();
  console.log(`PASS: both panels, viewports ${process.env.PANEL_WIDTHS ?? '320,390,768,1024,1280,1440,1920'}, all routes, shared navigation, keyboard focus, order updates, guided three-step product flow, contextual links and stock filters, persistent receipts after refresh failures, retained form values, rewards and login controls, empty and failure states. API fixtures only; no production writes.`);
} finally { await browser.close(); }
