import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { router } from './router';
import './index.css';

// Waiting updates activate after existing tabs close, protecting active checkout.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
  });
}

// Bootstrap: fetch lojaId from API and cache it for auth/register flows
const storedLojaId = localStorage.getItem('vox_loja_id');
const envLojaId = import.meta.env.VITE_LOJA_ID;
if (!storedLojaId && !envLojaId) {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  fetch(`${base}/loja`)
    .then(r => r.json())
    .then(loja => { if (loja?.id) localStorage.setItem('vox_loja_id', loja.id); })
    .catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
