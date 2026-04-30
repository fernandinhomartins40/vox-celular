import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../icons';
import { PHONE_DIGITS, PHONE_DISPLAY } from '../data';
import PromoStrip from './PromoStrip';

export default function Header({ cartCount, onOpenCart }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const nav = [
    { label: 'Início', href: '#home' },
    { label: 'Produtos', href: '#produtos' },
    { label: 'Serviços', href: '#servicos' },
    { label: 'Loja', href: '#contato' },
  ];

  return (
    <>
      <PromoStrip />
      <header className={`sticky top-0 z-40 bg-white/95 backdrop-blur transition-all ${scrolled ? 'shadow-[0_1px_0_var(--line)]' : ''}`}>
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-[72px] flex items-center justify-between gap-4">
          <a href="#home" className="flex items-center gap-3 shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="font-display font-black text-[28px] tracking-tight leading-none text-[var(--royal-700)]">VOX</span>
              <span className="font-display font-black text-[28px] leading-none text-[var(--red-500)]">.</span>
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-display text-[10px] tracking-[0.32em] text-zinc-500">CELULAR</span>
              <span className="font-display text-[9px] tracking-[0.22em] text-[var(--red-500)] mt-0.5">REPRESENTANTE TIM</span>
            </div>
          </a>

          <nav className="hidden lg:flex items-center gap-1">
            {nav.map(n => (
              <a key={n.href} href={n.href}
                className="px-4 py-2 rounded-md text-[14px] font-medium text-zinc-700 hover:text-[var(--royal-700)] transition">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="hidden md:grid w-10 h-10 rounded-full hover:bg-zinc-100 place-items-center text-zinc-700">
              <Icon.search className="w-[18px] h-[18px]" />
            </button>
            <a href={`https://wa.me/${PHONE_DIGITS}`} target="_blank" rel="noopener"
              className="hidden lg:inline-flex items-center gap-2 px-4 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-medium text-[13px] tracking-wide transition">
              <Icon.whatsapp className="w-4 h-4" />
              {PHONE_DISPLAY}
            </a>

            {/* Botão Minha Conta */}
            <Link to="/area-cliente/login"
              className="hidden md:inline-flex items-center gap-2 px-4 h-10 border border-[var(--royal-200)] text-[var(--royal-700)] hover:bg-[var(--royal-50)] rounded-full font-medium text-[13px] tracking-wide transition">
              <Icon.user className="w-[15px] h-[15px]" />
              Minha Conta
            </Link>

            <button onClick={onOpenCart}
              className="relative inline-flex items-center gap-2 px-4 h-10 bg-[var(--royal-700)] hover:bg-[var(--royal-800)] text-white rounded-full transition">
              <Icon.cart className="w-[18px] h-[18px]" />
              <span className="hidden sm:inline font-medium text-[13px]">Carrinho</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-[var(--red-500)] text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={() => setMobileOpen(v => !v)}
              className="lg:hidden w-10 h-10 grid place-items-center rounded-full hover:bg-zinc-100">
              {mobileOpen ? <Icon.close className="w-5 h-5" /> : <Icon.menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-[var(--line)] bg-white">
            <nav className="flex flex-col p-3">
              {nav.map(n => (
                <a key={n.href} href={n.href} onClick={() => setMobileOpen(false)}
                  className="px-3 py-3 rounded-md font-medium text-zinc-800 hover:bg-zinc-50">
                  {n.label}
                </a>
              ))}
              <Link to="/area-cliente/login" onClick={() => setMobileOpen(false)}
                className="mt-1 flex items-center gap-2 px-3 py-3 rounded-md font-medium text-[var(--royal-700)] hover:bg-[var(--royal-50)]">
                <Icon.user className="w-4 h-4" /> Minha Conta
              </Link>
              <a href={`https://wa.me/${PHONE_DIGITS}`} target="_blank" rel="noopener"
                className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-full font-semibold">
                <Icon.whatsapp className="w-4 h-4" /> {PHONE_DISPLAY}
              </a>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
