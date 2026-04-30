import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../../icons';

export default function AdminLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  if (user?.role === 'LOJISTA') {
    navigate('/admin', { replace: true });
    return null;
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

  const fillDemo = () => setForm({ email: 'lojista@vox.com', senha: '123456' });

  return (
    <div className="min-h-screen flex">
      {/* LEFT — branding */}
      <div className="hidden lg:flex lg:w-[55%] royal-radiant flex-col justify-between p-14 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.12]" style={{
          background: 'radial-gradient(2px 2px at 15% 25%, white, transparent), radial-gradient(1.5px 1.5px at 75% 35%, white, transparent), radial-gradient(1.5px 1.5px at 40% 70%, white, transparent)',
          backgroundSize: '500px 500px'
        }}/>
        <div className="relative">
          <Link to="/" className="flex items-baseline gap-1.5">
            <span className="font-display font-black text-[36px] leading-none text-white">VOX</span>
            <span className="font-display font-black text-[36px] leading-none text-[var(--red-500)]">.</span>
            <span className="font-display text-[11px] tracking-[0.3em] text-white/60 ml-1 mt-1">CELULAR</span>
          </Link>
        </div>
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-white/10 grid place-items-center mb-8">
            <Icon.lock className="w-7 h-7" />
          </div>
          <h1 className="font-display font-bold text-[52px] leading-[1.0] tracking-tight mb-4">
            Painel<br/>Administrativo
          </h1>
          <p className="text-white/70 text-[16px] max-w-sm leading-relaxed">
            Gerencie produtos, pedidos, clientes e a personalização da sua loja em um único lugar.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Pedidos hoje', valor: '3' },
              { label: 'Faturamento mês', valor: 'R$ 14.250' },
              { label: 'Clientes ativos', valor: '5' },
              { label: 'Produtos', valor: '12' },
            ].map((s, i) => (
              <div key={i} className="chip-glass rounded-xl p-4">
                <div className="font-display text-[10px] tracking-[0.2em] text-white/55 mb-1">{s.label}</div>
                <div className="font-display font-bold text-[22px]">{s.valor}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-[12px] text-white/40">© 2026 Vox Celular</div>
      </div>

      {/* RIGHT — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[var(--paper)]">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex items-baseline gap-1">
            <span className="font-display font-black text-[30px] leading-none text-[var(--royal-700)]">VOX</span>
            <span className="font-display font-black text-[30px] leading-none text-[var(--red-500)]">.</span>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-[2px] bg-[var(--red-500)]"></span>
              <span className="font-display text-[var(--red-500)] font-semibold text-[11px] tracking-[0.28em] uppercase">Acesso restrito</span>
            </div>
            <h2 className="font-display font-bold text-[34px] leading-tight text-[var(--ink)]">Entrar no painel</h2>
            <p className="text-zinc-500 text-[14px] mt-1">Apenas colaboradores autorizados.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block font-medium text-[13px] text-zinc-700 mb-1.5">E-mail</label>
              <input
                type="email" required autoComplete="email"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="lojista@vox.com"
                className="w-full px-4 py-3 bg-white border border-[var(--line)] rounded-xl focus:outline-none focus:border-[var(--royal-700)] text-[14px] transition"
              />
            </div>
            <div>
              <label className="block font-medium text-[13px] text-zinc-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'} required autoComplete="current-password"
                  value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  placeholder="••••••"
                  className="w-full px-4 py-3 pr-11 bg-white border border-[var(--line)] rounded-xl focus:outline-none focus:border-[var(--royal-700)] text-[14px] transition"
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
              ) : <Icon.lock className="w-4 h-4" />}
              {loading ? 'Entrando…' : 'Entrar no painel'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 p-4 bg-[var(--royal-50)] border border-[var(--royal-100)] rounded-xl">
            <div className="font-display font-bold text-[12px] text-[var(--royal-700)] tracking-wider mb-2">DEMONSTRAÇÃO</div>
            <div className="text-[12px] text-zinc-600 space-y-0.5">
              <div><span className="text-zinc-400">E-mail:</span> lojista@vox.com</div>
              <div><span className="text-zinc-400">Senha:</span> 123456</div>
            </div>
            <button onClick={fillDemo}
              className="mt-3 text-[12px] font-medium text-[var(--royal-700)] hover:underline">
              Preencher automaticamente →
            </button>
          </div>

          <div className="mt-8 text-center">
            <Link to="/" className="text-[13px] text-zinc-500 hover:text-[var(--royal-700)] transition">
              ← Voltar para a loja
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
