import { Icon } from '../icons';
import { PHONE_DIGITS } from '../data';

export default function FloatingWA() {
  return (
    <a href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent('Olá! Vim pelo site da Vox Celular.')}`}
      target="_blank" rel="noopener"
      className="fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white grid place-items-center shadow-lg pulse-ring transition">
      <Icon.whatsapp className="w-7 h-7" />
      <span className="sr-only">WhatsApp</span>
    </a>
  );
}
