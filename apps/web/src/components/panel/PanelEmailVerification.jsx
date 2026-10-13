import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
export default function PanelEmailVerification() {
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const active = useRef(false), running = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function request() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(''); setNotice('');
    try { await api.post('/auth/email/solicitar', {}); if (active.current) setNotice('Se necessário, um link poderá ser enviado ao e-mail da sua conta. Confira também o spam.'); }
    catch (e) { if (active.current) setError(e.message); }
    finally { running.current = false; if (active.current) setBusy(false); }
  }
  return <div className="mt-4 space-y-2"><button type="button" className="panel-secondary-button" disabled={busy || Boolean(notice)} onClick={request}>{busy ? 'Aguarde…' : 'Solicitar confirmação do e-mail'}</button>{notice && <p role="status" className="text-sm text-blue-700">{notice}</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div>;
}
