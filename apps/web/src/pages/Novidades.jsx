import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import BrandLogo from '../components/BrandLogo';

export default function Novidades() {
  const [params] = useSearchParams();
  const id = params.get('id') || '';
  return <NewsContent key={id} id={id} />;
}
function NewsContent({ id }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      if (id.length > 100) throw new Error('Novidade indisponível.');
      const store = await api.get('/loja');
      const data = await api.get(id ? `/novidades/${encodeURIComponent(id)}?lojaId=${encodeURIComponent(store.id)}` : `/novidades?lojaId=${encodeURIComponent(store.id)}`);
      if (active) setRows(Array.isArray(data) ? data : [data]);
    })().catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [id, reload]);
  const date = value => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value));
  return <div className="min-h-screen bg-slate-50 text-slate-900"><header className="border-b border-slate-200 bg-white p-5"><div className="mx-auto flex max-w-5xl items-center justify-between gap-4"><Link to="/" aria-label="Vox Celular, início"><BrandLogo /></Link><Link to="/" className="font-semibold text-blue-700">Voltar à loja</Link></div></header><main className="mx-auto max-w-5xl px-5 py-8"><h1 className="text-3xl font-bold">Novidades da Vox</h1><p className="mt-3 text-slate-600">Conteúdo publicado e revisado pela loja. Confira a fonte e a validade das informações.</p>
    <button type="button" onClick={() => { setRows(null); setError(''); setReload(value => value + 1); }} className="my-4 min-h-11 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-blue-700">Atualizar novidades</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}{!rows && !error && <p role="status">Consultando novidades…</p>}{rows?.length === 0 && <p>Nenhuma novidade publicada no momento.</p>}
    <div className={id ? '' : 'grid gap-4 md:grid-cols-2'}>{rows?.map(row => <article key={row.id} className="mb-4 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">{row.titulo}</h2><p className="mt-3 text-slate-600">{row.resumo}</p>{id && <p className="mt-5 whitespace-pre-wrap break-words leading-relaxed">{row.texto}</p>}<p className="mt-4 text-sm text-slate-500">Revisado em {date(row.revisadoEm)} · Válido até {date(row.validoAte)}</p>{id ? <a href={row.fonte} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block min-h-11 py-3 font-semibold text-blue-700">Consultar fonte</a> : <Link to={`/novidades?id=${encodeURIComponent(row.id)}`} className="mt-3 inline-block min-h-11 py-3 font-semibold text-blue-700">Ler novidade</Link>}</article>)}</div>
    {id && <Link to="/novidades" className="inline-block min-h-11 py-3 font-semibold text-blue-700">Todas as novidades</Link>}
  </main></div>;
}
