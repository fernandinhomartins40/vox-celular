import { StoreContentContext, resolveStoreContent, storeStyle } from './components/storeContent';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { api, assetUrl } from './lib/api';
import { useReveal } from './hooks/useReveal';

import Header from './components/Header';
import Hero from './components/Hero';
import CategoryGrid from './components/CategoryGrid';
import ProductGrid from './components/ProductGrid';
import EditorialBand from './components/EditorialBand';
import ServicesSection from './components/ServicesSection';
import Testimonials from './components/Testimonials';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import FloatingWA from './components/FloatingWA';
import CartDrawer from './components/CartDrawer';
import ProductModal from './components/ProductModal';
import { Benefits, BuyingSteps, MobileNav } from './components/StoreExtras';
import './redesign.css';

export default function LandingPage() {
  const [filter, setFilter] = useState('Todos');
  const [cart, setCart] = useState(() => {
    try { const saved = JSON.parse(sessionStorage.getItem('vox_cart')); return Array.isArray(saved) ? saved : []; }
    catch { return []; }
  });
  useEffect(() => { sessionStorage.setItem('vox_cart', JSON.stringify(cart)); }, [cart]);
  const [cartOpen, setCartOpen] = useState(() => new URLSearchParams(window.location.search).get('carrinho') === '1');
  const [modalProduct, setModalProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [reload, setReload] = useState(0);
  const [storeConfig, setStoreConfig] = useState(null);
  const [search, setSearch] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const loja = await api.get('/loja');
        if (active) setStoreConfig(loja.config);
        const items = await api.get(`/produtos?lojaId=${encodeURIComponent(loja.id)}`);
        try {
          const offlineModule = new URL('/offline-catalog.js', window.location.origin).href;
          const { savePublicCatalog } = await import(/* @vite-ignore */ offlineModule);
          if (active) savePublicCatalog(loja.id, items);
        } catch { /* Offline storage is optional and must not block the live catalogue. */ }
        if (active) setProducts(items.map(p => ({ ...p, img: assetUrl(p.imgUrl) })));
      } catch (error) {
        if (active) setCatalogError(error.message);
      } finally {
        if (active) setCatalogLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [reload]);

  useReveal();

  const addToCart = useCallback((p, qty = 1) => {
    if (p.estoque <= 0) return;
    setCart(prev => {
      const existing = prev.find(x => x.id === p.id);
      if (existing) return prev.map(x => x.id === p.id ? { ...x, qty: Math.min(p.estoque, x.qty + qty) } : x);
      return [...prev, { ...p, qty: Math.min(p.estoque, qty) }];
    });
  }, []);

  const cartCount = useMemo(() => cart.reduce((n, it) => n + it.qty, 0), [cart]);

  const handlePickCategory = (cat) => {
    setFilter(cat);
    setTimeout(() => {
      const el = document.getElementById('produtos');
      if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
    }, 50);
  };

  const content = resolveStoreContent(storeConfig);
  return (
    <StoreContentContext.Provider value={content}><div className="vox-store" style={storeStyle(content)}>
      <Header cartCount={cartCount} onOpenCart={() => setCartOpen(true)} search={search} onSearch={setSearch} />
      <main>
        <Hero config={storeConfig} />
        <Benefits />
        <BuyingSteps mobile />
        <CategoryGrid onPick={handlePickCategory} />
        <ProductGrid products={products} filter={filter} setFilter={setFilter} onAdd={addToCart} onOpen={setModalProduct}
          search={search} setSearch={setSearch} loading={catalogLoading} error={catalogError} onRetry={() => { setCatalogError(''); setCatalogLoading(true); setReload(n => n + 1); }} />
        <EditorialBand />
        <BuyingSteps />
        <ServicesSection />
        <Testimonials />
        <ContactSection config={storeConfig} />
      </main>
      <Footer config={storeConfig} />
      <div className="desktop-wa"><FloatingWA /></div>
      <MobileNav />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart} setItems={setCart} />
      <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} onAdd={addToCart} onSelect={setModalProduct} />
    </div></StoreContentContext.Provider>
  );
}
