import PanelShell from '../../components/panel/PanelShell';
const groups = [
  {
    "label": "Dia a dia",
    "items": [
      {
        "to": "/admin",
        "label": "Visão geral",
        "icon": "layoutDashboard",
        "end": true
      },
      {
        "to": "/admin/pedidos",
        "label": "Pedidos",
        "icon": "package"
      },
      {
        "to": "/admin/produtos",
        "label": "Produtos",
        "icon": "tag"
      },
      {
        "to": "/admin/clientes",
        "label": "Clientes",
        "icon": "users"
      },
      { "to": "/admin/servicos", "label": "Serviços", "icon": "package" },
      { "to": "/admin/guias", "label": "Guias de ajuda", "icon": "settings" }
    ]
  },
  {
    "label": "Sua loja",
    "items": [
      {
        "to": "/admin/configuracoes",
        "label": "Página da loja",
        "icon": "settings"
      },
      {
        "to": "/admin/conta",
        "label": "Minha conta",
        "icon": "user"
      }
    ]
  }
];
export default function AdminLayout() { return <PanelShell title="Painel do lojista" groups={groups} loginPath="/admin/login" />; }
