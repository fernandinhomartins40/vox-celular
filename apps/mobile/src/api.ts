import * as SecureStore from 'expo-secure-store';

const base = process.env.EXPO_PUBLIC_API_URL || 'https://www.voxcelular.com.br/api';
if (!base.startsWith('https://')) throw new Error('Configure uma API HTTPS para o aplicativo.');
let accessToken: string | null = null;
let generation = 0;
let renewing: Promise<string> | undefined;
const refreshKey = 'vox.refresh';
let storageQueue: Promise<unknown> = Promise.resolve();
function persistRefresh(token: string | null, version: number) {
  const operation = storageQueue.then(async () => {
    if (version !== generation) return;
    if (token) await SecureStore.setItemAsync(refreshKey, token);
    else await SecureStore.deleteItemAsync(refreshKey);
  });
  storageQueue = operation.catch(() => {});
  return operation;
}
type Session = { token: string; refreshToken: string; user: { id: string; nome: string; role: string; lojaId: string; email: string } };
export async function saveSession(session: Session) {
  const version = ++generation;
  renewing = undefined;
  await persistRefresh(session.refreshToken, version);
  if (generation !== version) throw new Error('Sua sessão mudou. Tente novamente.');
  accessToken = session.token;
}
async function renew() {
  if (renewing) return renewing;
  const version = generation;
  const pending = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(refreshKey);
      if (!refreshToken) throw new Error('Entre na sua conta para continuar.');
      const response = await fetch(`${base}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plataforma: 'native', refreshToken }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Sua sessão expirou. Entre novamente.');
      const session: Session = await response.json();
      if (generation !== version) throw new Error('Sua sessão mudou. Tente novamente.');
      await persistRefresh(session.refreshToken, version);
      if (generation !== version) throw new Error('Sua sessão foi encerrada.');
      accessToken = session.token;
      return session.token;
    } finally { if (generation === version) renewing = undefined; }
  })();
  renewing = pending;
  return pending;
}
export async function request<T>(path: string, body?: unknown, authenticated = false, method = body === undefined ? 'GET' : 'POST', retried = false): Promise<T> {
  const version = generation;
  let token = accessToken;
  if (authenticated && !token) token = await renew();
  if (authenticated && generation !== version) throw new Error('Sua sessão mudou. Tente novamente.');
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  if (authenticated && generation !== version) throw new Error('Sua sessão mudou. Tente novamente.');
  if (response.status === 401 && authenticated && !retried) { await renew(); if (generation !== version) throw new Error('Sua sessão mudou.'); return request<T>(path, body, authenticated, method, true); }
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Não foi possível concluir. Confira os dados.');
  return data as T;
}
export async function logout() {
  try { await request('/auth/logout', {}, true); }
  finally { const version = ++generation; accessToken = null; renewing = undefined; await persistRefresh(null, version); }
}
export function assetUrl(path: string) { return path.startsWith('https://') ? path : `${base.replace(/\/api\/?$/, '')}${path}`; }
