import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { PanelLoading } from '../../components/panel/PanelFeedback';
const defaults = { provedor: 'deepseek', workspace: '', limite: '25', entrada: '', saida: '', apiKey: '' };
const micro = value => { if (!/^\d+(\.\d{1,6})?$/.test(value)) throw new Error('Use valores em dólares, com ponto decimal e até seis casas.'); const result = Math.round(Number(value) * 1000000); if (!Number.isSafeInteger(result) || result <= 0 || result > 1000000000) throw new Error('Use valores maiores que zero e até US$ 1.000.'); return result; };
export default function AdminIa() {
  const [form, setForm] = useState(defaults), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [configured, setConfigured] = useState(false);
  const [budget, setBudget] = useState(null), [budgetError, setBudgetError] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/ia/config/orcamento').then(value => { if (active) setBudget(value); }).catch(e => { if (active) setBudgetError(e.message); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    api.get('/ia/config').then(row => { if (active && row) { setConfigured(row.chaveConfigurada); setForm({ ...defaults, provedor: row.provedor, workspace: row.workspace || '', limite: String(row.limiteMicroUsd / 1000000), entrada: String(row.tarifaEntradaMicroUsd / 1000000), saida: String(row.tarifaSaidaMicroUsd / 1000000) }); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  function change(field, value) { setForm(previous => ({ ...previous, [field]: value })); setNotice(''); }
  async function remove() {
    if (!window.confirm('Remover a chave e a configuração de IA? O histórico de gastos será preservado.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api.delete('/ia/config');
      setConfigured(false); setForm(defaults); setBudget(previous => previous && { ...previous, limiteMicroUsd: null });
      setNotice('Configuração removida. Para voltar a configurar, informe uma nova chave.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await api.put('/ia/config', { provedor: form.provedor, ...(form.provedor === 'qwen' ? { workspace: form.workspace.trim() } : {}), ...(form.apiKey ? { apiKey: form.apiKey.trim() } : {}), limiteMicroUsd: micro(form.limite), tarifaEntradaMicroUsd: micro(form.entrada), tarifaSaidaMicroUsd: micro(form.saida) });
      setForm(previous => ({ ...previous, apiKey: '' })); setConfigured(true); setNotice('Configuração salva. As chamadas de IA ainda não estão ativadas.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div><PanelPageHeader title="Assistente de IA" description="Configure o provedor e o orçamento da sua loja." />{loading ? <PanelLoading /> : <form onSubmit={save} className="panel-card p-6 space-y-5">{budgetError && <p role="alert">{budgetError}</p>}{budget && <section aria-label="Orçamento de IA do mês" className="rounded-xl border p-4"><h2 className="font-semibold">Orçamento de {budget.mes} (UTC)</h2><p>Gasto contabilizado: US$ {(budget.gastoMicroUsd / 1000000).toFixed(6)}</p><p>Reservado: US$ {(budget.reservadoMicroUsd / 1000000).toFixed(6)}</p><p>Teto configurado: {budget.limiteMicroUsd === null ? 'Não configurado' : `US$ ${(budget.limiteMicroUsd / 1000000).toFixed(2)}`}</p><p className="text-sm text-slate-500">Falhas com cobrança incerta são contabilizadas pelo máximo reservado. Estes valores não substituem a fatura do provedor.</p></section>}<p className="text-sm text-slate-600">A seleção atual usa regras do catálogo. Esta configuração prepara a integração; salvar não inicia chamadas pagas.</p>{error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status" className="text-blue-700">{notice}</p>}<label className="block">Provedor<select className="panel-input mt-2" value={form.provedor} disabled={busy} onChange={e => { change('provedor', e.target.value); change('apiKey', ''); setConfigured(false); }}><option value="deepseek">DeepSeek</option><option value="qwen">Qwen · Singapura</option></select></label>{form.provedor === 'qwen' && <label className="block">Workspace Qwen<input className="panel-input mt-2" required value={form.workspace} disabled={busy} onChange={e => change('workspace', e.target.value)} maxLength={64} /></label>}<label className="block">Chave de API<input className="panel-input mt-2" type="password" autoComplete="off" required={!configured} value={form.apiKey} disabled={busy} onChange={e => change('apiKey', e.target.value)} maxLength={512} placeholder={configured ? 'Deixe vazio para manter a chave salva' : 'Cole a chave do provedor'} /></label><p className="text-sm text-slate-500">A chave é criptografada no servidor e não é exibida novamente.</p>{[['limite', 'Teto mensal em US$'], ['entrada', 'Tarifa de entrada em US$ por milhão de tokens'], ['saida', 'Tarifa de saída em US$ por milhão de tokens']].map(([field, label]) => <label key={field} className="block">{label}<input className="panel-input mt-2" inputMode="decimal" required value={form[field]} disabled={busy} onChange={e => change(field, e.target.value)} placeholder="Ex.: 0.30" /></label>)}<p className="text-sm text-slate-600">Confira as tarifas atuais no provedor. Use ponto decimal. O orçamento interno não substitui os limites de cobrança da conta do provedor.</p><button className="panel-primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar configuração'}</button>{configured && <button type="button" className="panel-secondary-button" disabled={busy} onClick={remove}>Remover configuração</button>}</form>}</div>;
}
