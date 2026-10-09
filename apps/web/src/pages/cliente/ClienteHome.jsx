import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import { api } from '../../lib/api.js';
import { Icon } from '../../icons';
import { formatBRL } from '../../utils';
import { PHONE_DIGITS } from '../../data';

const STATUS_STYLE = {
  NOVO:       'bg-blue-50 text-blue-700',
  EM_PREPARO: 'bg-amber-50 text-amber-700',
  PRONTO:     'bg-emerald-50 text-emerald-700',
  ENTREGUE:   'bg-zinc-100 text-zinc-600',
};
const STATUS_LABEL = { NOVO: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue' };

export default function ClienteHome() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [fidelidade, setFidelidade] = useState(null);
  const [promocoes, setPromocoes] = useState([]);

  useEffect(() => {
    api.get('/pedidos/meus')
      .then(data => setPedidos(Array.isArray(data) ? data : (data.pedidos ?? [])))
      .catch(() => {});
    api.get('/fidelidade/pontos')
      .then(setFidelidade)
      .catch(() => {});
    const lojaId = user?.lojaId ?? localStorage.getItem('vox_loja_id') ?? '';
    api.get(lojaId ? `/promocoes?lojaId=${lojaId}` : '/promocoes')
      .then(data => setPromocoes(Array.isArray(data) ? data : (data.promocoes ?? [])))
      .catch(() => {});
  }, [user]);

  const ultimoPedido = pedidos[0] ?? null;
  const promo = promocoes[0] ?? null;
  const pontos = fidelidade;
  const progresso = pontos?.meta ? Math.round((pontos.saldo / pontos.meta) * 100) : 0;

  const recompensasDisponiveis = pontos
    ? (pontos.recompensas ?? []).filter(r => (r.pontos ?? r.custo ?? 0) <= pontos.saldo).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div className="royal-radiant rounded-2xl p-7 text-white relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5"/>
        <div className="relative">
          <p className="font-display text-[11px] tracking-[0.25em] text-white/60 mb-1">ÁREA DO CLIENTE</p>
          <h1 className="font-display font-bold text-[30px] sm:text-[36px] leading-tight">
            Olá, {user?.nome?.split(' ')[0]}! 👋
          </h1>
          <p className="text-white/70 text-[14px] mt-1">Bem-vindo à sua área exclusiva.</p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link to="/area-cliente/pedidos"
              className="inline-flex items-center gap-2 px-5 h-10 bg-white text-[var(--royal-800)] rounded-full font-semibold text-[13px] hover:bg-zinc-100 transition">
              <Icon.package className="w-4 h-4" /> Meus pedidos
            </Link>
            <a href={`https://wa.me/${PHONE_DIGITS}`} target="_blank" rel="noopener"
              className="inline-flex items-center gap-2 px-5 h-10 chip-glass text-white rounded-full font-medium text-[13px] hover:bg-white/15 transition">
              <Icon.whatsapp className="w-4 h-4" /> Falar com a loja
            </a>
          </div>
        </div>
      </div>

      {/* Cards de atalho */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { to: '/area-cliente/pedidos',    label: 'Meus Pedidos',  icon: 'package', val: pedidos.length,              sub: 'no histórico' },
          { to: '/area-cliente/fidelidade', label: 'Pontos',         icon: 'award',   val: pontos?.saldo ?? '—',        sub: pontos ? `nível ${pontos.nivel}` : 'carregando…' },
          { to: '/area-cliente/promocoes',  label: 'Promoções',      icon: 'tag',     val: promocoes.length,            sub: 'exclusivas' },
          { to: '/area-cliente/fidelidade', label: 'Recompensas',    icon: 'gift',    val: recompensasDisponiveis,      sub: 'disponíveis' },
        ].map((c, i) => {
          const I = Icon[c.icon];
          return (
            <Link key={i} to={c.to} className="bg-white border border-[var(--line)] rounded-2xl p-5 hover:border-[var(--royal-700)] hover:shadow-sm transition group">
              <div className="w-10 h-10 rounded-xl bg-[var(--royal-50)] text-[var(--royal-700)] grid place-items-center mb-3 group-hover:bg-[var(--royal-700)] group-hover:text-white transition">
                <I className="w-5 h-5" />
              </div>
              <div className="font-display font-bold text-[24px] leading-none text-[var(--ink)]">{c.val}</div>
              <div className="text-[12px] font-medium text-zinc-700 mt-1">{c.label}</div>
              <div className="text-[11px] text-zinc-400">{c.sub}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Último pedido */}
        {ultimoPedido && (
          <div className="bg-white border border-[var(--line)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-[18px]">Último pedido</div>
              <Link to="/area-cliente/pedidos" className="text-[12px] text-[var(--royal-700)] hover:underline">Ver todos</Link>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-display font-bold text-[var(--royal-700)]">{ultimoPedido.id}</span>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLE[ultimoPedido.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                {STATUS_LABEL[ultimoPedido.status] ?? ultimoPedido.status}
              </span>
            </div>
            <div className="text-[13px] text-zinc-600 mb-3">
              {(ultimoPedido.produtos ?? ultimoPedido.itens ?? []).map(p => p.nome ?? p.produto?.nome ?? '').filter(Boolean).join(', ')}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[var(--line)]">
              <span className="text-[12px] text-zinc-500">{ultimoPedido.data ?? ultimoPedido.createdAt?.slice(0, 10)}</span>
              <span className="font-display font-bold text-[18px]">{formatBRL(ultimoPedido.total)}</span>
            </div>
          </div>
        )}

        {/* Pontos */}
        {pontos && (
          <div className="bg-white border border-[var(--line)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-[18px]">Programa de fidelidade</div>
              <Link to="/area-cliente/fidelidade" className="text-[12px] text-[var(--royal-700)] hover:underline">Ver detalhes</Link>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 grid place-items-center">
                <Icon.award className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <div className="font-display font-bold text-[26px] leading-none">{pontos.saldo} <span className="text-[14px] text-zinc-500 font-normal">pontos</span></div>
                <div className="text-[12px] text-zinc-500">Nível {pontos.nivel}{pontos.meta ? ` · meta: ${pontos.meta} pts para ${pontos.proximoNivel}` : ''}</div>
              </div>
            </div>
            {pontos.meta && (
              <>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all" style={{ width: `${progresso}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400 mt-1.5">
                  <span>{pontos.saldo} pts</span><span>{pontos.meta} pts</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Promoção exclusiva */}
      {promo && (
        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between">
            <div className="font-display font-bold text-[18px]">Oferta exclusiva para você</div>
            <Link to="/area-cliente/promocoes" className="text-[12px] text-[var(--royal-700)] hover:underline">Ver todas</Link>
          </div>
          <div className="flex flex-col sm:flex-row">
            {promo.img && <img src={promo.img} alt="" className="sm:w-48 h-40 sm:h-auto object-cover" />}
            <div className="p-6 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--royal-50)] text-[var(--royal-700)] rounded-full text-[11px] font-semibold mb-3">
                  <Icon.tag className="w-3 h-3" /> EXCLUSIVO
                </div>
                <h3 className="font-display font-bold text-[20px] mb-1">{promo.titulo}</h3>
                <p className="text-[13px] text-zinc-600 mb-4">{promo.desc ?? promo.descricao}</p>
              </div>
              {promo.preco && (
                <div className="flex items-center justify-between">
                  <div>
                    {promo.precoOriginal && <div className="price-old text-[13px]">{formatBRL(promo.precoOriginal)}</div>}
                    <div className="font-display font-bold text-[28px] text-[var(--ink)]">{formatBRL(promo.preco)}</div>
                  </div>
                  <a href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(`Olá! Vi a promoção exclusiva: ${promo.titulo} por ${formatBRL(promo.preco)}`)}`}
                    target="_blank" rel="noopener"
                    className="inline-flex items-center gap-2 px-5 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold text-[13px] transition">
                    <Icon.whatsapp className="w-4 h-4" /> Quero essa oferta
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
