import { PanelLoading, PanelError } from '../../components/panel/PanelFeedback';
import PanelDialog from '../../components/panel/PanelDialog';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { Icon } from '../../icons';
import { formatBRL } from '../../utils';
import { PHONE_DIGITS } from '../../data';
import { formatPanelDate, normalizeSearch, orderTimeline, ORDER_GUIDANCE, setPanelParams } from '../../lib/panel';
import { PanelEmptyState, PanelOrderTimeline } from '../../components/panel/PanelFlow';

const STATUS_STYLE = {
  NOVO:       'bg-blue-50 text-blue-700 border-blue-200',
  EM_PREPARO: 'bg-amber-50 text-amber-700 border-amber-200',
  PRONTO:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  ENTREGUE:   'bg-zinc-100 text-zinc-600 border-zinc-200',
};
const STATUS_LABEL = { NOVO: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue' };

export default function ClientePedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [params, setParams] = useSearchParams();
  const selected = pedidos.find(p => p.id === params.get('pedido'));
  const detalhe = selected ? { ...selected, timeline: orderTimeline(selected) } : null;
  const setDetalhe = value => setPanelParams(setParams, { pedido: value?.id }, false);
  const busca = params.get('busca') ?? '';
  const filtrados = pedidos.filter(p => normalizeSearch(`${p.codigo ?? ''} ${(p.itens ?? p.produtos ?? []).map(i => i.nome ?? i.produto?.nome ?? '').join(' ')}`).includes(normalizeSearch(busca)) && (params.get('situacao') !== 'abertos' || p.status !== 'ENTREGUE'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/pedidos/meus')
      .then(data => setPedidos(Array.isArray(data) ? data : (data.pedidos ?? [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PanelLoading />;
  if (error) return <PanelError message={error} />;

  return (
    <div>
      <PanelPageHeader title="Meus pedidos" description="Acompanhe suas compras e consulte os detalhes." />
      {params.get('pedido') && !detalhe && <p role="status" className="panel-inline-notice">Este pedido não está disponível nesta conta. Consulte suas compras abaixo.</p>}
      {pedidos.length > 0 && <div className="panel-filter-bar"><label className="panel-search-field">Buscar compra<input value={busca} onChange={e => setPanelParams(setParams, { busca: e.target.value })} placeholder="Número do pedido ou produto" /></label><button aria-pressed={params.get('situacao') === 'abertos'} className="panel-secondary-button" onClick={() => setPanelParams(setParams, { situacao: params.get('situacao') === 'abertos' ? '' : 'abertos' })}>Somente em andamento</button></div>}

      {pedidos.length === 0 ? (
        <PanelEmptyState title="Nenhum pedido ainda" description="Escolha um produto na loja. Suas compras registradas pela equipe aparecerão aqui." action="Escolher um produto" to="/#produtos" />
      ) : (
        <div className="space-y-4">
          {filtrados.length === 0 && <PanelEmptyState title="Nenhuma compra corresponde à busca" description="Tente outro número ou consulte todas as compras." action="Limpar filtros" onAction={() => setPanelParams(setParams, { busca: '', situacao: '' })} />}
          {filtrados.map((p, i) => {
            const timeline = orderTimeline(p);
            const itensList = (p.produtos ?? p.itens ?? []).map(x => `${x.qty ?? x.quantidade ?? 1}x ${x.nome ?? x.produto?.nome ?? ''}`).join(', ');
            return (
              <div key={i} className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
                <div className="flex flex-wrap gap-3 items-center justify-between px-6 py-4 border-b border-[var(--line)]">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-[var(--royal-700)] text-[16px]">{p.codigo ?? p.id}</span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_STYLE[p.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                  <div className="text-[12px] text-zinc-500">{formatPanelDate(p.data ?? p.createdAt)}</div>
                </div>

                <div className="px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-[13px] text-zinc-700 mb-1">{itensList}</div>
                      <div className="text-[12px] text-zinc-500">{p.pagamento}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-display font-bold text-[22px] text-[var(--ink)]">{formatBRL(p.total)}</div>
                      <button onClick={() => setDetalhe({ ...p, timeline })}
                        className="inline-flex items-center gap-1.5 px-4 h-9 border border-[var(--line)] rounded-full text-[12.5px] font-medium text-zinc-600 hover:border-[var(--royal-700)] hover:text-[var(--royal-700)] transition">
                        <Icon.eye className="w-3.5 h-3.5" /> Detalhes
                      </button>
                    </div>
                  </div>

                  <p className="panel-order-guidance">{ORDER_GUIDANCE[p.status]}</p>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalhe */}
      {detalhe && (
        <PanelDialog label="Detalhes do pedido" onClose={() => setDetalhe(null)}>
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[var(--line)]">
              <div>
                <div className="font-display font-bold text-[22px]">{detalhe.codigo ?? detalhe.id}</div>
                <div className="text-[13px] text-zinc-500">{formatPanelDate(detalhe.data ?? detalhe.createdAt)} · {detalhe.pagamento}</div>
              </div>
              <button aria-label="Fechar detalhes" onClick={() => setDetalhe(null)} className="w-9 h-9 rounded-full hover:bg-zinc-100 grid place-items-center">
                <Icon.close className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              <div className="space-y-2">
                {(detalhe.produtos ?? detalhe.itens ?? []).map((it, i) => {
                  const nome  = it.nome ?? it.produto?.nome ?? '';
                  const qty   = it.qty  ?? it.quantidade ?? 1;
                  const preco = it.preco ?? it.precoUnitario ?? 0;
                  return (
                    <div key={i} className="flex items-center justify-between px-4 py-3 bg-[var(--paper)] rounded-xl text-[13px]">
                      <span>{qty}x {nome}</span>
                      <span className="font-semibold">{formatBRL(preco * qty)}</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between px-4 pt-3 border-t border-[var(--line)] font-display font-bold text-[20px]">
                  <span>Total</span><span>{formatBRL(detalhe.total)}</span>
                </div>
              </div>
              {/* Timeline completa */}
              <div>
                <div className="font-display font-bold text-[15px] mb-3">Acompanhamento</div>
                <PanelOrderTimeline timeline={detalhe.timeline ?? []} />
              </div>

              <a href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(`Olá! Quero informações sobre o pedido ${detalhe.codigo ?? detalhe.id}`)}`}
                target="_blank" rel="noopener"
                className="w-full inline-flex items-center justify-center gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-[13px] transition">
                <Icon.whatsapp className="w-4 h-4" /> Rastrear / falar com a loja
              </a>
            </div>
          </div>
        </PanelDialog>
      )}
    </div>
  );
}
