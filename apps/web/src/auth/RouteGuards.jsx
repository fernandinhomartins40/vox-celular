import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth.js';

function RequireAuth({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={role === 'LOJISTA' ? '/admin/login' : '/area-cliente/login'} replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export function ProtectedAdmin({ children }) {
  return <RequireAuth role="LOJISTA">{children}</RequireAuth>;
}

export function ProtectedCliente({ children }) {
  return <RequireAuth role="CLIENTE">{children}</RequireAuth>;
}
