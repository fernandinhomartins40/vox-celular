import { useState } from 'react';
import { api } from '../lib/api.js';
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
      const data = await api.post('/auth/login', { email, senha });
      const stored = { ...data.user, token: data.token };
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
      const data = await api.post('/auth/register', { nome, email, senha, lojaId, ...extra });
      const stored = { ...data.user, token: data.token };
      localStorage.setItem('vox_user', JSON.stringify(stored));
      setUser(stored);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('vox_user');
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
