import { LandingPreview, LandingPage, InstalarApp, Assistente, Ajuda, AdminLogin, AdminLayout, AdminDashboard, AdminPedidos, AdminProdutos, AdminClientes, AdminConfiguracoes, AdminIntegracoes, AdminConta, AdminServicos, AdminGuias, AdminIa, AdminEmail, PanelAccount, ClienteLogin, ClienteLayout, ClienteHome, ClientePedidos, ClienteFavoritos, ClienteServicos, ClienteAvisos, ClienteBeneficios } from './routePages';
import { createBrowserRouter } from 'react-router-dom';
import { ConfirmarConta } from './routePages';
import { Novidades, AdminNovidades } from './routePages';
import { ProtectedAdmin, ProtectedCliente } from './auth/RouteGuards.jsx';
import PwaLandingGuard from './components/PwaLandingGuard';
import CustomerAppFrame from './components/CustomerAppFrame';
import { CustomerApp, Descobertas } from './routePages';


export const router = createBrowserRouter([{ element: <CustomerAppFrame />, children: [
  { path: '/', element: <PwaLandingGuard><LandingPage /></PwaLandingGuard> },
  { path: '/app/login', element: <ClienteLogin /> },
  { path: '/app', element: <ProtectedCliente><CustomerApp /></ProtectedCliente> },
  { path: '/app/descobertas', element: <ProtectedCliente><Descobertas /></ProtectedCliente> },
  { path: '/app/loja', element: <ProtectedCliente><CustomerApp catalog /></ProtectedCliente> },
  { path: '/confirmar-conta', element: <ConfirmarConta /> },
  { path: '/instalar', element: <InstalarApp /> },
  { path: '/assistente', element: <Assistente /> },
  { path: '/ajuda', element: <Ajuda /> },
  { path: '/novidades', element: <Novidades /> },

  { path: '/admin/landing-preview', element: <PwaLandingGuard><ProtectedAdmin><LandingPreview /></ProtectedAdmin></PwaLandingGuard> },
  { path: '/admin/login', element: <AdminLogin /> },
  {
    path: '/admin',
    element: <ProtectedAdmin><AdminLayout /></ProtectedAdmin>,
    children: [
      { index: true,            element: <AdminDashboard /> },
      { path: 'pedidos',        element: <AdminPedidos /> },
      { path: 'produtos',       element: <AdminProdutos /> },
      { path: 'clientes',       element: <AdminClientes /> },
      { path: 'configuracoes',  element: <AdminConfiguracoes /> },
      { path: 'configuracoes/integracoes', element: <AdminIntegracoes /> },
      { path: 'configuracoes/ia', element: <AdminIa /> },
      { path: 'configuracoes/email', element: <AdminEmail /> },
      { path: 'conta',          element: <AdminConta /> },
      { path: 'servicos',       element: <AdminServicos /> },
      { path: 'guias',          element: <AdminGuias /> },
      { path: 'novidades',      element: <AdminNovidades /> },
    ],
  },

  { path: '/area-cliente/login', element: <ClienteLogin /> },
  {
    path: '/area-cliente',
    element: <ProtectedCliente><ClienteLayout /></ProtectedCliente>,
    children: [
      { index: true,          element: <ClienteHome /> },
      { path: 'pedidos',      element: <ClientePedidos /> },
      { path: 'favoritos',    element: <ClienteFavoritos /> },
      { path: 'avisos', element: <ClienteAvisos /> },
      { path: 'servicos',     element: <ClienteServicos /> },
      { path: 'beneficios',   element: <ClienteBeneficios /> },
      { path: 'fidelidade',   element: <ClienteBeneficios initialTab="pontos" /> },
      { path: 'promocoes',    element: <ClienteBeneficios initialTab="ofertas" /> },
      { path: 'conta',        element: <PanelAccount /> },
    ],
  },
]}]);
