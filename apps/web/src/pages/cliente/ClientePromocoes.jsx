import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth.js';
import { api } from '../../lib/api.js';
import { Icon } from '../../icons';
import { formatBRL } from '../../utils';
import { PHONE_DIGITS } from '../../data';

function diasRestantes(validade) {
  const hoje = new Date();
  const fim = new Date(validade);
  return Math.max(0, Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24)));
}

export default function ClientePromocoes() {
  const { user } = useAuth();
  const [promocoes, setPromocoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lojaId = user?.lojaId ?? localStorage.getItem('vox_loja_id') ?? '';
    const path = lojaId ? `/promocoes?lojaId=${lojaId}` : '/promocoes';
    api.get(path)
      .then(data => setPromocoes(Array.isArray(data) ? data : (data.promocoes ?? [])))
      .catch(() => setPromocoes([]))
      .finally(() => setLoading(false));
  }, [user]);

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
          <span className="font-display text-[var(--red-500)] font-semibold text-[11px] tracking-[0.28em]">SÓ PARA VOCÊ</span>
        </div>
        <h1 className="font-display font-bold text-[32px] text-[var(--ink)]">Promoções exclusivas</h1>
        <p className="text-zinc-500 text-[14px] mt-1">Ofertas personalizadas baseadas no seu histórico de compras.</p>
      </div>

      {/* Banner de urgência */}
      <div className="bg-[var(--royal-900)] text-white rounded-2xl px-6 py-4 mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--red-500)] grid place-items-center shrink-0">
            <Icon.bell className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="font-display font-bold text-[14px]">Ofertas por tempo limitado!</div>
            <div className="text-[12px] text-white/60">Aproveite antes que acabem. Exclusivo para clientes cadastrados.</div>
          </div>
        </div>
        <div className="text-[12px] text-white/50 shrink-0">Abril 2026</div>
      </div>

      {/* Estado vazio */}
      {promocoes.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[var(--line)] rounded-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-zinc-100 grid place-items-center mb-4">
            <Icon.tag className="w-7 h-7 text-zinc-400" />
          </div>
          <div className="font-display font-bold text-[18px] text-zinc-700">Nenhuma promoção no momento</div>
          <p className="text-[13px] text-zinc-500 mt-1">Fique de olho — novas ofertas aparecem aqui.</p>
        </div>
      ) : (
        /* Grid de promoções */
        <div className="grid md:grid-cols-3 gap-5">
          {promocoes.map((promo, i) => {
            const dias = promo.validade ? diasRestantes(promo.validade) : null;
            const discount = promo.precoOriginal ? Math.round((1 - promo.preco / promo.precoOriginal) * 100) : 0;
            return (
              <div key={i} className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden flex flex-col hover:border-[var(--royal-700)] hover:shadow-[0_12px_30px_-15px_rgba(8,37,163,0.3)] transition group">
                {promo.img && (
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--paper)]">
                    <img src={promo.img} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--royal-700)] text-white rounded-full text-[10px] font-display font-bold tracking-wider">
                        <Icon.tag className="w-2.5 h-2.5" /> EXCLUSIVO
                      </span>
                      {discount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 bg-[var(--red-500)] text-white rounded-full text-[10px] font-bold">
                          -{discount}%
                        </span>
                      )}
                    </div>
                    {dias !== null && dias <= 3 && (
                      <div className="absolute bottom-3 left-3 right-3 bg-[var(--red-500)]/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
                        <Icon.clock className="w-3.5 h-3.5" />
                        {dias === 0 ? 'Último dia!' : `Termina em ${dias} ${dias === 1 ? 'dia' : 'dias'}`}
                      </div>
                    )}
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-display font-bold text-[18px] leading-tight mb-1">{promo.titulo}</h3>
                  <p className="text-[13px] text-zinc-600 leading-relaxed mb-4 flex-1">{promo.desc ?? promo.descricao}</p>
                  {promo.preco && (
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        {promo.precoOriginal && <div className="price-old text-[13px]">{formatBRL(promo.precoOriginal)}</div>}
                        <div className="font-display font-bold text-[30px] leading-none text-[var(--ink)]">{formatBRL(promo.preco)}</div>
                      </div>
                      {promo.validade && (
                        <div className="text-right">
                          <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Válido até</div>
                          <div className="text-[12px] font-medium text-zinc-600">{promo.validade.split('-').reverse().join('/')}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <a href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(`Olá! Vi a promoção exclusiva "${promo.titulo}" e gostaria de aproveitar!`)}`}
                    target="_blank" rel="noopener"
                    className="w-full inline-flex items-center justify-center gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold text-[13px] transition">
                    <Icon.whatsapp className="w-4 h-4" /> Quero essa oferta
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA bottom */}
      <div className="mt-8 bg-white border border-[var(--line)] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="font-display font-bold text-[18px]">Quer uma oferta personalizada?</div>
          <p className="text-[13px] text-zinc-500 mt-0.5">Fale com nosso time e informe o produto que você procura.</p>
        </div>
        <a href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent('Olá! Sou cliente cadastrado e gostaria de uma oferta personalizada.')}`}
          target="_blank" rel="noopener"
          className="shrink-0 inline-flex items-center gap-2 px-6 h-11 bg-[var(--royal-700)] hover:bg-[var(--royal-800)] text-white rounded-full font-semibold text-[13px] transition">
          <Icon.whatsapp className="w-4 h-4" /> Falar com consultor
        </a>
      </div>
    </div>
  );
}
