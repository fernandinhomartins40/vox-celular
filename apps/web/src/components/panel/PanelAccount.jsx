import { PanelPageHeader } from './PanelShell';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/useAuth';
import { Icon } from '../../icons';
import PanelPrivacy from './PanelPrivacy';
import PanelSessions from './PanelSessions';
export default function PanelAccount() {
  const { user } = useAuth();
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  async function exportData() {
    setExporting(true); setExportError('');
    try {
      const data = await api.get('/privacidade/exportar');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'vox-meus-dados.json';
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setExportError(error.message); }
    finally { setExporting(false); }
  }
  async function submit(e) {
    e.preventDefault(); if (saving) return; setSuccess(false); setError('');
    if (form.novaSenha !== form.confirmar) { setError('As novas senhas não coincidem.'); return; }
    setSaving(true);
    try {
      await api.patch('/auth/senha', { senhaAtual: form.senhaAtual, novaSenha: form.novaSenha });
      setForm({ senhaAtual: '', novaSenha: '', confirmar: '' }); setSuccess(true);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  return <div>
    <PanelPageHeader title="Minha conta" description="Confira seus dados e mantenha sua conta segura." />
    <div className="panel-account-layout">
    <section className="panel-account-profile" aria-labelledby="account-profile-title">
      <div className="panel-account-heading"><span className="panel-action-icon"><Icon.user /></span><h2 id="account-profile-title">Seus dados</h2></div>
      <dl><div><dt>Nome</dt><dd>{user?.nome}</dd></div><div><dt>E-mail</dt><dd>{user?.email}</dd></div></dl>
      <PanelSessions />
      {user?.role === 'CLIENTE' && <PanelPrivacy />}
      {user?.role === 'CLIENTE' && <div className="mt-6"><h3 className="font-semibold mb-2">Seus dados com você</h3><p className="panel-account-help">Baixe uma cópia do seu cadastro, pedidos, favoritos e benefícios.</p><button disabled={exporting} onClick={exportData} className="panel-primary-button mt-3">{exporting ? 'Preparando arquivo…' : 'Baixar meus dados'}</button>{exportError && <p role="alert" className="panel-account-error">{exportError}</p>}</div>}
    </section>
    <form onSubmit={submit} className="panel-account-form" aria-labelledby="account-password-title">
      <div className="panel-account-heading"><span className="panel-action-icon"><Icon.lock /></span><h2 id="account-password-title">Alterar senha</h2></div>
      <div className="panel-account-fields">
      <p className="panel-account-help" id="account-password-help">Use pelo menos 12 caracteres na nova senha.</p>
      {[['senhaAtual', 'Senha atual'], ['novaSenha', 'Nova senha'], ['confirmar', 'Confirmar nova senha']].map(([key, label]) => <div className="panel-account-field" key={key}>
        <label htmlFor={key}>{label}</label>
        <input disabled={saving} id={key} type={showPassword ? 'text' : 'password'} required maxLength={72} minLength={key === 'senhaAtual' ? 1 : 12}
          aria-describedby={key === 'senhaAtual' ? undefined : 'account-password-help'}
          autoComplete={key === 'senhaAtual' ? 'current-password' : 'new-password'} value={form[key]}
          onChange={e => setForm(v => ({ ...v, [key]: e.target.value }))} />
      </div>)}
      <label className="panel-check-label"><input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} /> Mostrar senhas</label>
      {error && <p role="alert" className="panel-account-error">{error}</p>}
      {success && <p role="status" className="panel-account-success"><span>Senha alterada com sucesso.</span> As sessões anteriores foram encerradas. <Link to={user?.role === 'LOJISTA' ? '/admin/login' : '/area-cliente/login'}>Entrar com a nova senha</Link></p>}
      </div>
      <div className="panel-account-footer">
      <button disabled={saving} className="panel-primary-button">{saving ? 'Salvando…' : 'Alterar senha'}</button>
      </div>
    </form>
    </div>
  </div>;
}
