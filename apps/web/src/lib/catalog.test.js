import test from 'node:test';
import assert from 'node:assert/strict';
import { filterCatalog, brazilPhone } from './catalog.js';

const products = [
  { id: 'a', nome: 'Capa 100% & proteção', sub: 'Azul', categoria: 'Acessórios', preco: 30, estoque: 0, destaque: true },
  { id: 'b', nome: 'Celular', sub: '128 GB', categoria: 'Celulares', preco: 1000, estoque: 3 },
  { id: 'c', nome: 'Cabo', sub: 'USB', categoria: 'Acessórios', preco: 20, estoque: 4 },
];
test('search ignores accents and case; category and stock combine', () => {
  assert.deepEqual(filterCatalog(products, { search: 'ACESSORIOS', available: true }).map(p => p.id), ['c']);
  assert.deepEqual(filterCatalog(products, { search: '128 gb', category: 'Celulares' }).map(p => p.id), ['b']);
  assert.equal(filterCatalog(products, { search: 'inexistente' }).length, 0);
});
test('price ordering leaves source unchanged', () => {
  assert.deepEqual(filterCatalog(products, { sort: 'menor' }).map(p => p.id), ['c', 'a', 'b']);
  assert.deepEqual(filterCatalog(products, { sort: 'maior' }).map(p => p.id), ['b', 'a', 'c']);
  assert.deepEqual(products.map(p => p.id), ['a', 'b', 'c']);
});
test('customer phone gets country prefix once and invalid contact is omitted', () => {
  assert.equal(brazilPhone('(42) 99103-1420'), '5542991031420');
  assert.equal(brazilPhone('+55 42 99103-1420'), '5542991031420');
  assert.equal(brazilPhone(''), '');
  assert.equal(brazilPhone('123'), '');
});
