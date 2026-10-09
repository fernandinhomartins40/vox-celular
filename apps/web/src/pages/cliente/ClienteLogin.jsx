import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import { Icon } from '../../icons';
import { PHONE_DIGITS } from '../../data';

export default function ClienteLogin() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '' });
  const [creating, setCreating] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  if (user?.role === 'CLIENTE') {
    navigate('/area-cliente', { replace: true });
    return null;
  }

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    const result = creating ? await register(form.nome.trim(), form.email.trim(), form.senha) : await login(form.email.trim(), form.senha);
    setLoading(false);
    if (result.ok) { navigate('/area-cliente', { replace: true }); }
    else { setErro(result.error || 'E-mail ou senha incorretos.'); }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-[var(--line)] px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-1">
          <span className="font-display font-black text-[26px] leading-none text-[var(--royal-700)]">VOX</span>
          <span className="font-display font-black text-[26px] leading-none text-[var(--red-500)]">.</span>
          <span className="font-display text-[10px] tracking-[0.28em] text-zinc-500 ml-1.5">CELULAR</span>
        </Link>
        <Link to="/" className="text-[13px] text-zinc-500 hover:text-[var(--royal-700)] transition">
          ← Voltar para a loja
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[440px]">
          {/* Header do formulário */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--royal-700)] to-[var(--royal-500)] grid place-items-center mb-4 shadow-lg shadow-[var(--royal-700)]/25">
              <Icon.user className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display font-bold text-[32px] text-[var(--ink)]">Área do Cliente</h1>
            <p className="text-zinc-500 text-[14px] mt-1">Acesse seus pedidos, pontos e promoções exclusivas.</p>
          </div>

          <div className="bg-white border border-[var(--line)] rounded-2xl p-8 shadow-sm">
            <form onSubmit={submit} className="space-y-4">
              {creating && <div>
                <label htmlFor="customer-name" className="block font-medium text-[13px] mb-1.5">Nome</label>
                <input id="customer-name" required minLength={2} autoComplete="name" value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-xl" />
              </div>}
              <div>
                <label className="block font-medium text-[13px] text-zinc-700 mb-1.5">E-mail</label>
                <input
                  type="email" required autoComplete="email"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl focus:outline-none focus:border-[var(--royal-700)] text-[14px] transition"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-medium text-[13px] text-zinc-700">Senha</label>
                  {!creating && <a href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent('Olá! Preciso de orientação para recuperar o acesso à minha conta.')}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[var(--royal-700)] hover:underline">Preciso de ajuda</a>}
                </div>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'} required minLength={6} autoComplete={creating ? 'new-password' : 'current-password'}
                    value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                    placeholder="••••••"
                    className="w-full px-4 py-3 pr-11 bg-[var(--paper)] border border-[var(--line)] rounded-xl focus:outline-none focus:border-[var(--royal-700)] text-[14px] transition"
                  />
                  <button type="button" onClick={() => setShowSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                    <Icon.eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {erro && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
                  <Icon.close className="w-4 h-4 shrink-0" /> {erro}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 h-12 bg-[var(--royal-700)] hover:bg-[var(--royal-800)] disabled:opacity-60 text-white rounded-xl font-semibold text-[14px] tracking-wide transition">
                {loading ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/></svg>
                ) : <Icon.arrowRight className="w-4 h-4" />}
                {loading ? 'Aguarde…' : creating ? 'Criar minha conta' : 'Entrar na minha conta'}
              </button>
            </form>

            <div className="mt-5 text-center text-[13px] text-zinc-500">
              {creating ? 'Já tem conta? ' : 'Ainda não tem conta? '}
              <button disabled={loading} onClick={() => { setCreating(v => !v); setErro(''); }} className="text-[var(--royal-700)] font-medium hover:underline">{creating ? 'Entrar' : 'Criar conta grátis'}</button>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
