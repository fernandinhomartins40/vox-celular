import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import { api } from '../../lib/api.js';
import { Icon } from '../../icons';
import { formatBRL } from '../../utils';

const STATUS_STYLE = {
  'NOVO':       'bg-blue-50 text-blue-700 border-blue-200',
  'EM_PREPARO': 'bg-amber-50 text-amber-700 border-amber-200',
  'PRONTO':     'bg-emerald-50 text-emerald-700 border-emerald-200',
  'ENTREGUE':   'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const STATUS_LABEL = {
  NOVO: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/pedidos'),
    ])
      .then(([m, p]) => {
        setMetrics(m);
        setPedidos(Array.isArray(p) ? p : (p.pedidos ?? []));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[var(--royal-700)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!metrics) return null;

  const maxVal = metrics.grafico?.length ? Math.max(...metrics.grafico.map(d => d.valor)) : 1;
  const recentes = pedidos.slice(0, 5);
  const novosCount = pedidos.filter(p => p.status === 'NOVO').length;

  const cards = [
    { label: 'Pedidos hoje',    valor: metrics.pedidosHoje,                sub: `${metrics.pedidosMes} no mês`,               icon: 'package',    cor: 'text-[var(--royal-700)]', bg: 'bg-[var(--royal-50)]' },
    { label: 'Faturamento mês', valor: formatBRL(metrics.faturamentoMes),  sub: `Ontem: ${formatBRL(metrics.faturamentoOntem)}`, icon: 'trendingUp', cor: 'text-emerald-700',       bg: 'bg-emerald-50' },
    { label: 'Ticket médio',    valor: formatBRL(metrics.ticketMedio),     sub: 'Por pedido',                                 icon: 'barChart',   cor: 'text-violet-700',        bg: 'bg-violet-50' },
    { label: 'Estoque baixo',   valor: metrics.estoqueBaixo,               sub: 'Produtos críticos',                          icon: 'bell',       cor: 'text-amber-700',         bg: 'bg-amber-50' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <p className="text-zinc-500 text-[13px]">Quarta-feira, 30 de abril de 2026</p>
        <h1 className="font-display font-bold text-[32px] sm:text-[40px] leading-tight text-[var(--ink)]">
          Olá, {user?.nome?.split(' ')[0]} 👋
        </h1>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c, i) => {
          const I = Icon[c.icon];
          return (
            <div key={i} className="bg-white border border-[var(--line)] rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.cor} grid place-items-center mb-4`}>
                <I className="w-5 h-5" />
              </div>
              <div className="font-display font-bold text-[26px] leading-none text-[var(--ink)] mb-1">{c.valor}</div>
              <div className="text-[12px] font-medium text-zinc-700">{c.label}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">{c.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        {/* Gráfico */}
        <div className="lg:col-span-7 bg-white border border-[var(--line)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="font-display font-bold text-[20px]">Faturamento</div>
              <div className="text-[12px] text-zinc-500">Últimos 7 dias</div>
            </div>
            <div className="text-[12px] text-zinc-400">Abr 2026</div>
          </div>
          <div className="flex items-end gap-2 h-40">
            {(metrics.grafico ?? []).map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] text-zinc-400 font-medium">{formatBRL(d.valor).replace('R$ ', '')}</div>
                <div
                  className="w-full rounded-t-lg bg-[var(--royal-700)] transition-all hover:bg-[var(--royal-500)]"
                  style={{ height: `${Math.max(8, (d.valor / maxVal) * 120)}px` }}
                  title={formatBRL(d.valor)}
                />
                <div className="text-[10px] text-zinc-400">{d.dia?.split('/')[0]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Atalhos */}
        <div className="lg:col-span-5 bg-white border border-[var(--line)] rounded-2xl p-6">
          <div className="font-display font-bold text-[20px] mb-4">Ações rápidas</div>
          <div className="space-y-2">
            {[
              { to: '/admin/pedidos',       label: 'Ver pedidos pendentes', icon: 'package',    badge: `${novosCount} novos` },
              { to: '/admin/produtos',      label: 'Gerenciar produtos',    icon: 'tag',        badge: null },
              { to: '/admin/clientes',      label: 'Base de clientes',      icon: 'users',      badge: null },
              { to: '/admin/configuracoes', label: 'Personalizar loja',     icon: 'settings',   badge: null },
            ].map((a, i) => {
              const I = Icon[a.icon];
              return (
                <Link key={i} to={a.to}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--paper)] border border-transparent hover:border-[var(--line)] transition group">
                  <div className="w-9 h-9 rounded-lg bg-[var(--royal-50)] text-[var(--royal-700)] grid place-items-center shrink-0">
                    <I className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-[13.5px] font-medium text-zinc-700 group-hover:text-[var(--ink)]">{a.label}</span>
                  {a.badge && <span className="text-[11px] text-[var(--royal-700)] bg-[var(--royal-50)] px-2 py-0.5 rounded-full">{a.badge}</span>}
                  <Icon.arrowRight className="w-4 h-4 text-zinc-300 group-hover:text-[var(--royal-700)]" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pedidos recentes */}
      <div className="mt-5 bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
          <div className="font-display font-bold text-[18px]">Pedidos recentes</div>
          <Link to="/admin/pedidos" className="text-[13px] font-medium text-[var(--royal-700)] hover:underline flex items-center gap-1">
            Ver todos <Icon.arrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--paper)] border-b border-[var(--line)]">
              <tr>
                {['Pedido', 'Cliente', 'Total', 'Pagamento', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold text-zinc-500 text-[11px] tracking-wider uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentes.map((p, i) => (
                <tr key={i} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)] transition">
                  <td className="px-5 py-3.5 font-display font-bold text-[var(--royal-700)]">{p.id}</td>
                  <td className="px-5 py-3.5 text-zinc-700">{p.clienteNome ?? p.cliente?.usuario?.nome ?? ''}</td>
                  <td className="px-5 py-3.5 font-semibold">{formatBRL(p.total)}</td>
                  <td className="px-5 py-3.5 text-zinc-500">{p.pagamento}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_STYLE[p.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentes.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-zinc-500">Nenhum pedido encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
