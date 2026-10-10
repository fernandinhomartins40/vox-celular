import { Icon } from '../icons';
import { useStoreContent } from './storeContent';

export default function FloatingWA() {
 const c = useStoreContent('contact');
  return (
    <a href={`https://wa.me/${c.phone}?text=${encodeURIComponent('Olá! Vim pelo site da Vox Celular.')}`}
      target="_blank" rel="noopener"
      className="fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white grid place-items-center shadow-lg pulse-ring transition">
      <Icon.whatsapp className="w-7 h-7" />
      <span className="sr-only">WhatsApp</span>
    </a>
  );
}
