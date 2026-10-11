import PanelMetricCard from '../../components/panel/PanelMetricCard';
import PanelNextAction from '../../components/panel/PanelNextAction';
import { PanelLoading, PanelError } from '../../components/panel/PanelFeedback';
import { PanelPageHeader, PanelQuickActions } from '../../components/panel/PanelShell';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import { api } from '../../lib/api.js';
import { Icon } from '../../icons';
import { formatBRL } from '../../utils';
import { orderLink } from '../../lib/panel';

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

  if (loading) return <PanelLoading />;
  if (error) return <PanelError message={error} />;
  if (!metrics) return null;

  const maxVal = Math.max(1, ...(metrics.grafico ?? []).map(d => d.valor));
  const recentes = pedidos.slice(0, 5);
  const novosCount = pedidos.filter(p => p.status === 'NOVO').length;
  const pendentesCount = pedidos.filter(p => p.status !== 'ENTREGUE').length;

  const cards = [
    { label: 'Pedidos hoje',    valor: metrics.pedidosHoje,                sub: `${metrics.pedidosMes} no mês`,               icon: 'package',    cor: 'text-[var(--royal-700)]', bg: 'bg-[var(--royal-50)]' },
    { label: 'Faturamento mês', valor: formatBRL(metrics.faturamentoMes),  sub: `Ontem: ${formatBRL(metrics.faturamentoOntem)}`, icon: 'trendingUp', cor: 'text-emerald-700',       bg: 'bg-emerald-50' },
    { label: 'Ticket médio',    valor: formatBRL(metrics.ticketMedio),     sub: 'Por pedido',                                 icon: 'barChart',   cor: 'text-violet-700',        bg: 'bg-violet-50' },
    { label: 'Estoque baixo', valor: metrics.estoqueBaixo, sub: 'Ver produtos com até 5 unidades', icon: 'bell', to: '/admin/produtos?estoque=baixo' },
  ];

  return (
    <div>
      {/* Header */}
      <PanelPageHeader title={`Olá, ${user?.nome?.split(' ')[0] ?? 'lojista'}`} description="Acompanhe sua loja e escolha o que fazer agora." />
      {pendentesCount > 0 ? <PanelNextAction title={`${pendentesCount} ${pendentesCount === 1 ? 'pedido precisa' : 'pedidos precisam'} de atendimento`} description="Confira os itens e avance o atendimento depois de concluir cada etapa." action="Atender agora" to={novosCount ? '/admin/pedidos?status=NOVO' : '/admin/pedidos'} /> : metrics.estoqueBaixo > 0 ? <PanelNextAction title="Confira o estoque da loja" description={`${metrics.estoqueBaixo} produtos têm até 5 unidades. Revise as quantidades antes de vender.`} action="Ver estoque baixo" to="/admin/produtos?estoque=baixo" /> : <PanelNextAction title="Tudo em dia" description="Não há pedidos em andamento. Você pode revisar os produtos da loja." action="Ver produtos" to="/admin/produtos" />}
      <PanelQuickActions items={[
        ...(!pendentesCount ? [{ to: '/admin/pedidos', label: 'Consultar pedidos', description: 'Compras e histórico de atendimento', icon: 'package' }] : []),
        { to: '/admin/produtos', label: 'Gerenciar produtos', description: 'Cadastro, preço e estoque', icon: 'tag' },
        { to: '/admin/clientes', label: 'Consultar clientes', description: 'Contatos, compras e pontos', icon: 'users' },
        { to: '/admin/configuracoes', label: 'Editar página da loja', description: 'Conteúdo, imagens e aparência', icon: 'settings' },
      ]} />

      <details className="panel-disclosure mb-6"><summary>Resultados da loja <span>Vendas, estoque e últimos 7 dias</span></summary><div className="panel-disclosure-content">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => <PanelMetricCard key={c.label} to={c.to} label={c.label} value={c.valor} description={c.sub} icon={c.icon} />)}
      </div>

      <div className="grid gap-5">
        {/* Gráfico */}
        <div className="bg-white border border-[var(--line)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="font-display font-bold text-[20px]">Faturamento</div>
              <div className="text-[12px] text-zinc-500">Últimos 7 dias</div>
            </div>
            <div className="text-[12px] text-zinc-400">{new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date())}</div>
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

      </div>

      </div></details>
      {/* Pedidos recentes */}
      <div className="mt-5 bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
          <div className="font-display font-bold text-[18px]">Pedidos recentes</div>
          <Link to="/admin/pedidos" className="text-[13px] font-medium text-[var(--royal-700)] hover:underline flex items-center gap-1">
            Ver todos <Icon.arrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="panel-data-table w-full text-[13px]">
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
                  <td data-label="Pedido" className="px-5 py-3.5 font-display font-bold text-[var(--royal-700)]"><Link to={orderLink('/admin', p.id)} className="panel-inline-link" aria-label={`Abrir pedido ${p.codigo ?? p.id}`}>{p.codigo ?? p.id} <Icon.arrowRight className="w-4 h-4" /></Link></td>
                  <td data-label="Cliente" className="px-5 py-3.5 text-zinc-700">{p.clienteNome ?? p.cliente?.usuario?.nome ?? ''}</td>
                  <td data-label="Total" className="px-5 py-3.5 font-semibold">{formatBRL(p.total)}</td>
                  <td data-label="Pagamento" className="px-5 py-3.5 text-zinc-500">{p.pagamento}</td>
                  <td data-label="Status" className="px-5 py-3.5">
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
