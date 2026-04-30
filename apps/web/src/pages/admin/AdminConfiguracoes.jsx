import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Icon } from '../../icons';

const FALLBACK = {
  nomeLoja: 'Vox Celular',
  slogan: 'Representante TIM em Palmital-PR',
  telefone: '(42) 99103-1420',
  whatsapp: '5542991031420',
  endereco: 'Av. Maximiliano Vicentin, 710, Palmital–PR',
  horarioSemana: 'Seg–Sex 8h–19h',
  horarioSabado: 'Sáb 8h–13h',
  heroTitulo1: 'Plano TIM Controle',
  heroTitulo2: 'com 20 GB + apps',
  heroSub: 'Portabilidade grátis, ativação na hora. Leve um chip novo de bônus.',
  instagram: '',
  facebook: '',
  freteMinimoGratis: '200',
  parcelasMaxSemJuros: '12',
};

function Field({ label, name, value, onChange, textarea, hint }) {
  return (
    <div>
      <label className="block font-medium text-[12.5px] text-zinc-700 mb-1.5">{label}</label>
      {textarea ? (
        <textarea name={name} value={value ?? ''} onChange={onChange} rows={2}
          className="w-full px-3 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[13px] focus:outline-none focus:border-[var(--royal-700)] resize-none transition" />
      ) : (
        <input name={name} value={value ?? ''} onChange={onChange}
          className="w-full px-3 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[13px] focus:outline-none focus:border-[var(--royal-700)] transition" />
      )}
      {hint && <p className="text-[11px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function AdminConfiguracoes() {
  const [config, setConfig] = useState(FALLBACK);
  const [salvo, setSalvo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/config')
      .then(data => setConfig({ ...FALLBACK, ...data }))
      .catch(() => { /* use fallback */ })
      .finally(() => setLoading(false));
  }, []);

  const onChange = (e) => setConfig(v => ({ ...v, [e.target.name]: e.target.value }));

  const salvar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/config', config);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      titulo: 'Identidade da loja',
      icon: 'tag',
      campos: [
        { label: 'Nome da loja', name: 'nomeLoja' },
        { label: 'Slogan / subtítulo', name: 'slogan' },
      ],
    },
    {
      titulo: 'Contato e localização',
      icon: 'pin',
      campos: [
        { label: 'Telefone exibido', name: 'telefone' },
        { label: 'Número WhatsApp (com DDI, sem +)', name: 'whatsapp', hint: 'Ex: 5542991031420' },
        { label: 'Endereço completo', name: 'endereco' },
        { label: 'Horário seg–sex', name: 'horarioSemana' },
        { label: 'Horário sábado', name: 'horarioSabado' },
      ],
    },
    {
      titulo: 'Banner principal (Hero)',
      icon: 'layoutDashboard',
      campos: [
        { label: 'Título linha 1', name: 'heroTitulo1' },
        { label: 'Título linha 2', name: 'heroTitulo2' },
        { label: 'Subtítulo / descrição', name: 'heroSub', textarea: true },
      ],
    },
    {
      titulo: 'Redes sociais',
      icon: 'users',
      campos: [
        { label: 'Instagram (URL)', name: 'instagram', hint: 'Ex: https://instagram.com/voxcelular' },
        { label: 'Facebook (URL)', name: 'facebook' },
      ],
    },
    {
      titulo: 'Condições comerciais',
      icon: 'card',
      campos: [
        { label: 'Valor mínimo frete grátis (R$)', name: 'freteMinimoGratis' },
        { label: 'Parcelas máximas sem juros', name: 'parcelasMaxSemJuros' },
      ],
    },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[var(--royal-700)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-[2px] bg-[var(--red-500)]"></span>
          <span className="font-display text-[var(--red-500)] font-semibold text-[11px] tracking-[0.28em]">PERSONALIZAÇÃO</span>
        </div>
        <h1 className="font-display font-bold text-[32px] text-[var(--ink)]">Configurações da loja</h1>
        <p className="text-zinc-500 text-[14px] mt-1">Personalize os textos e informações exibidos na landing page pública.</p>
      </div>

      <form onSubmit={salvar} className="space-y-5 max-w-2xl">
        {sections.map((s, si) => {
          const I = Icon[s.icon] ?? Icon.settings;
          return (
            <div key={si} className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--line)] bg-[var(--paper)]">
                <div className="w-8 h-8 rounded-lg bg-[var(--royal-50)] text-[var(--royal-700)] grid place-items-center">
                  <I className="w-4 h-4" />
                </div>
                <span className="font-display font-bold text-[16px]">{s.titulo}</span>
              </div>
              <div className="p-6 grid gap-4 sm:grid-cols-2">
                {s.campos.map((c, ci) => (
                  <div key={ci} className={c.textarea ? 'sm:col-span-2' : ''}>
                    <Field {...c} value={config[c.name]} onChange={onChange} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-2">
          <p className="text-[12px] text-zinc-400">As alterações serão salvas no servidor e aplicadas imediatamente.</p>
          <button type="submit" disabled={saving}
            className={`inline-flex items-center gap-2 px-7 h-11 rounded-xl font-semibold text-[14px] transition ${
              salvo ? 'bg-emerald-600 text-white' : 'bg-[var(--royal-700)] hover:bg-[var(--royal-800)] disabled:opacity-60 text-white'
            }`}>
            {salvo ? <><Icon.check className="w-4 h-4" /> Salvo!</> : saving ? 'Salvando…' : <><Icon.arrowRight className="w-4 h-4" /> Salvar configurações</>}
          </button>
        </div>
      </form>
    </div>
  );
}
