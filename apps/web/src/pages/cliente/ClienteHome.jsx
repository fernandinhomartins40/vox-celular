import PanelMetricCard from '../../components/panel/PanelMetricCard';
import { PanelLoading } from '../../components/panel/PanelFeedback';
import { PanelPageHeader, PanelQuickActions } from '../../components/panel/PanelShell';
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
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState([]);

  useEffect(() => {
    let active = true;
    const lojaId = user?.lojaId ?? localStorage.getItem('vox_loja_id') ?? '';
    Promise.allSettled([
      api.get('/pedidos/meus'),
      api.get('/fidelidade/pontos'),
      api.get(lojaId ? `/promocoes?lojaId=${lojaId}` : '/promocoes'),
    ]).then(([orders, loyalty, offers]) => {
      if (!active) return;
      if (orders.status === 'fulfilled') setPedidos(Array.isArray(orders.value) ? orders.value : (orders.value.pedidos ?? []));
      if (loyalty.status === 'fulfilled') setFidelidade(loyalty.value);
      if (offers.status === 'fulfilled') setPromocoes(Array.isArray(offers.value) ? offers.value : (offers.value.promocoes ?? []));
      setFailed([['pedidos', orders], ['pontos', loyalty], ['ofertas', offers]].filter(([, result]) => result.status === 'rejected').map(([name]) => name));
      setLoading(false);
    });
    return () => { active = false; };
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
      <PanelPageHeader title={`Olá, ${user?.nome?.split(' ')[0] ?? 'cliente'}!`} description="Seus pedidos e benefícios, em um só lugar.">
        <a href={`https://wa.me/${PHONE_DIGITS}`} target="_blank" rel="noopener noreferrer" className="panel-help-link"><Icon.whatsapp /> Falar com a loja</a>
      </PanelPageHeader>
      <PanelQuickActions items={[
        { to: '/area-cliente/pedidos', label: 'Acompanhar pedido', description: 'Status e detalhes da compra', icon: 'package' },
        { to: '/area-cliente/fidelidade', label: 'Usar meus pontos', description: 'Saldo e recompensas juntos', icon: 'award' },
        { to: '/area-cliente/promocoes', label: 'Ver ofertas', description: 'Oportunidades da loja', icon: 'tag' },
      ]} />
      {loading && <PanelLoading />}
      {failed.length > 0 && <div role="alert" className="panel-inline-notice">Não foi possível consultar {failed.join(', ')}. <button onClick={() => window.location.reload()}>Tentar novamente</button></div>}
      {/* Cards de atalho */}
      {!loading && <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { to: '/area-cliente/pedidos', label: 'Meus pedidos', icon: 'package', val: failed.includes('pedidos') ? '—' : pedidos.length, sub: failed.includes('pedidos') ? 'indisponível' : 'no histórico' },
          { to: '/area-cliente/fidelidade', label: 'Pontos', icon: 'award', val: pontos?.saldo ?? '—', sub: pontos ? `nível ${pontos.nivel}` : 'indisponível' },
          { to: '/area-cliente/promocoes', label: 'Ofertas', icon: 'tag', val: failed.includes('ofertas') ? '—' : promocoes.length, sub: failed.includes('ofertas') ? 'indisponível' : 'disponíveis' },
          { to: '/area-cliente/fidelidade', label: 'Recompensas', icon: 'gift', val: failed.includes('pontos') ? '—' : recompensasDisponiveis, sub: failed.includes('pontos') ? 'indisponível' : 'disponíveis' },
        ].map(c => <PanelMetricCard key={c.label} to={c.to} label={c.label} value={c.val} description={c.sub} icon={c.icon} />)}

      </div>}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Último pedido */}
        {ultimoPedido && (
          <div className="bg-white border border-[var(--line)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-[18px]">Último pedido</div>
              <Link to="/area-cliente/pedidos" className="text-[12px] text-[var(--royal-700)] hover:underline">Ver todos</Link>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-display font-bold text-[var(--royal-700)]">{ultimoPedido.codigo ?? ultimoPedido.id}</span>
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
            <div className="font-display font-bold text-[18px]">Oferta da loja</div>
            <Link to="/area-cliente/promocoes" className="text-[12px] text-[var(--royal-700)] hover:underline">Ver todas</Link>
          </div>
          <div className="flex flex-col sm:flex-row">
            {promo.img && <img src={promo.img} alt="" className="sm:w-48 h-40 sm:h-auto object-cover" />}
            <div className="p-6 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--royal-50)] text-[var(--royal-700)] rounded-full text-[11px] font-semibold mb-3">
                  <Icon.tag className="w-3 h-3" /> OFERTA
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
