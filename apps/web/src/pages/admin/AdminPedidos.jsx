import { PanelLoading, PanelError } from '../../components/panel/PanelFeedback';
import PanelDialog from '../../components/panel/PanelDialog';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Icon } from '../../icons';
import { formatBRL } from '../../utils';
import { brazilPhone } from '../../lib/catalog';

const STATUS_LIST_API  = ['TODOS', 'NOVO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE'];
const STATUS_LABEL     = { NOVO: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue', TODOS: 'Todos' };
const STATUS_STYLE     = {
  NOVO:       'bg-blue-50 text-blue-700 border-blue-200',
  EM_PREPARO: 'bg-amber-50 text-amber-700 border-amber-200',
  PRONTO:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  ENTREGUE:   'bg-zinc-100 text-zinc-600 border-zinc-200',
};
const NEXT_STATUS = { NOVO: 'EM_PREPARO', EM_PREPARO: 'PRONTO', PRONTO: 'ENTREGUE' };

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState('TODOS');
  const [busca, setBusca] = useState('');
  const [detalhe, setDetalhe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    api.get('/pedidos')
      .then(data => setPedidos(Array.isArray(data) ? data : (data.pedidos ?? [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = pedidos.filter(p => {
    const matchFiltro = filtro === 'TODOS' || p.status === filtro;
    const clienteNome = p.clienteNome ?? (typeof p.cliente === 'object' ? p.cliente?.usuario?.nome : p.cliente) ?? '';
    const matchBusca  = busca === '' ||
      `${p.codigo ?? ''} ${p.id}`.toLowerCase().includes(busca.toLowerCase()) ||
      clienteNome.toLowerCase().includes(busca.toLowerCase());
    return matchFiltro && matchBusca;
  });

  const avancarStatus = async (id) => {
    if (pending) return;
    const pedido = pedidos.find(p => p.id === id);
    if (!pedido || !NEXT_STATUS[pedido.status]) return;
    const novoStatus = NEXT_STATUS[pedido.status];
    setPending(true);
    setActionError('');
    try {
      const updated = await api.patch(`/pedidos/${id}/status`, { status: novoStatus });
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      if (detalhe?.id === id) setDetalhe(prev => ({ ...prev, ...updated }));
    } catch (e) {
      setActionError(e.message);
    } finally {
      setPending(false);
    }
  };

  if (loading) return <PanelLoading />;
  if (error) return <PanelError message={error} />;

  return (
    <div>
      <PanelPageHeader title="Pedidos" description="Encontre um pedido e atualize o andamento." />

      {actionError && <p role="alert" className="text-red-600 mb-4">{actionError}</p>}
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Icon.search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input aria-label="Buscar pedido ou cliente" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar pedido ou cliente…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[var(--line)] rounded-xl text-[13px] focus:outline-none focus:border-[var(--royal-700)]" />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_LIST_API.map(s => (
            <button key={s} aria-pressed={filtro === s} onClick={() => setFiltro(s)}
              className={`px-3.5 h-9 rounded-full text-[12.5px] font-medium border transition ${filtro === s ? 'bg-[var(--royal-800)] text-white border-[var(--royal-800)]' : 'bg-white text-zinc-600 border-[var(--line)] hover:border-[var(--royal-700)]'}`}>
              {STATUS_LABEL[s]}
              <span className={`ml-1.5 text-[11px] ${filtro === s ? 'text-white/60' : 'text-zinc-400'}`}>
                {s === 'TODOS' ? pedidos.length : pedidos.filter(p => p.status === s).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="panel-data-table w-full text-[13px]">
            <thead className="bg-[var(--paper)] border-b border-[var(--line)]">
              <tr>
                {['Pedido', 'Data', 'Cliente', 'Produtos', 'Total', 'Pagamento', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold text-zinc-500 text-[11px] tracking-wider uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => {
                const clienteNome = p.clienteNome ?? (typeof p.cliente === 'object' ? p.cliente?.usuario?.nome : p.cliente) ?? '';
                const telefone = brazilPhone(p.clienteTelefone ?? p.cliente?.telefone);
                const itensList = (p.produtos ?? p.itens ?? []).map(x => x.nome ?? x.produto?.nome).filter(Boolean).join(', ');
                return (
                  <tr key={i} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)] transition">
                    <td data-label="Pedido" className="px-5 py-3.5 font-display font-bold text-[var(--royal-700)] whitespace-nowrap">{p.codigo ?? p.id}</td>
                    <td data-label="Data" className="px-5 py-3.5 text-zinc-500 whitespace-nowrap">{p.data ?? p.createdAt?.slice(0, 10)}</td>
                    <td data-label="Cliente" className="px-5 py-3.5 font-medium text-zinc-800 whitespace-nowrap">{clienteNome}</td>
                    <td data-label="Produtos" className="px-5 py-3.5 text-zinc-500 max-w-[180px] truncate">{itensList}</td>
                    <td data-label="Total" className="px-5 py-3.5 font-semibold whitespace-nowrap">{formatBRL(p.total)}</td>
                    <td data-label="Pagamento" className="px-5 py-3.5 text-zinc-500 whitespace-nowrap">{p.pagamento}</td>
                    <td data-label="Status" className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_STYLE[p.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td data-label="Ações" className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setDetalhe(p)}
                          className="w-8 h-8 rounded-lg bg-[var(--royal-50)] text-[var(--royal-700)] grid place-items-center hover:bg-[var(--royal-100)] transition" title="Ver detalhes">
                          <Icon.eye className="w-3.5 h-3.5" />
                        </button>
                        {NEXT_STATUS[p.status] && (
                          <button disabled={pending} onClick={() => avancarStatus(p.id)}
                            className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 grid place-items-center hover:bg-emerald-100 transition" title={`Avançar para ${STATUS_LABEL[NEXT_STATUS[p.status]]}`}>
                            <Icon.check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {telefone && <a href={`https://wa.me/${telefone}?text=${encodeURIComponent(`Olá ${clienteNome}! Sobre seu pedido ${p.codigo ?? p.id}: `)}`}
                          target="_blank" rel="noopener noreferrer" title="WhatsApp do cliente"
                          className="w-8 h-8 rounded-lg bg-emerald-600 text-white grid place-items-center"><Icon.whatsapp className="w-3.5 h-3.5" /></a>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-zinc-500">Nenhum pedido encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal detalhe */}
      {detalhe && (
        <PanelDialog label="Detalhes do pedido" onClose={() => setDetalhe(null)}>
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[var(--line)]">
              <div>
                <div className="font-display font-bold text-[22px]">{detalhe.codigo ?? detalhe.id}</div>
                <div className="text-[13px] text-zinc-500">{detalhe.data ?? detalhe.createdAt?.slice(0, 10)} · {detalhe.pagamento}</div>
              </div>
              <button aria-label="Fechar detalhes" onClick={() => setDetalhe(null)} className="w-9 h-9 rounded-full hover:bg-zinc-100 grid place-items-center">
                <Icon.close className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-0.5">Cliente</div>
                  <div className="font-semibold">{detalhe.clienteNome ?? (typeof detalhe.cliente === 'object' ? detalhe.cliente?.usuario?.nome : detalhe.cliente) ?? ''}</div>
                  <div className="text-[12px] text-zinc-500">{detalhe.clienteEmail ?? (typeof detalhe.cliente === 'object' ? detalhe.cliente?.usuario?.email : detalhe.email) ?? ''}</div>
                </div>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-semibold border ${STATUS_STYLE[detalhe.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                  {STATUS_LABEL[detalhe.status] ?? detalhe.status}
                </span>
              </div>
              <div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">Itens</div>
                <div className="space-y-2">
                  {(detalhe.produtos ?? detalhe.itens ?? []).map((it, i) => {
                    const nome  = it.nome ?? it.produto?.nome ?? '';
                    const qty   = it.qty  ?? it.quantidade ?? 1;
                    const preco = it.preco ?? it.precoUnitario ?? 0;
                    return (
                      <div key={i} className="flex items-center justify-between text-[13px] bg-[var(--paper)] rounded-lg px-3 py-2">
                        <span>{qty}x {nome}</span>
                        <span className="font-semibold">{formatBRL(preco * qty)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--line)] font-display font-bold text-[18px]">
                  <span>Total</span><span>{formatBRL(detalhe.total)}</span>
                </div>
              </div>
              {NEXT_STATUS[detalhe.status] && (
                <button disabled={pending} onClick={() => avancarStatus(detalhe.id)}
                  className="w-full inline-flex items-center justify-center gap-2 h-11 bg-[var(--royal-700)] hover:bg-[var(--royal-800)] text-white rounded-xl font-semibold text-[13px] transition">
                  <Icon.check className="w-4 h-4" /> Avançar para "{STATUS_LABEL[NEXT_STATUS[detalhe.status]]}"
                </button>
              )}
            </div>
          </div>
        </PanelDialog>
      )}
    </div>
  );
}
