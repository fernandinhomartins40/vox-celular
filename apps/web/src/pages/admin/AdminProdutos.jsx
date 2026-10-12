import PanelPagination from '../../components/panel/PanelPagination';
import { usePanelPagination } from '../../lib/usePanelPagination';
import { useSearchParams } from 'react-router-dom';
import { PanelSteps, PanelEmptyState } from '../../components/panel/PanelFlow';
import { normalizeSearch, productStepError, setPanelParams } from '../../lib/panel';
import { PanelLoading, PanelError } from '../../components/panel/PanelFeedback';
import PanelDialog from '../../components/panel/PanelDialog';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { api, assetUrl } from '../../lib/api.js';
import { CATEGORIES } from '../../data';
import { Icon } from '../../icons';
import { formatBRL, badgeStyle } from '../../utils';
import { compressCanvas, IMAGE_ACCEPT } from '../../lib/imageUpload';

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
  atributosTecnicos: {},
};

const emptyImage = {
  source: '',
  fileName: '',
  crop: null,
  naturalWidth: 0,
  naturalHeight: 0,
};

const tabs = [
  { id: 'basico', label: 'Produto' },
  { id: 'precos', label: 'Venda' },
  { id: 'revisao', label: 'Revisão' },
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
    atributosTecnicos: produto.atributosTecnicos || {},
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
  if (imageState.autoFit) {
    const scale = Math.min(size / image.width, size / image.height);
    ctx.drawImage(image, (size - image.width * scale) / 2, (size - image.height * scale) / 2, image.width * scale, image.height * scale);
    return (await compressCanvas(canvas)).dataUrl;
  }
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
  return (await compressCanvas(canvas)).dataUrl;
}

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [params, setParams] = useSearchParams();
  const filtro = params.get('categoria') || 'Todos';
  const busca = params.get('busca') || '';
  const estoqueFiltro = params.get('estoque') || '';
  const [actionError, setActionError] = useState('');
  const [updating, setUpdating] = useState({});
  const pendingProducts = useRef(new Set());
  const savingRef = useRef(false);
  const setFiltro = value => setPanelParams(setParams, { categoria: value === 'Todos' ? '' : value });
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

  const categoriasProduto = useMemo(() => [...new Set([...CATEGORIES.filter(c => c !== 'Todos'), ...produtos.map(p => p.categoria)])], [produtos]);
  const cats = ['Todos', ...categoriasProduto];
  const filtrados = produtos.filter(p => (filtro === 'Todos' || p.categoria === filtro) && normalizeSearch(`${p.nome} ${p.sub} ${p.categoria}`).includes(normalizeSearch(busca)) && (!estoqueFiltro || (estoqueFiltro === 'baixo' ? p.ativo !== false && p.estoque <= 5 : estoqueFiltro === 'zero' ? p.ativo !== false && p.estoque === 0 : p.ativo === false)));
  const pagination = usePanelPagination(filtrados, 12);

  const currentImage = imageState.source || assetUrl(editando?.img || editando?.imgUrl);

  const updateProduto = (produto) => {
    const normalizado = normalizeProduto(produto);
    setProdutos(prev => prev.map(p => p.id === normalizado.id ? normalizado : p));
    return normalizado;
  };

  const toggleProduto = async (id, field) => {
    const produto = produtos.find(p => p.id === id);
    if (!produto || pendingProducts.current.has(id)) return;
    pendingProducts.current.add(id); setUpdating(v => ({ ...v, [id]: true })); setActionError('');
    try { updateProduto(await api.patch(`/produtos/${id}`, { [field]: !produto[field] })); }
    catch (e) { setActionError(e.message); }
    finally { pendingProducts.current.delete(id); setUpdating(v => ({ ...v, [id]: false })); }
  };
  const toggleAtivo = id => toggleProduto(id, 'ativo');
  const toggleDestaque = id => toggleProduto(id, 'destaque');
  const goStep = next => {
    const target = tabs.findIndex(t => t.id === next);
    for (let i = 0; i < target; i++) {
      const message = productStepError(form, imageState.source, modalMode === 'create', tabs[i].id);
      if (message) { setFormError(message); setActiveTab(tabs[i].id); return; }
    }
    setFormError(''); setActiveTab(next);
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
    if (file.size > 15 * 1024 * 1024) { setFormError('Escolha uma imagem de até 15 MB.'); return; }
    if (!file.type.startsWith('image/')) {
      setFormError('Selecione um arquivo de imagem.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const source = String(reader.result);
      let image;
      try { image = await loadImage(source); } catch { setFormError('Não foi possível abrir esta imagem. Escolha outro arquivo.'); return; }
      if (image.width * image.height > 40000000) { setFormError('Escolha uma imagem de até 40 megapixels.'); return; }
      const minSide = Math.min(image.width, image.height);
      const size = (minSide / image.width) * 100;
      setImageState({
        source,
        autoFit: true,
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
    setActiveTab('basico');
  };

  const salvar = async () => {
    if (savingRef.current) return;
    for (const step of ['basico', 'precos']) {
      const message = productStepError(form, imageState.source, modalMode === 'create', step);
      if (message) { setFormError(message); setActiveTab(step); return; }
    }
    savingRef.current = true;
    setFormError('');
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
        atributosTecnicos: form.atributosTecnicos,
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
      savingRef.current = false; setSaving(false);
    }
  };

  if (loading) return <PanelLoading />;
  if (error) return <PanelError message={error} />;

  return (
    <div>
      <PanelPageHeader title="Produtos" description="Cadastre e ajuste imagem, preço e estoque.">
        <button onClick={abrirNovo}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-[var(--royal-700)] hover:bg-[var(--royal-800)] text-white rounded-lg text-[13px] font-semibold transition">
          <Icon.plus className="w-4 h-4" /> Novo produto
        </button>
      </PanelPageHeader>

      {actionError && <p role="alert" className="panel-inline-notice">{actionError}</p>}
      <div className="panel-filter-bar">
        <label className="panel-search"><span className="sr-only">Buscar produto</span><input value={busca} placeholder="Buscar nome ou categoria" onChange={e => setPanelParams(setParams, { busca: e.target.value })} /></label>
        <label><span className="sr-only">Filtrar estoque</span><select value={estoqueFiltro} onChange={e => setPanelParams(setParams, { estoque: e.target.value })}><option value="">Todo o estoque</option><option value="baixo">Estoque baixo (até 5)</option><option value="zero">Sem estoque</option><option value="inativo">Produtos inativos</option></select></label>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {cats.map(c => (
          <button key={c} aria-pressed={filtro === c} onClick={() => setFiltro(c)}
            className={`px-3.5 h-9 rounded-full text-[12.5px] font-medium border transition ${filtro === c ? 'bg-[var(--royal-800)] text-white border-[var(--royal-800)]' : 'bg-white text-zinc-600 border-[var(--line)] hover:border-[var(--royal-700)]'}`}>
            {c}
          </button>
        ))}
      </div>

      {(busca || estoqueFiltro || filtro !== 'Todos') && filtrados.length > 0 && <button className="panel-secondary-button mb-4" onClick={() => setParams({})}>Limpar filtros</button>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pagination.items.map(p => {
          const discount = p.precoOriginal ? Math.round((1 - p.preco / p.precoOriginal) * 100) : 0;
          return (
            <div key={p.id} className="bg-white border border-[var(--line)] rounded-lg overflow-hidden transition">
              <div className="relative aspect-square bg-[var(--paper)] overflow-hidden">
                {p.img ? <img loading="lazy" src={assetUrl(p.img)} alt={p.nome} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-zinc-400 text-[12px]">Sem imagem</div>}
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
                <div className="panel-product-actions">
                  <button onClick={() => abrirEdit(p)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 bg-[var(--royal-50)] text-[var(--royal-700)] rounded-lg text-[12px] font-medium hover:bg-[var(--royal-100)] transition">
                    <Icon.edit className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button disabled={updating[p.id]} aria-pressed={Boolean(p.destaque)} aria-label={p.destaque ? `Remover destaque de ${p.nome}` : `Destacar ${p.nome}`} onClick={() => toggleDestaque(p.id)}
                    className={`panel-secondary-button ${p.destaque ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`} title="Destaque">
                    <Icon.star className="w-3.5 h-3.5" /> {p.destaque ? 'Em destaque' : 'Destacar'}
                  </button>
                  <button disabled={updating[p.id]} aria-pressed={p.ativo !== false} aria-label={p.ativo !== false ? `Desativar ${p.nome}` : `Ativar ${p.nome}`} onClick={() => toggleAtivo(p.id)}
                    className={`panel-secondary-button ${p.ativo !== false ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-500 hover:bg-red-100'}`} title={p.ativo !== false ? 'Desativar' : 'Ativar'}>
                    {p.ativo !== false ? <Icon.check className="w-3.5 h-3.5" /> : <Icon.close className="w-3.5 h-3.5" />} {p.ativo !== false ? 'Publicado' : 'Oculto'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtrados.length === 0 && (
          <div className="col-span-full"><PanelEmptyState title="Nenhum produto encontrado" description={produtos.length ? 'Ajuste os filtros para encontrar seu produto.' : 'Cadastre o primeiro produto para exibir na loja.'} action={produtos.length ? 'Limpar filtros' : 'Novo produto'} onAction={produtos.length ? () => setParams({}) : abrirNovo} /></div>
        )}
      </div>

      <PanelPagination pagination={pagination} label="produtos" />

      {modalMode && (
        <ProductFormModal
          mode={modalMode}
          activeTab={activeTab}
          setActiveTab={goStep}
          onAdjust={() => setCropDraft({ ...imageState, autoFit: false })}
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

function ProductFormModal({ mode, activeTab, setActiveTab, form, setForm, formError, saving, onClose, onSave, onFile, onAdjust, categorias, currentImage, imageState }) {
  const current = tabs.findIndex(t => t.id === activeTab);
  const contentRef = useRef(null);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    if (formError) contentRef.current?.querySelector('[role=alert]')?.focus();
  }, [activeTab, formError]);
  return <PanelDialog label="Produto" onClose={() => { if (!saving) onClose(); }} className="p-3" layer="z-50">
    <div className="panel-product-dialog">
      <header><div><h2>{mode === 'create' ? 'Cadastrar produto' : 'Editar produto'}</h2><p className="panel-muted">Produto, venda e revisão. Seus dados ficam preenchidos ao voltar.</p></div><button disabled={saving} aria-label="Fechar produto" onClick={onClose}><Icon.close /></button></header>
      <div ref={contentRef} className="panel-product-content">
        <PanelSteps steps={tabs.map(t => t.label)} current={current} />
        {formError && <p tabIndex={-1} role="alert" className="panel-inline-notice">{formError}</p>}
        {activeTab === 'basico' && <div className="space-y-4">
          <TextField label="Nome do produto" value={form.nome} onChange={nome => setForm(v => ({ ...v, nome }))} />
          <details><summary>Características para comparação e assistente</summary><div className="space-y-4 mt-4">
            <p className="text-sm text-slate-500">Preencha apenas dados confirmados. Deixe em branco o que não souber.</p>
            <label className="block">Tipo de produto<select className="block w-full border rounded-xl p-3" value={form.atributosTecnicos.tipo || ''} onChange={e => setForm(v => { const tech = { ...v.atributosTecnicos, verificado: false }; if (e.target.value) tech.tipo = e.target.value; else delete tech.tipo; return { ...v, atributosTecnicos: tech }; })}><option value="">Não informado</option><option value="celular">Celular</option><option value="tablet">Tablet</option><option value="acessorio">Acessório</option><option value="outro">Outro</option></select></label>
            {[['marca', 'Marca'], ['modelo', 'Modelo'], ['fonte', 'Fonte oficial das características (HTTPS)']].map(([key, label]) => <TextField key={key} label={label} value={form.atributosTecnicos[key] || ''} onChange={value => setForm(v => { const tech = { ...v.atributosTecnicos, verificado: false }; if (value) tech[key] = value; else delete tech[key]; return { ...v, atributosTecnicos: tech }; })} />)}
            {[['ramGB', 'Memória RAM (GB)'], ['armazenamentoGB', 'Armazenamento (GB)'], ['bateriaMah', 'Bateria (mAh)']].map(([key, label]) => <TextField key={key} label={label} type="number" value={form.atributosTecnicos[key] ?? ''} onChange={value => setForm(v => { const tech = { ...v.atributosTecnicos, verificado: false }; if (value !== '') tech[key] = Number(value); else delete tech[key]; return { ...v, atributosTecnicos: tech }; })} />)}
            <ToggleField label="Conferi estas características na fonte informada" checked={Boolean(form.atributosTecnicos.verificado)} onChange={verificado => setForm(v => ({ ...v, atributosTecnicos: { ...v.atributosTecnicos, verificado } }))} />
          </div></details>
          <SelectField label="Categoria" value={form.categoria} options={categorias} onChange={categoria => setForm(v => ({ ...v, categoria }))} />
          <TextAreaField label="Descrição" rows={3} value={form.descricao} onChange={descricao => setForm(v => ({ ...v, descricao }))} />
          <div className="panel-product-image">
            {currentImage && <img src={currentImage} alt="Prévia do produto" />}
            <div><label className="block text-sm font-semibold" htmlFor="product-image">Foto do produto</label><input id="product-image" type="file" accept={IMAGE_ACCEPT} onChange={onFile} /><p className="panel-muted">900 × 900 px · WebP comprimido. Ajuste o recorte antes de salvar.</p>{imageState.source && <button className="panel-secondary-button" onClick={onAdjust}>Ajustar imagem</button>}</div>
          </div>
          <details><summary>Mais detalhes (opcional)</summary><div className="space-y-4 mt-4"><TextField label="Subtítulo / variação" value={form.sub} onChange={sub => setForm(v => ({ ...v, sub }))} /><TextAreaField label="Especificações (uma por linha)" rows={4} value={form.specsText} onChange={specsText => setForm(v => ({ ...v, specsText }))} /></div></details>
        </div>}
        {activeTab === 'precos' && <div className="space-y-4">
          <TextField label="Preço atual (R$)" type="number" value={form.preco} onChange={preco => setForm(v => ({ ...v, preco }))} />
          <TextField label="Estoque disponível" type="number" value={form.estoque} onChange={estoque => setForm(v => ({ ...v, estoque }))} />
          <ToggleField label="Disponível na loja" checked={form.ativo} onChange={ativo => setForm(v => ({ ...v, ativo }))} />
          <ToggleField label="Produto em destaque" checked={form.destaque} onChange={destaque => setForm(v => ({ ...v, destaque }))} />
          <details><summary>Preço anterior e selo (opcional)</summary><div className="space-y-4 mt-4"><TextField label="Preço original / De (R$)" type="number" value={form.precoOriginal} onChange={precoOriginal => setForm(v => ({ ...v, precoOriginal }))} /><TextField label="Selo da oferta" value={form.badge} onChange={badge => setForm(v => ({ ...v, badge }))} placeholder="OFERTA, NOVO, TOP VENDAS..." /></div></details>
        </div>}
        {activeTab === 'revisao' && <section className="panel-product-review"><h3>Confira antes de salvar</h3>{currentImage && <img src={currentImage} alt="Prévia do produto" />}<strong>{form.nome}</strong><p>{form.categoria} · {form.sub}</p><p>{form.descricao}</p><dl><div><dt>Preço</dt><dd>{formatBRL(form.preco)}</dd></div><div><dt>Estoque</dt><dd>{form.estoque} unidades</dd></div><div><dt>Visibilidade</dt><dd>{form.ativo ? 'Disponível na loja' : 'Produto inativo'}</dd></div><div><dt>Destaque</dt><dd>{form.destaque ? 'Sim' : 'Não'}</dd></div></dl><p className="panel-muted">Ao salvar, estas informações serão atualizadas na loja.</p></section>}
      </div>
      <footer><button className="panel-secondary-button" disabled={saving} onClick={current ? () => setActiveTab(tabs[current - 1].id) : onClose}>{current ? 'Voltar' : 'Cancelar'}</button>{current < 2 ? <button className="panel-primary-button" onClick={() => setActiveTab(tabs[current + 1].id)}>Continuar</button> : <button className="panel-primary-button" disabled={saving} onClick={onSave}>{saving ? 'Salvando…' : mode === 'create' ? 'Cadastrar produto' : 'Salvar alterações'}</button>}</footer>
    </div>
  </PanelDialog>;
}

function CropModal({ draft, setDraft, onClose, onApply }) {
  return (
    <PanelDialog label="Ajustar imagem" onClose={onClose} className="p-3" layer="z-[60]">
      <div className="relative bg-white rounded-lg w-full max-w-4xl overflow-hidden shadow-2xl">
        <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--line)]">
          <div>
            <div className="font-display font-bold text-[16px] text-zinc-900">Ajustar Imagem do Produto</div>
            <div className="text-[13px] text-zinc-500 mt-2">Recorte e ajuste a imagem antes de adicionar ao produto</div>
          </div>
          <button aria-label="Fechar ajuste de imagem" onClick={onClose} className="w-9 h-9 rounded-full hover:bg-zinc-100 grid place-items-center">
            <Icon.close className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="min-h-14 border border-zinc-300 rounded-lg flex flex-wrap items-center justify-between px-4 py-3 gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <Icon.plus className="w-4 h-4 rotate-45 text-zinc-600" />
              <span className="font-semibold text-[15px] text-zinc-900">Editor de Imagem</span>
              <span className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-bold">Quadrado 1:1</span>
              <span className="rounded-full bg-emerald-600 text-white px-3 py-1 text-[11px] font-bold">Alta qualidade</span>
            </div>
            <span className="hidden sm:block text-[13px] text-zinc-500">Arraste os cantos para ajustar</span>
          </div>

          <CropStage draft={draft} setDraft={setDraft} />

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-[12px] text-zinc-600">
            Arraste o recorte para posicionar e os cantos para ajustar. No teclado, use as setas para mover e + ou − nos cantos para redimensionar.
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
    </PanelDialog>
  );
}

function CropStage({ draft, setDraft }) {
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const actionRef = useRef(null);
  const [stageWidth, setStageWidth] = useState(520);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setStageWidth(Math.max(1, Math.min(520, entry.contentRect.width - 32))));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  const stageSize = { width: stageWidth, height: stageWidth * 330 / 520 };
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
    <div ref={containerRef} className="panel-crop-stage border border-zinc-300 rounded-lg bg-zinc-50 py-4 overflow-hidden">
      <div ref={stageRef} className="relative mx-auto bg-zinc-400 select-none" style={{ width: stageSize.width, height: stageSize.height, maxWidth: '100%' }}>
        <img src={draft.source} alt="" draggable="false" className="absolute object-contain" style={{ left: imgLeft, top: imgTop, width: imgWidth, height: imgHeight }} />
        <div className="absolute bg-black/45 pointer-events-none" style={{ left: imgLeft, top: imgTop, width: imgWidth, height: rect.top - imgTop }} />
        <div className="absolute bg-black/45 pointer-events-none" style={{ left: imgLeft, top: rect.top + rect.height, width: imgWidth, height: imgTop + imgHeight - (rect.top + rect.height) }} />
        <div className="absolute bg-black/45 pointer-events-none" style={{ left: imgLeft, top: rect.top, width: rect.left - imgLeft, height: rect.height }} />
        <div className="absolute bg-black/45 pointer-events-none" style={{ left: rect.left + rect.width, top: rect.top, width: imgLeft + imgWidth - (rect.left + rect.width), height: rect.height }} />
        <div tabIndex={0} role="group" aria-label="Mover recorte com as setas" onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
          event.preventDefault();
          setDraft(prev => ({ ...prev, crop: { ...prev.crop,
            x: clamp(prev.crop.x + (event.key === 'ArrowRight' ? 2 : event.key === 'ArrowLeft' ? -2 : 0), 0, 100 - prev.crop.size),
            y: clamp(prev.crop.y + (event.key === 'ArrowDown' ? 2 : event.key === 'ArrowUp' ? -2 : 0), 0, 100 - prev.crop.size * prev.naturalWidth / prev.naturalHeight),
          } }));
        }} onPointerDown={event => startPointer(event, 'move')} className="absolute border-2 border-blue-500 cursor-move" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, touchAction: 'none' }}>
          {['nw', 'ne', 'sw', 'se'].map(corner => (
            <button key={corner} type="button" aria-label={`Redimensionar canto ${corner.includes('n') ? 'superior' : 'inferior'} ${corner.includes('w') ? 'esquerdo' : 'direito'}`} onKeyDown={event => {
              if (!['+', '=', '-', '−'].includes(event.key)) return;
              event.preventDefault(); event.stopPropagation();
              setDraft(prev => ({ ...prev, crop: { ...prev.crop, size: clamp(prev.crop.size + (event.key === '-' || event.key === '−' ? -2 : 2), 10, Math.min(100 - prev.crop.x, (100 - prev.crop.y) * prev.naturalHeight / prev.naturalWidth)) } }));
            }} onPointerDown={event => { event.stopPropagation(); startPointer(event, corner); }}
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
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block font-medium text-[13px] text-zinc-800 mb-2">{label}</label>
      <input id={id} type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={fieldClass()} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block font-medium text-[13px] text-zinc-800 mb-2">{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)} className={fieldClass()}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function TextAreaField({ label, value, onChange, rows }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block font-medium text-[13px] text-zinc-800 mb-2">{label}</label>
      <textarea id={id} value={value} onChange={e => onChange(e.target.value)} rows={rows} className={`${fieldClass()} resize-none`} />
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
