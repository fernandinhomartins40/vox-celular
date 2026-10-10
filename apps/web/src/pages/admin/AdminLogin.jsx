import PanelAuthLayout from '../../components/panel/PanelAuthLayout';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import { Icon } from '../../icons';

export default function AdminLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  if (user?.role === 'LOJISTA') {
    return <Navigate to="/admin" replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    const result = await login(form.email, form.senha);
    setLoading(false);
    if (result.ok) { navigate('/admin', { replace: true }); }
    else { setErro(result.error || 'E-mail ou senha incorretos.'); }
  };


  return <PanelAuthLayout title="Entrar no painel" description="Gerencie produtos, pedidos e sua loja.">
<form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block font-medium text-[13px] text-zinc-700 mb-1.5">E-mail</label>
              <input
                id="login-email" type="email" required autoComplete="email"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="lojista@vox.com"
                className="w-full px-4 py-3 bg-white border border-[var(--line)] rounded-xl focus:outline-none focus:border-[var(--royal-700)] text-[14px] transition"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block font-medium text-[13px] text-zinc-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  id="login-password" type={showSenha ? 'text' : 'password'} required autoComplete="current-password"
                  value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  placeholder="••••••"
                  className="w-full px-4 py-3 pr-11 bg-white border border-[var(--line)] rounded-xl focus:outline-none focus:border-[var(--royal-700)] text-[14px] transition"
                />
                <button type="button" aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showSenha} onClick={() => setShowSenha(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                  <Icon.eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {erro && (
              <div role="alert" className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
                <Icon.close className="w-4 h-4 shrink-0" /> {erro}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 h-12 bg-[var(--royal-700)] hover:bg-[var(--royal-800)] disabled:opacity-60 text-white rounded-xl font-semibold text-[14px] tracking-wide transition">
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/></svg>
              ) : <Icon.lock className="w-4 h-4" />}
              {loading ? 'Entrando…' : 'Entrar no painel'}
            </button>
          </form>
</PanelAuthLayout>;
}
