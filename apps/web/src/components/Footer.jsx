import BrandLogo from './BrandLogo';
import { useStoreContent } from './storeContent';
import { Link } from 'react-router-dom';
import { Icon } from '../icons';

const safeUrl = value => /^https?:\/\//i.test(value ?? '') ? value : '#contato';

export default function Footer({ config }) {
 const f = useStoreContent('footer'); const c = useStoreContent('contact'); const header = useStoreContent('header');
  return (
    <footer className="mt-24 ink-radiant text-zinc-300">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-14 grid md:grid-cols-12 gap-8">
        <div className="md:col-span-5">
          <div className="mb-3"><BrandLogo brand={header.brand} inverse /></div>
          <div className="font-display text-[10px] tracking-[0.32em] text-zinc-500 mb-5">{f.tagline}</div>
          <p className="text-[14px] text-zinc-400 max-w-md leading-relaxed mb-6">
            {f.description}
          </p>
          <div className="flex items-center gap-2">
            <a href={safeUrl(config?.instagramUrl)} aria-label="Instagram" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center transition">
              <Icon.instagram className="w-4 h-4" />
            </a>
            <a href={safeUrl(config?.facebookUrl)} aria-label="Facebook" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center transition">
              <Icon.facebook className="w-4 h-4" />
            </a>
            <a href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener"
              className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white grid place-items-center transition">
              <Icon.whatsapp className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="font-display font-bold text-white mb-4 tracking-wide text-[13px] uppercase">Loja</div>
          <ul className="space-y-2.5 text-[14px]">
            <li><Link to="/instalar" className="hover:text-white transition">Instalar Vox no celular</Link></li>
            <li><a href="#produtos" className="hover:text-white transition">Produtos</a></li>
            <li><a href="#servicos" className="hover:text-white transition">Serviços</a></li>
            <li><a href="#contato" className="hover:text-white transition">Contato</a></li>
            <li><Link to="/admin/login" className="inline-flex items-center gap-2 text-white hover:underline"><Icon.lock className="w-4 h-4" /> Painel do lojista</Link></li>
            <li><a href={c.mapsUrl} target="_blank" rel="noopener" className="hover:text-white transition">Como chegar</a></li>
            <li>
              <Link to="/area-cliente/login"
                className="inline-flex items-center gap-1.5 hover:text-white transition text-zinc-400">
                <Icon.user className="w-3.5 h-3.5" /> Área do Cliente
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <div className="font-display font-bold text-white mb-4 tracking-wide text-[13px] uppercase">Contato</div>
          <ul className="space-y-3 text-[14px]">
            <li className="flex items-start gap-2.5"><Icon.pin className="w-4 h-4 mt-0.5 shrink-0 text-[var(--red-500)]" /> <span>{c.address}</span></li>
            <li className="flex items-start gap-2.5"><Icon.whatsapp className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" /> <span>{c.phoneDisplay}</span></li>
            <li className="flex items-start gap-2.5"><Icon.clock className="w-4 h-4 mt-0.5 shrink-0 text-[var(--royal-400)]" /> <span>{config?.horarioSemana || 'Seg–Sex 8h–19h'} · {config?.horarioSabado || 'Sáb 8h–13h'}</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-zinc-500">
          <div>{f.copyright}</div>
          <div className="flex items-center gap-4">
            <span>{f.representative}</span>
            <Link to="/admin/login"
              className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition text-[11px]">
              <Icon.lock className="w-3 h-3" /> Acesso Lojista
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
