import { useState } from 'react';
import { api } from '../../lib/api';

export default function PanelSessions() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function load() {
    setBusy(true); setMessage('');
    try { setRows(await api.get('/auth/sessoes')); }
    catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }
  async function close(id) {
    if (!window.confirm('Encerrar este acesso? Será necessário entrar novamente nele.')) return;
    setBusy(true); setMessage('');
    try { await api.delete(`/auth/sessoes/${encodeURIComponent(id)}`); setRows(previous => previous.filter(row => row.id !== id)); setMessage('Acesso encerrado.'); }
    catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }
  return <details className="mt-6" onToggle={e => { if (e.currentTarget.open && rows === null && !busy) load(); }}>
    <summary className="font-semibold cursor-pointer">Acessos à sua conta</summary>
    <p className="panel-account-help mt-3">Confira quando os acessos foram iniciados e encerre os que não reconhece.</p>
    <button className="text-blue-700 underline my-3" disabled={busy} onClick={load}>Atualizar lista de acessos</button>
    {busy && <p role="status">Atualizando acessos…</p>}
    {rows && <ul>{rows.map(row => <li className="border-t border-slate-200 py-3" key={row.id}><strong>{row.atual ? 'Acesso atual' : 'Outro acesso'}</strong><p className="text-sm text-slate-500">Iniciado em {new Date(row.createdAt).toLocaleString('pt-BR')}</p>{!row.atual && <button disabled={busy} onClick={() => close(row.id)} className="text-blue-700 underline py-2">Encerrar acesso</button>}</li>)}</ul>}
    {rows?.length === 0 && <p>Nenhum acesso recente encontrado.</p>}
    <p className="panel-account-help mt-3">Acessos antigos podem não aparecer. Alterar sua senha encerra todas as sessões anteriores.</p>
    {message && <p role="status" className="mt-3">{message}</p>}
  </details>;
}
