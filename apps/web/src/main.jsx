import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { router } from './router';
import './index.css';
import PwaUpdateNotice from './components/PwaUpdateNotice';

// Waiting updates activate after existing tabs close, protecting active checkout.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => {
      const announce = () => window.dispatchEvent(new Event('vox:update-available'));
      if (registration.waiting && navigator.serviceWorker.controller) announce();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) announce();
        });
      });
    }).catch(() => {});
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
      <PwaUpdateNotice />
      <Suspense fallback={<div role="status" aria-live="polite" className="min-h-screen bg-slate-50 text-slate-900 grid place-items-center p-6"><p>Carregando a página…</p></div>}>
        <RouterProvider router={router} />
      </Suspense>
    </AuthProvider>
  </StrictMode>,
);
