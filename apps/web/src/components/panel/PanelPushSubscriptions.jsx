import { useState } from 'react';
import { api, getSessionGeneration } from '../../lib/api';
import { prepareBrowserPush, disableBrowserPush } from '../../lib/browserPush';
export default function PanelPushSubscriptions() {
  const [rows, setRows] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [prepared, setPrepared] = useState(null);
  async function disable() {
    if (!window.confirm('Desativar avisos neste aparelho? Você poderá ativá-los novamente.')) return;
    setBusy(true); setError(''); setMessage(''); setPrepared(null);
    try { await disableBrowserPush(api, getSessionGeneration(), getSessionGeneration); setRows(await api.get('/push/web')); setMessage('Avisos desativados neste aparelho.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const stopButton = <button className="panel-secondary-button" disabled={busy} onClick={disable}>Desativar neste aparelho</button>;
  async function prepare() {
    setBusy(true); setError(''); setMessage(''); setPrepared(null);
    try { setPrepared(await prepareBrowserPush(api, getSessionGeneration(), getSessionGeneration)); setMessage('Tudo pronto. Clique em permitir para receber avisos neste aparelho.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function activate() {
    setBusy(true); setError(''); setMessage('');
    try { await prepared.activate(); setPrepared(null); setRows(await api.get('/push/web')); setMessage('Aparelho cadastrado. A entrega depende da conexão e das permissões do sistema.'); }
    catch (e) { setPrepared(null); setError(e.message); } finally { setBusy(false); }
  }
  async function load() {
    setBusy(true); setError(''); setMessage('');
    try { setRows(await api.get('/push/web')); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove(id) {
    if (!window.confirm('Remover esta assinatura? Ela não receberá novos envios até ser cadastrada novamente.')) return;
    setBusy(true); setError(''); setMessage('');
    try { await api.delete(`/push/web/${encodeURIComponent(id)}`); setRows(previous => previous.filter(row => row.id !== id)); setMessage('Assinatura removida no servidor.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="panel-card p-6 mt-5" aria-label="Assinaturas de notificações"><h2 className="font-semibold text-lg">Avisos neste aparelho</h2><p className="text-sm text-slate-600 my-3">Receba avisos de pedidos e serviços. Você escolhe a permissão; nenhuma informação pessoal aparece na notificação.</p><div className="flex flex-wrap gap-3"><button className="panel-primary-button" disabled={busy} onClick={prepared ? activate : prepare}>{prepared ? 'Permitir neste aparelho' : 'Preparar notificações'}</button><button className="panel-secondary-button" disabled={busy} onClick={load}>{busy ? 'Aguarde…' : 'Consultar assinaturas'}</button>{stopButton}</div>{error && <p role="alert" className="text-red-700 mt-3">{error}</p>}{message && <p role="status" className="text-blue-700 mt-3">{message}</p>}{rows?.length === 0 && <p className="mt-4">Nenhuma assinatura cadastrada.</p>}{rows?.map((row, index) => <div key={row.id} className="border-t mt-4 pt-4"><h3 className="font-medium">Assinatura {index + 1} · {row.ativo ? 'Ativa' : 'Desativada'}</h3><p className="text-sm text-slate-500 my-2">Cadastrada em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(row.createdAt))}</p><button className="panel-secondary-button" disabled={busy} onClick={() => remove(row.id)}>Remover assinatura {index + 1}</button></div>)}</section>;
}
