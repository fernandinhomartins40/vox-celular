import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
export default function AccountRecovery({ initialEmail = '', onBack }) {
  const [email, setEmail] = useState(initialEmail), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const active = useRef(false), running = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function submit(event) {
    event.preventDefault();
    if (running.current) return;
    running.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const lojaId = import.meta.env.VITE_LOJA_ID || (await api.get('/loja')).id;
      if (!active.current) return;
      await api.post('/auth/recuperacao/solicitar', { lojaId, email: email.trim() });
      if (active.current) setNotice('Se houver uma conta com esse e-mail, você poderá receber um link. Confira também o spam.');
    } catch (e) { if (active.current) setError(e.message); }
    finally { running.current = false; if (active.current) setBusy(false); }
  }
  return <section aria-label="Recuperar senha" className="space-y-4"><h2 className="text-lg font-semibold">Recuperar senha</h2><p className="text-sm text-slate-600">Informe o e-mail usado na sua conta. O link permite escolher uma nova senha.</p>{notice ? <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">{notice}</p> : <form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium">E-mail da conta<input className="panel-input mt-2" type="email" required maxLength={254} autoComplete="email" value={email} disabled={busy} onChange={e => setEmail(e.target.value)} /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button className="panel-primary-button w-full" disabled={busy}>{busy ? 'Aguarde…' : 'Solicitar link'}</button></form>}<button type="button" className="panel-secondary-button w-full" disabled={busy} onClick={onBack}>Voltar para entrar</button></section>;
}
