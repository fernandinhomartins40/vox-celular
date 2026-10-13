import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, publicApiIdentity, request } from './api';
import { catalogMaxChars, catalogRows, parseCatalogSnapshot } from './catalogSnapshot';
import type { CatalogProduct } from './catalogSnapshot';
const key = `vox.public.catalog.v1:${publicApiIdentity}`;
export async function loadCatalog(): Promise<{ products: CatalogProduct[]; savedAt: number | null }> {
  let storeId: string | undefined;
  try {
    const store = await request<{ id: string }>('/loja');
    storeId = store.id;
    const products = await request<CatalogProduct[]>(`/produtos?lojaId=${encodeURIComponent(store.id)}`);
    try {
      const saved = JSON.stringify({ version: 1, storeId: store.id, savedAt: Date.now(), products: catalogRows(products, store.id) });
      if (saved.length <= catalogMaxChars) await AsyncStorage.setItem(key, saved);
      else await AsyncStorage.removeItem(key);
    } catch { await AsyncStorage.removeItem(key).catch(() => {}); }
    return { products, savedAt: null };
  } catch (error) {
    // An authorization, validation or missing-store response must never revive old data.
    if (error instanceof ApiError && error.status < 500) throw error;
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) throw error;
      const saved = parseCatalogSnapshot(raw);
      if (storeId && saved.storeId !== storeId) throw error;
      return { products: saved.products, savedAt: saved.savedAt };
    } catch { await AsyncStorage.removeItem(key).catch(() => {}); throw error; }
  }
}
