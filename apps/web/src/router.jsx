import { createBrowserRouter } from 'react-router-dom';
import { ProtectedAdmin, ProtectedCliente } from './auth/RouteGuards.jsx';

import LandingPage from './LandingPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPedidos from './pages/admin/AdminPedidos';
import AdminProdutos from './pages/admin/AdminProdutos';
import AdminClientes from './pages/admin/AdminClientes';
import AdminConfiguracoes from './pages/admin/AdminConfiguracoes';
import AdminConta from './pages/admin/AdminConta';
import PanelAccount from './components/panel/PanelAccount';
import ClienteLogin from './pages/cliente/ClienteLogin';
import ClienteLayout from './pages/cliente/ClienteLayout';
import ClienteHome from './pages/cliente/ClienteHome';
import ClientePedidos from './pages/cliente/ClientePedidos';
import ClienteBeneficios from './pages/cliente/ClienteBeneficios';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },

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
      { path: 'conta',          element: <AdminConta /> },
    ],
  },

  { path: '/area-cliente/login', element: <ClienteLogin /> },
  {
    path: '/area-cliente',
    element: <ProtectedCliente><ClienteLayout /></ProtectedCliente>,
    children: [
      { index: true,          element: <ClienteHome /> },
      { path: 'pedidos',      element: <ClientePedidos /> },
      { path: 'beneficios',   element: <ClienteBeneficios /> },
      { path: 'fidelidade',   element: <ClienteBeneficios initialTab="pontos" /> },
      { path: 'promocoes',    element: <ClienteBeneficios initialTab="ofertas" /> },
      { path: 'conta',        element: <PanelAccount /> },
    ],
  },
]);
