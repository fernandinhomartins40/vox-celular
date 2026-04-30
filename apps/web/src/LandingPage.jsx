import { useState, useCallback, useMemo } from 'react';
import { PRODUCTS } from './data';
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

  useReveal();

  const addToCart = useCallback((p, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(x => x.id === p.id);
      if (existing) return prev.map(x => x.id === p.id ? { ...x, qty: x.qty + qty } : x);
      return [...prev, { ...p, qty }];
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
        <Hero />
        <CategoryGrid onPick={handlePickCategory} />
        <ProductGrid products={PRODUCTS} filter={filter} setFilter={setFilter} onAdd={addToCart} onOpen={setModalProduct} />
        <EditorialBand />
        <ServicesSection />
        <Testimonials />
        <ContactSection />
      </main>
      <Footer />
      <FloatingWA />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart} setItems={setCart} />
      <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} onAdd={addToCart} />
    </>
  );
}
