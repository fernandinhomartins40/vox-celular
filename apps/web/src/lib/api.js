const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const ASSET_BASE_URL = BASE_URL.replace(/\/api\/?$/, '');

export const LOJA_ID = import.meta.env.VITE_LOJA_ID || localStorage.getItem('vox_loja_id') || '';

function getToken() {
  try {
    const u = localStorage.getItem('vox_user');
    return u ? JSON.parse(u).token : null;
  } catch { return null; }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const message = Array.isArray(err.error) ? err.error.map(issue => issue.message).filter(Boolean).join('; ') : err.error;
    throw new Error(typeof message === 'string' && message ? message : `Não foi possível concluir a solicitação (HTTP ${res.status})`);
  }
  return res.json();
}

export const api = {
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (path, body)  => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  put:    (path, body)  => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)        => request(path, { method: 'DELETE' }),
};

export function assetUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${ASSET_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
