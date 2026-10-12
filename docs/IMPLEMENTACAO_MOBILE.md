# Implementação mobile — acompanhamento

Plano aprovado pelo usuário em 12/10/2026: `PLANO_MOBILE_CLIENTE.md`.

## Incremento 1: base instalável e offline seguro

- Manifest standalone, escopo na raiz e ícones 192/512, incluindo maskable derivado da mesma logo.
- Registro do service worker somente no build de produção. Cache restrito à tela offline e seu ícone: nenhuma API, página privada, credencial, pedido ou compra é persistida por ele.
- Navegação usa rede; falha de conexão mostra tela com tentativa de reconexão. Erros HTTP do servidor continuam sendo apresentados normalmente e não viram resposta offline.
- Nova rota pública `/instalar`, acessível no rodapé, com orientação Android/iOS e botão quando o navegador disponibiliza o evento de instalação.
- Atualização de service worker aguarda fechamento das abas existentes. Sem `skipWaiting` ou recarga automática durante checkout.
- Teste em Chromium: manifest/ícones, registro, conteúdo exato do cache, navegação offline, API indisponível e reconexão. Lint/build aprovados localmente; o mesmo teste integra o workflow.

## Limites e próximos incrementos

### Incremento 2: favoritos e comparação

Favoritos persistentes por cliente/loja, limitados a 100 itens e com operações idempotentes. Produtos ocultos não aparecem; salvar favorito não reserva estoque. A tela `/area-cliente/favoritos` compara até três produtos com informações cadastradas, indicando dados ausentes sem inferir características.

Detalhes do produto permitem salvar favoritos. A adição ao carrinho atualiza preço e disponibilidade pela API e reutiliza o checkout existente. Testes de interface em 390/768/1440 passaram localmente. O CI inclui testes de API para autenticação, isolamento, repetição, visibilidade e ausência de efeitos sobre estoque.

Esta base não é a entrega completa do plano: não há aplicativo React Native, push, assistente de IA, catálogo offline ou novos serviços persistentes. Instalação real no Safari/iPhone e Chrome/Android ainda exige validação em dispositivos. Os ícones foram derivados programaticamente dos assets existentes, sem redesenhar a marca.

Continuar fundamentos de sessões/privacidade/tenant e catálogo estruturado; depois favoritos/comparação, serviços/conteúdos, assistente, notificações e aplicativos nativos conforme os critérios do plano. Checkout continua exigindo o backend e pagamento permanece aguardando confirmação; não foi adicionado gateway neste incremento.
