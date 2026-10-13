import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, publicApiIdentity, request } from './api';
import { guideMaxChars, guideRows, parseGuideSnapshot } from './guideSnapshot';
import type { Guide } from './guideSnapshot';
const key = `vox.public.guides.v1:${publicApiIdentity}`;
export async function loadGuides(): Promise<{ guides: Guide[]; savedAt: number | null }> {
  let storeId: string | undefined;
  try {
    const store = await request<{ id: string }>('/loja');
    storeId = store.id;
    const guides = await request<Guide[]>(`/guias?lojaId=${encodeURIComponent(store.id)}`);
    try {
      const saved = JSON.stringify({ version: 1, storeId: store.id, savedAt: Date.now(), guides: guideRows(guides) });
      if (saved.length <= guideMaxChars) await AsyncStorage.setItem(key, saved);
      else await AsyncStorage.removeItem(key);
    } catch { await AsyncStorage.removeItem(key).catch(() => {}); }
    return { guides, savedAt: null };
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) throw error;
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) throw error;
      const saved = parseGuideSnapshot(raw);
      if (storeId && saved.storeId !== storeId) throw error;
      return { guides: saved.guides, savedAt: saved.savedAt };
    } catch { await AsyncStorage.removeItem(key).catch(() => {}); throw error; }
  }
}
