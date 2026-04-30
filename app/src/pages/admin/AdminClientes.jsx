import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Icon } from '../../icons';
import { formatBRL } from '../../utils';

const STATUS_STYLE = {
  NOVO:       'bg-blue-50 text-blue-700',
  EM_PREPARO: 'bg-amber-50 text-amber-700',
  PRONTO:     'bg-emerald-50 text-emerald-700',
  ENTREGUE:   'bg-zinc-100 text-zinc-600',
};
const STATUS_LABEL = { NOVO: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue' };

export default function AdminClientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/clientes')
      .then(data => setClientes(Array.isArray(data) ? data : (data.clientes ?? [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = clientes.filter(c =>
    busca === '' ||
    (c.nome ?? '').toLowerCase().includes(busca.toLowerCase()) ||
    (c.email ?? '').includes(busca)
  );

  const totalGasto  = clientes.reduce((s, c) => s + (c.totalGasto ?? 0), 0);
  const totalPontos = clientes.reduce((s, c) => s + (c.pontos ?? 0), 0);

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
          <span className="font-display text-[var(--red-500)] font-semibold text-[11px] tracking-[0.28em]">CRM</span>
        </div>
        <h1 className="font-display font-bold text-[32px] text-[var(--ink)]">Clientes</h1>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total cadastros', valor: clientes.length },
          { label: 'Ticket médio', valor: clientes.length ? formatBRL(Math.round(totalGasto / clientes.length)) : '—' },
          { label: 'Pontos distribuídos', valor: totalPontos },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[var(--line)] rounded-2xl p-5 text-center">
            <div className="font-display font-bold text-[26px] text-[var(--ink)]">{s.valor}</div>
            <div className="text-[12px] text-zinc-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-5">
        <Icon.search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          className="w-full pl-10 pr-4 py-3 bg-white border border-[var(--line)] rounded-xl text-[13px] focus:outline-none focus:border-[var(--royal-700)]" />
      </div>

      {/* Lista */}
      <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--paper)] border-b border-[var(--line)]">
              <tr>
                {['Cliente', 'Cidade', 'Pedidos', 'Total gasto', 'Pontos', 'Cadastro', 'Ações'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold text-zinc-500 text-[11px] tracking-wider uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c, i) => (
                <tr key={i} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)] transition">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--royal-700)] to-[var(--royal-500)] grid place-items-center text-white font-display font-bold text-[14px] shrink-0">
                        {(c.nome ?? '?')[0]}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-800">{c.nome}</div>
                        <div className="text-[11px] text-zinc-400">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500">{c.cidade ?? '—'}</td>
                  <td className="px-5 py-3.5 font-medium">{c.pedidos ?? 0}</td>
                  <td className="px-5 py-3.5 font-semibold">{formatBRL(c.totalGasto ?? 0)}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[11px] font-semibold">
                      <Icon.award className="w-3 h-3" /> {c.pontos ?? 0} pts
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 whitespace-nowrap">{c.cadastro ?? c.createdAt?.slice(0, 10) ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelecionado(c)}
                        className="w-8 h-8 rounded-lg bg-[var(--royal-50)] text-[var(--royal-700)] grid place-items-center hover:bg-[var(--royal-100)] transition">
                        <Icon.eye className="w-3.5 h-3.5" />
                      </button>
                      {c.telefone && (
                        <a href={`https://wa.me/55${(c.telefone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${(c.nome ?? '').split(' ')[0]}! Aqui é da Vox Celular 😊`)}`}
                          target="_blank" rel="noopener"
                          className="w-8 h-8 rounded-lg bg-emerald-600 text-white grid place-items-center hover:bg-emerald-700 transition">
                          <Icon.whatsapp className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-zinc-500">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal detalhe do cliente */}
      {selecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelecionado(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[var(--line)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--royal-700)] to-[var(--royal-500)] grid place-items-center text-white font-display font-bold text-[18px]">
                  {(selecionado.nome ?? '?')[0]}
                </div>
                <div>
                  <div className="font-display font-bold text-[20px]">{selecionado.nome}</div>
                  <div className="text-[12px] text-zinc-500">{selecionado.email}{selecionado.telefone ? ` · ${selecionado.telefone}` : ''}</div>
                </div>
              </div>
              <button onClick={() => setSelecionado(null)} className="w-9 h-9 rounded-full hover:bg-zinc-100 grid place-items-center">
                <Icon.close className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total gasto', valor: formatBRL(selecionado.totalGasto ?? 0) },
                  { label: 'Pedidos', valor: selecionado.pedidos ?? 0 },
                  { label: 'Pontos', valor: `${selecionado.pontos ?? 0} pts` },
                ].map((s, i) => (
                  <div key={i} className="bg-[var(--paper)] rounded-xl p-4 text-center">
                    <div className="font-display font-bold text-[18px]">{s.valor}</div>
                    <div className="text-[11px] text-zinc-500">{s.label}</div>
                  </div>
                ))}
              </div>
              {selecionado.historicoPedidos?.length > 0 && (
                <div>
                  <div className="font-display font-bold text-[15px] mb-3">Histórico de pedidos</div>
                  <div className="space-y-2">
                    {selecionado.historicoPedidos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper)] rounded-xl text-[13px]">
                        <div>
                          <span className="font-display font-bold text-[var(--royal-700)]">{p.id}</span>
                          <span className="text-zinc-500 ml-2">{p.data ?? p.createdAt?.slice(0, 10)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{formatBRL(p.total)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[p.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
