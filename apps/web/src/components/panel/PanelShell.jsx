import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import { Icon } from '../../icons';
import './panel.css';

export default function PanelShell({ title, groups, loginPath }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const mobileItems = groups.flatMap(group => group.items).slice(0, 4);
  const [open, setOpen] = useState(false);
  const menuButton = useRef(null);
  const drawer = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const trigger = menuButton.current;
    document.body.style.overflow = 'hidden';
    drawer.current?.querySelector('button')?.focus();
    const onKey = event => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab') return;
      const elements = [...drawer.current.querySelectorAll('a, button')];
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey); trigger?.focus(); };
  }, [open]);
  const navigation = mobile => <>
    <div className="panel-brand"><Link to="/" aria-label="VOX Celular — loja">VOX<span>.</span></Link><span>{title}</span>
      {mobile && <button aria-label="Fechar menu" onClick={() => setOpen(false)}><Icon.close /></button>}
    </div>
    <nav aria-label={`Navegação — ${title}`} className="panel-navigation">
      {groups.map(group => <div key={group.label} className="panel-nav-group"><p>{group.label}</p>
        {group.items.map(({ to, label, icon, end, aliases = [] }) => { const I = Icon[icon]; const aliasActive = aliases.includes(pathname); return <NavLink key={to} to={to} end={end} aria-current={aliasActive ? 'page' : undefined} onClick={() => setOpen(false)} className={({ isActive }) => isActive || aliasActive ? 'panel-nav-link is-active' : 'panel-nav-link'}><I /><span>{label}</span></NavLink>; })}
      </div>)}
    </nav>
    <div className="panel-sidebar-footer">
      <Link to="/" className="panel-nav-link"><Icon.arrowRight /><span>Ir para a loja</span></Link>
      <div className="panel-user"><span className="panel-avatar">{user?.nome?.[0] ?? 'V'}</span><div><strong>{user?.nome}</strong><span>{user?.email}</span></div></div>
      <button className="panel-nav-link" onClick={() => { logout(); navigate(loginPath); }}><Icon.logOut /><span>Sair da conta</span></button>
    </div>
  </>;
  return <div className={`vox-panel ${pathname === '/admin/configuracoes' ? 'panel-editor-layout' : ''}`}>
    <a className="panel-skip" href="#panel-content">Ir para o conteúdo</a>
    <aside className="panel-sidebar" inert={open ? true : undefined}>{navigation(false)}</aside>
    {open && <div className="panel-menu-overlay"><div className="panel-backdrop" onClick={() => setOpen(false)} /><aside role="dialog" aria-modal="true" aria-label="Menu de navegação" className="panel-drawer" ref={drawer}>{navigation(true)}</aside></div>}
    <div className="panel-workspace" inert={open ? true : undefined}>
      <header className="panel-topbar"><button ref={menuButton} className="panel-menu-button" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}><Icon.menu /></button><strong>{title}</strong><Link to="/" className="panel-store-link">Ver loja <Icon.arrowUpRight /></Link></header>
      <main id="panel-content" tabIndex={-1} className="panel-content"><Outlet /></main>
      <nav className="panel-mobile-nav" aria-label="Atalhos do painel">{mobileItems.map(({ to, label, icon, end, aliases = [] }) => {
        const I = Icon[icon]; const aliasActive = aliases.includes(pathname);
        return <NavLink key={to} to={to} end={end} aria-current={aliasActive ? 'page' : undefined} className={({ isActive }) => isActive || aliasActive ? 'is-active' : ''}><I /><span>{label === 'Visão geral' ? 'Início' : label === 'Meus benefícios' ? 'Benefícios' : label === 'Meus pedidos' ? 'Pedidos' : label === 'Minha conta' ? 'Conta' : label}</span></NavLink>;
      })}</nav>
    </div>
  </div>;
}
export function PanelPageHeader({ title, description, children }) {
  return <div className="panel-page-header"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</div>;
}
export function PanelQuickActions({ items }) {
  return <nav className="panel-quick-actions" aria-label="Ações rápidas">{items.map(({ to, label, description, icon }) => { const I = Icon[icon]; return <Link key={to} to={to}><span className="panel-action-icon"><I /></span><span><strong>{label}</strong><small>{description}</small></span><Icon.arrowRight /></Link>; })}</nav>;
}
