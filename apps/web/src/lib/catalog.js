export function filterCatalog(products, { category = 'Todos', search = '', sort = 'destaque', available = false } = {}) {
  const normalize = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const query = normalize(search).trim();
  const result = products.filter(p => (category === 'Todos' || p.categoria === category)
    && (!available || p.estoque > 0)
    && normalize(`${p.nome} ${p.sub} ${p.categoria}`).includes(query));
  if (sort === 'menor') result.sort((a, b) => a.preco - b.preco);
  else if (sort === 'maior') result.sort((a, b) => b.preco - a.preco);
  else result.sort((a, b) => Number(b.destaque) - Number(a.destaque));
  return result;
}

export function brazilPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (/^\d{10,11}$/.test(digits)) return `55${digits}`;
  return /^55\d{10,11}$/.test(digits) ? digits : '';
}
