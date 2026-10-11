import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPanelDate, normalizeSearch, orderLink, orderTimeline, productStepError, setPanelParams, panelReturnTo } from './panel.js';

test('search accepts accents; order links encode IDs and filters preserve context', () => {
  assert.equal(normalizeSearch('  João  '), 'joao');
  assert.equal(orderLink('/admin', 'id&outro'), '/admin/pedidos?pedido=id%26outro');
  setPanelParams((update, options) => {
    assert.equal(update(new URLSearchParams('cliente=c&status=NOVO')).toString(), 'cliente=c&pedido=p');
    assert.equal(options.replace, true);
  }, { pedido: 'p', status: '' });
});
test('calendar dates keep their day; fallback timeline does not invent payment or timestamps', () => {
  assert.equal(formatPanelDate('2026-10-10'), '10/10/2026');
  assert.equal(formatPanelDate('2026-10-10T01:00:00Z'), '09/10/2026');
  const timeline = orderTimeline({ status: 'PRONTO', createdAt: '2026-10-10' });
  assert.equal(timeline.filter(t => t.ok).length, 3);
  assert.equal(timeline[1].data, null);
  assert.equal(timeline.some(t => /pagamento/i.test(t.status)), false);
  const actual = [{ status: 'Pedido recebido', ok: true, data: '2026-10-10' }];
  assert.equal(orderTimeline({ timeline: actual }).length, 1);
});
test('filtering restarts pagination; opening details and paging preserve list context', () => {
  const initial = new URLSearchParams('busca=Maria&pagina=3');
  setPanelParams(update => assert.equal(update(initial).toString(), 'busca=Joao'), { busca: 'Joao' });
  setPanelParams(update => assert.equal(update(initial).toString(), 'busca=Maria&pagina=3&clienteDetalhe=c1'), { clienteDetalhe: 'c1' });
  setPanelParams(update => assert.equal(update(initial).toString(), 'busca=Maria&pagina=2'), { pagina: '2' });
});
test('login returns to the requested task and rejects external or mismatched destinations', () => {
  assert.equal(panelReturnTo('/admin/pedidos?pedido=1', '/admin'), '/admin/pedidos?pedido=1');
  for (const path of ['//evil.test', 'https://evil.test', '/admin-other', '/admin/../outside', '/admin/%2e%2e/outside', '/admin/login', '/area-cliente']) assert.equal(panelReturnTo(path, '/admin'), '/admin');
});
test('guided product validates image, money and integer stock without losing optional fields', () => {
  const form = { nome: 'Celular', categoria: 'Celulares', descricao: 'Descrição', preco: '199.90', precoOriginal: '', estoque: '10' };
  assert.match(productStepError(form, '', true, 'basico'), /foto/);
  assert.equal(productStepError(form, '', false, 'basico'), '');
  assert.equal(productStepError(form, 'image', true, 'precos'), '');
  assert.match(productStepError({ ...form, preco: 'Infinity' }, 'image', true, 'precos'), /preço/);
  assert.match(productStepError({ ...form, estoque: '1.5' }, 'image', true, 'precos'), /inteira/);
  assert.match(productStepError({ ...form, estoque: '-1' }, 'image', true, 'precos'), /inteira/);
});
