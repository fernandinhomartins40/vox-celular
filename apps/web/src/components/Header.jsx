import BrandLogo from './BrandLogo';
import { useStoreContent } from './storeContent';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../icons';

export default function Header({ cartCount, onOpenCart, search = '', onSearch = () => {} }) {
  const h = useStoreContent('header'); const c = useStoreContent('contact');
  const nav = useStoreContent('navigation').items.filter(item => item.href.startsWith('#')).map(item => [item.label, item.href]);
  const [open, setOpen] = useState(false);
  return <>
    <div className="store-strip">{h.announcements.map((text, i) => <span key={i}>{text}</span>)}</div>
    <header className="store-header">
      <div className="store-header-inner">
        <button className="mobile-menu" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(v => !v)}><Icon.menu /></button>
        <a href="#home" className="store-brand" aria-label="Vox Celular — início"><BrandLogo brand={h.brand} /><small><b>{h.tagline}</b></small></a>
        <nav className="desktop-links" aria-label="Menu principal">{nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
        <form className="store-search" onSubmit={e => { e.preventDefault(); document.getElementById('produtos')?.scrollIntoView(); }}><Icon.search /><input aria-label="Pesquisar no catálogo" value={search} onChange={e => onSearch(e.target.value)} placeholder={h.search} /></form>
        <a className="header-wa" href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener noreferrer"><Icon.whatsapp />{c.phoneDisplay}</a>
        <Link className="header-account" to="/area-cliente/login"><Icon.user />Minha Conta</Link>
        <button className="header-cart" onClick={onOpenCart} aria-label={`Abrir carrinho (${cartCount} itens)`}><Icon.cart /><span>Carrinho</span>{cartCount > 0 && <b>{cartCount}</b>}</button>
      </div>
      {open && <nav className="mobile-dropdown" aria-label="Menu mobile">{nav.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}<Link to="/admin/login">Painel do lojista</Link></nav>}
    </header>
  </>;
}
