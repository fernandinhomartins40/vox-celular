import { useEffect, useRef, useState } from 'react';
import { api, getSessionGeneration } from '../../lib/api';
import { formatBRL } from '../../utils';
export default function CustomerServiceQuotes({ requestId, onUpdated }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checkedAt, setCheckedAt] = useState(0);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const operation = useRef(false);
  async function run(quote, accept) {
    if (operation.current) return;
    if (quote && !window.confirm(`${accept ? 'Aceitar' : 'Recusar'} o orçamento de ${formatBRL(quote.valorCentavos / 100)}? Confira a descrição antes de confirmar.`)) return;
    const generation = getSessionGeneration(); operation.current = true; setBusy(true); setError('');
    const active = () => mounted.current && generation === getSessionGeneration();
    try {
      if (quote) await api.post(`/orcamentos-servico/${encodeURIComponent(quote.id)}/decisao`, { aceitar: accept });
      const data = await api.get(`/orcamentos-servico?solicitacaoId=${encodeURIComponent(requestId)}`);
      if (active()) { setRows(data); setCheckedAt(Date.now()); if (quote) onUpdated?.(); }
    } catch (e) { if (active()) setError(e.message); }
    finally { operation.current = false; if (active()) setBusy(false); }
  }
  const labels = { PENDENTE: 'Aguardando sua decisão', ACEITO: 'Aceito', RECUSADO: 'Recusado', SUBSTITUIDO: 'Substituído por nova versão' };
  return <section className="mt-4 border-t border-slate-200 pt-3" aria-label="Orçamentos do atendimento"><button type="button" disabled={busy} onClick={() => run()} className="panel-secondary-button">{busy ? 'Consultando…' : 'Consultar orçamentos'}</button>{error && <p role="alert" className="panel-account-error mt-3">{error}</p>}{rows?.length === 0 && <p className="panel-muted mt-3">A loja ainda não enviou orçamento.</p>}{rows?.map((quote, index) => <div key={quote.id} className="mt-3 rounded-xl bg-slate-50 p-4"><h4 className="font-semibold">Orçamento versão {quote.versao} · {formatBRL(quote.valorCentavos / 100)}</h4><p className="my-2 whitespace-pre-wrap break-words">{quote.descricao}</p><p className="text-sm">Válido até {new Date(quote.validoAte).toLocaleString('pt-BR')}</p><p className="font-semibold text-sm my-2">{quote.status === 'PENDENTE' && Date.parse(quote.validoAte) <= checkedAt ? 'Orçamento vencido. Peça uma nova proposta à loja.' : labels[quote.status] || quote.status}</p>{index === 0 && quote.status === 'PENDENTE' && Date.parse(quote.validoAte) > checkedAt && <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => run(quote, true)} className="panel-primary-button">Aceitar orçamento</button><button type="button" disabled={busy} onClick={() => run(quote, false)} className="panel-secondary-button">Recusar orçamento</button></div>}</div>)}</section>;
}
