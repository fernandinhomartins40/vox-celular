import { useStoreContent } from './storeContent';
import { useState } from 'react';
import { Icon } from '../icons';
import SectionHeader from './SectionHeader';

export default function ContactSection({ config }) {
 const c = useStoreContent('contact');
  const [form, setForm] = useState({ nome: '', telefone: '', mensagem: '' });
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const text = `Olá Vox Celular!\n\nNome: ${form.nome}\nTelefone: ${form.telefone}\n\nMensagem: ${form.mensagem}`;
    window.open(`https://wa.me/${c.phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <section id="contato" className="max-w-7xl mx-auto px-4 lg:px-8 mt-24 reveal">
      <SectionHeader eyebrow="Visite a loja" title={c.title} sub={c.subtitle} />

      <div className="contact-grid">
        <div className="contact-map rounded-2xl overflow-hidden border border-[var(--line)] bg-white">
          <iframe
            src={c.mapsEmbed}
            className="w-full h-[460px] border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Localização Vox Celular"
          />
          <a className="map-directions" href={c.mapsUrl} target="_blank" rel="noopener noreferrer"><Icon.pin className="w-4 h-4" /> Como chegar à Vox Celular</a>
        </div>

          <div className="contact-card royal-radiant text-white relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[var(--royal-400)]/30 blur-3xl"/>
            <div className="relative">
              <div className="font-display text-[11px] tracking-[0.28em] uppercase text-white/65 mb-4">Vox Celular</div>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center shrink-0">
                    <Icon.pin className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-[14px]">Endereço</div>
                    <a href={c.mapsUrl} target="_blank" rel="noopener" className="text-[14px] text-white/85 hover:underline">
                      {c.address}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center shrink-0">
                    <Icon.whatsapp className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-[14px]">WhatsApp</div>
                    <a href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener" className="text-[14px] text-white/85 hover:underline">
                      {c.phoneDisplay}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center shrink-0">
                    <Icon.clock className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-[14px]">Horário</div>
                    <div className="text-[14px] text-white/85">{config?.horarioSemana || 'Seg–Sex 8h–19h'} · {config?.horarioSabado || 'Sáb 8h–13h'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="contact-form bg-white border border-[var(--line)] space-y-3">
            <div className="font-display font-bold text-[18px]">{c.formTitle}</div>
            <div className="text-[12px] text-zinc-500 mb-2">{c.formSubtitle}</div>
            <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
              aria-label="Seu nome" placeholder="Seu nome" className="w-full px-4 py-3 bg-[var(--paper)] border border-[var(--line)] rounded-lg focus:outline-none focus:border-[var(--royal-700)] text-[14px]" />
            <input required value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })}
              type="tel" aria-label="Telefone" placeholder="Telefone (DDD + número)" className="w-full px-4 py-3 bg-[var(--paper)] border border-[var(--line)] rounded-lg focus:outline-none focus:border-[var(--royal-700)] text-[14px]" />
            <textarea required value={form.mensagem} onChange={e => setForm({ ...form, mensagem: e.target.value })}
              aria-label="Mensagem" placeholder="Como podemos ajudar?" rows={3}
              className="w-full px-4 py-3 bg-[var(--paper)] border border-[var(--line)] rounded-lg focus:outline-none focus:border-[var(--royal-700)] text-[14px] resize-none" />
            <button type="submit"
              className={`w-full inline-flex items-center justify-center gap-2 px-4 h-12 rounded-full font-semibold text-[14px] tracking-wide transition ${
                sent ? 'bg-emerald-600 text-white' : 'bg-[var(--red-500)] hover:bg-[var(--red-600)] text-white'
              }`}>
              {sent ? <><Icon.check className="w-4 h-4" /> Continue no WhatsApp</> : <><Icon.send className="w-4 h-4" /> {c.button}</>}
            </button>
          </form>
      </div>
    </section>
  );
}
