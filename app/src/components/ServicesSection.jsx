import { Icon } from '../icons';
import { SERVICES, PHONE_DIGITS } from '../data';
import SectionHeader from './SectionHeader';

export default function ServicesSection() {
  return (
    <section id="servicos" className="max-w-7xl mx-auto px-4 lg:px-8 mt-24 reveal">
      <SectionHeader eyebrow="Serviços" title="Mais que uma loja" sub="Resolvemos tudo do seu celular num só lugar — diagnóstico, conserto, ativação e suporte humano." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SERVICES.map((s, i) => {
          const I = Icon[s.icon];
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
              <a href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent('Olá! Tenho interesse em: ' + s.titulo)}`}
                target="_blank" rel="noopener"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--royal-700)] hover:text-[var(--red-500)] transition">
                Solicitar <Icon.arrowRight className="w-4 h-4" />
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
