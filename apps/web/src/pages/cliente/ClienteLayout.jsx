import PanelShell from '../../components/panel/PanelShell';
const groups = [
  {
    "label": "Sua conta",
    "items": [
      {
        "to": "/area-cliente",
        "label": "Início",
        "icon": "home",
        "end": true
      },
      {
        "to": "/area-cliente/pedidos",
        "label": "Meus pedidos",
        "icon": "package"
      }
    ]
  },
  {
    "label": "Seus benefícios",
    "items": [
      {
        "to": "/area-cliente/fidelidade",
        "label": "Pontos e recompensas",
        "icon": "award"
      },
      {
        "to": "/area-cliente/promocoes",
        "label": "Ofertas",
        "icon": "tag"
      }
    ]
  }
];
export default function ClienteLayout() { return <PanelShell title="Área do cliente" groups={groups} loginPath="/area-cliente/login" />; }
