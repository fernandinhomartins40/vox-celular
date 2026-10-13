import { useEffect, useState } from 'react';

export default function PwaUpdateNotice() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const show = () => setAvailable(true);
    window.addEventListener('vox:update-available', show);
    return () => window.removeEventListener('vox:update-available', show);
  }, []);
  if (!available) return null;
  return <aside role="status" aria-live="polite" className="fixed top-3 left-3 right-3 z-[100] mx-auto max-w-xl rounded-2xl border border-blue-200 bg-white p-4 text-slate-900 shadow-lg">
    <div className="flex items-start gap-4"><div className="flex-1"><p className="font-semibold">Uma nova versão está disponível</p><p className="mt-1 text-sm text-slate-600">Conclua o que está fazendo. Depois, feche todas as abas da Vox e abra novamente para atualizar.</p></div><button type="button" onClick={() => setAvailable(false)} className="min-h-11 rounded-lg px-3 font-semibold text-blue-700 focus-visible:outline focus-visible:outline-2" aria-label="Dispensar aviso de atualização">Entendi</button></div>
  </aside>;
}
