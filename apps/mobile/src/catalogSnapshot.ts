export type CatalogProduct = { id: string; lojaId: string; nome: string; sub: string; categoria: string; preco: number; estoque: number; imgUrl: string };
export const catalogLimit = 200;
export const catalogMaxChars = 250000;
const lifetime = 48 * 60 * 60 * 1000;
export function catalogRows(value: unknown, storeId: string): CatalogProduct[] {
  if (!Array.isArray(value)) throw new Error('Catálogo inválido.');
  return value.slice(0, catalogLimit).map(value => {
    if (!value || typeof value !== 'object') throw new Error('Produto inválido.');
    const p = value as Record<string, unknown>;
    for (const [field, max] of [['id', 100], ['nome', 200], ['sub', 500], ['categoria', 100], ['imgUrl', 2000]] as const) {
      if (typeof p[field] !== 'string' || (p[field] as string).length > max) throw new Error('Produto inválido.');
    }
    if (p.lojaId !== storeId || typeof p.preco !== 'number' || !Number.isFinite(p.preco) || p.preco < 0 || typeof p.estoque !== 'number' || !Number.isInteger(p.estoque) || p.estoque < 0) throw new Error('Produto inválido.');
    return { id: p.id as string, lojaId: storeId, nome: p.nome as string, sub: p.sub as string, categoria: p.categoria as string, preco: p.preco, estoque: p.estoque, imgUrl: p.imgUrl as string };
  });
}
export function parseCatalogSnapshot(raw: string, now = Date.now()) {
  if (raw.length > catalogMaxChars) throw new Error('Catálogo salvo excede o limite.');
  const saved = JSON.parse(raw);
  if (saved.version !== 1 || typeof saved.storeId !== 'string' || !saved.storeId || saved.storeId.length > 100 || !Number.isSafeInteger(saved.savedAt) || saved.savedAt > now || now - saved.savedAt > lifetime) throw new Error('Catálogo salvo expirou.');
  return { storeId: saved.storeId as string, savedAt: saved.savedAt as number, products: catalogRows(saved.products, saved.storeId) };
}
