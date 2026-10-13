const key = 'vox.public.guides.v1';
const maxChars = 300000;
const maxAge = 48 * 3600000;
const topics = ['planos', 'saldo-consumo', 'chip-esim', 'internet-apn', 'sinal', 'chamadas-sms', 'portabilidade', 'perda-roubo', 'aplicativos'];
const domains = { TIM: 'tim.com.br', VIVO: 'vivo.com.br', CLARO: 'claro.com.br' };
function official(value, operator) {
  if (typeof value !== 'string' || value.length > 1500) return false;
  try {
    const url = new URL(value), domain = domains[operator];
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && (url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch { return false; }
}
export function guideCopy(storeId, guides, savedAt = Date.now(), now = Date.now()) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(storeId) || !Array.isArray(guides) || !Number.isSafeInteger(savedAt) || savedAt > now) throw new Error('Invalid guide copy');
  const rows = guides.slice(0, 100).map(g => {
    if (!g || !Object.hasOwn(domains, g.operadora) || !topics.includes(g.topico)) throw new Error('Invalid guide');
    for (const [field, limit] of [['id', 100], ['titulo', 120], ['resumo', 600], ['revisadoEm', 40], ['validoAte', 40]]) if (typeof g[field] !== 'string' || !g[field] || g[field].length > limit) throw new Error('Invalid guide field');
    if (!Array.isArray(g.passos) || !g.passos.length || g.passos.length > 12 || g.passos.some(step => typeof step !== 'string' || !step || step.length > 600)) throw new Error('Invalid guide steps');
    const reviewed = Date.parse(g.revisadoEm), expiry = Date.parse(g.validoAte);
    if (!Number.isFinite(reviewed) || !Number.isFinite(expiry) || reviewed > now || expiry <= reviewed || expiry - reviewed > 180 * 86400000 || !official(g.fonte, g.operadora) || !official(g.canalOficial, g.operadora)) throw new Error('Invalid guide review/source');
    return { id: g.id, operadora: g.operadora, topico: g.topico, titulo: g.titulo, resumo: g.resumo, passos: [...g.passos], fonte: g.fonte, canalOficial: g.canalOficial, revisadoEm: g.revisadoEm, validoAte: g.validoAte };
  }).filter(g => Date.parse(g.validoAte) > now);
  const copy = { version: 1, storeId, savedAt, guides: rows };
  if (JSON.stringify(copy).length > maxChars) throw new Error('Guide copy too large');
  return copy;
}
export function savePublicGuides(storeId, guides, storage = localStorage) {
  try { storage.setItem(key, JSON.stringify(guideCopy(storeId, guides))); }
  catch { try { storage.removeItem(key); } catch { /* Optional storage. */ } }
}
export function readPublicGuides(storage = localStorage, now = Date.now()) {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > maxChars) throw new Error('No bounded copy');
    const copy = JSON.parse(raw);
    if (copy.version !== 1 || !Number.isSafeInteger(copy.savedAt) || copy.savedAt > now || now - copy.savedAt > maxAge) throw new Error('Expired copy');
    return guideCopy(copy.storeId, copy.guides, copy.savedAt, now);
  } catch { try { storage.removeItem(key); } catch { /* Optional storage. */ } return null; }
}
const root = typeof document !== 'undefined' ? document.getElementById('offline-guides') : null;
if (root) {
  const saved = readPublicGuides();
  if (saved?.guides.length) {
    const heading = document.createElement('h2'); heading.textContent = 'Guias salvos';
    const note = document.createElement('p'); note.textContent = `Cópia de ${new Date(saved.savedAt).toLocaleString('pt-BR')}. Confira fontes oficiais quando a conexão voltar.`;
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Filtrar guias por operadora');
    for (const value of ['', 'TIM', 'VIVO', 'CLARO']) { const option = document.createElement('option'); option.value = value; option.textContent = value || 'Todas as operadoras'; select.append(option); }
    const list = document.createElement('div'); list.className = 'catalog-list';
    function render() {
      list.replaceChildren();
      for (const guide of saved.guides.filter(g => !select.value || g.operadora === select.value)) {
        const card = document.createElement('article'), title = document.createElement('h3'), summary = document.createElement('p'), steps = document.createElement('ol'), dates = document.createElement('p');
        title.textContent = `${guide.operadora} · ${guide.titulo}`; summary.textContent = guide.resumo;
        for (const step of guide.passos) { const item = document.createElement('li'); item.textContent = step; steps.append(item); }
        dates.textContent = `Revisado em ${new Date(guide.revisadoEm).toLocaleDateString('pt-BR')} · Válido até ${new Date(guide.validoAte).toLocaleDateString('pt-BR')}`;
        card.append(title, summary, steps, dates); list.append(card);
      }
      if (!list.children.length) { const empty = document.createElement('p'); empty.textContent = 'Sem guia vigente nesta cópia.'; list.append(empty); }
    }
    select.addEventListener('change', render); root.append(heading, note, select, list); render();
  }
}
