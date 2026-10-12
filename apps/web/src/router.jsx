import LandingPreview from './pages/admin/LandingPreview';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedAdmin, ProtectedCliente } from './auth/RouteGuards.jsx';

import LandingPage from './LandingPage';
import InstalarApp from './pages/InstalarApp';
import Assistente from './pages/Assistente';
import Ajuda from './pages/Ajuda';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPedidos from './pages/admin/AdminPedidos';
import AdminProdutos from './pages/admin/AdminProdutos';
import AdminClientes from './pages/admin/AdminClientes';
import AdminConfiguracoes from './pages/admin/AdminConfiguracoes';
import AdminIntegracoes from './pages/admin/AdminIntegracoes';
import AdminConta from './pages/admin/AdminConta';
import AdminServicos from './pages/admin/AdminServicos';
import AdminGuias from './pages/admin/AdminGuias';
import PanelAccount from './components/panel/PanelAccount';
import ClienteLogin from './pages/cliente/ClienteLogin';
import ClienteLayout from './pages/cliente/ClienteLayout';
import ClienteHome from './pages/cliente/ClienteHome';
import ClientePedidos from './pages/cliente/ClientePedidos';
import ClienteFavoritos from './pages/cliente/ClienteFavoritos';
import ClienteServicos from './pages/cliente/ClienteServicos';
import ClienteBeneficios from './pages/cliente/ClienteBeneficios';

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
