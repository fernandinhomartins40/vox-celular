const KEY = 'vox_pending_discoveries';
export function queueDiscoveries(rows, ownerId) {
  const lojaId = rows[0]?.produto.lojaId;
  const ids = [...new Set(rows.filter(row => row.produto.lojaId === lojaId).map(row => row.produto.id))].slice(0, 3);
  if (!lojaId || !ids.length) throw new Error('Encontre um aparelho antes de finalizar.');
  sessionStorage.setItem(KEY, JSON.stringify({ lojaId, ids, ownerId: ownerId || null, createdAt: Date.now() }));
}
export function readDiscoveries(user) {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY));
    if (!value || !Array.isArray(value.ids) || !value.ids.length || value.ids.length > 3 || value.ids.some(id => typeof id !== 'string') || value.lojaId !== user.lojaId || (value.ownerId && value.ownerId !== user.id) || !Number.isFinite(value.createdAt) || Date.now() - value.createdAt > 30 * 60 * 1000 || value.createdAt > Date.now()) return null;
    return value;
  } catch { return null; }
}
export function updateDiscoveries(value) {
  if (!value?.ids.length) sessionStorage.removeItem(KEY);
  else sessionStorage.setItem(KEY, JSON.stringify(value));
}
