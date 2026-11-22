// Same filtering and ordering as the PWA (apps/web/src/lib/catalog.js).
type Row = { nome: string; sub?: string; categoria: string; preco: number; estoque: number; destaque?: boolean };
export type Sort = 'destaque' | 'menor' | 'maior';
export function filterCatalog<T extends Row>(products: T[], { category = 'Todos', search = '', sort = 'destaque' as Sort } = {}) {
  const normalize = (text?: string) => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const query = normalize(search).trim();
  const result = products.filter(p => (category === 'Todos' || p.categoria === category) && normalize(`${p.nome} ${p.sub} ${p.categoria}`).includes(query));
  if (sort === 'menor') result.sort((a, b) => a.preco - b.preco);
  else if (sort === 'maior') result.sort((a, b) => b.preco - a.preco);
  else result.sort((a, b) => Number(b.destaque) - Number(a.destaque));
  return result;
}
