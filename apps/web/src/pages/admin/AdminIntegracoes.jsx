import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { PanelLoading, PanelError } from '../../components/panel/PanelFeedback';

export default function AdminIntegracoes() {
  const [data, setData] = useState(null), [selected, setSelected] = useState('mercadolivre');
  const [values, setValues] = useState({}), [ambiente, setAmbiente] = useState('producao');
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function load() { setData(await api.get('/integracoes')); }
  useEffect(() => {
    let active = true;
    api.get('/integracoes').then(result => { if (active) setData(result); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  function choose(id) {
    if (Object.values(values).some(Boolean) && !window.confirm('Trocar de canal e descartar os campos ainda não salvos?')) return;
    setSelected(id); setValues({}); setNotice(''); setError('');
    setAmbiente(data.conexoes.find(c => c.canal === id)?.ambiente ?? 'producao');
  }
  async function action(kind) {
    if (pending) return;
    if (kind === 'remove' && !window.confirm('Remover as credenciais deste canal?')) return;
    setPending(true); setError(''); setNotice('');
    try {
      if (kind === 'save') { await api.put(`/integracoes/${selected}`, { ambiente, credenciais: values }); setValues({}); setNotice('Credenciais salvas com segurança.'); }
      if (kind === 'verify') { const result = await api.post(`/integracoes/${selected}/verificar`, {}); setNotice(result.message); }
      if (kind === 'remove') { await api.delete(`/integracoes/${selected}`); setValues({}); setNotice('Credenciais removidas.'); }
      await load();
    } catch (e) { setError(e.message); }
    finally { setPending(false); }
  }
  if (!data) return error ? <PanelError message={error} /> : <PanelLoading />;
  const canal = data.canais.find(c => c.id === selected), connection = data.conexoes.find(c => c.canal === selected);
  return <div>
    <PanelPageHeader title="Integrações de vendas" description="Escolha o canal, informe as credenciais e confira o acesso."><Link className="panel-secondary-button" to="/admin/configuracoes">Página da loja</Link></PanelPageHeader>
    <nav aria-label="Marketplaces" className="flex flex-wrap gap-2 mb-6">{data.canais.map(c => <button key={c.id} disabled={pending} className={selected === c.id ? 'panel-primary-button' : 'panel-secondary-button'} aria-pressed={selected === c.id} onClick={() => choose(c.id)}>{c.nome}</button>)}</nav>
    <section className="panel-account-form p-6">
      <h2>{canal.nome}</h2>
      <p className="panel-muted">{connection ? connection.status === 'ACESSO_VERIFICADO' ? 'Acesso de leitura verificado' : 'Configurado — acesso ainda não verificado' : 'Ainda não configurado'}</p>
      <p className="panel-inline-notice">Salvar chaves não ativa vendas ou sincronização. A autorização e a homologação são específicas de cada canal.</p>
      {!['mercadolivre','americanas'].includes(selected) && <p className="panel-muted">Verificação automática de acesso ainda não disponível para este canal.</p>}
      <a href={canal.docs} target="_blank" rel="noopener noreferrer">Abrir documentação oficial ↗</a>
      <form onSubmit={e => { e.preventDefault(); action('save'); }} className="mt-5">
        <label className="panel-account-field">Ambiente<select value={ambiente} disabled={pending} onChange={e => setAmbiente(e.target.value)}><option value="producao">Produção</option><option value="homologacao">Homologação</option></select></label>
        <p className="panel-muted">Campos vazios preservam o valor salvo. Para substituir uma chave, preencha o campo novamente. Não coloque senhas da conta de vendedor.</p>
        {canal.fields.map(f => <label key={f.key} className="panel-account-field mb-4">{f.label}<input type="password" autoComplete="new-password" maxLength={8000} value={values[f.key] ?? ''} disabled={pending} placeholder={connection?.campos.includes(f.key) ? 'Salvo — mantenha vazio para preservar' : 'Informe a credencial'} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} /></label>)}
        {error && <p role="alert" className="text-red-600">{error}</p>}{notice && <p role="status" className="panel-success-notice">{notice}</p>}
        <div className="flex flex-wrap gap-3 mt-5"><button disabled={pending || !Object.values(values).some(Boolean)} className="panel-primary-button">{pending ? 'Aguarde…' : 'Salvar credenciais'}</button>
          {connection && <>{['mercadolivre','americanas'].includes(selected) && <button type="button" disabled={pending || Object.values(values).some(Boolean)} onClick={() => action('verify')} className="panel-secondary-button">Verificar acesso</button>}<button type="button" disabled={pending} onClick={() => action('remove')} className="panel-secondary-button">Remover credenciais</button></>}
        </div>
      </form>
    </section>
  </div>;
}
