import { Navigate, useLocation } from 'react-router-dom';
import { useInstalledApp } from '../hooks/useInstalledApp';
import { useAuth } from '../auth/useAuth';

export default function PwaLandingGuard({ children }) {
  const installed = useInstalledApp();
  const { user } = useAuth();
  const location = useLocation();
  // replace also protects existing installations whose launch URL is still '/'.
  if (installed) return <Navigate to={`${user ? '/app/loja' : '/app/login'}${location.search}${location.hash}`} state={user ? undefined : { returnTo: location.search || location.hash ? `/app/loja${location.search}${location.hash}` : '/app' }} replace />;
  return children;
}
