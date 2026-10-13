import PanelAuthLayout from '../../components/panel/PanelAuthLayout';
import AccountRecovery from '../../components/panel/AccountRecovery';
import { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { panelReturnTo } from '../../lib/panel';
import { useAuth } from '../../auth/useAuth.js';
import { Icon } from '../../icons';
import { PHONE_DIGITS } from '../../data';

export default function ClienteLogin() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.returnTo === '/?carrinho=1' ? '/?carrinho=1' : panelReturnTo(location.state?.returnTo, '/area-cliente');
  const [form, setForm] = useState({ nome: '', email: '', senha: '', telefone: '' });
  const [creating, setCreating] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  if (user?.role === 'CLIENTE') {
    return <Navigate to={destination} replace />;
  }
  if (recovering) return <PanelAuthLayout title="Sua conta na VOX" description="Recupere seu acesso com segurança."><AccountRecovery initialEmail={form.email} onBack={() => setRecovering(false)} /></PanelAuthLayout>;

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    const result = creating ? await register(form.nome.trim(), form.email.trim(), form.senha, { telefone: form.telefone.trim() || undefined }) : await login(form.email.trim(), form.senha);
    setLoading(false);
    if (result.ok) { navigate(destination, { replace: true }); }
    else { setErro(result.error || 'E-mail ou senha incorretos.'); }
  };

  return <PanelAuthLayout title="Sua conta na VOX" description="Acompanhe pedidos, pontos e ofertas.">
<form onSubmit={submit} className="space-y-4">
              {creating && <div>
                <label htmlFor="customer-name" className="block font-medium text-[13px] mb-1.5">Nome</label>
                <input id="customer-name" required minLength={2} autoComplete="name" value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-xl" />
              </div>}
              <div>
                <label htmlFor="login-email" className="block font-medium text-[13px] text-zinc-700 mb-1.5">E-mail</label>
                <input
                  id="login-email" type="email" required autoComplete="email"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl focus:outline-none focus:border-[var(--royal-700)] text-[14px] transition"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block font-medium text-[13px] text-zinc-700">Senha</label>
                  {!creating && <a href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent('Olá! Preciso de orientação para recuperar o acesso à minha conta.')}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[var(--royal-700)] hover:underline">Preciso de ajuda</a>}
                </div>
                <div className="relative">
                  <input
                    id="login-password" type={showSenha ? 'text' : 'password'} required minLength={creating ? 12 : 6} maxLength={creating ? 72 : undefined} autoComplete={creating ? 'new-password' : 'current-password'}
                    value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                    placeholder="••••••"
                    className="w-full px-4 py-3 pr-11 bg-[var(--paper)] border border-[var(--line)] rounded-xl focus:outline-none focus:border-[var(--royal-700)] text-[14px] transition"
                  />
                  <button type="button" aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showSenha} onClick={() => setShowSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                    <Icon.eye className="w-4 h-4" />
                  </button>
                </div>
                {creating && <p className="text-xs text-zinc-500 mt-2">Use de 12 a 72 caracteres.</p>}
              </div>

              {creating && <details><summary className="text-sm cursor-pointer">Adicionar telefone (opcional)</summary><label htmlFor="customer-phone" className="block mt-3 text-sm">Telefone para contato</label><input id="customer-phone" type="tel" autoComplete="tel" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className="w-full border rounded-xl p-3" /><p className="text-xs text-zinc-500 mt-1">Ajuda a loja a combinar os detalhes do seu pedido.</p></details>}
              {erro && (
                <div role="alert" className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
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
{!creating && <button type="button" disabled={loading} className="mt-4 w-full min-h-11 text-sm font-medium text-[var(--royal-700)] hover:underline" onClick={() => { setForm(previous => ({ ...previous, senha: '' })); setRecovering(true); }}>Esqueci minha senha</button>}
<div className="mt-5 text-center text-[13px] text-zinc-500">
              {creating ? 'Já tem conta? ' : 'Ainda não tem conta? '}
              <button disabled={loading} onClick={() => { setCreating(v => !v); setErro(''); }} className="text-[var(--royal-700)] font-medium hover:underline">{creating ? 'Entrar' : 'Criar conta grátis'}</button>
            </div>
</PanelAuthLayout>;
}
