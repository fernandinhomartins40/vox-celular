import { useState, useEffect } from 'react';
import { Icon } from '../icons';
import { HERO_SLIDES } from '../data';

export default function Hero({ config }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % HERO_SLIDES.length), 5500);
    return () => clearInterval(t);
  }, [paused]);

  const original = HERO_SLIDES[idx];
  const s = idx === 0 && config ? { ...original,
    title: config.heroSlide1Titulo ? [config.heroSlide1Titulo] : original.title,
    sub: config.heroSlide1Sub || original.sub,
    priceMain: config.heroSlide1Preco || original.priceMain,
  } : original;

  return (
    <section id="home" className="relative">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-5">
        <div
          className="relative overflow-hidden rounded-[28px] royal-radiant text-white"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Starlight texture */}
          <div className="absolute inset-0 opacity-[0.18]" style={{
            background: 'radial-gradient(2px 2px at 10% 20%, white, transparent), radial-gradient(1.5px 1.5px at 80% 30%, white, transparent), radial-gradient(1.5px 1.5px at 50% 80%, white, transparent), radial-gradient(1px 1px at 30% 60%, white, transparent), radial-gradient(1.5px 1.5px at 90% 70%, white, transparent)',
            backgroundSize: '600px 600px'
          }}/>

          <div className="relative grid lg:grid-cols-12 gap-8 items-center px-6 sm:px-10 lg:px-14 pt-12 pb-16 lg:py-20 min-h-[520px]">
            {/* LEFT — copy */}
            <div className="lg:col-span-6 relative z-10">
              <div key={idx + '-text'} className="hero-fade" style={{ animation: 'fadeUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both' }}>
                <div className="inline-flex items-center gap-2 px-3 py-1 chip-glass rounded-full font-display text-[11px] tracking-[0.22em] mb-7">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                  {s.eyebrow}
                </div>
                <h1 className="font-display font-bold text-[44px] sm:text-[58px] lg:text-[72px] leading-[1.0] tracking-tight mb-5">
                  {s.title.map((line, i) => <div key={i}>{line}</div>)}
                </h1>
                <p className="text-[15px] sm:text-[16px] text-white/75 max-w-md mb-8 leading-relaxed">
                  {s.sub}
                </p>

                {/* Price block */}
                <div className="flex items-end gap-4 mb-9">
                  <div className="flex flex-col">
                    <span className="font-display text-[11px] tracking-[0.25em] text-white/55 mb-1">{s.priceLabel}</span>
                    <div className="flex items-baseline gap-2">
                      {s.pricePrefix && (
                        <span className="font-display font-bold text-2xl sm:text-3xl text-white/85">{s.pricePrefix}</span>
                      )}
                      <span className="font-display font-black text-[64px] sm:text-[88px] leading-[0.85] tracking-tight relative">
                        {s.priceMain}
                        <span className="absolute left-0 right-0 -bottom-2 h-[6px] bg-[var(--red-500)] rounded-full"></span>
                      </span>
                      <span className="font-display font-semibold text-xl sm:text-2xl text-white/85 mb-2">{s.priceSuffix}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a href={s.ctaHref} target={s.ctaHref.startsWith('http') ? '_blank' : undefined} rel="noopener"
                    className="inline-flex items-center gap-2 px-7 h-12 bg-white text-[var(--royal-800)] rounded-full font-semibold text-[14px] tracking-wide hover:bg-zinc-100 transition shadow-lg shadow-black/10">
                    {s.cta}
                    <Icon.arrowRight className="w-4 h-4" />
                  </a>
                  <a href="#produtos"
                    className="inline-flex items-center gap-2 px-6 h-12 chip-glass hover:bg-white/15 text-white rounded-full font-medium text-[14px] tracking-wide transition">
                    Ver catálogo
                  </a>
                </div>
              </div>
            </div>

            {/* RIGHT — product photography */}
            <div className="lg:col-span-6 relative">
              <div className="relative h-[320px] sm:h-[420px] lg:h-[480px] halo">
                <div key={idx + '-img'} className="absolute inset-0 hero-fade flex items-center justify-center"
                  style={{ animation: 'fadeUp 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both' }}>
                  <img src={s.img} alt=""
                    className="relative z-10 max-h-full w-auto object-contain"
                    style={{ filter: 'drop-shadow(0 30px 50px rgba(0,0,0,0.4))' }} />
                </div>

                {/* Floating offer chip */}
                <div className="absolute z-20 top-3 right-3 sm:top-6 sm:right-0 chip-glass rounded-2xl p-4 w-[180px]">
                  <div className="font-display text-[10px] tracking-[0.22em] text-white/60 mb-1">VOX EXCLUSIVO</div>
                  <div className="font-display font-bold text-white text-[15px] leading-tight">Frete grátis em Palmital</div>
                  <div className="text-[12px] text-white/70 mt-1">Acima de R$ 200</div>
                </div>
              </div>
            </div>
          </div>

          {/* Indicators */}
          <div className="absolute bottom-6 left-6 sm:left-14 right-6 sm:right-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {HERO_SLIDES.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)}
                  className={`h-1 rounded-full transition-all ${i === idx ? 'w-12 bg-white' : 'w-6 bg-white/25 hover:bg-white/40'}`}
                  aria-label={`Slide ${i+1}`}/>
              ))}
            </div>
            <div className="font-display text-[11px] tracking-[0.3em] text-white/55">
              {String(idx+1).padStart(2,'0')} <span className="text-white/30">/</span> {String(HERO_SLIDES.length).padStart(2,'0')}
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-7">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 py-1">
          {[
            { i: 'truck', t: 'Entrega em Palmital', s: 'Acima de R$ 200' },
            { i: 'card', t: '12x sem juros', s: 'No cartão' },
            { i: 'shield', t: 'Garantia oficial', s: 'Em todos os produtos' },
            { i: 'whatsapp', t: 'Atendimento humano', s: 'Seg–Sáb · 8h–19h' },
          ].map((x, i) => {
            const I = Icon[x.i];
            return (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-9 h-9 rounded-full bg-[var(--royal-50)] text-[var(--royal-700)] grid place-items-center shrink-0">
                  <I className="w-4 h-4" />
                </div>
                <div className="leading-tight">
                  <div className="font-medium text-[13px] text-[var(--ink)]">{x.t}</div>
                  <div className="text-[11.5px] text-zinc-500">{x.s}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
