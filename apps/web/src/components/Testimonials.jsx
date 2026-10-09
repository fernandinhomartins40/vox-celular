import { Icon } from '../icons';
import { TESTIMONIALS } from '../data';
import SectionHeader from './SectionHeader';

export default function Testimonials() {
  return (
    <section className="store-testimonials max-w-7xl mx-auto px-4 lg:px-8 mt-24 reveal">
      <SectionHeader eyebrow="Avaliações reais" title="O que dizem nossos clientes" />
      <div className="grid md:grid-cols-3 gap-4">
        {TESTIMONIALS.map((t, i) => (
          <div key={i} className="bg-white border border-[var(--line)] rounded-2xl p-7 flex flex-col">
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <Icon.star key={j} className={`w-[15px] h-[15px] ${j < t.estrelas ? 'star-fill' : 'text-zinc-200'}`} />
              ))}
              <span className="ml-2 text-[11px] font-medium text-zinc-500 tracking-wider">{t.estrelas}.0 / 5</span>
            </div>
            <p className="text-[15px] text-zinc-700 leading-relaxed flex-1 mb-5">"{t.texto}"</p>
            <div className="flex items-center gap-3 pt-5 border-t border-[var(--line)]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--royal-700)] to-[var(--red-500)] grid place-items-center text-white font-display font-bold text-[15px]">
                {t.nome[0]}
              </div>
              <div>
                <div className="font-display font-bold text-[14px]">{t.nome}</div>
                <div className="text-[12px] text-zinc-500">{t.cidade}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
