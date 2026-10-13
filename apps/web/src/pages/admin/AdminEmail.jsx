import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { PanelLoading } from '../../components/panel/PanelFeedback';
const defaults = { host: '', port: 587, user: '', password: '', from: '', origin: 'https://www.voxcelular.com.br' };
export default function AdminEmail() {
  const [form, setForm] = useState(defaults), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [configured, setConfigured] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const active = useRef(false), running = useRef(false);
  useEffect(() => {
    active.current = true;
    let cancelled = false;
    api.get('/email/config').then(row => { if (!cancelled && row) { setForm({ ...defaults, host: row.host, port: row.port, user: row.user, from: row.from, origin: row.origin }); setConfigured(true); } }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; active.current = false; };
  }, []);
  async function run(remove = false) {
    if (running.current || (remove && !window.confirm('Remover a configuração de e-mail desta loja?'))) return;
    running.current = true; setBusy(true); setError(''); setNotice('');
    try {
      if (remove) await api.delete('/email/config');
      else await api.put('/email/config', { ...form, host: form.host.trim(), user: form.user.trim(), from: form.from.trim(), origin: form.origin.trim() });
      if (active.current) { setConfigured(!remove); if (remove) setForm(defaults); setNotice(remove ? 'Configuração removida.' : 'Configuração salva. O envio ainda precisa ser validado.'); }
    } catch (e) { if (active.current) setError(e.message); }
    finally { running.current = false; if (active.current) { setBusy(false); setForm(previous => ({ ...previous, password: '' })); } }
  }
  return <div><PanelPageHeader title="E-mails da loja" description="Configure o remetente para os e-mails de acesso dos clientes." />{loading ? <PanelLoading /> : <form className="panel-card p-5 sm:p-6 space-y-5" onSubmit={e => { e.preventDefault(); run(); }}>
    {error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status" className="text-blue-700">{notice}</p>}
    <p className="text-sm text-slate-600">Use os dados do seu serviço de e-mail. Salvar não envia mensagens nem confirma que o remetente funciona.</p>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      {[['host', 'Servidor SMTP', 'text', 253], ['user', 'Usuário SMTP', 'text', 320], ['from', 'E-mail remetente', 'email', 254], ['origin', 'Endereço HTTPS da aplicação', 'url', 300]].map(([field, label, type, maxLength]) => <label key={field} className="block text-sm font-medium">{label}<input className="panel-input mt-2" required type={type} maxLength={maxLength} value={form[field]} onChange={e => setForm(previous => ({ ...previous, [field]: e.target.value }))} /></label>)}
      <label className="block text-sm font-medium">Porta segura<select className="panel-input mt-2" value={form.port} onChange={e => setForm(previous => ({ ...previous, port: Number(e.target.value) }))}><option value={587}>587 · STARTTLS</option><option value={465}>465 · TLS</option></select></label>
      <label className="block text-sm font-medium">Senha SMTP<input className="panel-input mt-2" required type="password" autoComplete="new-password" maxLength={1024} value={form.password} onChange={e => setForm(previous => ({ ...previous, password: e.target.value }))} /></label>
    </fieldset>
    <p className="text-sm text-slate-500">A senha fica cifrada e não é exibida novamente. Informe-a sempre que salvar alterações.</p>
    <div className="flex flex-wrap gap-3"><button className="panel-primary-button" disabled={busy}>{busy ? 'Aguarde…' : 'Salvar configuração'}</button>{configured && <button type="button" className="panel-secondary-button" disabled={busy} onClick={() => run(true)}>Remover configuração</button>}</div>
  </form>}</div>;
}
