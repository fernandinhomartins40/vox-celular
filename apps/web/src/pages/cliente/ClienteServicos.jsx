import CustomerServiceQuotes from '../../components/panel/CustomerServiceQuotes';
import CustomerServiceSchedule from '../../components/panel/CustomerServiceSchedule';
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { api } from '../../lib/api';
import { formatBRL } from '../../utils';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { PanelLoading, PanelError } from '../../components/panel/PanelFeedback';
import ServiceSchedule from '../../components/ServiceSchedule';
import { serviceSlotLabel } from '../../lib/serviceSchedule';

const labels = { RECEBIDA: 'Recebida', EM_ANALISE: 'Em análise', AGUARDANDO_CLIENTE: 'Aguardando você', EM_EXECUCAO: 'Em execução', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };
export default function ClienteServicos() {
  const { user } = useAuth();
  const [services, setServices] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ servicoId: '', aparelho: '', problema: '' });
  const [attempt, setAttempt] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [slot, setSlot] = useState(null);
  const [creating, setCreating] = useState(false);
  async function load() {
    setError('');
    try {
      const [catalog, history] = await Promise.all([api.get(`/servicos?lojaId=${encodeURIComponent(user.lojaId)}`), api.get('/servicos/solicitacoes')]);
      setServices(catalog); setRequests(history);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => {
    let active = true;
    Promise.all([api.get(`/servicos?lojaId=${encodeURIComponent(user.lojaId)}`), api.get('/servicos/solicitacoes')]).then(([catalog, history]) => { if (active) { setServices(catalog); setRequests(history); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [user.lojaId]);
  function change(field, value) { setForm(previous => ({ ...previous, [field]: value })); if (field === 'servicoId') setSlot(null); setAttempt(null); setError(''); }
  async function send(event) {
    event.preventDefault(); setBusy(true); setError('');
    const key = attempt || crypto.randomUUID(); setAttempt(key);
    try {
      const row = await api.post('/servicos/solicitacoes', { ...form, ...(slot ? { horarioId: slot.id } : {}), chaveIdempotencia: key });
      setReceipt({ ...row, horario: slot }); setRequests(previous => [{ ...row, horario: slot }, ...previous.filter(item => item.id !== row.id)]); setSlot(null);
      setForm({ servicoId: '', aparelho: '', problema: '' }); setAttempt(null); setStep(1);
      setCreating(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const selected = services?.find(service => service.id === form.servicoId);
  const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2';
  return <>
    <PanelPageHeader title="Meus serviços" description="Solicite ajuda para seu aparelho e acompanhe a resposta da loja." />
    <div role="group" aria-label="Área de serviços" className="flex flex-wrap gap-3 mb-6">
      <button type="button" aria-pressed={!creating} disabled={busy} onClick={() => setCreating(false)} className={!creating ? 'panel-primary-button' : 'panel-secondary-button'}>Meus atendimentos</button>
      <button type="button" aria-pressed={creating} disabled={busy} onClick={() => { setCreating(true); setReceipt(null); }} className={creating ? 'panel-primary-button' : 'panel-secondary-button'}>Solicitar serviço</button>
    </div>
    {error && <PanelError message={error} />}
    {services === null ? <><PanelLoading /><button className="text-blue-700 py-3" onClick={load}>Tentar novamente</button></> : <>
      {receipt && <div role="status" className="panel-feedback mb-6"><strong>Solicitação enviada</strong><p className="break-all">Protocolo: {receipt.protocolo}</p><p>{receipt.horario ? `Horário reservado: ${serviceSlotLabel(receipt.horario)}. Orçamento e pagamento não confirmados.` : 'A loja vai analisar. Nenhum pagamento ou agendamento foi confirmado.'}</p></div>}
      {creating && (services.length ? <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 mb-6">
        <h2 className="font-bold text-xl">Solicitar um serviço</h2><ol aria-label="Etapas da solicitação" className="flex flex-wrap gap-4 my-4 text-sm">{['Escolha o serviço', 'Conte o problema', 'Revise e envie'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'font-bold text-blue-700' : 'text-slate-500'}>{index + 1}. {label}</li>)}</ol>
        <form onSubmit={step < 3 ? event => { event.preventDefault(); setStep(previous => previous + 1); } : send}>
          {step === 2 && selected?.agendamento && <ServiceSchedule key={selected.id} lojaId={user.lojaId} servicoId={selected.id} selected={slot} onChange={value => { setSlot(value); setAttempt(null); }} />}
          {step === 3 && slot && <p className="mb-4 font-semibold">Horário escolhido: {serviceSlotLabel(slot)}</p>}
          {step === 1 && <label>Serviço<select aria-label="Serviço" required value={form.servicoId} onChange={e => change('servicoId', e.target.value)} className={field}><option value="">Escolha uma opção</option>{services.map(service => <option key={service.id} value={service.id}>{service.titulo}</option>)}</select>{selected && <span className="block mt-3 text-sm text-slate-600">{selected.descricao}<br />{selected.preco === null ? 'Preço sob orçamento.' : `Preço informado: ${formatBRL(selected.preco)}. Confirme as condições com a loja.`}</span>}</label>}
          {step === 2 && <div className="grid gap-4"><label>Aparelho<input required minLength={2} maxLength={160} className={field} value={form.aparelho} onChange={e => change('aparelho', e.target.value)} placeholder="Ex.: Samsung Galaxy A55" /></label><label>O que está acontecendo?<textarea required minLength={5} maxLength={2000} rows={4} className={field} value={form.problema} onChange={e => change('problema', e.target.value)} placeholder="Descreva o problema com suas palavras." /></label><p className="text-sm text-slate-500">Não informe senhas, códigos de desbloqueio ou dados bancários.</p></div>}
          {step === 3 && <div className="space-y-3"><h3 className="font-bold">Confira antes de enviar</h3><p>{selected?.titulo}</p><p className="break-words">{form.aparelho}</p><p className="whitespace-pre-wrap break-words">{form.problema}</p><p className="text-sm text-slate-500">Esta é uma solicitação de análise. Orçamento, prazo e eventual agendamento serão confirmados pela loja.</p></div>}
          <div className="flex gap-4 mt-6">{step > 1 && <button type="button" disabled={busy} onClick={() => setStep(previous => previous - 1)} className="px-4 py-3 text-blue-700">Voltar</button>}<button disabled={busy} className="bg-blue-700 text-white rounded-xl px-5 py-3 disabled:opacity-50">{busy ? 'Enviando…' : step === 3 ? 'Enviar solicitação' : 'Continuar'}</button></div>
        </form>
      </section> : <p className="panel-feedback mb-6">A loja ainda não publicou serviços para solicitação pelo aplicativo.</p>)}
      {!creating && <section aria-label="Acompanhamento de serviços"><div className="flex flex-wrap gap-4 justify-between items-center mb-4"><h2 className="font-bold text-xl">Minhas solicitações</h2><button className="text-blue-700 py-3" onClick={load}>Atualizar</button></div>{!requests.length && <p className="text-slate-500">Suas solicitações aparecerão aqui.</p>}<div className="grid gap-4">{requests.map(row => <article key={row.id} className="bg-white border border-slate-200 rounded-2xl p-5"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">{row.servico?.titulo || 'Serviço solicitado'}</h3><strong className="text-blue-700">{labels[row.status] || row.status}</strong></div><p className="text-sm break-all my-2">{row.protocolo}</p><p className="break-words">{row.aparelho}</p><details className="mt-3"><summary className="text-blue-700 cursor-pointer py-2">Ver detalhes e atualizações</summary><p className="whitespace-pre-wrap break-words mb-3">{row.problema}</p><ol className="space-y-3">{row.historico?.map(event => <li key={event.id} className="border-l-2 border-blue-200 pl-3"><strong>{labels[event.status] || event.status}</strong><p className="break-words">{event.mensagem}</p><time className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString('pt-BR')}</time></li>)}</ol></details><CustomerServiceSchedule ticket={row} onUpdated={load} /><CustomerServiceQuotes requestId={row.id} onUpdated={load} /></article>)}</div></section>}
    </>}
  </>;
}
