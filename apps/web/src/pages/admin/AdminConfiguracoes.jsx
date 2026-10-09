import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Icon } from '../../icons';

const FALLBACK = { horarioSemana: '', horarioSabado: '', heroSlide1Titulo: '', heroSlide1Sub: '', heroSlide1Preco: '', instagramUrl: '', facebookUrl: '' };

function Field({ label, name, value, onChange, textarea, hint }) {
  return (
    <div>
      <label htmlFor={name} className="block font-medium text-[12.5px] text-zinc-700 mb-1.5">{label}</label>
      {textarea ? (
        <textarea id={name} name={name} value={value ?? ''} onChange={onChange} rows={2}
          className="w-full px-3 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[13px] focus:outline-none focus:border-[var(--royal-700)] resize-none transition" />
      ) : (
        <input id={name} name={name} value={value ?? ''} onChange={onChange}
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
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/config')
      .then(data => setConfig({ ...FALLBACK, ...data }))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (e) => setConfig(v => ({ ...v, [e.target.name]: e.target.value }));

  const salvar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      setError('');
      await api.put('/config', Object.fromEntries(Object.keys(FALLBACK).map(key => [key, config[key]])));
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { titulo: 'Horários', icon: 'pin', campos: [{ label: 'Segunda a sexta', name: 'horarioSemana' }, { label: 'Sábado', name: 'horarioSabado' }] },
    { titulo: 'Banner principal', icon: 'layoutDashboard', campos: [{ label: 'Título', name: 'heroSlide1Titulo' }, { label: 'Preço', name: 'heroSlide1Preco' }, { label: 'Descrição', name: 'heroSlide1Sub', textarea: true }] },
    { titulo: 'Redes sociais', icon: 'users', campos: [{ label: 'Instagram (URL)', name: 'instagramUrl' }, { label: 'Facebook (URL)', name: 'facebookUrl' }] },
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

      {error && <p role="alert" className="text-red-600 mb-4">{error}</p>}
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
          <p className="text-[12px] text-zinc-400">As alterações serão salvas no servidor.</p>
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
