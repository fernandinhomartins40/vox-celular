import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(`${process.env.PANEL_TOOLS ?? `${process.env.RUNNER_TEMP}/vox-browser`}/package.json`);
const { chromium } = require('playwright');
const base = process.env.PANEL_BASE ?? 'http://127.0.0.1:3196';
const browser = await chromium.launch({ headless: true, ...(process.env.PANEL_BROWSER ? { executablePath: process.env.PANEL_BROWSER } : {}) });
const order = { id: 'fixture-order', codigo: 'VOX-123', total: 2299, status: 'NOVO', pagamento: 'Pix', createdAt: '2026-10-10T12:00:00Z', clienteNome: 'Maria Silva', cliente: { usuario: { nome: 'Maria Silva' } }, itens: [{ produto: { nome: 'Celular de teste' }, quantidade: 1, precoUnitario: 2299 }] };
const product = { id: 'fixture-product', nome: 'Celular de teste', descricao: 'Descrição de teste', categoria: 'Celulares', preco: 2299, estoque: 5, ativo: true, destaque: false };
const customer = { id: 'fixture-customer', nome: 'Maria Silva', email: 'maria@example.test', pedidos: 1, totalGasto: 2299, pontos: 500, cidade: 'Palmital', createdAt: order.createdAt, historicoPedidos: [order] };
const reward = { id: 'fixture-reward', titulo: 'Vale de teste', pontos: 100 };
let points = 500;
const responses = () => ({
  '/loja': { id: 'fixture-store' }, '/config': {},
  '/dashboard': { pedidosHoje: 1, pedidosMes: 1, faturamentoMes: 2299, faturamentoOntem: 0, ticketMedio: 2299, estoqueBaixo: 0, grafico: [{ dia: '10/10', valor: 0 }] },
  '/pedidos': [order], '/pedidos/meus': [order], '/produtos/admin': [product],
  '/clientes': [customer], '/promocoes': [],
  '/fidelidade/pontos': { saldo: points, nivel: 'Prata', meta: 600, proximoNivel: 'Ouro', recompensas: [reward], historico: [] },
});
try {
  for (const width of [320, 390, 768, 1440]) {
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
        if (path.startsWith('/fidelidade/resgatar/')) { points -= 100; data = { codigo: 'REWARD-123' }; }
        if (data === undefined) throw new Error(`Unexpected fixture API request: ${path}`);
        await route.fulfill({ json: data });
      });
      await page.route('https://fonts.googleapis.com/**', route => route.abort());
      const prefix = role === 'LOJISTA' ? '/admin' : '/area-cliente';
      const routes = role === 'LOJISTA' ? ['', '/pedidos', '/produtos', '/clientes', '/configuracoes', '/conta'] : ['', '/pedidos', '/fidelidade', '/promocoes'];
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
      assert.equal(await details.evaluate(el => document.activeElement === el), true);
      if (role === 'LOJISTA') {
        await details.click();
        await dialog.getByRole('button', { name: /Avançar para/ }).click();
        await dialog.getByText(order.status === 'EM_PREPARO' ? 'Em preparo' : order.status === 'PRONTO' ? 'Pronto' : 'Entregue', { exact: true }).waitFor();
        await page.keyboard.press('Escape');
        await page.goto(base + '/admin/produtos');
        await page.getByRole('button', { name: 'Novo produto', exact: true }).click();
        await page.getByLabel('Nome do Produto *', { exact: true }).fill('Produto criado');
        await page.getByLabel('Descricao', { exact: true }).fill('Descrição preenchida');
        await page.getByRole('button', { name: '3. Venda', exact: true }).click();
        await page.getByLabel('Preco atual (R$) *', { exact: true }).fill('199');
        await page.getByLabel('Estoque disponivel', { exact: true }).fill('10');
        await page.getByRole('button', { name: '1. Produto', exact: true }).click();
        assert.equal(await page.getByLabel('Nome do Produto *', { exact: true }).inputValue(), 'Produto criado');
        assert.equal(await page.getByRole('button', { name: /^[123]\. / }).count(), 3);
        await page.getByRole('button', { name: '2. Imagem', exact: true }).click();
        await page.locator('input[type=file]').setInputFiles({ name: 'test.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="#0825a3"/></svg>') });
        const crop = page.getByRole('dialog', { name: 'Ajustar imagem', exact: true });
        await crop.waitFor();
        await page.getByRole('button', { name: 'Redimensionar canto superior esquerdo' }).focus();
        await page.keyboard.press('-');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Crop overflow at ${width}`);
        await crop.getByRole('button', { name: 'Aplicar Corte', exact: true }).click();
        await page.getByRole('dialog', { name: 'Produto', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Cadastrar Produto', exact: true }).click();
        await page.getByText('Produto criado', { exact: true }).waitFor();
        assert.equal(savedProduct.preco, 199);
        assert.equal(savedProduct.estoque, 10);
        assert(savedProduct.image.dataUrl.startsWith('data:image/webp'));
        await page.goto(base + '/admin/clientes');
        await page.getByRole('button', { name: 'Ver detalhes de Maria Silva', exact: true }).click();
        await page.getByRole('dialog', { name: 'Detalhes do cliente' }).waitFor();
        await page.keyboard.press('Escape');
      } else {
        points = 500;
        await page.goto(base + '/area-cliente/fidelidade');
        await page.getByRole('button', { name: 'Resgatar', exact: true }).click();
        await page.getByRole('dialog', { name: 'Resgate confirmado' }).waitFor();
        await page.getByText('REWARD-123', { exact: true }).waitFor();
        const whatsapp = await page.getByRole('dialog').getByRole('link', { name: 'WhatsApp' }).getAttribute('href');
        assert(new URL(whatsapp).searchParams.get('text').includes('REWARD-123'));
        await page.keyboard.press('Escape');
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
  console.log('PASS: both panels, 4 viewports, all routes, shared navigation, keyboard focus, order updates, three product sections, retained form values, rewards and login controls, empty and failure states. API fixtures only; no production writes.');
} finally { await browser.close(); }
