import { PanelPageHeader } from './PanelShell';
import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/useAuth';
export default function PanelAccount() {
  const { user } = useAuth();
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  async function submit(e) {
    e.preventDefault(); setSuccess(false); setError('');
    if (form.novaSenha !== form.confirmar) { setError('As novas senhas não coincidem.'); return; }
    setSaving(true);
    try {
      await api.patch('/auth/senha', { senhaAtual: form.senhaAtual, novaSenha: form.novaSenha });
      setForm({ senhaAtual: '', novaSenha: '', confirmar: '' }); setSuccess(true);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  return <div className="max-w-xl">
    <PanelPageHeader title="Minha conta" description={`${user?.nome} · ${user?.email}`} />
    <form onSubmit={submit} className="bg-white p-6 rounded-2xl space-y-4 border">
      <h2 className="font-bold text-xl">Alterar senha</h2>
      <p className="text-sm text-zinc-500">Preencha sua senha atual, escolha uma nova e confirme a alteração. Use pelo menos 12 caracteres.</p>
      {[['senhaAtual', 'Senha atual'], ['novaSenha', 'Nova senha'], ['confirmar', 'Confirmar nova senha']].map(([key, label]) => <div key={key}>
        <label htmlFor={key} className="block mb-1 text-sm">{label}</label>
        <input id={key} type="password" required maxLength={72} minLength={key === 'senhaAtual' ? 1 : 12}
          autoComplete={key === 'senhaAtual' ? 'current-password' : 'new-password'} value={form[key]}
          onChange={e => setForm(v => ({ ...v, [key]: e.target.value }))} className="w-full border rounded-lg p-3" />
      </div>)}
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {success && <p role="status" className="text-emerald-700">Senha alterada com sucesso.</p>}
      <button disabled={saving} className="px-5 py-3 bg-[var(--royal-700)] text-white rounded-xl disabled:opacity-50">{saving ? 'Salvando…' : 'Alterar senha'}</button>
    </form>
  </div>;
}
