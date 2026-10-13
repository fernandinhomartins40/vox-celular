import PanelPagination from '../../components/panel/PanelPagination';
import { usePanelPagination } from '../../lib/usePanelPagination';
import { PanelLoading, PanelError } from '../../components/panel/PanelFeedback';
import PanelDialog from '../../components/panel/PanelDialog';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { Icon } from '../../icons';
import { formatBRL } from '../../utils';
import { brazilPhone } from '../../lib/catalog';
import { formatPanelDate, normalizeSearch, orderLink, setPanelParams } from '../../lib/panel';

const STATUS_STYLE = {
  NOVO:       'bg-blue-50 text-blue-700',
  EM_PREPARO: 'bg-amber-50 text-amber-700',
  PRONTO:     'bg-emerald-50 text-emerald-700',
  ENTREGUE:   'bg-zinc-100 text-zinc-600',
};
const STATUS_LABEL = { NOVO: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue' };

export default function AdminClientes() {
  const [clientes, setClientes] = useState([]);
  const [params, setParams] = useSearchParams();
  const busca = params.get('busca') ?? '';
  const setBusca = value => setPanelParams(setParams, { busca: value });
  const closureOnly = params.get('encerramento') === 'solicitado';
  const selecionado = clientes.find(c => c.id === params.get('clienteDetalhe')) ?? null;
  const setSelecionado = value => setPanelParams(setParams, { clienteDetalhe: value?.id }, false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/clientes')
      .then(data => setClientes(Array.isArray(data) ? data : (data.clientes ?? [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = clientes.filter(c =>
    (!closureOnly || c.encerramentoConta?.status === 'SOLICITADA') && (busca === '' ||
    normalizeSearch(`${c.nome ?? ''} ${c.email ?? ''} ${c.telefone ?? ''}`).includes(normalizeSearch(busca)))
  );

  const pagination = usePanelPagination(filtrados, 12);

  const totalGasto  = clientes.reduce((s, c) => s + Number(c.totalGasto ?? 0), 0);
  const totalPontos = clientes.reduce((s, c) => s + (c.pontos ?? 0), 0);

  if (loading) return <PanelLoading />;
  if (error) return <PanelError message={error} />;

  return (
    <div>
      <PanelPageHeader title="Clientes" description="Consulte contatos, compras e pontos em um só lugar." />
      {params.get('clienteDetalhe') && !selecionado && <p role="status" className="panel-inline-notice">Este cliente não está disponível. Consulte os demais cadastros abaixo.</p>}

      {/* Stats rápidas */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total cadastros', valor: clientes.length },
          { label: 'Gasto médio por cliente', valor: clientes.length ? formatBRL(totalGasto / clientes.length) : '—' },
          { label: 'Saldo de pontos dos clientes', valor: totalPontos },
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
        <input aria-label="Buscar cliente" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone…"
          className="w-full pl-10 pr-4 py-3 bg-white border border-[var(--line)] rounded-xl text-[13px] focus:outline-none focus:border-[var(--royal-700)]" />
      </div>

      {/* Lista */}
      <label className="flex items-center gap-3 mb-4"><input type="checkbox" checked={closureOnly} onChange={event => setPanelParams(setParams, { encerramento: event.target.checked ? 'solicitado' : null })} /><span>Solicitações de encerramento ({clientes.filter(client => client.encerramentoConta?.status === 'SOLICITADA').length})</span></label>
      {busca && <button className="panel-secondary-button mb-4" onClick={() => setBusca('')}>Limpar busca</button>}
      <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="panel-data-table w-full text-[13px]">
            <thead className="bg-[var(--paper)] border-b border-[var(--line)]">
              <tr>
                {['Cliente', 'Cidade', 'Pedidos', 'Total gasto', 'Pontos', 'Cadastro', 'Ações'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold text-zinc-500 text-[11px] tracking-wider uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagination.items.map((c, i) => (
                <tr key={i} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)] transition">
                  <td data-label="Cliente" className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--royal-700)] to-[var(--royal-500)] grid place-items-center text-white font-display font-bold text-[14px] shrink-0">
                        {(c.nome ?? '?')[0]}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-800">{c.nome}</div>
                        <div className="text-[11px] text-zinc-400">{c.email}</div>
                        {c.encerramentoConta?.status === 'SOLICITADA' && <span className="text-xs font-semibold text-amber-800">Encerramento solicitado</span>}
                      </div>
                    </div>
                  </td>
                  <td data-label="Cidade" className="px-5 py-3.5 text-zinc-500">{c.cidade ?? '—'}</td>
                  <td data-label="Pedidos" className="px-5 py-3.5 font-medium">{c.pedidos ?? 0}</td>
                  <td data-label="Total gasto" className="px-5 py-3.5 font-semibold">{formatBRL(c.totalGasto ?? 0)}</td>
                  <td data-label="Pontos" className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[11px] font-semibold">
                      <Icon.award className="w-3 h-3" /> {c.pontos ?? 0} pts
                    </span>
                  </td>
                  <td data-label="Cadastro" className="px-5 py-3.5 text-zinc-500 whitespace-nowrap">{formatPanelDate(c.cadastro ?? c.createdAt)}</td>
                  <td data-label="Ações" className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button aria-label={`Ver detalhes de ${c.nome}`} onClick={() => setSelecionado(c)}
                        className="panel-secondary-button">
                        <Icon.eye className="w-3.5 h-3.5" /> Ver cliente
                      </button>
                      {brazilPhone(c.telefone) && (
                        <a aria-label={`Falar com ${c.nome} no WhatsApp`} href={`https://wa.me/${brazilPhone(c.telefone)}?text=${encodeURIComponent(`Olá ${(c.nome ?? '').split(' ')[0]}! Aqui é da Vox Celular.`)}`}
                          target="_blank" rel="noopener"
                          className="panel-secondary-button">
                          <Icon.whatsapp className="w-3.5 h-3.5" /> WhatsApp
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

      <PanelPagination pagination={pagination} label="clientes" />

      {/* Modal detalhe do cliente */}
      {selecionado && (
        <PanelDialog label="Detalhes do cliente" onClose={() => setSelecionado(null)}>
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
              <button aria-label="Fechar detalhes" onClick={() => setSelecionado(null)} className="w-9 h-9 rounded-full hover:bg-zinc-100 grid place-items-center">
                <Icon.close className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              <div className="panel-filter-bar"><Link className="panel-secondary-button" to={`/admin/pedidos?cliente=${encodeURIComponent(selecionado.id)}`}>Ver pedidos deste cliente</Link>{brazilPhone(selecionado.telefone) && <a className="panel-secondary-button" href={`https://wa.me/${brazilPhone(selecionado.telefone)}?text=${encodeURIComponent(`Olá ${selecionado.nome}! Aqui é da Vox Celular.`)}`} target="_blank" rel="noopener noreferrer"><Icon.whatsapp className="w-4 h-4" /> Falar com cliente</a>}</div>
              {selecionado.encerramentoConta && <div role="status" className="panel-inline-notice"><p>Solicitação de encerramento: {selecionado.encerramentoConta.status === 'SOLICITADA' ? 'Registrada' : selecionado.encerramentoConta.status}</p><p className="break-all">Protocolo: {selecionado.encerramentoConta.id}</p><p>O encerramento ainda não foi concluído. Preserve os registros comerciais enquanto a solicitação é analisada.</p></div>}
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
                      <Link key={i} to={orderLink('/admin', p.id)} className="flex flex-wrap gap-3 items-center justify-between px-4 py-2.5 bg-[var(--paper)] rounded-xl text-[13px]">
                        <div>
                          <span className="font-display font-bold text-[var(--royal-700)]">{p.codigo ?? p.id}</span>
                          <span className="text-zinc-500 ml-2">{formatPanelDate(p.data ?? p.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{formatBRL(p.total)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[p.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </PanelDialog>
      )}
    </div>
  );
}
