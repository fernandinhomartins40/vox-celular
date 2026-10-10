import { useStoreContent } from './storeContent';
import { Icon } from '../icons';

import SectionHeader from './SectionHeader';

export default function ServicesSection() {
 const content = useStoreContent('services'); const contact = useStoreContent('contact');
  return (
    <section id="servicos" className="max-w-7xl mx-auto px-4 lg:px-8 mt-24 reveal">
      <SectionHeader eyebrow="Serviços" title={content.title} sub={content.subtitle} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {content.items.map((s, i) => {
          const I = Icon[s.icon] || Icon.headphones;
          return (
            <div key={i} className="group relative bg-white border border-[var(--line)] rounded-2xl p-6 hover:border-[var(--royal-700)] hover:shadow-[0_18px_40px_-22px_rgba(8,37,163,0.35)] hover:-translate-y-0.5 transition">
              <div className="flex items-start justify-between mb-7">
                <div className="w-11 h-11 rounded-xl bg-[var(--royal-700)] text-white grid place-items-center group-hover:bg-[var(--red-500)] transition">
                  <I className="w-5 h-5" />
                </div>
                <span className="font-medium text-[10.5px] tracking-[0.2em] uppercase text-[var(--royal-700)] bg-[var(--royal-50)] px-2 py-1 rounded">
                  {s.tag}
                </span>
              </div>
              <h3 className="font-display font-bold text-[20px] mb-2 leading-tight">{s.titulo}</h3>
              <p className="text-[13.5px] text-zinc-600 leading-relaxed mb-5">{s.desc}</p>
              <a href={`https://wa.me/${contact.phone}?text=${encodeURIComponent('Olá! Tenho interesse em: ' + s.titulo)}`}
                target="_blank" rel="noopener"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--royal-700)] hover:text-[var(--red-500)] transition">
                {content.button} <Icon.arrowRight className="w-4 h-4" />
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
