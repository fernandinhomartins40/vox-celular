import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../icons';
import { PHONE_DIGITS, PHONE_DISPLAY } from '../data';
const nav = [['Início', '#home'], ['Produtos', '#produtos'], ['Serviços', '#servicos'], ['Loja', '#contato']];
export default function Header({ cartCount, onOpenCart, search = '', onSearch = () => {} }) {
  const [open, setOpen] = useState(false);
  return <>
    <div className="store-strip"><span>Até 12x sem juros no cartão</span><span>Assistência técnica com 90 dias de garantia</span><span>Representante TIM em Palmital</span><span>Entrega local acima de R$ 200</span></div>
    <header className="store-header">
      <div className="store-header-inner">
        <button className="mobile-menu" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(v => !v)}><Icon.menu /></button>
        <a href="#home" className="store-brand" aria-label="Vox Celular — início"><strong>VOX<span>.</span></strong><small>CELULAR<br/><b>REPRESENTANTE TIM</b></small></a>
        <nav className="desktop-links" aria-label="Menu principal">{nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
        <form className="store-search" onSubmit={e => { e.preventDefault(); document.getElementById('produtos')?.scrollIntoView(); }}><Icon.search /><input aria-label="Pesquisar no catálogo" value={search} onChange={e => onSearch(e.target.value)} placeholder="O que você está procurando?" /></form>
        <a className="header-wa" href={`https://wa.me/${PHONE_DIGITS}`} target="_blank" rel="noopener noreferrer"><Icon.whatsapp />{PHONE_DISPLAY}</a>
        <Link className="header-account" to="/area-cliente/login"><Icon.user />Minha Conta</Link>
        <button className="header-cart" onClick={onOpenCart} aria-label={`Abrir carrinho (${cartCount} itens)`}><Icon.cart /><span>Carrinho</span>{cartCount > 0 && <b>{cartCount}</b>}</button>
      </div>
      {open && <nav className="mobile-dropdown" aria-label="Menu mobile">{nav.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}<Link to="/admin/login">Painel do lojista</Link></nav>}
    </header>
  </>;
}
