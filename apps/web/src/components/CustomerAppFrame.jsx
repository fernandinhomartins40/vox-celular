import { Link, Outlet, useLocation } from 'react-router-dom';
import { useInstalledApp } from '../hooks/useInstalledApp';
import { Icon } from '../icons';
import '../customer-app.css';

const tabs = [
  ['/app', 'Início', 'home'], ['/app/loja', 'Loja', 'package'],
  ['/assistente', 'Assistente', 'search'], ['/ajuda', 'Ajuda', 'headphones'],
  ['/area-cliente', 'Conta', 'user'],
];
export default function CustomerAppFrame() {
  const { pathname } = useLocation();
  const installed = useInstalledApp();
  const active = (installed || pathname.startsWith('/app')) && !pathname.startsWith('/admin');
  if (!active) return <Outlet />;
  const login = pathname === '/app/login' || pathname === '/area-cliente/login';
  return <div className={`customer-app-frame${login ? ' customer-app-login' : ''}`}>
    <div className="customer-app-content"><Outlet /></div>
    {!login && <nav className="customer-app-tabs" aria-label="Navegação do aplicativo">{tabs.map(([to, label, icon]) => {
      const I = Icon[icon];
      const selected = to === '/app' ? pathname === '/app' || pathname === '/novidades' : pathname.startsWith(to);
      return <Link key={to} to={to} aria-current={selected ? 'page' : undefined}><I aria-hidden="true" /><span>{label}</span></Link>;
    })}</nav>}
  </div>;
}
