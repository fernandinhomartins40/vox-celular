import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Icon } from '../../icons';
import { formatBRL } from '../../utils';
import { PHONE_DIGITS } from '../../data';

const STATUS_STYLE = {
  NOVO:       'bg-blue-50 text-blue-700 border-blue-200',
  EM_PREPARO: 'bg-amber-50 text-amber-700 border-amber-200',
  PRONTO:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  ENTREGUE:   'bg-zinc-100 text-zinc-600 border-zinc-200',
};
const STATUS_LABEL = { NOVO: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue' };

const TIMELINE_STEPS = ['Pedido recebido', 'Pagamento confirmado', 'Em preparo', 'Pronto para retirada', 'Entregue'];
const STATUS_STEP = { NOVO: 1, EM_PREPARO: 2, PRONTO: 3, ENTREGUE: 4 };

function buildTimeline(pedido) {
  const step = STATUS_STEP[pedido.status] ?? 0;
  if (pedido.timeline) return pedido.timeline;
  return TIMELINE_STEPS.map((label, i) => ({
    status: label,
    data: i <= step ? (pedido.data ?? pedido.createdAt?.slice(0, 10)) : null,
    ok: i <= step,
  }));
}

export default function ClientePedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [detalhe, setDetalhe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/pedidos/meus')
      .then(data => setPedidos(Array.isArray(data) ? data : (data.pedidos ?? [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[var(--royal-700)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div>
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-[2px] bg-[var(--red-500)]"></span>
          <span className="font-display text-[var(--red-500)] font-semibold text-[11px] tracking-[0.28em]">HISTÓRICO</span>
        </div>
        <h1 className="font-display font-bold text-[32px] text-[var(--ink)]">Meus Pedidos</h1>
      </div>

      {pedidos.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[var(--line)] rounded-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-zinc-100 grid place-items-center mb-4">
            <Icon.package className="w-7 h-7 text-zinc-400" />
          </div>
          <div className="font-display font-bold text-[18px] text-zinc-700">Nenhum pedido ainda</div>
          <p className="text-[13px] text-zinc-500 mt-1">Seus pedidos aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((p, i) => {
            const timeline = buildTimeline(p);
            const itensList = (p.produtos ?? p.itens ?? []).map(x => `${x.qty ?? x.quantidade ?? 1}x ${x.nome ?? x.produto?.nome ?? ''}`).join(', ');
            return (
              <div key={i} className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-[var(--royal-700)] text-[16px]">{p.id}</span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_STYLE[p.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                  <div className="text-[12px] text-zinc-500">{p.data ?? p.createdAt?.slice(0, 10)}</div>
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

                  {/* Mini timeline */}
                  <div className="mt-4 flex items-center gap-0">
                    {timeline.map((t, ti) => (
                      <div key={ti} className="flex items-center flex-1 last:flex-none">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-all ${
                          t.ok ? 'bg-[var(--royal-700)] text-white' : 'bg-zinc-100 text-zinc-400'
                        }`}>
                          {t.ok ? <Icon.check className="w-3.5 h-3.5" /> : ti + 1}
                        </div>
                        {ti < timeline.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 ${t.ok ? 'bg-[var(--royal-700)]' : 'bg-zinc-200'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-zinc-400 px-0.5">
                    {timeline.map((t, ti) => (
                      <div key={ti} className="text-center" style={{ width: ti < timeline.length - 1 ? '20%' : 'auto' }}>
                        {t.status.split(' ')[0]}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalhe */}
      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetalhe(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[var(--line)]">
              <div>
                <div className="font-display font-bold text-[22px]">{detalhe.id}</div>
                <div className="text-[13px] text-zinc-500">{detalhe.data ?? detalhe.createdAt?.slice(0, 10)} · {detalhe.pagamento}</div>
              </div>
              <button onClick={() => setDetalhe(null)} className="w-9 h-9 rounded-full hover:bg-zinc-100 grid place-items-center">
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
                <div className="space-y-3">
                  {(detalhe.timeline ?? []).map((t, ti) => (
                    <div key={ti} className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${t.ok ? 'bg-[var(--royal-700)] text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                        {t.ok ? <Icon.check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{ti + 1}</span>}
                      </div>
                      <div>
                        <div className={`font-medium text-[13px] ${t.ok ? 'text-[var(--ink)]' : 'text-zinc-400'}`}>{t.status}</div>
                        {t.data && <div className="text-[11px] text-zinc-500">{t.data}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <a href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(`Olá! Quero informações sobre o pedido ${detalhe.id}`)}`}
                target="_blank" rel="noopener"
                className="w-full inline-flex items-center justify-center gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-[13px] transition">
                <Icon.whatsapp className="w-4 h-4" /> Rastrear / falar com a loja
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
