import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
const source = (await readFile('apps/web/src/lib/api.js', 'utf8'))
  .replaceAll('import.meta.env.VITE_API_URL', "'https://vox.invalid/api'")
  .replaceAll('import.meta.env.VITE_LOJA_ID', "'loja'");
const { api, setAccessToken } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let release;
let refreshes = 0;
let mutations = 0;
globalThis.fetch = async url => {
  if (url.endsWith('/auth/refresh')) {
    refreshes++;
    return new Promise(resolve => { release = () => resolve({ ok: true, json: async () => ({ token: 'old-session', user: { id: 'old-user' } }) }); });
  }
  mutations++;
  return { ok: true, status: 200, json: async () => ({ ok: true }) };
};
values.set('vox_user', JSON.stringify({ id: 'old-user' }));
const pending = api.post('/pedidos', {}).catch(error => error);
const second = api.get('/auth/me').catch(error => error);
assert.equal(refreshes, 1, 'Concurrent requests share one rotation');
setAccessToken('new-session');
values.set('vox_user', JSON.stringify({ id: 'new-user' }));
release();
assert.match((await pending).message, /sessão mudou/);
assert.match((await second).message, /sessão mudou/);
assert.equal(mutations, 0, 'Old queued mutations cannot run in the new account');
assert.equal(JSON.parse(values.get('vox_user')).id, 'new-user');
setAccessToken(null);
const logoutRace = api.get('/auth/me').catch(error => error);
setAccessToken(null);
values.delete('vox_user');
release();
assert.match((await logoutRace).message, /sessão mudou/);
assert.equal(values.has('vox_user'), false, 'Late refresh cannot restore logged-out profile');
console.log('Session renewal, account switch and logout races passed.');
