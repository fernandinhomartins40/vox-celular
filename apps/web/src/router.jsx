import { LandingPreview, LandingPage, InstalarApp, Assistente, Ajuda, AdminLogin, AdminLayout, AdminDashboard, AdminPedidos, AdminProdutos, AdminClientes, AdminConfiguracoes, AdminIntegracoes, AdminConta, AdminServicos, AdminGuias, AdminIa, PanelAccount, ClienteLogin, ClienteLayout, ClienteHome, ClientePedidos, ClienteFavoritos, ClienteServicos, ClienteBeneficios } from './routePages';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedAdmin, ProtectedCliente } from './auth/RouteGuards.jsx';


export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/instalar', element: <InstalarApp /> },
  { path: '/assistente', element: <Assistente /> },
  { path: '/ajuda', element: <Ajuda /> },

  { path: '/admin/landing-preview', element: <ProtectedAdmin><LandingPreview /></ProtectedAdmin> },
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
      { path: 'conta',          element: <AdminConta /> },
      { path: 'servicos',       element: <AdminServicos /> },
      { path: 'guias',          element: <AdminGuias /> },
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
      { path: 'servicos',     element: <ClienteServicos /> },
      { path: 'beneficios',   element: <ClienteBeneficios /> },
      { path: 'fidelidade',   element: <ClienteBeneficios initialTab="pontos" /> },
      { path: 'promocoes',    element: <ClienteBeneficios initialTab="ofertas" /> },
      { path: 'conta',        element: <PanelAccount /> },
    ],
  },
]);
