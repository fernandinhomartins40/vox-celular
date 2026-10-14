import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth.js';

function RequireAuth({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={role === 'LOJISTA' ? '/admin/login' : location.pathname.startsWith('/app') ? '/app/login' : '/area-cliente/login'} state={{ returnTo: location.pathname + location.search }} replace />;
  if (user.role !== role) return <Navigate to={user.role === 'LOJISTA' ? '/admin' : '/area-cliente'} replace />;
  return children;
}

export function ProtectedAdmin({ children }) {
  return <RequireAuth role="LOJISTA">{children}</RequireAuth>;
}

export function ProtectedCliente({ children }) {
  return <RequireAuth role="CLIENTE">{children}</RequireAuth>;
}
