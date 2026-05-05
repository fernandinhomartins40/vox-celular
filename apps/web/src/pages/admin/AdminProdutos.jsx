import { useEffect, useMemo, useRef, useState } from 'react';
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
  crop: null,
  naturalWidth: 0,
  naturalHeight: 0,
};

const tabs = [
  { id: 'basico', label: 'Basico', icon: Icon.package },
  { id: 'imagens', label: 'Imagens', icon: Icon.eye },
  { id: 'precos', label: 'Precos', icon: Icon.card },
  { id: 'estoque', label: 'Estoque', icon: Icon.package },
  { id: 'ofertas', label: 'Ofertas', icon: Icon.tag },
  { id: 'detalhes', label: 'Detalhes', icon: Icon.settings },
];

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
  if (!imageState.source || !imageState.crop) return null;
  const image = await loadImage(imageState.source);
  const size = 900;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const crop = imageState.crop;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(
    image,
    (crop.x / 100) * image.width,
    (crop.y / 100) * image.height,
    (crop.size / 100) * image.width,
    (crop.size / 100) * image.height,
    0,
    0,
    size,
    size,
  );
  return canvas.toDataURL('image/webp', 0.82);
}

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [filtro, setFiltro] = useState('Todos');
  const [modalMode, setModalMode] = useState(null);
  const [activeTab, setActiveTab] = useState('basico');
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageState, setImageState] = useState(emptyImage);
  const [cropDraft, setCropDraft] = useState(null);
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
  const currentImage = imageState.source || assetUrl(editando?.img || editando?.imgUrl);

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
    setActiveTab('basico');
    setModalMode('create');
  };

  const abrirEdit = (produto) => {
    setForm(produtoToForm(produto));
    setImageState(emptyImage);
    setEditando(produto);
    setFormError('');
    setActiveTab('basico');
    setModalMode('edit');
  };

  const fecharModal = () => {
    setModalMode(null);
    setEditando(null);
    setForm(emptyForm);
    setImageState(emptyImage);
    setCropDraft(null);
    setFormError('');
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Selecione um arquivo de imagem.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const source = String(reader.result);
      const image = await loadImage(source);
      const minSide = Math.min(image.width, image.height);
      const size = (minSide / image.width) * 100;
      setCropDraft({
        source,
        fileName: file.name,
        naturalWidth: image.width,
        naturalHeight: image.height,
        crop: {
          x: Math.max(0, (100 - size) / 2),
          y: Math.max(0, (100 - ((minSide / image.height) * 100)) / 2),
          size,
        },
      });
      setFormError('');
    };
    reader.readAsDataURL(file);
  };

  const applyCrop = () => {
    if (!cropDraft) return;
    setImageState(cropDraft);
    setCropDraft(null);
    setActiveTab('imagens');
  };

  const salvar = async () => {
    setFormError('');
    if (!form.nome.trim() || !form.descricao.trim() || !form.categoria) {
      setActiveTab('basico');
      setFormError('Preencha nome, categoria e descricao.');
      return;
    }
    if (!form.preco || Number(form.preco) <= 0) {
      setActiveTab('precos');
      setFormError('Informe um preco valido.');
      return;
    }
    if (modalMode === 'create' && !imageState.source) {
      setActiveTab('imagens');
      setFormError('Envie uma imagem do produto.');
      return;
    }

    setSaving(true);
    try {
      const imageDataUrl = await buildCroppedImage(imageState);
      const payload = {
        nome: form.nome.trim(),
        sub: form.sub.trim() || form.nome.trim(),
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
        <ProductFormModal
          mode={modalMode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          form={form}
          setForm={setForm}
          formError={formError}
          saving={saving}
          onClose={fecharModal}
          onSave={salvar}
          onFile={handleFile}
          categorias={categoriasProduto}
          currentImage={currentImage}
          imageState={imageState}
        />
      )}

      {cropDraft && (
        <CropModal
          draft={cropDraft}
          setDraft={setCropDraft}
          onClose={() => setCropDraft(null)}
          onApply={applyCrop}
        />
      )}
    </div>
  );
}

