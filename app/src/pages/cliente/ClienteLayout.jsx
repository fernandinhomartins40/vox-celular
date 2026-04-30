import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../../icons';

const NAV = [
  { to: '/area-cliente',             label: 'Início',      icon: 'home',    end: true },
  { to: '/area-cliente/pedidos',     label: 'Pedidos',     icon: 'package' },
  { to: '/area-cliente/fidelidade',  label: 'Fidelidade',  icon: 'award' },
  { to: '/area-cliente/promocoes',   label: 'Promoções',   icon: 'tag' },
];

export default function ClienteLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/area-cliente/login');
  };

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Top nav */}
      <header className="bg-white border-b border-[var(--line)] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-5 h-[64px] flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-baseline gap-1 shrink-0">
            <span className="font-display font-black text-[22px] leading-none text-[var(--royal-700)]">VOX</span>
            <span className="font-display font-black text-[22px] leading-none text-[var(--red-500)]">.</span>
            <span className="font-display text-[9px] tracking-[0.28em] text-zinc-400 ml-1 hidden sm:block">CELULAR</span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon, end }) => {
              const I = Icon[icon];
              return (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition ${
                      isActive
                        ? 'bg-[var(--royal-50)] text-[var(--royal-700)]'
                        : 'text-zinc-600 hover:text-[var(--royal-700)] hover:bg-[var(--royal-50)]'
                    }`
                  }>
                  <I className="w-[15px] h-[15px]" /> {label}
                </NavLink>
              );
            })}
          </nav>

          {/* User actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-[13px] text-zinc-600">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--royal-700)] to-[var(--royal-500)] grid place-items-center text-white font-display font-bold text-[13px]">
                {user?.nome?.[0]}
              </div>
              <span className="font-medium">{user?.nome?.split(' ')[0]}</span>
            </div>
            <button onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full border border-[var(--line)] text-[12px] text-zinc-500 hover:text-[var(--red-500)] hover:border-red-200 transition">
              <Icon.logOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
            {/* Mobile menu */}
            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden w-9 h-9 grid place-items-center rounded-full hover:bg-zinc-100">
              {menuOpen ? <Icon.close className="w-5 h-5" /> : <Icon.menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-[var(--line)] bg-white px-4 py-3 space-y-1">
            {NAV.map(({ to, label, icon, end }) => {
              const I = Icon[icon];
              return (
                <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium ${
                      isActive ? 'bg-[var(--royal-50)] text-[var(--royal-700)]' : 'text-zinc-700 hover:bg-zinc-50'
                    }`
                  }>
                  <I className="w-4 h-4" /> {label}
                </NavLink>
              );
            })}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
