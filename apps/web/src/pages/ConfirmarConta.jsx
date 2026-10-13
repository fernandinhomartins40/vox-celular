import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
function readLink() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return { token: params.get('token') || '', lojaId: params.get('lojaId') || '', verificar: params.get('acao') === 'verificar-email' };
}
export default function ConfirmarConta() {
  const [link] = useState(readLink);
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false);
  const running = useRef(false), mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    window.history.replaceState(window.history.state, '', window.location.pathname);
    function incoming() {
      // Reload for a second emailed link, resetting any in-flight form state.
      if (window.location.hash) window.location.reload();
    }
    window.addEventListener('hashchange', incoming);
    return () => { mounted.current = false; window.removeEventListener('hashchange', incoming); };
  }, []);
  const valid = /^[A-Za-z0-9_-]{43}$/.test(link.token) && /^[a-zA-Z0-9_-]{1,100}$/.test(link.lojaId);
  async function submit(event) {
    event.preventDefault();
    if (!valid || running.current || done) return;
    if (!link.verificar && password !== confirmation) { setError('As senhas precisam ser iguais.'); return; }
    running.current = true; setBusy(true); setError('');
    try {
      await api.post(link.verificar ? '/auth/email/confirmar' : '/auth/recuperacao/confirmar', { token: link.token, lojaId: link.lojaId, ...(!link.verificar ? { novaSenha: password } : {}) });
      if (mounted.current) setDone(true);
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { running.current = false; if (mounted.current) { setPassword(''); setConfirmation(''); setBusy(false); } }
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900"><section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6"><h1 className="text-2xl font-bold">{link.verificar ? 'Confirme seu e-mail' : 'Crie uma nova senha'}</h1><p className="mt-3 text-slate-600">{done ? link.verificar ? 'E-mail confirmado.' : 'Senha alterada. Entre novamente; os acessos anteriores foram encerrados.' : !valid ? 'Este link está incompleto. Abra o link recebido no seu e-mail.' : link.verificar ? 'Confirme abaixo para verificar este endereço.' : 'Use de 12 a 72 caracteres. O link só pode ser usado uma vez.'}</p>{valid && !done && <form onSubmit={submit} className="mt-6 grid gap-4">{!link.verificar && <><label>Nova senha<input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} disabled={busy} onChange={e => setPassword(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 p-3" /></label><label>Confirme a nova senha<input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={confirmation} disabled={busy} onChange={e => setConfirmation(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 p-3" /></label></>}{error && <p role="alert" className="text-red-700">{error}</p>}<button disabled={busy} className="min-h-12 rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Confirmando…' : link.verificar ? 'Confirmar e-mail' : 'Salvar nova senha'}</button></form>}<Link to="/area-cliente/login" className="mt-5 block py-3 text-blue-700">Entrar na minha conta</Link></section></main>;
}
