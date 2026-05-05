import { useEffect, useMemo, useState } from 'react';
import { api, assetUrl } from '../../lib/api.js';
import { CATEGORIES } from '../../data';
import { Icon } from '../../icons';
import { formatBRL, badgeStyle } from '../../utils';

const emptyForm = {
  nome: '',
  sub: '',
  categoria: 'Celulares',
  preco: '',
  precoOriginal: '',
  badge: '',
  descricao: '',
  estoque: 0,
  ativo: true,
  destaque: false,
  specsText: '',
};

const emptyImage = {
  source: '',
  fileName: '',
  zoom: 1,
  offsetX: 50,
  offsetY: 50,
};

function normalizeProduto(produto) {
  return { ...produto, img: produto.img ?? produto.imgUrl };
}

function produtoToForm(produto) {
  return {
    nome: produto.nome ?? '',
    sub: produto.sub ?? '',
    categoria: produto.categoria ?? 'Celulares',
    preco: produto.preco ?? '',
    precoOriginal: produto.precoOriginal ?? '',
    badge: produto.badge ?? '',
    descricao: produto.descricao ?? '',
    estoque: produto.estoque ?? 0,
    ativo: produto.ativo !== false,
    destaque: Boolean(produto.destaque),
    specsText: Array.isArray(produto.specs) ? produto.specs.join('\n') : '',
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function buildCroppedImage(imageState) {
  if (!imageState.source) return null;
  const image = await loadImage(imageState.source);
  const size = 900;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const baseScale = Math.max(size / image.width, size / image.height);
  const scale = baseScale * Number(imageState.zoom || 1);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (size - drawWidth) * (Number(imageState.offsetX) / 100);
  const y = (size - drawHeight) * (Number(imageState.offsetY) / 100);

  ctx.drawImage(image, x, y, drawWidth, drawHeight);
  return canvas.toDataURL('image/webp', 0.78);
}

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [filtro, setFiltro] = useState('Todos');
  const [modalMode, setModalMode] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageState, setImageState] = useState(emptyImage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/produtos/admin')
      .then(data => setProdutos((Array.isArray(data) ? data : (data.produtos ?? [])).map(normalizeProduto)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const cats = useMemo(() => ['Todos', ...CATEGORIES.filter(c => c !== 'Todos')], []);
  const categoriasProduto = useMemo(() => CATEGORIES.filter(c => c !== 'Todos'), []);
  const filtrados = filtro === 'Todos' ? produtos : produtos.filter(p => p.categoria === filtro);
  const previewSrc = imageState.source || assetUrl(editando?.img || editando?.imgUrl);

  const updateProduto = (produto) => {
    const normalizado = normalizeProduto(produto);
    setProdutos(prev => prev.map(p => p.id === normalizado.id ? normalizado : p));
    return normalizado;
  };

  const toggleAtivo = async (id) => {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;
    try {
      const updated = await api.patch(`/produtos/${id}`, { ativo: !produto.ativo });
      updateProduto(updated);
    } catch (e) {
      console.error('Erro ao alternar ativo:', e.message);
    }
  };

  const toggleDestaque = async (id) => {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;
    try {
      const updated = await api.patch(`/produtos/${id}`, { destaque: !produto.destaque });
      updateProduto(updated);
    } catch (e) {
      console.error('Erro ao alternar destaque:', e.message);
    }
  };

  const abrirNovo = () => {
    setForm(emptyForm);
    setImageState(emptyImage);
    setEditando(null);
    setFormError('');
    setModalMode('create');
  };

  const abrirEdit = (produto) => {
    setForm(produtoToForm(produto));
    setImageState(emptyImage);
    setEditando(produto);
    setFormError('');
    setModalMode('edit');
  };

  const fecharModal = () => {
    setModalMode(null);
    setEditando(null);
    setForm(emptyForm);
    setImageState(emptyImage);
    setFormError('');
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Selecione um arquivo de imagem.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageState({ ...emptyImage, source: String(reader.result), fileName: file.name });
      setFormError('');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const salvar = async () => {
    setFormError('');
    if (!form.nome.trim() || !form.sub.trim() || !form.descricao.trim() || !form.categoria) {
      setFormError('Preencha nome, subtitulo, categoria e descricao.');
      return;
    }
    if (!form.preco || Number(form.preco) <= 0) {
      setFormError('Informe um preco valido.');
      return;
    }
    if (modalMode === 'create' && !imageState.source) {
      setFormError('Envie uma imagem do produto.');
      return;
    }

    setSaving(true);
    try {
      const imageDataUrl = await buildCroppedImage(imageState);
      const payload = {
        nome: form.nome.trim(),
        sub: form.sub.trim(),
        categoria: form.categoria,
        preco: Number(form.preco),
        precoOriginal: form.precoOriginal === '' ? null : Number(form.precoOriginal),
        badge: form.badge.trim() || null,
        descricao: form.descricao.trim(),
        estoque: Number(form.estoque || 0),
        ativo: Boolean(form.ativo),
        destaque: Boolean(form.destaque),
        specs: form.specsText.split('\n').map(s => s.trim()).filter(Boolean),
        ...(imageDataUrl ? { image: { dataUrl: imageDataUrl } } : {}),
      };

      if (modalMode === 'create') {
        const created = await api.post('/produtos', payload);
        setProdutos(prev => [normalizeProduto(created), ...prev]);
      } else if (editando) {
        const updated = await api.patch(`/produtos/${editando.id}`, payload);
        updateProduto(updated);
      }
      fecharModal();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[var(--royal-700)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-5 h-[2px] bg-[var(--red-500)]"></span>
            <span className="font-display text-[var(--red-500)] font-semibold text-[11px] tracking-[0.28em]">CATALOGO</span>
          </div>
          <h1 className="font-display font-bold text-[32px] text-[var(--ink)]">Produtos</h1>
        </div>
        <button onClick={abrirNovo}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-[var(--royal-700)] hover:bg-[var(--royal-800)] text-white rounded-lg text-[13px] font-semibold transition">
          <Icon.plus className="w-4 h-4" /> Novo produto
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {cats.map(c => (
          <button key={c} onClick={() => setFiltro(c)}
            className={`px-3.5 h-9 rounded-full text-[12.5px] font-medium border transition ${filtro === c ? 'bg-[var(--royal-800)] text-white border-[var(--royal-800)]' : 'bg-white text-zinc-600 border-[var(--line)] hover:border-[var(--royal-700)]'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtrados.map(p => {
          const discount = p.precoOriginal ? Math.round((1 - p.preco / p.precoOriginal) * 100) : 0;
          return (
            <div key={p.id} className={`bg-white border rounded-lg overflow-hidden transition ${p.ativo !== false ? 'border-[var(--line)]' : 'border-[var(--line)] opacity-50'}`}>
              <div className="relative aspect-square bg-[var(--paper)] overflow-hidden">
                {p.img ? <img src={assetUrl(p.img)} alt={p.nome} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-zinc-400 text-[12px]">Sem imagem</div>}
                {p.badge && (
                  <span className={`absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${badgeStyle(p.badge)}`}>
                    {p.badge}
                  </span>
                )}
                {discount > 0 && (
                  <span className="absolute top-2 right-2 bg-[var(--royal-800)] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">-{discount}%</span>
                )}
                {p.destaque && (
                  <div className="absolute bottom-2 left-2 bg-amber-400 text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide">DESTAQUE</div>
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

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={fecharModal} />
          <div className="relative bg-white rounded-lg w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--line)]">
              <div>
                <div className="font-display font-bold text-[20px]">{modalMode === 'create' ? 'Cadastrar produto' : 'Editar produto'}</div>
                <div className="text-[12px] text-zinc-500">Imagem final: WebP quadrada 900 x 900 px.</div>
              </div>
              <button onClick={fecharModal} className="w-9 h-9 rounded-full hover:bg-zinc-100 grid place-items-center">
                <Icon.close className="w-5 h-5" />
              </button>
            </div>

            <div className="grid lg:grid-cols-[340px_1fr] max-h-[calc(92vh-74px)] overflow-y-auto">
              <div className="p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-[var(--line)]">
                <div className="aspect-square bg-[var(--paper)] rounded-lg overflow-hidden border border-[var(--line)] relative">
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ transform: `scale(${imageState.source ? imageState.zoom : 1})`, transformOrigin: `${imageState.offsetX}% ${imageState.offsetY}%`, objectPosition: `${imageState.offsetX}% ${imageState.offsetY}%` }}
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[12px] text-zinc-500">Envie uma imagem</div>
                  )}
                </div>

                <label className="mt-4 h-10 px-4 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white hover:bg-zinc-50 text-[13px] font-medium cursor-pointer w-full">
                  <Icon.plus className="w-4 h-4" /> Selecionar imagem
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
                {imageState.fileName && <div className="mt-2 text-[11px] text-zinc-500 truncate">{imageState.fileName}</div>}

                {imageState.source && (
                  <div className="mt-4 space-y-3">
                    <RangeField label="Zoom" min="1" max="2.6" step="0.05" value={imageState.zoom} onChange={zoom => setImageState(s => ({ ...s, zoom }))} />
                    <RangeField label="Horizontal" min="0" max="100" step="1" value={imageState.offsetX} onChange={offsetX => setImageState(s => ({ ...s, offsetX }))} />
                    <RangeField label="Vertical" min="0" max="100" step="1" value={imageState.offsetY} onChange={offsetY => setImageState(s => ({ ...s, offsetY }))} />
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                {formError && <div className="rounded-lg bg-red-50 border border-red-100 text-red-600 px-3 py-2 text-[12px]">{formError}</div>}

                <div className="grid sm:grid-cols-2 gap-4">
                  <TextField label="Nome" value={form.nome} onChange={nome => setForm(v => ({ ...v, nome }))} />
                  <TextField label="Subtitulo" value={form.sub} onChange={sub => setForm(v => ({ ...v, sub }))} />
                  <SelectField label="Categoria" value={form.categoria} options={categoriasProduto} onChange={categoria => setForm(v => ({ ...v, categoria }))} />
                  <TextField label="Badge" value={form.badge} onChange={badge => setForm(v => ({ ...v, badge }))} placeholder="OFERTA, NOVO..." />
                  <TextField label="Preco atual (R$)" type="number" value={form.preco} onChange={preco => setForm(v => ({ ...v, preco }))} />
                  <TextField label="Preco original / De (R$)" type="number" value={form.precoOriginal} onChange={precoOriginal => setForm(v => ({ ...v, precoOriginal }))} />
                  <TextField label="Estoque" type="number" value={form.estoque} onChange={estoque => setForm(v => ({ ...v, estoque }))} />
                  <div className="grid grid-cols-2 gap-3 pt-6">
                    <ToggleField label="Ativo" checked={form.ativo} onChange={ativo => setForm(v => ({ ...v, ativo }))} />
                    <ToggleField label="Destaque" checked={form.destaque} onChange={destaque => setForm(v => ({ ...v, destaque }))} />
                  </div>
                </div>

                <TextAreaField label="Descricao" rows={4} value={form.descricao} onChange={descricao => setForm(v => ({ ...v, descricao }))} />
                <TextAreaField label="Especificacoes (uma por linha)" rows={5} value={form.specsText} onChange={specsText => setForm(v => ({ ...v, specsText }))} />

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button onClick={fecharModal} className="sm:flex-1 h-10 border border-[var(--line)] rounded-lg text-[13px] font-medium text-zinc-600 hover:bg-zinc-50 transition">Cancelar</button>
                  <button onClick={salvar} disabled={saving}
                    className="sm:flex-1 h-10 bg-[var(--royal-700)] hover:bg-[var(--royal-800)] disabled:opacity-60 text-white rounded-lg text-[13px] font-semibold transition">
                    {saving ? 'Salvando...' : modalMode === 'create' ? 'Cadastrar produto' : 'Salvar alteracoes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fieldClass() {
  return 'w-full px-3 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[13px] focus:outline-none focus:border-[var(--royal-700)]';
}

function TextField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block font-medium text-[12px] text-zinc-700 mb-1">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={fieldClass()} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block font-medium text-[12px] text-zinc-700 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={fieldClass()}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function TextAreaField({ label, value, onChange, rows }) {
  return (
    <div>
      <label className="block font-medium text-[12px] text-zinc-700 mb-1">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} className={`${fieldClass()} resize-none`} />
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 text-[12px] font-medium text-zinc-700 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-[var(--royal-700)]" />
      {label}
    </label>
  );
}

function RangeField({ label, value, onChange, min, max, step }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-zinc-700 mb-1">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-[var(--royal-700)]" />
    </label>
  );
}
