import PanelShell from '../../components/panel/PanelShell';
const groups = [{ label: 'Sua conta', items: [
  { to: '/area-cliente', label: 'Início', icon: 'home', end: true },
  { to: '/area-cliente/pedidos', label: 'Meus pedidos', icon: 'package' },
  { to: '/area-cliente/favoritos', label: 'Meus favoritos', icon: 'star' },
  { to: '/area-cliente/beneficios', aliases: ['/area-cliente/fidelidade', '/area-cliente/promocoes'], label: 'Meus benefícios', icon: 'gift' },
  { to: '/area-cliente/avisos', label: 'Meus avisos', icon: 'package' },
  { to: '/area-cliente/conta', label: 'Minha conta', icon: 'user' },
  { to: '/area-cliente/servicos', label: 'Meus serviços', icon: 'package' },
] }];
export default function ClienteLayout() { return <PanelShell title="Área do cliente" groups={groups} loginPath="/area-cliente/login" />; }
