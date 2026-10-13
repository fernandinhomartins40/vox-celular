import { useEffect, useRef, useState } from 'react';
import { api, getSessionGeneration } from '../../lib/api';

export default function PanelAccountClosure() {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const scope = useRef(null);
  useEffect(() => {
    const current = { active: true, generation: getSessionGeneration(), sending: false };
    scope.current = current;
    api.get('/privacidade/encerramento').then(data => { if (current.active && current.generation === getSessionGeneration()) setRow(data.solicitacao); })
      .catch(e => { if (current.active && current.generation === getSessionGeneration()) setError(e.message); })
      .finally(() => { if (current.active && current.generation === getSessionGeneration()) setLoading(false); });
    return () => { current.active = false; };
  }, [reload]);
  function retry() { setLoading(true); setError(''); setPassword(''); setConfirmed(false); setRow(null); setBusy(false); setReload(value => value + 1); }
  async function submit(event) {
    event.preventDefault();
    const current = scope.current;
    if (!current?.active || current.sending || current.generation !== getSessionGeneration() || !confirmed || !password || row) return;
    const active = () => current.active && current === scope.current && current.generation === getSessionGeneration();
    current.sending = true; setBusy(true); setError('');
    try { const result = await api.post('/privacidade/encerramento', { senhaAtual: password, confirmacao: 'SOLICITAR_ENCERRAMENTO' }); if (active()) setRow(result.solicitacao); }
    catch (e) { if (active()) setError(e.message); }
    finally { current.sending = false; if (active()) { setBusy(false); setPassword(''); } }
  }
  return <section className="mt-6" aria-label="Encerramento da conta"><h3 className="font-semibold mb-2">Encerramento da conta</h3>
    <p className="panel-account-help">Registre sua solicitação. A conta continua ativa até a conclusão do processo; pedidos e registros comerciais são preservados nesta etapa.</p>
    {loading && <p role="status">Consultando solicitação…</p>}
    {error && <><p role="alert" className="panel-account-error mt-3">{error}</p><button type="button" disabled={busy} onClick={retry} className="panel-secondary-button mt-3">Consultar status e tentar novamente</button></>}
    {!loading && row ? <div role="status" className="mt-3"><p className="font-semibold">{row.status === 'SOLICITADA' ? 'Solicitação registrada' : `Status: ${row.status}`}</p><p className="break-all">Protocolo: {row.id}</p><p className="panel-account-help">Esta confirmação não significa que a conta foi excluída.</p></div> : !loading && !error && <form onSubmit={submit} className="mt-3" aria-label="Solicitar encerramento da conta">
      <label className="block">Senha atual<input type="password" autoComplete="current-password" maxLength={72} required value={password} disabled={busy} onChange={event => setPassword(event.target.value)} className="mt-2 w-full min-h-11 rounded-xl border border-slate-200 bg-slate-50 p-3" /></label>
      <label className="flex items-start gap-3 py-3"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} /><span>Entendi e quero solicitar o encerramento.</span></label>
      <button disabled={busy || !confirmed || !password} className="panel-primary-button">{busy ? 'Registrando…' : 'Registrar solicitação'}</button>
    </form>}
  </section>;
}
