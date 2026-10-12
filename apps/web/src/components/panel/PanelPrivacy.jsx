import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function PanelPrivacy() {
  const [preferences, setPreferences] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/privacidade/preferencias').then(data => { if (active) setPreferences({ personalizacao: Boolean(data.personalizacao), notificacoes: Boolean(data.notificacoes), versaoAviso: data.versaoAviso }); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  async function save(e) {
    e.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { await api.put('/privacidade/preferencias', preferences); setMessage('Preferências salvas. Você pode alterá-las quando quiser.'); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} className="mt-6" aria-label="Preferências de privacidade">
    <h3 className="font-semibold mb-2">Você escolhe</h3>
    {!preferences && !error && <p role="status">Carregando preferências…</p>}
    {preferences && <>
      <label className="flex items-start gap-3 py-3"><input className="mt-1" type="checkbox" disabled={saving} checked={preferences.personalizacao} onChange={e => { setMessage(''); setPreferences(value => ({ ...value, personalizacao: e.target.checked })); }} /><span>Permitir ofertas personalizadas<small className="block text-slate-500 mt-1">Usar minhas preferências para sugerir ofertas da loja.</small></span></label>
      <label className="flex items-start gap-3 py-3"><input className="mt-1" type="checkbox" disabled={saving} checked={preferences.notificacoes} onChange={e => { setMessage(''); setPreferences(value => ({ ...value, notificacoes: e.target.checked })); }} /><span>Quero receber avisos da Vox<small className="block text-slate-500 mt-1">A permissão do aparelho será solicitada separadamente. Você pode desativar esta opção quando quiser.</small></span></label>
      <p className="panel-account-help">Estas escolhas são opcionais e não impedem consultar produtos, comprar ou acompanhar pedidos.</p>
      <button disabled={saving} className="panel-primary-button mt-3">{saving ? 'Salvando…' : 'Salvar preferências'}</button>
    </>}
    {message && <p role="status" className="panel-account-success mt-3">{message}</p>}
    {error && <p role="alert" className="panel-account-error mt-3">{error}</p>}
  </form>;
}
