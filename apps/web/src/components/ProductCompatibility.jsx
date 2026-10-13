import { useEffect, useRef, useState } from 'react';
import { api, assetUrl } from '../lib/api';

export default function ProductCompatibility({ product, onSelect }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    if (product.lojaId) api.get(`/compatibilidades?lojaId=${encodeURIComponent(product.lojaId)}&produtoId=${encodeURIComponent(product.id)}`)
      .then(data => { if (active.current) setRows(data); }).catch(e => { if (active.current) setError(e.message); });
    return () => { active.current = false; };
  }, [product.id, product.lojaId]);
  async function open(related) {
    if (busy || !onSelect) return;
    setBusy(true); setError('');
    try {
      const data = await api.get(`/produtos/${encodeURIComponent(related.id)}?lojaId=${encodeURIComponent(product.lojaId)}`);
      if (active.current) onSelect({ ...data, img: assetUrl(data.imgUrl) });
    } catch (e) { if (active.current) setError(e.message); }
    finally { if (active.current) setBusy(false); }
  }
  return <section className="mb-5 rounded-xl border border-slate-200 p-4" aria-label="Compatibilidade conferida pela loja">
    <h3 className="font-semibold text-sm">Compatibilidade conferida pela loja</h3>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    {!product.lojaId || rows?.length === 0 ? <p className="mt-2 text-sm text-slate-600">Compatibilidade não informada. Confirme com a loja antes de escolher um acessório.</p> : rows === null ? !error && <p role="status" className="mt-2 text-sm">Consultando compatibilidade…</p> : rows.map(row => {
      const related = row.acessorio.id === product.id ? row.aparelho : row.acessorio;
      return <div key={row.id} className="mt-3 text-sm"><p className="font-semibold">{related.nome}</p><p className="text-slate-600">{row.observacao}</p><p className="text-xs text-slate-500">Conferido em {new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(row.aprovadoEm))}</p>{onSelect && <button type="button" disabled={busy} onClick={() => open(related)} className="min-h-11 font-semibold text-blue-700">Ver este produto</button>}</div>;
    })}
  </section>;
}
