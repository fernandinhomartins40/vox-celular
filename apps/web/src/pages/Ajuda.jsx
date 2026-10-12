import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { PHONE_DIGITS } from '../data';

const topics = { planos: 'Planos e contratação', 'saldo-consumo': 'Saldo e consumo', 'chip-esim': 'Chip e eSIM', 'internet-apn': 'Internet e APN', sinal: 'Sinal', 'chamadas-sms': 'Chamadas e mensagens', portabilidade: 'Portabilidade', 'perda-roubo': 'Perda ou roubo', aplicativos: 'Aplicativos oficiais' };
const channels = { TIM: 'https://www.tim.com.br/ajuda', VIVO: 'https://vivo.com.br/para-voce/ajuda', CLARO: 'https://www.claro.com.br/atendimento' };
export default function Ajuda() {
  const [guides, setGuides] = useState(null);
  const [error, setError] = useState('');
  const [operator, setOperator] = useState('');
  const [topic, setTopic] = useState('');
  const [step, setStep] = useState(1);
  const [reload, setReload] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    api.get('/loja').then(store => api.get(`/guias?lojaId=${encodeURIComponent(store.id)}`)).then(rows => { if (active) { setGuides(rows); setError(''); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [reload]);
  const available = (guides || []).filter(guide => guide.operadora === operator && guide.topico === topic && Date.parse(guide.validoAte) > now);
  const button = 'text-left bg-white rounded-2xl border border-slate-200 p-5 text-blue-700 font-semibold min-h-14 hover:border-blue-500';
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white"><div className="max-w-5xl mx-auto p-4 flex justify-between gap-4 items-center"><Link to="/">Voltar à loja</Link><Link to="/area-cliente/servicos" className="text-blue-700">Solicitar serviço da Vox</Link></div></header>
    <main className="max-w-5xl mx-auto px-4 py-8"><h1 className="text-3xl font-bold">Como podemos ajudar?</h1><p className="text-slate-600 mt-2">Orientações revisadas e canais oficiais das operadoras.</p>
      <ol aria-label="Etapas da ajuda" className="flex flex-wrap gap-4 text-sm my-6">{['Sua operadora', 'Seu assunto', 'Guia e ajuda oficial'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'text-blue-700 font-bold' : 'text-slate-500'}>{index + 1}. {label}</li>)}</ol>
      {error && <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-xl mb-4">{error} <button className="underline" onClick={() => setReload(value => value + 1)}>Tentar novamente</button></p>}
      <h2 ref={heading} tabIndex={-1} className="font-bold text-xl mb-4">{step === 1 ? 'Qual é sua operadora?' : step === 2 ? `Do que precisa na ${operator}?` : topics[topic]}</h2>
      {step === 1 && <div className="grid sm:grid-cols-3 gap-4">{Object.keys(channels).map(value => <button key={value} className={button} onClick={() => { setOperator(value); setTopic(''); setStep(2); }}>{value}</button>)}</div>}
      {step === 2 && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Object.entries(topics).map(([value, label]) => <button key={value} className={button} onClick={() => { setTopic(value); setStep(3); }}>{label}</button>)}</div>}
      {step === 3 && <>
        {guides === null && !error && <p role="status">Consultando guias revisados…</p>}
        {guides !== null && !available.length && <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4"><p>A Vox ainda não tem um guia vigente para este assunto.</p><p className="text-sm text-slate-500 mt-2">Consulte o canal oficial abaixo para obter instruções atuais.</p></div>}
        <div className="grid gap-4">{available.map(guide => <article key={guide.id} className="bg-white rounded-2xl border border-slate-200 p-5"><h3 className="text-lg font-bold">{guide.titulo}</h3><p className="text-slate-600 mt-2 whitespace-pre-wrap">{guide.resumo}</p><ol className="list-decimal pl-5 space-y-3 my-5">{guide.passos.map((text, index) => <li key={index} className="whitespace-pre-wrap break-words">{text}</li>)}</ol><p className="text-xs text-slate-500 mb-4">Revisado em {new Date(guide.revisadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Válido até {new Date(guide.validoAte).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p><div className="flex flex-wrap gap-4"><a href={guide.fonte} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline py-3">Consultar fonte oficial</a><a href={guide.canalOficial} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline py-3">Ajuda oficial para este guia</a></div></article>)}</div>
        <a href={channels[operator]} target="_blank" rel="noopener noreferrer" className="inline-block bg-blue-700 text-white rounded-xl px-5 py-3 mt-5">Abrir atendimento oficial da {operator}</a>
        <p className="text-sm text-slate-500 mt-4">Não compartilhe senhas, códigos de confirmação ou QR codes de eSIM com terceiros. A Vox não recebe essas informações nesta página.</p>
      </>}
      <div className="flex flex-wrap gap-4 mt-6">{step > 1 && <button onClick={() => setStep(value => value - 1)} className="text-blue-700 px-4 py-3">Voltar</button>}<a href={`https://wa.me/${PHONE_DIGITS}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 px-4 py-3">Falar com a Vox</a></div>
    </main>
  </div>;
}
