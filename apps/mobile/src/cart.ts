import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { ApiError, NativeUser, request, sessionRevision, requireCapability } from './api';

export type CartItem = { produtoId: string; qty: number };
export type PricedItem = CartItem & { precoCentavos: number };
export type PendingCheckout = { userId: string; checkoutKey: string; itens: PricedItem[] };
export type Cart = { storeId: string; items: CartItem[]; pending?: PendingCheckout };
export type Receipt = { id: string; codigo: string; total: number | string; pagamento: string };
const key = 'vox.cart.v1';
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}
function validItems(items: unknown): items is CartItem[] {
  return Array.isArray(items) && items.length <= 30 && items.every(item => item && typeof item.produtoId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(item.produtoId) && Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 100) && new Set(items.map(item => item.produtoId)).size === items.length;
}
async function read(): Promise<Cart> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return { storeId: '', items: [] };
  if (raw.length > 20000) throw new Error('Não foi possível ler o carrinho salvo.');
  const data = JSON.parse(raw) as Cart;
  if (typeof data.storeId !== 'string' || !validItems(data.items)) throw new Error('Não foi possível ler o carrinho salvo.');
  if (data.pending && (typeof data.pending.userId !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.pending.checkoutKey) || !validItems(data.pending.itens) || !data.pending.itens.length || data.pending.itens.some(item => !Number.isSafeInteger(item.precoCentavos) || item.precoCentavos < 0))) throw new Error('Não foi possível recuperar a confirmação pendente. Consulte seus pedidos.');
  return data;
}
export const readCart = () => exclusive(read);
export function changeCart(storeId: string, produtoId: string, qty: number) {
  return exclusive(async () => {
    const cart = await read();
    if (cart.pending) throw new Error('Verifique a confirmação pendente antes de alterar o carrinho.');
    if (cart.items.length && cart.storeId !== storeId) throw new Error('Conclua ou esvazie o carrinho da outra loja primeiro.');
    const items = cart.items.filter(item => item.produtoId !== produtoId);
    if (qty > 0) items.push({ produtoId, qty });
    if (!validItems(items)) throw new Error('Limite de 30 produtos e 100 unidades por produto.');
    const next = { storeId: items.length ? storeId : '', items };
    await AsyncStorage.setItem(key, JSON.stringify(next));
    return next;
  });
}
export function addToCart(storeId: string, produtoId: string, stock: number) {
  return exclusive(async () => {
    const cart = await read();
    if (cart.pending) throw new Error('Verifique a confirmação pendente antes de alterar o carrinho.');
    if (cart.items.length && cart.storeId !== storeId) throw new Error('Seu carrinho pertence a outra loja.');
    const qty = (cart.items.find(item => item.produtoId === produtoId)?.qty || 0) + 1;
    if (qty > stock) throw new Error('Não há estoque para adicionar outra unidade.');
    const items = [...cart.items.filter(item => item.produtoId !== produtoId), { produtoId, qty }];
    if (!validItems(items)) throw new Error('Limite de 30 produtos e 100 unidades por produto.');
    const next = { storeId, items };
    await AsyncStorage.setItem(key, JSON.stringify(next));
    return next;
  });
}
export function confirmCart(pricedItems: PricedItem[]): Promise<Receipt> {
  return exclusive(async () => {
    const cart = await read();
    const revision = sessionRevision();
    await requireCapability('checkout-preco-confirmado');
    const user = await request<NativeUser>('/auth/me', undefined, true);
    if (revision !== sessionRevision()) throw new Error('Sua sessão mudou. Verifique a conta antes de confirmar.');
    if (user.role !== 'CLIENTE' || user.lojaId !== cart.storeId) throw new Error('Entre com uma conta de cliente desta loja.');
    if (cart.pending && cart.pending.userId !== user.id) throw new Error('Entre com a conta que iniciou esta confirmação.');
    if (!cart.pending) {
      if (!validItems(pricedItems) || !pricedItems.length || pricedItems.some(item => !Number.isSafeInteger(item.precoCentavos) || item.precoCentavos < 0) || JSON.stringify(cart.items.slice().sort((a, b) => a.produtoId.localeCompare(b.produtoId))) !== JSON.stringify(pricedItems.map(({ produtoId, qty }) => ({ produtoId, qty })).sort((a, b) => a.produtoId.localeCompare(b.produtoId)))) throw new Error('Atualize o carrinho antes de confirmar.');
      cart.pending = { userId: user.id, checkoutKey: randomUUID(), itens: pricedItems };
      await AsyncStorage.setItem(key, JSON.stringify(cart));
    }
    if (revision !== sessionRevision()) throw new Error('Sua sessão mudou. Verifique a conta antes de confirmar.');
    let result: Receipt;
    try { result = await request<Receipt>('/pedidos', { checkoutKey: cart.pending.checkoutKey, itens: cart.pending.itens }, true); }
    catch (error) {
      // A definitive validation/transaction rejection cannot have created a new order.
      // Network/5xx ambiguity preserves the persisted key for safe recovery after restart.
      if (error instanceof ApiError && [400, 403, 404, 409].includes(error.status)) { delete cart.pending; await AsyncStorage.setItem(key, JSON.stringify(cart)); }
      throw error;
    }
    await AsyncStorage.removeItem(key);
    return result;
  });
}
