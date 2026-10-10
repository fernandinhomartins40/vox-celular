# Painéis VOX — sistema de design e fluxos

## Objetivo

Unificar a área do cliente e o painel do lojista com componentes compartilhados, linguagem simples e navegação por tarefa. Implementação diretamente na `main`, sem novas dependências de interface.

## Plano priorizado e implementação

| Prioridade | Problema observado | Implementação |
| --- | --- | --- |
| P0 | Navegações diferentes entre os painéis | `PanelShell`: menu lateral no desktop e menu acessível no celular/tablet, com os mesmos estados, marca e saída da conta |
| P0 | Textos pequenos e estilos dispersos | Tipografia DM Sans para leitura e títulos dos painéis; Barlow Condensed na marca; cores, bordas, foco, cartões e espaçamento compartilhados em `panel.css` |
| P0 | Tabelas exigiam deslocamento lateral no celular | Pedidos, clientes e pedidos recentes passam a cartões com rótulos no celular, mantendo tabelas no desktop |
| P0 | Diálogos sem controle uniforme de teclado | `PanelDialog`: foco inicial, contenção de foco, Escape, bloqueio de rolagem e retorno ao controle de origem |
| P1 | Cadastro de produto fragmentado em seis abas | Três seções: Produto (dados e especificações), Imagem (seleção e recorte), Venda (preço, estoque, oferta e destaque) |
| P1 | Ações principais distantes ou duplicadas | `PanelQuickActions` nas duas páginas iniciais; removido o segundo bloco de atalhos repetidos do lojista |
| P1 | Cabeçalhos e indicadores inconsistentes | `PanelPageHeader` e `PanelMetricCard` utilizados nos dois painéis |
| P1 | Telas de entrada com identidades diferentes | `PanelAuthLayout` compartilha estrutura e estilo, preservando login, cadastro de cliente, ajuda e exibição de senha |
| P1 | Falhas de carregamento pouco claras | `PanelLoading` e `PanelError`; a página inicial do cliente mantém os dados disponíveis, mostra aviso de falha parcial e não exibe zero como dado indisponível |
| P1 | Editor de imagem calculava posição em largura fixa | Recorte acompanha o espaço disponível via ResizeObserver; suporte a toque, movimentação por setas e redimensionamento por teclado |
| P2 | Data fixa e textos desnecessários | Mês atual no resumo do lojista, código legível do pedido, ofertas com texto direto e sem banner quando a lista está vazia |
| P2 | Mensagem de recompensa exigia copiar o código | WhatsApp inclui o código retornado no resgate |

## Princípio dos três passos

Os passos representam decisões e ações principais após entrar na conta. Digitar cada campo e ajustar uma imagem são interações dentro da tarefa; não são omitidos para prometer três cliques em todo cadastro.

| Tarefa | Caminho |
| --- | --- |
| Lojista: atualizar pedido | Atender pedidos → abrir detalhes → avançar status |
| Cliente: acompanhar compra | Acompanhar pedido → detalhes |
| Cliente: usar recompensa | Usar meus pontos → resgatar → enviar código no WhatsApp |
| Lojista: personalizar página | Editar página da loja → preencher os campos relacionados → salvar |
| Lojista: produto | Uma tela com três seções relacionadas, mantendo o formulário preenchido durante a navegação; salvar sem sair do editor |

Todos os campos, permissões, rotas e recursos existentes foram mantidos. Não foram alteradas regras de pagamento, fidelidade, autenticação ou persistência.

## Componentes e uso

- `apps/web/src/components/panel/PanelShell.jsx`: estrutura, navegação agrupada e cabeçalho de página/atalhos.
- `PanelAuthLayout.jsx`: estrutura das telas de entrada.
- `PanelDialog.jsx`: comportamento acessível de diálogos e modais de imagem.
- `PanelMetricCard.jsx`: indicadores, com ou sem navegação.
- `PanelFeedback.jsx`: carregamento e falhas com opção de tentar novamente.
- `panel.css`: estilos limitados a `.vox-panel`, preservando o escopo da loja pública.

As áreas interativas comuns têm pelo menos 44 px. Os pequenos controles de precisão do recorte têm alternativa por teclado. Há foco visível, rótulos associados aos campos, estados de seleção anunciados, link para pular a navegação e respeito à preferência por movimento reduzido.

## Validação

O script `.github/scripts/test-panels-browser.mjs` testa os painéis em Chromium com APIs simuladas e dados isolados. Não usa credenciais reais nem grava em produção. Está integrado ao job de verificação do workflow existente, além dos testes já existentes contra API/PostgreSQL reais no CI.

Cobertura: 320, 390, 768 e 1440 px; todas as rotas autenticadas; ausência de rolagem horizontal na página; menu e diálogos por teclado; retorno de foco; atualização de pedido; três seções de produto e preservação dos campos; seleção/recorte/envio da imagem em WebP; preço e estoque no payload; detalhes do cliente; resgate e código no WhatsApp; login e exibição de senha; estados vazio e erro. Os testes bloqueiam fontes externas para também exercitar as fontes de fallback.

Validações adicionais: build do frontend, ESLint, testes existentes de catálogo e revisão visual das capturas de celular/tablet/desktop. A publicação ocorre exclusivamente pelo GitHub Actions e respeita a aprovação de produção prevista no `AGENTS.md`.
