const key = 'vox.public.catalog.v1';
const maxChars = 250000;
export function catalogCopy(storeId, products, savedAt = Date.now()) {
  if (typeof storeId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(storeId) || !Array.isArray(products) || !Number.isSafeInteger(savedAt) || savedAt < 0) throw new Error('Invalid public catalogue');
  const rows = products.slice(0, 200).map(p => {
    if (!p || p.lojaId !== storeId || typeof p.id !== 'string' || p.id.length > 100 || typeof p.nome !== 'string' || p.nome.length > 200 || typeof p.categoria !== 'string' || p.categoria.length > 100 || !Number.isFinite(p.preco) || p.preco < 0) throw new Error('Invalid product');
    return { id: p.id, lojaId: storeId, nome: p.nome, categoria: p.categoria, preco: p.preco };
  });
  const value = { version: 1, storeId, savedAt, products: rows };
  if (JSON.stringify(value).length > maxChars) throw new Error('Catalogue too large');
  return value;
}
export function savePublicCatalog(storeId, products, storage = localStorage) {
  try { storage.setItem(key, JSON.stringify(catalogCopy(storeId, products))); }
  catch { try { storage.removeItem(key); } catch { /* Storage optional. */ } }
}
export function readPublicCatalog(storage = localStorage, now = Date.now()) {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > maxChars) throw new Error('No bounded copy');
    const value = JSON.parse(raw);
    if (value.version !== 1 || !Number.isSafeInteger(value.savedAt) || value.savedAt > now || now - value.savedAt > 48 * 3600000) throw new Error('Expired copy');
    return catalogCopy(value.storeId, value.products, value.savedAt);
  } catch { try { storage.removeItem(key); } catch { /* Storage optional. */ } return null; }
}
const root = typeof document !== 'undefined' ? document.getElementById('offline-catalog') : null;
if (root) {
  const saved = readPublicCatalog();
  if (saved) {
    const heading = document.createElement('h2'); heading.textContent = 'Catálogo salvo';
    const note = document.createElement('p'); note.textContent = `Cópia de ${new Date(saved.savedAt).toLocaleString('pt-BR')}. Preços e disponibilidade precisam ser confirmados quando a conexão voltar.`;
    const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Buscar produto ou categoria'; search.setAttribute('aria-label', 'Buscar no catálogo salvo');
    const list = document.createElement('div'); list.className = 'catalog-list';
    function render() {
      list.replaceChildren();
      const matching = saved.products.filter(p => `${p.nome} ${p.categoria}`.toLocaleLowerCase('pt-BR').includes(search.value.toLocaleLowerCase('pt-BR')));
      for (const p of matching) {
        const card = document.createElement('article'), name = document.createElement('h3'), price = document.createElement('p');
        name.textContent = p.nome; price.textContent = `${p.categoria} · Preço salvo: ${p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        card.append(name, price); list.append(card);
      }
      if (!matching.length) { const empty = document.createElement('p'); empty.textContent = 'Nenhum produto encontrado nesta cópia.'; list.append(empty); }
    }
    search.addEventListener('input', render); root.append(heading, note, search, list); render();
  }
}
