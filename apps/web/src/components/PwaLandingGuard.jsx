import { Navigate, useLocation } from 'react-router-dom';
import { useInstalledApp } from '../hooks/useInstalledApp';

export default function PwaLandingGuard({ children }) {
  const installed = useInstalledApp();
  const location = useLocation();
  // replace also protects existing installations whose launch URL is still '/'.
  if (installed) return <Navigate to={`/app${location.search}${location.hash}`} replace />;
  return children;
}
