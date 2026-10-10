import { Fragment, useEffect, useState } from 'react';
import { StoreContentContext, resolveStoreContent, storeStyle } from '../../components/storeContent';
import Header from '../../components/Header';
import Hero from '../../components/Hero';
import CategoryGrid from '../../components/CategoryGrid';
import ProductGrid from '../../components/ProductGrid';
import EditorialBand from '../../components/EditorialBand';
import ServicesSection from '../../components/ServicesSection';
import Testimonials from '../../components/Testimonials';
import ContactSection from '../../components/ContactSection';
import Footer from '../../components/Footer';
import FloatingWA from '../../components/FloatingWA';
import { Benefits, BuyingSteps, MobileNav } from '../../components/StoreExtras';
import '../../redesign.css';

export default function LandingPreview() {
  const [draft, setDraft] = useState(null);
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const receive = event => {
      if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'vox-landing-preview') return;
      setDraft(event.data.payload);
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'vox-preview-ready' }, location.origin);
    return () => window.removeEventListener('message', receive);
  }, []);
  if (!draft) return <p role="status">Preparando prévia…</p>;
  const content = resolveStoreContent(draft.config);
  const sections = {
    header: <Header cartCount={0} onOpenCart={() => {}} search={search} onSearch={setSearch} />,
    hero: <Hero />,
    benefits: <Benefits />,
    categories: <CategoryGrid onPick={setFilter} />,
    products: <ProductGrid products={draft.products} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} onAdd={() => {}} onOpen={() => {}} />,
    portability: <EditorialBand />,
    steps: <><BuyingSteps mobile /><BuyingSteps /></>,
    services: <ServicesSection />,
    testimonials: <Testimonials />,
    contact: <ContactSection config={draft.config} />,
    footer: <Footer config={draft.config} />,
    navigation: <><MobileNav /><div className="desktop-wa"><FloatingWA /></div></>,
  };
  return <StoreContentContext.Provider value={content}><div className="vox-store store-preview" style={storeStyle(content)} onClickCapture={event => { if (event.target.closest('a')) event.preventDefault(); }} onSubmitCapture={event => { event.preventDefault(); event.stopPropagation(); }}>
    {draft.section === 'design' ? <>{sections.header}<main>{Object.entries(sections).filter(([key]) => !['header', 'footer', 'navigation'].includes(key)).map(([key, node]) => <Fragment key={key}>{node}</Fragment>)}</main>{sections.footer}{sections.navigation}</> : <main>{sections[draft.section]}</main>}
  </div></StoreContentContext.Provider>;
}
