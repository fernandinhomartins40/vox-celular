import { useState } from 'react';
import { api, setAccessToken } from '../lib/api.js';
import { AuthContext } from './context.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('vox_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  async function login(email, senha) {
    setLoading(true);
    try {
      const lojaId = import.meta.env.VITE_LOJA_ID || (await api.get('/loja')).id;
      const data = await api.post('/auth/login', { email, senha, lojaId, plataforma: 'web' });
      setAccessToken(data.token);
      const stored = { ...data.user };
      localStorage.setItem('vox_user', JSON.stringify(stored));
      setUser(stored);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }

  async function register(nome, email, senha, extra = {}) {
    setLoading(true);
    try {
      const lojaId = import.meta.env.VITE_LOJA_ID || (await api.get('/loja')).id;
      localStorage.setItem('vox_loja_id', lojaId);
      const data = await api.post('/auth/register', { nome, email, senha, lojaId, ...extra, plataforma: 'web' });
      setAccessToken(data.token);
      const stored = { ...data.user };
      localStorage.setItem('vox_user', JSON.stringify(stored));
      setUser(stored);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try { await api.post('/auth/logout', {}); }
    catch { /* Local logout remains possible without network; session expires server-side. */ }
    setAccessToken(null);
    localStorage.removeItem('vox_user');
    sessionStorage.removeItem('vox_cart');
    sessionStorage.removeItem('vox_checkout_attempt');
    setUser(null);
  }

  const isLojista = user?.role === 'LOJISTA';
  const isCliente = user?.role === 'CLIENTE';

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading, isLojista, isCliente }}>
      {children}
    </AuthContext.Provider>
  );
}
