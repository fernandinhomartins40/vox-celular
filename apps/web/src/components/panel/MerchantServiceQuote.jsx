import { useEffect, useRef, useState } from 'react';
import { api, getSessionGeneration } from '../../lib/api';
import { formatBRL } from '../../utils';
export default function MerchantServiceQuote({ ticket, onUpdated }) {
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const attempt = useRef(null);
  const operation = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function edit(setter, next) { setter(next); attempt.current = null; setMessage(''); }
  async function run(event) {
    event?.preventDefault(); if (operation.current) return;
    const generation = getSessionGeneration(); const active = () => mounted.current && generation === getSessionGeneration();
    operation.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (event) {
        const normalized = value.trim().replace(',', '.');
        if (!/^\d{1,7}(\.\d{1,2})?$/.test(normalized)) throw new Error('Use um valor em reais com até duas casas decimais.');
        const cents = Math.round(Number(normalized) * 100);
        if (cents > 100000000) throw new Error('Valor acima do limite permitido.');
        const body = { solicitacaoId: ticket.id, valorCentavos: cents, descricao: description.trim(), validoAte: new Date(validUntil).toISOString() };
        attempt.current ||= { ...body, chaveIdempotencia: crypto.randomUUID() };
        await api.post('/orcamentos-servico', attempt.current);
        if (active()) { setMessage('Orçamento registrado. Aguarde a decisão do cliente antes de executar.'); attempt.current = null; setValue(''); setDescription(''); setValidUntil(''); onUpdated?.(); }
      }
      const data = await api.get(`/orcamentos-servico?solicitacaoId=${encodeURIComponent(ticket.id)}`);
      if (active()) setRows(data);
    } catch (e) { if (active()) setError(e.message); }
    finally { operation.current = false; if (active()) setBusy(false); }
  }
  return <section className="mt-4 border-t border-slate-200 pt-4" aria-label="Orçamentos do atendimento"><h3 className="font-semibold">Orçamento do atendimento</h3><button type="button" disabled={busy} onClick={() => run()} className="panel-secondary-button my-3">Consultar propostas</button>{error && <p role="alert" className="panel-account-error">{error} Se o envio falhou, consulte as propostas ou tente novamente sem mudar os dados.</p>}{message && <p role="status" className="panel-account-success">{message}</p>}{rows?.map(row => <p key={row.id} className="my-2 text-sm">Versão {row.versao} · {formatBRL(row.valorCentavos / 100)} · {({ PENDENTE: 'Aguardando cliente', ACEITO: 'Aceito', RECUSADO: 'Recusado', SUBSTITUIDO: 'Substituído' })[row.status] || row.status}</p>)}
    {['EM_ANALISE', 'AGUARDANDO_CLIENTE'].includes(ticket.status) && <form onSubmit={run} aria-label="Emitir orçamento" className="grid gap-3 mt-3"><label>Valor do orçamento (R$)<input required inputMode="decimal" value={value} disabled={busy} onChange={event => edit(setValue, event.target.value)} className="block w-full min-h-11 rounded-xl border p-3" /></label><label>Descrição do orçamento<textarea required minLength={5} maxLength={2000} value={description} disabled={busy} onChange={event => edit(setDescription, event.target.value)} className="block w-full rounded-xl border p-3" /></label><label>Validade do orçamento<input required type="datetime-local" value={validUntil} disabled={busy} onChange={event => edit(setValidUntil, event.target.value)} className="block w-full min-h-11 rounded-xl border p-3" /></label><p className="panel-muted">Horário do dispositivo. Uma nova proposta substitui a pendente e exige nova decisão do cliente.</p><button disabled={busy} className="panel-primary-button">{busy ? 'Registrando…' : 'Enviar orçamento ao cliente'}</button></form>}
  </section>;
}
