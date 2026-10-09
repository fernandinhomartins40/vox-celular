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

export default function LandingPage() {
  const [filter, setFilter] = useState('Todos');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [reload, setReload] = useState(0);
  const [storeConfig, setStoreConfig] = useState(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const loja = await api.get('/loja');
        if (active) setStoreConfig(loja.config);
        const items = await api.get(`/produtos?lojaId=${encodeURIComponent(loja.id)}`);
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

  return (
    <>
      <Header cartCount={cartCount} onOpenCart={() => setCartOpen(true)} />
      <main>
        <Hero config={storeConfig} />
        <CategoryGrid onPick={handlePickCategory} />
        <ProductGrid products={products} filter={filter} setFilter={setFilter} onAdd={addToCart} onOpen={setModalProduct}
          loading={catalogLoading} error={catalogError} onRetry={() => { setCatalogError(''); setCatalogLoading(true); setReload(n => n + 1); }} />
        <EditorialBand />
        <ServicesSection />
        <Testimonials />
        <ContactSection config={storeConfig} />
      </main>
      <Footer config={storeConfig} />
      <FloatingWA />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart} setItems={setCart} />
      <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} onAdd={addToCart} />
    </>
  );
}
