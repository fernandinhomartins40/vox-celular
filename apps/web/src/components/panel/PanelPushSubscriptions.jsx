import { useState } from 'react';
import { api } from '../../lib/api';
export default function PanelPushSubscriptions() {
  const [rows, setRows] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
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
  return <section className="panel-card p-6 mt-5" aria-label="Assinaturas de notificações"><h2 className="font-semibold text-lg">Assinaturas de notificações</h2><p className="text-sm text-slate-600 my-3">Gerencie os registros de navegadores. A presença de uma assinatura não confirma entrega de push.</p><button className="panel-secondary-button" disabled={busy} onClick={load}>{busy ? 'Consultando…' : 'Consultar assinaturas'}</button>{error && <p role="alert" className="text-red-700 mt-3">{error}</p>}{message && <p role="status" className="text-blue-700 mt-3">{message}</p>}{rows?.length === 0 && <p className="mt-4">Nenhuma assinatura cadastrada.</p>}{rows?.map((row, index) => <div key={row.id} className="border-t mt-4 pt-4"><h3 className="font-medium">Assinatura {index + 1} · {row.ativo ? 'Ativa' : 'Desativada'}</h3><p className="text-sm text-slate-500 my-2">Cadastrada em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(row.createdAt))}</p><button className="panel-secondary-button" disabled={busy} onClick={() => remove(row.id)}>Remover assinatura {index + 1}</button></div>)}</section>;
}
