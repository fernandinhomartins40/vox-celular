import { Icon } from '../icons';
import { PHONE_DIGITS } from '../data';

export default function EditorialBand() {
  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-8 mt-24 reveal">
      <div className="relative overflow-hidden rounded-[28px] royal-radiant-soft text-white grid lg:grid-cols-12 gap-0 items-stretch min-h-[380px]">
        <div className="lg:col-span-7 px-7 sm:px-12 lg:px-14 py-12 lg:py-16 relative z-10">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-6 h-[2px] bg-[var(--red-500)]"></span>
            <span className="font-display text-[11px] tracking-[0.28em] text-white/70">PORTABILIDADE TIM</span>
          </div>
          <h3 className="font-display font-bold text-[40px] sm:text-[52px] lg:text-[60px] leading-[0.98] tracking-tight mb-5">
            Traga seu número<br/>e ganhe desconto<br/>na loja.
          </h3>
          <p className="text-white/75 text-[15px] max-w-md mb-7 leading-relaxed">
            Faça portabilidade gratuita para a TIM e leve um cupom de R$ 50 para usar em qualquer produto. Ativação imediata na loja.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent('Olá! Quero fazer a portabilidade para TIM.')}`}
              target="_blank" rel="noopener"
              className="inline-flex items-center gap-2 px-7 h-12 bg-white text-[var(--royal-800)] rounded-full font-semibold text-[14px] tracking-wide hover:bg-zinc-100 transition">
              Quero portabilidade <Icon.arrowRight className="w-4 h-4" />
            </a>
            <span className="font-display text-[12px] tracking-[0.2em] text-white/60">SEM TAXA · ATIVAÇÃO NA HORA</span>
          </div>
        </div>
        <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-0">
          <img src="https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1100&q=85" alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-screen"/>
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#061A7A]/20 to-[#061A7A]/80 lg:bg-gradient-to-r lg:from-[#061A7A]/80 lg:via-[#061A7A]/20 lg:to-transparent"/>
        </div>
      </div>
    </section>
  );
}
