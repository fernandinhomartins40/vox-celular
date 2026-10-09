import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import { Icon } from '../../icons';

const NAV = [
  { to: '/admin',               label: 'Dashboard',      icon: 'layoutDashboard', end: true },
  { to: '/admin/pedidos',       label: 'Pedidos',         icon: 'package' },
  { to: '/admin/produtos',      label: 'Produtos',        icon: 'tag' },
  { to: '/admin/clientes',      label: 'Clientes',        icon: 'users' },
  { to: '/admin/configuracoes', label: 'Configurações',   icon: 'settings' },
];

function SidebarContent({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-1">
          <span className="font-display font-black text-[24px] leading-none text-white">VOX</span>
          <span className="font-display font-black text-[24px] leading-none text-[var(--red-500)]">.</span>
        </Link>
        <div className="font-display text-[9px] tracking-[0.25em] text-white/40">ADMIN</div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white ml-3">
            <Icon.close className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon, end }) => {
          const I = Icon[icon];
          return (
            <NavLink key={to} to={to} end={end} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/8'
                }`
              }>
              <I className="w-[18px] h-[18px] shrink-0" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[var(--royal-400)]/40 grid place-items-center text-white font-display font-bold text-[14px]">
            {user?.nome?.[0] ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[13px] text-white truncate">{user?.nome}</div>
            <div className="text-[11px] text-white/45 truncate">{user?.email}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition text-[13px]">
          <Icon.logOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-zinc-100">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-[220px] shrink-0 ink-radiant flex-col fixed top-0 left-0 h-full z-30">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[220px] ink-radiant flex flex-col z-50">
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-[220px] flex flex-col min-h-screen">
        {/* Top bar mobile */}
        <header className="lg:hidden bg-white border-b border-[var(--line)] px-5 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-zinc-100">
            <Icon.menu className="w-5 h-5" />
          </button>
          <span className="font-display font-bold text-[18px] text-[var(--royal-700)]">VOX<span className="text-[var(--red-500)]">.</span> Admin</span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