function ProductFormModal({ mode, activeTab, setActiveTab, form, setForm, formError, saving, onClose, onSave, onFile, categorias, currentImage, imageState }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl">
        <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--line)]">
          <div>
            <div className="flex items-center gap-2 font-display font-bold text-[17px]">
              <Icon.package className="w-4 h-4 text-blue-600" />
              {mode === 'create' ? 'Cadastrar Produto' : 'Editar Produto'}
            </div>
            <div className="text-[13px] text-zinc-500 mt-2">Edite as informacoes do produto abaixo</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-zinc-100 grid place-items-center">
            <Icon.close className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-170px)] overflow-y-auto px-6 py-4">
          {formError && <div className="mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 px-3 py-2 text-[12px]">{formError}</div>}

          <div className="grid grid-cols-3 sm:grid-cols-6 bg-zinc-200 rounded-md p-1 mb-3">
            {tabs.map(tab => {
              const TabIcon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`h-10 inline-flex items-center justify-center gap-2 rounded text-[13px] font-semibold transition ${active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}>
                  <TabIcon className="w-4 h-4" /> {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'basico' && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <TextField label="Nome do Produto *" value={form.nome} onChange={nome => setForm(v => ({ ...v, nome }))} />
                <SelectField label="Categoria *" value={form.categoria} options={categorias} onChange={categoria => setForm(v => ({ ...v, categoria }))} />
              </div>
              <TextAreaField label="Descricao" rows={4} value={form.descricao} onChange={descricao => setForm(v => ({ ...v, descricao }))} />
              <div className="flex flex-wrap items-center gap-3">
                <SwitchField checked={form.ativo} onChange={ativo => setForm(v => ({ ...v, ativo }))} />
                <span className="text-[13px] text-zinc-800">Produto ativo</span>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${form.ativo ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'}`}>
                  {form.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'imagens' && (
            <div>
              <label className="border-2 border-dashed border-zinc-300 rounded-lg min-h-[290px] flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition">
                <span className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 grid place-items-center mb-4">
                  <Icon.arrowUpRight className="w-8 h-8 -rotate-45" />
                </span>
                <span className="font-display font-bold text-[18px] text-zinc-900">Adicionar Imagens do Produto</span>
                <span className="text-[14px] text-zinc-500 mt-2">Arraste e solte ou clique para selecionar</span>
                <span className="text-[11px] text-zinc-400 mt-3">JPG, PNG, WebP ate 50MB - 1/10 imagens</span>
                <span className="mt-5 h-10 px-5 inline-flex items-center justify-center gap-2 rounded-md border border-blue-600 bg-white text-blue-600 text-[13px] font-semibold">
                  <Icon.plus className="w-4 h-4" /> Selecionar Imagens
                </span>
                <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              </label>

              <div className="flex items-center justify-between mt-5 mb-3">
                <div className="text-[13px] font-semibold text-zinc-700">
                  Imagens do Produto <span className="ml-2 border border-zinc-300 rounded-full px-2 py-0.5 text-[11px]">{currentImage ? '1/1 prontas' : '0/1 prontas'}</span>
                </div>
                <div className="text-[12px] text-zinc-500">A primeira imagem sera a principal</div>
              </div>

              {currentImage ? (
                <div className="w-52 border-2 border-blue-600 rounded-lg p-2 relative">
                  <span className="absolute -top-3 -left-2 bg-blue-600 text-white rounded-full px-2.5 py-1 text-[11px] font-bold">Principal</span>
                  <span className="absolute top-3 right-3 bg-emerald-600 text-white rounded-full px-3 py-1 text-[11px] font-bold">Pronto</span>
                  <img src={currentImage} alt="" className="w-full aspect-square object-cover rounded-md bg-zinc-50" />
                  {imageState.fileName && <div className="mt-2 truncate text-[11px] text-zinc-500">{imageState.fileName}</div>}
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-5 text-[13px] text-zinc-500">Nenhuma imagem adicionada.</div>
              )}
            </div>
          )}

          {activeTab === 'precos' && (
            <div className="grid md:grid-cols-2 gap-4">
              <TextField label="Preco atual (R$) *" type="number" value={form.preco} onChange={preco => setForm(v => ({ ...v, preco }))} />
              <TextField label="Preco original / De (R$)" type="number" value={form.precoOriginal} onChange={precoOriginal => setForm(v => ({ ...v, precoOriginal }))} />
            </div>
          )}

          {activeTab === 'estoque' && (
            <div className="grid md:grid-cols-2 gap-4">
              <TextField label="Estoque disponivel" type="number" value={form.estoque} onChange={estoque => setForm(v => ({ ...v, estoque }))} />
              <TextField label="Subtitulo / variacao" value={form.sub} onChange={sub => setForm(v => ({ ...v, sub }))} />
            </div>
          )}

          {activeTab === 'ofertas' && (
            <div className="space-y-4">
              <TextField label="Badge da oferta" value={form.badge} onChange={badge => setForm(v => ({ ...v, badge }))} placeholder="OFERTA, NOVO, TOP VENDAS..." />
              <ToggleField label="Produto em destaque" checked={form.destaque} onChange={destaque => setForm(v => ({ ...v, destaque }))} />
            </div>
          )}

          {activeTab === 'detalhes' && (
            <TextAreaField label="Especificacoes (uma por linha)" rows={8} value={form.specsText} onChange={specsText => setForm(v => ({ ...v, specsText }))} />
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--line)] bg-white">
          <button onClick={onClose} className="h-11 px-4 border border-blue-600 rounded-md text-[13px] font-semibold text-blue-600 hover:bg-blue-50 transition">Cancelar</button>
          <button onClick={onSave} disabled={saving}
            className="h-11 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-md text-[13px] font-semibold transition">
            {saving ? 'Salvando...' : mode === 'create' ? 'Cadastrar Produto' : 'Salvar Alteracoes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CropModal({ draft, setDraft, onClose, onApply }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="relative bg-white rounded-lg w-full max-w-4xl overflow-hidden shadow-2xl">
        <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--line)]">
          <div>
            <div className="font-display font-bold text-[16px] text-zinc-900">Ajustar Imagem do Produto</div>
            <div className="text-[13px] text-zinc-500 mt-2">Recorte e ajuste a imagem antes de adicionar ao produto</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-zinc-100 grid place-items-center">
            <Icon.close className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="h-14 border border-zinc-300 rounded-lg flex items-center justify-between px-5 mb-4">
            <div className="flex items-center gap-3">
              <Icon.plus className="w-4 h-4 rotate-45 text-zinc-600" />
              <span className="font-semibold text-[15px] text-zinc-900">Editor de Imagem</span>
              <span className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-bold">Quadrado 1:1</span>
              <span className="rounded-full bg-emerald-600 text-white px-3 py-1 text-[11px] font-bold">Alta qualidade</span>
            </div>
            <span className="hidden sm:block text-[13px] text-zinc-500">Arraste os cantos para ajustar</span>
          </div>

          <CropStage draft={draft} setDraft={setDraft} />

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-[12px] text-zinc-600">
            <strong>Dica:</strong> Arraste os cantos da area destacada para ajustar o tamanho e posicao do corte. O recorte e exportado em WebP 900x900 para preservar qualidade e reduzir espaco em disco.
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button onClick={onClose} className="h-11 px-5 border border-blue-600 rounded-md text-[13px] font-semibold text-blue-600 hover:bg-blue-50 transition">
              Cancelar
            </button>
            <button onClick={onApply} className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[13px] font-semibold transition">
              Aplicar Corte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CropStage({ draft, setDraft }) {
  const stageRef = useRef(null);
  const actionRef = useRef(null);
  const stageSize = { width: 520, height: 330 };
  const imgScale = Math.min(stageSize.width / draft.naturalWidth, stageSize.height / draft.naturalHeight);
  const imgWidth = draft.naturalWidth * imgScale;
  const imgHeight = draft.naturalHeight * imgScale;
  const imgLeft = (stageSize.width - imgWidth) / 2;
  const imgTop = (stageSize.height - imgHeight) / 2;
  const cropHeightPct = (draft.crop.size / draft.naturalHeight) * draft.naturalWidth;

  const rect = {
    left: imgLeft + (draft.crop.x / 100) * imgWidth,
    top: imgTop + (draft.crop.y / 100) * imgHeight,
    width: (draft.crop.size / 100) * imgWidth,
    height: (cropHeightPct / 100) * imgHeight,
  };

  const updateFromPointer = (event) => {
    if (!actionRef.current || !stageRef.current) return;
    const stageBox = stageRef.current.getBoundingClientRect();
    const px = event.clientX - stageBox.left - imgLeft;
    const py = event.clientY - stageBox.top - imgTop;
    const xPct = Math.max(0, Math.min(100, (px / imgWidth) * 100));
    const yPct = Math.max(0, Math.min(100, (py / imgHeight) * 100));
    const action = actionRef.current;

    setDraft(prev => {
      const crop = prev.crop;
      let next = { ...crop };
      if (action.type === 'move') {
        const dx = xPct - action.startX;
        const dy = yPct - action.startY;
        const maxY = 100 - ((crop.size / prev.naturalHeight) * prev.naturalWidth);
        next.x = clamp(action.crop.x + dx, 0, 100 - crop.size);
        next.y = clamp(action.crop.y + dy, 0, maxY);
      } else {
        const right = crop.x + crop.size;
        const bottom = crop.y + ((crop.size / prev.naturalHeight) * prev.naturalWidth);
        if (action.type === 'nw') {
          const newSize = clamp(Math.min(right - xPct, ((bottom - yPct) / prev.naturalWidth) * prev.naturalHeight), 10, right);
          next = { x: right - newSize, y: bottom - ((newSize / prev.naturalHeight) * prev.naturalWidth), size: newSize };
        }
        if (action.type === 'ne') {
          const newSize = clamp(Math.min(xPct - crop.x, ((bottom - yPct) / prev.naturalWidth) * prev.naturalHeight), 10, 100 - crop.x);
          next = { x: crop.x, y: bottom - ((newSize / prev.naturalHeight) * prev.naturalWidth), size: newSize };
        }
        if (action.type === 'sw') {
          const newSize = clamp(Math.min(right - xPct, ((yPct - crop.y) / prev.naturalWidth) * prev.naturalHeight), 10, right);
          next = { x: right - newSize, y: crop.y, size: newSize };
        }
        if (action.type === 'se') {
          const maxByHeight = ((100 - crop.y) / prev.naturalWidth) * prev.naturalHeight;
          const newSize = clamp(Math.min(xPct - crop.x, ((yPct - crop.y) / prev.naturalWidth) * prev.naturalHeight), 10, Math.min(100 - crop.x, maxByHeight));
          next = { x: crop.x, y: crop.y, size: newSize };
        }
        const maxY = 100 - ((next.size / prev.naturalHeight) * prev.naturalWidth);
        next.x = clamp(next.x, 0, 100 - next.size);
        next.y = clamp(next.y, 0, maxY);
      }
      return { ...prev, crop: next };
    });
  };

  const endPointer = () => {
    actionRef.current = null;
    window.removeEventListener('pointermove', updateFromPointer);
    window.removeEventListener('pointerup', endPointer);
  };

  const startPointer = (event, type) => {
    event.preventDefault();
    const stageBox = stageRef.current.getBoundingClientRect();
    actionRef.current = {
      type,
      startX: ((event.clientX - stageBox.left - imgLeft) / imgWidth) * 100,
      startY: ((event.clientY - stageBox.top - imgTop) / imgHeight) * 100,
      crop: { ...draft.crop },
    };
    window.addEventListener('pointermove', updateFromPointer);
    window.addEventListener('pointerup', endPointer);
  };

  return (
    <div className="border border-zinc-300 rounded-lg bg-zinc-50 py-4 overflow-x-auto">
      <div ref={stageRef} className="relative mx-auto bg-zinc-400 select-none" style={{ width: stageSize.width, height: stageSize.height, maxWidth: '100%' }}>
        <img src={draft.source} alt="" draggable="false" className="absolute object-contain" style={{ left: imgLeft, top: imgTop, width: imgWidth, height: imgHeight }} />
        <div className="absolute bg-black/45 pointer-events-none" style={{ left: imgLeft, top: imgTop, width: imgWidth, height: rect.top - imgTop }} />
        <div className="absolute bg-black/45 pointer-events-none" style={{ left: imgLeft, top: rect.top + rect.height, width: imgWidth, height: imgTop + imgHeight - (rect.top + rect.height) }} />
        <div className="absolute bg-black/45 pointer-events-none" style={{ left: imgLeft, top: rect.top, width: rect.left - imgLeft, height: rect.height }} />
        <div className="absolute bg-black/45 pointer-events-none" style={{ left: rect.left + rect.width, top: rect.top, width: imgLeft + imgWidth - (rect.left + rect.width), height: rect.height }} />
        <div onPointerDown={event => startPointer(event, 'move')} className="absolute border-2 border-blue-500 cursor-move" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
          {['nw', 'ne', 'sw', 'se'].map(corner => (
            <button key={corner} type="button" aria-label={`Ajustar ${corner}`} onPointerDown={event => startPointer(event, corner)}
              className={`absolute w-3 h-3 bg-white border border-zinc-500 ${corner.includes('n') ? '-top-1.5' : '-bottom-1.5'} ${corner.includes('w') ? '-left-1.5' : '-right-1.5'} ${corner === 'nw' || corner === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function fieldClass() {
  return 'w-full px-3 py-2.5 bg-white border border-zinc-300 rounded-md text-[13px] focus:outline-none focus:border-blue-600';
}

function TextField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block font-medium text-[13px] text-zinc-800 mb-2">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={fieldClass()} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block font-medium text-[13px] text-zinc-800 mb-2">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={fieldClass()}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function TextAreaField({ label, value, onChange, rows }) {
  return (
    <div>
      <label className="block font-medium text-[13px] text-zinc-800 mb-2">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} className={`${fieldClass()} resize-none`} />
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-700 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-blue-600" />
      {label}
    </label>
  );
}

function SwitchField({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full p-0.5 transition ${checked ? 'bg-blue-600' : 'bg-zinc-300'}`}>
      <span className={`block w-5 h-5 bg-white rounded-full shadow transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}
