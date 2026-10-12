import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { ApiError, NativeUser, request, sessionRevision } from './api';
type Pending = { userId: string; rewardId: string; chaveResgate: string; pontosEsperados: number };
const key = 'vox.reward.pending.v1';
let queue: Promise<unknown> = Promise.resolve();
export async function pendingReward(): Promise<Pending | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  if (raw.length > 1000) throw new Error('Não foi possível recuperar o resgate. Consulte seus códigos.');
  const value = JSON.parse(raw) as Pending;
  if (typeof value.userId !== 'string' || typeof value.rewardId !== 'string' || !/^[a-f0-9-]{36}$/i.test(value.chaveResgate)) throw new Error('Não foi possível recuperar o resgate. Consulte seus códigos.');
  return value;
}
export function redeemReward(rewardId: string, points?: number) {
  const operation = queue.then(async () => {
    const revision = sessionRevision();
    const user = await request<NativeUser>('/auth/me', undefined, true);
    if (user.role !== 'CLIENTE' || revision !== sessionRevision()) throw new Error('Confira sua conta de cliente antes de continuar.');
    let pending = await pendingReward();
    if (pending && (pending.userId !== user.id || pending.rewardId !== rewardId)) throw new Error('Verifique o resgate pendente com a conta que iniciou a confirmação.');
    if (!pending) {
      if (!Number.isInteger(points) || !points || points < 1) throw new Error('Atualize as recompensas para conferir o custo.');
      pending = { userId: user.id, rewardId, chaveResgate: randomUUID(), pontosEsperados: points };
      await AsyncStorage.setItem(key, JSON.stringify(pending));
    }
    if (revision !== sessionRevision()) throw new Error('Sua conta mudou. Verifique a confirmação pendente.');
    let result: { codigo: string; saldo: number };
    try { result = await request(`/fidelidade/resgatar/${encodeURIComponent(rewardId)}`, { chaveResgate: pending.chaveResgate, pontosEsperados: pending.pontosEsperados }, true); }
    catch (error) {
      if (error instanceof ApiError && [400, 403, 404, 409].includes(error.status)) await AsyncStorage.removeItem(key);
      throw error;
    }
    await AsyncStorage.removeItem(key);
    return result;
  });
  queue = operation.catch(() => {});
  return operation;
}
