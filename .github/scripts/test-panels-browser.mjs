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
  '/privacidade/preferencias': { personalizacao: false, notificacoes: false, versaoAviso: '2026-10-12' },
  '/auth/sessoes': [],
  '/servicos': [{ id: 'service', titulo: 'Diagnóstico', descricao: 'Análise do aparelho', preco: null, agendamento: true }],
  '/agenda': [{ id: 'available-slot', inicio: '2026-11-01T13:00:00.000Z', fim: '2026-11-01T14:00:00.000Z', vagas: 1 }, { id: 'full-slot', inicio: '2026-11-02T13:00:00.000Z', fim: '2026-11-02T14:00:00.000Z', vagas: 0 }],
  '/servicos/admin': [{ id: 'service', titulo: 'Diagnóstico', descricao: 'Análise do aparelho', preco: null, ativo: true }],
  '/agenda/admin': [],
  '/guias/admin': [],
  '/servicos/solicitacoes': [],
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
      page.setDefaultTimeout(30000);
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
        if (path === '/servicos' && route.request().method() === 'POST') {
          const body = route.request().postDataJSON();
          assert.equal(body.preco, null, 'Empty service price is a quote, not zero');
          data = { ...body, id: 'new-service' };
        }
        if (path === '/servicos/solicitacoes' && route.request().method() === 'POST') {
          const body = route.request().postDataJSON();
          assert.match(body.chaveIdempotencia, /^[0-9a-f-]{36}$/);
          assert.equal(body.horarioId, 'available-slot');
          data = { ...body, id: 'service-request', protocolo: 'VOX-S-FIXTURE', status: 'RECEBIDA' };
        }
        if (data === undefined) throw new Error(`Unexpected fixture API request: ${path}`);
        await route.fulfill({ json: data });
      });
      await page.route('https://fonts.googleapis.com/**', route => route.abort());
      const prefix = role === 'LOJISTA' ? '/admin' : '/area-cliente';
      const routes = role === 'LOJISTA' ? ['', '/pedidos', '/produtos', '/clientes', '/configuracoes', '/conta', '/servicos', '/guias'] : ['', '/pedidos', '/beneficios', '/fidelidade', '/promocoes', '/conta', '/servicos'];
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
        if (process.env.PANEL_SCREENSHOTS && (route === '' || route === '/conta')) {
          await mkdir(process.env.PANEL_SCREENSHOTS, { recursive: true });
          await page.screenshot({ path: `${process.env.PANEL_SCREENSHOTS}/${role}-${width}${route === '/conta' ? '-account' : ''}.png`, fullPage: true });
        }
      }
      if (role === 'LOJISTA') {
        await page.goto(base + prefix + '/servicos');
        await page.getByRole('button', { name: 'Agenda de atendimento', exact: true }).click();
        await page.getByRole('heading', { name: 'Abrir horário de atendimento' }).waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Agenda overflow at ${width}`);
        await page.getByRole('button', { name: 'Catálogo de serviços', exact: true }).click();
        await page.getByRole('button', { name: 'Novo serviço', exact: true }).click();
        await page.getByLabel('Nome do serviço', { exact: true }).fill('Troca de bateria');
        await page.getByLabel('Descrição', { exact: true }).fill('Avaliação e troca após orçamento aprovado.');
        await page.getByRole('button', { name: 'Salvar serviço', exact: true }).click();
        await page.getByRole('status').filter({ hasText: 'Serviço salvo.' }).waitFor();
        await page.goto(base + prefix + '/guias');
        await page.getByRole('button', { name: 'Novo guia', exact: true }).click();
        await page.getByLabel('Título', { exact: true }).fill('Ajuda com chip');
        await page.getByLabel('Resumo', { exact: true }).fill('Consulte as orientações oficiais.');
        await page.getByRole('checkbox').check();
        await page.getByRole('textbox', { name: /^Resumo/ }).fill('Texto revisado com as orientações oficiais.');
        assert.equal(await page.getByRole('checkbox').isChecked(), false, 'Content changes require publication review');
        await page.getByRole('region', { name: 'Prévia do guia' }).getByText('Texto revisado com as orientações oficiais.', { exact: true }).waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Guide editor overflow at ${width}`);
      }
      if (role === 'CLIENTE') {
        await page.goto(base + prefix + '/servicos');
        await page.getByRole('combobox', { name: /^Serviço/ }).selectOption('service');
        await page.getByRole('button', { name: 'Continuar', exact: true }).click();
        const schedule = page.getByRole('combobox', { name: /^Horário de atendimento/ });
        await schedule.selectOption('available-slot');
        assert.equal(await schedule.locator('option[value="full-slot"]').evaluate(option => option.disabled), true);
        await page.getByLabel('Aparelho', { exact: true }).fill('Samsung Galaxy A55');
        await page.getByLabel('O que está acontecendo?', { exact: true }).fill('A bateria descarrega rapidamente.');
        await page.getByRole('button', { name: 'Continuar', exact: true }).click();
        await page.getByRole('heading', { name: 'Confira antes de enviar' }).waitFor();
        await page.getByRole('button', { name: 'Enviar solicitação', exact: true }).click();
        await page.getByRole('status').filter({ hasText: 'VOX-S-FIXTURE' }).waitFor();
        await page.getByRole('status').filter({ hasText: 'Horário reservado:' }).waitFor();
      }
      await page.goto(base + prefix);
      await page.getByRole('region', { name: 'Próximo passo' }).getByRole('link').first().click();
      await page.locator('main h1').waitFor();
      const details = role === 'LOJISTA' ? page.getByRole('button', { name: 'Ver detalhes', exact: true }).first() : page.getByRole('button', { name: 'Detalhes', exact: true }).first();
      if (role === 'LOJISTA') await details.click();
      const dialog = page.getByRole('dialog', { name: 'Detalhes do pedido' });
      await dialog.waitFor();
      await page.waitForFunction(() => document.querySelector('[role="dialog"][aria-label="Detalhes do pedido"]')?.contains(document.activeElement));
      await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      if (role === 'LOJISTA') {
        await page.waitForFunction(() => document.activeElement?.matches('button[aria-label="Ver detalhes"]') || document.activeElement?.textContent?.trim() === 'Ver detalhes');
        assert.equal(await details.evaluate(el => document.activeElement === el), true);
      }
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
        await page.getByRole('dialog', { name: 'Produto', exact: true }).waitFor({ state: 'hidden' });
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
      page.setDefaultTimeout(30000);
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
  for (const width of [390, 1440]) {
    for (const role of ['LOJISTA', 'CLIENTE']) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.setDefaultTimeout(30000);
      const orders = Array.from({ length: 25 }, (_, index) => ({ ...order, id: `order-${index}`, codigo: `ORDER-${String(index).padStart(2, '0')}`, clienteId: `customer-${index}`, status: index === 0 ? 'ENTREGUE' : 'NOVO' }));
      const products = Array.from({ length: 25 }, (_, index) => ({ ...product, id: `product-${index}`, nome: `Product ${String(index).padStart(2, '0')}` }));
      const customers = Array.from({ length: 25 }, (_, index) => ({ ...customer, id: `customer-${index}`, nome: `Customer ${String(index).padStart(2, '0')}`, historicoPedidos: [orders[index]] }));
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(role => localStorage.setItem('vox_user', JSON.stringify({ role, nome: 'Test User', email: 'test@example.test', token: 'fixture-token' })), role);
      await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
        const data = { ...responses(), '/pedidos': orders, '/pedidos/meus': orders, '/clientes': customers, '/produtos/admin': products }[path];
        return route.fulfill({ json: data ?? [] });
      });
      await page.goto(base + (role === 'LOJISTA' ? '/admin' : '/area-cliente'));
      await page.getByRole('region', { name: 'Próximo passo' }).waitFor();
      if (width === 390) assert.equal(await page.getByRole('navigation', { name: 'Atalhos do painel' }).isVisible(), true);
      if (role === 'CLIENTE') assert.equal(await page.getByRole('link', { name: 'Ver meu pedido', exact: true }).getAttribute('href'), '/area-cliente/pedidos?pedido=order-1', 'An open order takes priority over a newer completed purchase');
      const routes = role === 'LOJISTA' ? ['/admin/pedidos', '/admin/produtos', '/admin/clientes'] : ['/area-cliente/pedidos'];
      for (const route of routes) {
        await page.goto(base + route);
        const paging = page.getByRole('navigation', { name: /^Páginas de/ });
        await paging.getByText(/1–12 de 25/).waitFor();
        await paging.getByRole('button', { name: 'Próxima', exact: true }).click();
        await paging.getByText(/13–24 de 25/).waitFor();
        await page.reload();
        await paging.getByText(/13–24 de 25/).waitFor();
        const search = route.endsWith('produtos') ? page.getByLabel('Buscar produto') : route.endsWith('clientes') ? page.getByLabel('Buscar cliente') : role === 'LOJISTA' ? page.getByLabel('Buscar pedido ou cliente') : page.getByLabel('Buscar compra');
        await search.fill(route.endsWith('produtos') ? 'Product 24' : route.endsWith('clientes') ? 'Customer 24' : 'ORDER-24');
        await paging.getByText(/1–1 de 1/).waitFor();
        assert.equal(new URL(page.url()).searchParams.has('pagina'), false, 'Search covers all records and restarts at page one');
        if (route.endsWith('clientes')) {
          await page.getByRole('button', { name: 'Ver detalhes de Customer 24', exact: true }).click();
          await page.getByRole('dialog', { name: 'Detalhes do cliente' }).waitFor();
          await page.reload();
          await page.getByRole('dialog', { name: 'Detalhes do cliente' }).waitFor();
          await page.keyboard.press('Escape');
          assert.equal(await search.inputValue(), 'Customer 24');
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${route}: pagination stays within ${width}px`);
      }
      if (role === 'CLIENTE') {
        await page.goto(base + '/area-cliente/beneficios');
        await page.getByRole('button', { name: 'Resgatar', exact: true }).click();
        await page.getByRole('button', { name: 'Confirmar resgate', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Ofertas da loja', exact: true }).click();
        await page.getByRole('button', { name: 'Pontos e recompensas', exact: true }).click();
        await page.getByRole('button', { name: 'Confirmar resgate', exact: true }).waitFor();
      }
      await page.goto(base + (role === 'LOJISTA' ? '/admin/conta' : '/area-cliente/conta'));
      await page.getByLabel('Mostrar senhas', { exact: true }).check();
      assert.equal(await page.getByLabel('Nova senha', { exact: true }).getAttribute('type'), 'text');
      assert.deepEqual(errors, []);
      await page.close();
    }
  }
  for (const role of ['LOJISTA', 'CLIENTE']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
      page.setDefaultTimeout(30000);
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
      return route.fulfill({ json: path === '/auth/login' ? { token: 'fixture-token', user: { role, nome: 'Test User', email: 'test@example.test' } } : responses()[path] ?? [] });
    });
    const prefix = role === 'LOJISTA' ? '/admin' : '/area-cliente';
    await page.goto(`${base}${prefix}/pedidos?pedido=${order.id}`);
    await page.getByLabel('E-mail', { exact: true }).fill('test@example.test');
    await page.getByLabel('Senha', { exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: role === 'LOJISTA' ? 'Entrar no painel' : 'Entrar na minha conta', exact: true }).click();
    await page.getByRole('dialog', { name: 'Detalhes do pedido' }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('pedido'), order.id, 'Login resumes the requested task');
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
      page.setDefaultTimeout(30000);
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
