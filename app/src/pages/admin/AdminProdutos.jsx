import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { CATEGORIES } from '../../data';
import { Icon } from '../../icons';
import { formatBRL, badgeStyle } from '../../utils';

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [filtro, setFiltro] = useState('Todos');
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/produtos/admin')
      .then(data => setProdutos(Array.isArray(data) ? data : (data.produtos ?? [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = filtro === 'Todos' ? produtos : produtos.filter(p => p.categoria === filtro);

  const toggleAtivo = async (id) => {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;
    try {
      await api.patch(`/produtos/${id}`, { ativo: !produto.ativo });
      setProdutos(prev => prev.map(p => p.id === id ? { ...p, ativo: !p.ativo } : p));
    } catch (e) {
      console.error('Erro ao alternar ativo:', e.message);
    }
  };

  const toggleDestaque = async (id) => {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;
    try {
      await api.patch(`/produtos/${id}`, { destaque: !produto.destaque });
      setProdutos(prev => prev.map(p => p.id === id ? { ...p, destaque: !p.destaque } : p));
    } catch (e) {
      console.error('Erro ao alternar destaque:', e.message);
    }
  };

  const abrirEdit = (p) => {
    setForm({ preco: p.preco, precoOriginal: p.precoOriginal ?? '', descricao: p.descricao, estoque: p.estoque });
    setEditando(p);
  };

  const salvar = async () => {
    if (!editando) return;
    setSaving(true);
    try {
      const updateData = {
        preco: Number(form.preco),
        precoOriginal: form.precoOriginal ? Number(form.precoOriginal) : null,
        descricao: form.descricao,
        estoque: Number(form.estoque),
      };
      await api.patch(`/produtos/${editando.id}`, updateData);
      setProdutos(prev => prev.map(p => p.id === editando.id ? { ...p, ...updateData } : p));
      setEditando(null);
    } catch (e) {
      console.error('Erro ao salvar produto:', e.message);
    } finally {
      setSaving(false);
    }
  };

  const cats = ['Todos', ...CATEGORIES.filter(c => c !== 'Todos')];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[var(--royal-700)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div>
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-[2px] bg-[var(--red-500)]"></span>
          <span className="font-display text-[var(--red-500)] font-semibold text-[11px] tracking-[0.28em]">CATÁLOGO</span>
        </div>
        <h1 className="font-display font-bold text-[32px] text-[var(--ink)]">Produtos</h1>
      </div>

      {/* Filtros de categoria */}
      <div className="flex flex-wrap gap-2 mb-6">
        {cats.map(c => (
          <button key={c} onClick={() => setFiltro(c)}
            className={`px-3.5 h-9 rounded-full text-[12.5px] font-medium border transition ${filtro === c ? 'bg-[var(--royal-800)] text-white border-[var(--royal-800)]' : 'bg-white text-zinc-600 border-[var(--line)] hover:border-[var(--royal-700)]'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtrados.map(p => {
          const discount = p.precoOriginal ? Math.round((1 - p.preco / p.precoOriginal) * 100) : 0;
          return (
            <div key={p.id} className={`bg-white border rounded-2xl overflow-hidden transition ${p.ativo !== false ? 'border-[var(--line)]' : 'border-[var(--line)] opacity-50'}`}>
              <div className="relative aspect-square bg-[var(--paper)] overflow-hidden">
                <img src={p.img} alt={p.nome} className="w-full h-full object-cover" />
                {p.badge && (
                  <span className={`absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${badgeStyle(p.badge)}`}>
                    {p.badge}
                  </span>
                )}
                {discount > 0 && (
                  <span className="absolute top-2 right-2 bg-[var(--royal-800)] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">-{discount}%</span>
                )}
                {p.destaque && (
                  <div className="absolute bottom-2 left-2 bg-amber-400 text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide">⭐ DESTAQUE</div>
                )}
              </div>
              <div className="p-4">
                <div className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase mb-0.5">{p.categoria}</div>
                <div className="font-display font-bold text-[15px] leading-tight mb-1">{p.nome}</div>
                <div className="font-display font-bold text-[20px] text-[var(--ink)]">{formatBRL(p.preco)}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5 mb-3">Estoque: {p.estoque} un.</div>
                <div className="flex gap-2">
                  <button onClick={() => abrirEdit(p)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 bg-[var(--royal-50)] text-[var(--royal-700)] rounded-lg text-[12px] font-medium hover:bg-[var(--royal-100)] transition">
                    <Icon.edit className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={() => toggleDestaque(p.id)}
                    className={`w-8 h-8 rounded-lg grid place-items-center transition ${p.destaque ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`} title="Destaque">
                    <Icon.star className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleAtivo(p.id)}
                    className={`w-8 h-8 rounded-lg grid place-items-center transition ${p.ativo !== false ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-500 hover:bg-red-100'}`} title={p.ativo !== false ? 'Desativar' : 'Ativar'}>
                    {p.ativo !== false ? <Icon.check className="w-3.5 h-3.5" /> : <Icon.close className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtrados.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500">Nenhum produto encontrado.</div>
        )}
      </div>

      {/* Modal de edição */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditando(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--line)]">
              <div className="font-display font-bold text-[20px]">Editar produto</div>
              <button onClick={() => setEditando(null)} className="w-9 h-9 rounded-full hover:bg-zinc-100 grid place-items-center">
                <Icon.close className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <img src={editando.img} alt="" className="w-14 h-14 rounded-xl object-cover" />
                <div>
                  <div className="font-display font-bold text-[16px]">{editando.nome}</div>
                  <div className="text-[12px] text-zinc-500">{editando.sub}</div>
                </div>
              </div>
              {[
                { label: 'Preço atual (R$)', key: 'preco', type: 'number' },
                { label: 'Preço original / De (R$)', key: 'precoOriginal', type: 'number' },
                { label: 'Estoque (unidades)', key: 'estoque', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block font-medium text-[12px] text-zinc-700 mb-1">{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[13px] focus:outline-none focus:border-[var(--royal-700)]" />
                </div>
              ))}
              <div>
                <label className="block font-medium text-[12px] text-zinc-700 mb-1">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(v => ({ ...v, descricao: e.target.value }))} rows={3}
                  className="w-full px-3 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[13px] focus:outline-none focus:border-[var(--royal-700)] resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditando(null)} className="flex-1 h-10 border border-[var(--line)] rounded-xl text-[13px] font-medium text-zinc-600 hover:bg-zinc-50 transition">Cancelar</button>
                <button onClick={salvar} disabled={saving}
                  className="flex-1 h-10 bg-[var(--royal-700)] hover:bg-[var(--royal-800)] disabled:opacity-60 text-white rounded-xl text-[13px] font-semibold transition">
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
