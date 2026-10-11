# Central de vendas multicanal — auditoria e plano para aprovação

Data: 11/10/2026. Status: planejamento; nenhum conector implementado ou homologado. A implementação depende da aprovação expressamente solicitada no documento enviado pelo usuário.

## 1. Evidências da aplicação atual

| Área | Existe e pode ser reaproveitado | Lacuna para multicanal |
| --- | --- | --- |
| Frontend | React, Vite, rotas protegidas, componentes compartilhados de painel, formulários guiados, estados de erro e navegação contextual | Não há central de canais, anúncios, entregas, pagamentos ou atendimento externo |
| Catálogo | Cadastro e edição persistentes, preço, quantidade, visibilidade, destaque, imagem local WebP e crop | Sem SKU comercial, GTIN, marca, modelo, condição estruturada, dimensões, peso, galeria, variantes, kits, custo ou categoria por canal |
| Compra | LandingPage usa catálogo da API; carrinho limita quantidade ao estoque carregado | CartDrawer apenas gera mensagem para WhatsApp. Não cria Pedido, não reserva estoque, não confirma pagamento; limite do navegador não protege concorrência |
| Pedidos | Consulta de pedidos e itens, histórico, avanço de status com expectedStatus e transação | Não há endpoint de criação; status NOVO/EM_PREPARO/PRONTO/ENTREGUE não representa pagamento, envio, cancelamento ou devolução |
| Clientes | Cadastro, consulta, histórico de pedidos, programa de pontos e resgates transacionais | Pedido exige Cliente, que exige Usuario. Comprador externo não deve receber conta fictícia para permitir importação |
| Comercial | Dashboard agrega total de pedidos; promoções são consultadas por API; fidelidade tem resgates reais | Total agregado não é faturamento liquidado ou lucro; não há taxas, conciliação, custos nem CRUD completo de promoções/recompensas no painel |
| Segurança | Hash bcrypt, JWT, filtros de loja nos principais endpoints, segredo obrigatório em produção | Roles apenas LOJISTA/CLIENTE; login procura primeiro e-mail sem loja, apesar da unicidade por loja; JWT de sete dias não consulta Sessao nem é revogado ao trocar senha; sem gestão de vendedores |
| Escala | Índices, pool Prisma de cinco conexões em produção, volumes persistentes, logs limitados | Listas carregam todos os registros; paginação atual ocorre no navegador; painel de clientes inclui histórico inteiro |
| Operação | Um workflow, builds API/web paralelos no GitHub, imagens GHCR, migrations, backup pré-deploy, readiness, testes reais de runtime e browser | Sem fila, outbox/inbox, conectores, OAuth externo, reconciliação ou auditoria comercial; backup local não protege perda da VPS |

Evidências principais: `apps/web/src/router.jsx`, `LandingPage.jsx`, `components/CartDrawer.jsx`, `pages/admin/*`, `apps/api/prisma/schema.prisma`, `src/routes/{produtos,pedidos,auth,clientes,dashboard,fidelidade,promocoes}.ts`, `src/middleware/auth.ts`, `docker-compose.yml`, `.github/workflows/deploy.yml` e `.github/scripts/remote-deploy.sh`.

Arquivos App.jsx/data.js/mockData.js/authMock.js existem, mas não equivalem ao fluxo de produção: main.jsx monta router.jsx, cuja loja é LandingPage. Não usar dados desses arquivos como integração final.

Validação nesta auditoria: lint web, build TypeScript API e oito testes de catálogo/painel passaram. Consulta somente leitura à VPS: readiness OK, API 26,46 MiB, web 3,129 MiB, banco 31,33 MiB; CPU momentânea 0%; banco 9031 kB. Esses valores são um snapshot, não capacidade sob carga. Nenhuma venda externa ou homologação foi testada.

## 2. Pesquisa oficial e viabilidade por canal

Recursos documentados não significam que a aplicação já possui autorização. Não pressupor que exclusão, cancelamento, reembolso, mensagens ou etiquetas sejam universais.

| Canal | Confirmado na documentação consultada | Dependências e limites |
| --- | --- | --- |
| Mercado Livre | OAuth com autorização do vendedor; consulta de vendas e notificações de recursos. Portal apresenta gestão de itens, envios, perguntas e pós-venda | Criar app, consentimento e escopos; validar operações de anúncio, catálogo, logística e pós-venda para a conta/categoria. Notificação é gatilho para consultar fonte oficial, não pedido completo confiável |
| Magalu | Portfólio separado em SKU/preço/estoque; escopos de leitura/escrita; pedidos e entregas; OAuth e webhooks | App e consentimento do seller PJ. Doc atual de pedidos disponibiliza canal Magalu; não assumir Netshoes pelo mesmo conector. API antiga e atual têm comportamentos diferentes; não misturar documentação |
| Amazon | SP-API, listings, pedidos, relatórios e notificações; Brasil usa endpoint América do Norte | Cadastro de desenvolvedor/app, autorização e roles por operação; dados restritos exigem avaliação específica. Eventos usam SQS/EventBridge, não webhook HTTP genérico. Sandbox não substitui validação real; distinguir FBA de estoque próprio |
| Casas Bahia | Produto/oferta, preço, estoque, status, pedidos, etiquetas/rastreamento; callback de pedidos; ambiente de homologação | Conta developer, App+token, homologação obrigatória antes de produção. Cadastro de callback pelo parceiro no PAS. Reenvio de eventos limitado; reconciliação continua necessária |
| Americanas/SkyHub | Integração de produtos e pedidos; homologação básica inclui produtos, conexão, pedidos e etiquetas | Credenciais e homologação, inclusive identificação do integrador. Não tratar documentação disponível como prova de conta comercial habilitada ou acesso produtivo; validar contrato e operações liberadas |
| SHEIN | Plataforma de autorização do vendedor; documentação de publicação/edição de produtos e pedidos/rastreamento | Capacidades variam entre operação própria, semi e gestão completa. A referência de pedido consultada indica ausência de consulta de comentários/mensagens; não prometer inbox completo. Confirmar categoria de celulares, país e modelo de conta |
| Shopee | Portal oficial identificado | Portal e guia BR não puderam ser lidos pelo navegador de pesquisa (403/indisponível). Endpoints, escopos, webhooks, requisitos de parceiro e operações BR ficam NÃO VALIDADOS até acesso oficial. Não inferir capacidades de blogs ou exemplos de terceiros |
| TikTok Shop | Documentação oficial identifica suporte BR em ambiente de testes | Canal adicional candidato; onboarding, escopos e operações comerciais devem passar por pesquisa/validação próprias antes de entrar no escopo produtivo |
| Shopify | Documentação oficial de webhooks | Loja própria adicional, não marketplace. Considerar GraphQL Admin API e autorização específicos em uma etapa posterior; sem implementar por presumir equivalência |

Fontes oficiais consultadas em 11/10/2026:

- [Mercado Livre: autenticação](https://developers.mercadolivre.com.br/autenticacao-e-autorizacao), [vendas](https://developers.mercadolivre.com.br/pt_br/imovel-consulta-de-usuarios/gerenciamento-de-vendas), [notificações](https://developers.mercadolivre.com.br/pt_br/lojas-oficiais/produto-receba-notificacoes), [portal](https://developers.mercadolivre.com.br/).
- [Magalu: produtos e escopos](https://developers.magalu.com/docs/apis/products/overview/index.html), [pedidos](https://developers.magalu.com/docs/apis/orders/overview/index.html), [OAuth](https://developers.magalu.com/docs/first-steps/create-an-application/authentication-authorization/index.html), [webhooks de produtos](https://developers.magalu.com/docs/apis/products/webhooks/index.html).
- [Amazon: onboarding](https://developer-docs.amazon.com/sp-api/docs/onboarding-overview), [endpoints](https://developer-docs.amazon.com/sp-api/lang-pt_BR/docs/sp-api-endpoints), [notificações](https://developer-docs.amazon.com/sp-api/docs/notification-type-values).
- [Casas Bahia: capacidades](https://developers.grupocasasbahia.com.br/marketplace/docs/entenda-a-api), [início/homologação](https://developers.grupocasasbahia.com.br/marketplace/docs/como-iniciar), [callback](https://developers.grupocasasbahia.com.br/marketplace/docs/callback-notificacao-de-pedido).
- [Americanas/SkyHub: portal](https://desenvolvedores.skyhub.com.br/), [homologação](https://desenvolvedores.skyhub.com.br/processo-de-homologacao/validacoes).
- [SHEIN: soluções e autorização](https://open.sheincorp.com/pt/solution), [publicação](https://open.sheincorp.com/pt/documents/apidoc/detail/3001808), [referência de pedidos](https://open.sheincorp.com/documents/apidoc/detail/3000157-2000001). Parte das páginas é dinâmica; resultados indexados servem como evidência documental parcial, exigindo confirmar contrato no portal autenticado.
- [Shopee: portal](https://open.shopee.com/), [guia BR identificado](https://open.shopee.com/developer-guide/736) — conteúdo bloqueado nesta consulta.
- [TikTok Shop: testes com suporte BR](https://partner.tiktokshop.com/docv2/page/ar5ppjvv), [Shopify: webhooks](https://shopify.dev/docs/api/admin-rest/unstable/resources/webhook).

## 3. Arquitetura proposta

Evoluir o monólito modular Express/Prisma/PostgreSQL; manter React e os componentes existentes. Não iniciar microserviços, Redis ou broker adicional sem necessidade medida. Conectores isolados por canal implementam contratos de capacidades, autenticação, catálogo, anúncios, estoque, preços, pedidos e logística; operações indisponíveis retornam impossibilidade explícita, nunca sucesso simulado.

PostgreSQL armazena inbox de eventos, outbox de ações e jobs duráveis. Processamento inicialmente limitado dentro da API, com loop controlado, shutdown e lease recuperável; nenhum trabalho comercial fica apenas em memória. Claim com SKIP LOCKED, transações curtas, concorrência inicial 1, lotes pequenos, limites por conta/canal, backoff com jitter e Retry-After. Separar worker futuramente somente se medições justificarem mais container/pool.

Fluxo: webhook autenticado → persistir inbox → responder no prazo do canal → consultar recurso oficial → normalizar → transação de pedido/reserva/outbox → sincronizar demais anúncios → confirmar resultado remoto. Polling com cursor persistido, janelas sobrepostas e deduplicação cobre eventos perdidos. Fonte do saldo de estoque próprio é o sistema central; estoque de fulfillment do marketplace é separado por depósito.

OAuth: state de uso único vinculado a usuário/loja e expiração; PKCE quando exigido/suportado; escopos mínimos; refresh serializado por conexão. Tokens cifrados com chave de aplicação fora do banco e do Git, identificação da versão para rotação. Nunca enviar refresh tokens ao navegador ou logs. Revogação e falhas de autorização pausam ações e solicitam reconexão.

Segurança de eventos: assinatura/cabeçalhos conforme cada provedor, corpo bruto quando necessário, limite de tamanho e rate limit. Onde não houver assinatura suficiente, conferir recurso e titular por API autenticada. Não seguir URLs arbitrárias do payload (SSRF); usar endpoint permitido do conector. Duplicatas são esperadas; idempotência é obrigatória.

Sincronização não deve pingar alterações entre canais: armazenar versão de catálogo, saldo desejado, saldo confirmado e origem do evento. Coalescer jobs de preço/estoque; operações financeiras nunca são repetidas cegamente após timeout. Consultar resultado remoto ou exigir revisão quando não há idempotência externa.

## 4. Alterações propostas no banco

Todas são propostas, não migrations já executadas. Aplicar expand/backfill/validate antes de retirar contratos legados.

| Entidade existente/nova | Evolução |
| --- | --- |
| Produto | SKU único por loja, marca/modelo/GTIN opcional, condição, custo Decimal, peso/dimensões, version; preservar IDs e campos atuais |
| VarianteProduto / ImagemProduto / ComponenteKit | SKU da unidade vendável, atributos estruturados e galeria; kits referenciam componentes sem saldo independente duplicado |
| SaldoEstoque / MovimentoEstoque / ReservaEstoque | Quantidade física, reservada, segurança, depósito e versão; movimento imutável com origem/idempotência; reserva por item e ciclo de vida |
| ConexaoCanal | loja, provedor, conta externa, ambiente, scopes, credenciais cifradas, expiração, cursor, saúde; unicidade loja/provedor/conta |
| AnuncioCanal | conexão + SKU, ID externo, preço, categoria/atributos, estado desejado/confirmado, rejeições e versão; unicidade conexão/ID externo |
| Pedido | Origem, conexão, ID externo, moeda, status externo e estados independentes financeiro/logístico/comercial; unicidade conexão/ID externo; compatibilidade dos quatro estados antigos |
| CompradorPedido / EnderecoPedido | Snapshot mínimo de contato/endereço; Cliente opcional para pedidos externos, sem criar Usuario fictício; política de retenção e mascaramento |
| PagamentoPedido / EntregaPedido / DocumentoFiscal / OcorrenciaPedido | IDs externos, status, valores, transportadora, tracking, etiquetas, XML e histórico; podem existir múltiplas entregas, pagamentos e devoluções parciais |
| EventoIntegracao / JobIntegracao / Outbox | chave de dedup, referência de recurso, tentativas, nextRunAt, lease, resultado/errorCode; índices por conexão/status/próxima execução |
| RegraAutomacao / ExecucaoAutomacao / Auditoria | regras versionadas, limites, habilitação e histórico; autor e antes/depois com dados sensíveis removidos |
| Usuario / Permissao | LOJISTA como proprietário, VENDEDOR e ADMIN_LOJA com capacidades específicas; checagem server-side e revogação efetiva; sem administrador global implícito |
| CustoVenda / LiquidacaoCanal | comissões, frete, impostos informados, custo de aquisição e repasses; separar margem estimada de realizada |

Condições de integridade: saldo/reserva não negativos; reserva + segurança não excede disponibilidade alocável; chaves de dedup escopadas por tenant/conexão; FKs e verificações impedem relacionar produtos de outra loja. Compra, reserva, movimentos e outbox devem ser atômicos. Liberar/consumir reserva uma única vez. Devolução só repõe saldo físico após recebimento/conferência.

Não é possível garantir zero overselling entre marketplaces assíncronos que aceitam pedidos independentemente. Reduzir o risco com margem de segurança, alocação exclusiva das últimas unidades por canal, pausa quando integração estiver atrasada e reconciliação. Garantir concorrência local e não apresentar garantia absoluta distribuída.

## 5. UX: uma central, tarefas em até três passos

Manter navegação principal enxuta: Visão geral, Pedidos, Produtos, Clientes e Canais. Entregas, pagamento, fiscal, devoluções e mensagens ficam no contexto do pedido. Anúncios, preço e estoque por canal ficam no contexto do produto. Automações/configuração ficam em Canais e só aparecem quando necessárias. Reaproveitar PanelShell, PanelDialog, PanelFlow e feedback existentes.

| Tarefa | Até três passos na nossa interface |
| --- | --- |
| Conectar conta | Escolher canal → autorizar no provedor → conferir vínculo; etapas externas de homologação não contam como resolvidas pela UI |
| Publicar em vários canais | Selecionar produtos/canais → corrigir requisitos apontados → confirmar publicação; aprovação assíncrona permanece visível |
| Atender pedido | Abrir pendência → concluir próxima ação permitida → conferir comprovante/resultado |
| Repor estoque | Abrir produto → informar entrada e motivo → salvar; sincronização automática acompanha resultado por canal |
| Corrigir anúncio | Abrir erro → ajustar campo destacado → reenviar |
| Devolução/reembolso | Abrir ocorrência → conferir itens/valor/condições → confirmar; decisão externa pode continuar pendente |

Exibir “automático”, “aguardando canal”, “precisa de você” e “falhou” de forma distinta. Não mostrar conexão não homologada como ativa. Não habilitar ações inexistentes. Texto curto, foco/teclado, contraste, alvos de toque, tabelas adaptadas a mobile e contexto preservado ao filtrar. Contagem de passos é meta de fluxo, não justificativa para omitir consentimento ou confirmação financeira.

## 6. Plano priorizado e critérios de aceite

### Etapa 0 — Segurança e integridade da base (P0)

Corrigir seleção de tenant no login e contratos públicos da loja; permissões e revogação, auditoria, rate limit de autenticação, política de dados e backup/restauração. Paginação/filtros server-side nas listas, mantendo frontend compatível. Dependências: estratégia de identificação da loja, chave de criptografia e destino de backup aprovados/configurados com segurança.

Aceite: acesso cruzado entre lojas bloqueado em testes negativos; troca/revogação invalida acesso; vendedor não consegue alterar credenciais/preços/reembolsos fora da permissão; paginação não perde registros; restauração ensaiada em banco isolado. Antes de tokens externos, validar proteção de segredos e logs.

### Etapa 1 — Vendas e estoque reais (P0)

Adicionar SKU/campos essenciais, registro de venda da loja/balcão e checkout com pedido persistido, reserva/movimentos transacionais, cancelamento, estados financeiros/logísticos e endereço/contato por pedido. Manter WhatsApp como atendimento opcional ligado ao código do pedido; pagamento manual permanece “aguardando”, nunca aprovado por clique do cliente. Galeria/variantes; kits entram após saldo unitário validado.

Aceite: duas compras concorrentes da última unidade não geram duas reservas locais; mesma chave de compra não duplica pedido; preço/visibilidade/estoque validados no servidor; cancelamento libera reserva uma vez; pedido aparece nos dois painéis; legado preservado e estoque backfilled sem perda. UI principal em até três passos, com dados persistidos após recarregar.

### Etapa 2 — Núcleo de integração e Mercado Livre (P1)

Construir conexão/capabilities/inbox/outbox/jobs, saúde, consentimento, vínculo de anúncios existentes e importação idempotente. Começar em somente leitura; depois sincronizar estoque/preço de pequeno conjunto autorizado; por último publicação/pausa com validação de requisitos. Dependências: app e conta ML autorizados, catálogo válido e operações da conta confirmadas.

Aceite: OAuth/renovação/revogação reais; eventos duplicados/fora de ordem, restart do processo, 429 e timeouts não duplicam pedidos/movimentos; anúncios existentes vinculados sem duplicação; saldo confirmado remotamente; imagens acessíveis por URL HTTPS da VPS e aceitas pelo canal; falhas expostas com reprocessamento seguro. Sandbox/fixtures são testes auxiliares, não prova de integração concluída.

### Etapa 3 — Segundo canal e expansão controlada (P1)

Prioridade sugerida: Magalu pela documentação atual acessível; Shopee assim que acesso BR e autorização forem verificados. Amazon após roles/onboarding e decisão sobre SQS/EventBridge; Casas Bahia e Americanas após homologação; SHEIN após verificar categoria/modelo. A ordem pode mudar conforme contas de venda reais do cliente. TikTok Shop/Shopify ficam opcionais posteriores.

Aceite por canal: matriz de operações e limites publicada; conta realmente autorizada; catálogo/preço/estoque/pedido conferidos com dados e IDs reais, teste de falha/reconciliação e contrato de logística; canal desabilitado sem credenciais. Cada conector só recebe selo validado para operações efetivamente testadas.

### Etapa 4 — Entregas, fiscal e pós-venda (P1/P2)

No mesmo pedido: etiquetas, tracking, divisão de pacotes, NF/XML, cancelamento/devolução parcial, reembolso e atendimento conforme capabilities. Integração fiscal é distinta de anexar uma nota ao marketplace: escolher emissor autorizado e configuração tributária com responsável fiscal. Sem certificado fiscal ou autorização, disponibilizar apenas anexação validada quando suportada.

Aceite: etiqueta do pedido correto, acesso protegido a dados pessoais, expiração/quotas de documentos, sequência fiscal/logística correta, nenhum reembolso repetido após timeout, retorno físico conferido antes de repor estoque. Operações indisponíveis têm orientação e acesso contextual ao painel externo.

### Etapa 5 — Automação e margem (P2)

Regras de preço com piso de margem e teto de alteração, prevenção de publicação incompleta, alertas de prazo, reposição sugerida, reconciliação e relatórios por canal. Começar com cálculo determinístico e explicável; usar sugestões assistidas, não inventar GTIN/atributo obrigatório ou condição do aparelho. Impostos não são calculados arbitrariamente. Histórico de execuções, limites por regra, pausa e simulação de impacto antes de habilitar.

Aceite: alteração de preço respeita piso/teto, taxa com vigência e fonte; custo ausente é mostrado como margem desconhecida; receita de pedido distinta de repasse; recorrência não repete efeito; sugestão informa motivo/dados; lojista consegue desativar regra e rastrear cada execução.

## 7. Operação, riscos e validação de ponta a ponta

- Preservar main e workflow único com builds paralelos no GitHub e deploy GHCR; não construir na VPS ou mexer em aplicações vizinhas. Migrations aditivas, backup prévio e plano de compatibilidade/restore por etapa.
- Medir carga com API, banco, imagens, jobs e eventos simultâneos: pico RAM/CPU, p95 de API, fila/lag, conexões, disco/I/O e OOM; snapshot atual não autoriza elevar limites ou iniciar novos serviços.
- Reservar budget inicial de um job ativo, lotes pequenos e filas limitadas por conexão; limites definitivos após carga real. Reconciliação incremental e prioridade para estoque/pedidos; evitar polling agressivo de catálogo inteiro.
- Testes: unidades dos normalizadores e cálculo financeiro; banco real para reservas, tenant, idempotência e migrations; contratos dos conectores; cenários de duplicação, ordem invertida, token expirado, desconexão, rate limit, falha pós-commit e restore; browser nos tamanhos 320/390/768/1024/1440/1920 e teclado. Mocks somente para provocar falhas controladas, nunca solução final.
- Guardar payload mínimo; mascarar contato/endereço em logs; separar tokens, PII e auditoria; definir retenção e exportação/exclusão conforme obrigações contratuais/fiscais. A conformidade LGPD precisa de política operacional, não apenas código.
- Imagens de catálogo são ilustrações geradas. Para anúncios reais, conferir modelo/cor/acessórios e regras de cada marketplace; aparência plausível não comprova correspondência ao item vendido.
- Comercial: custos de contas, comissões, serviços fiscais e eventual infraestrutura de notificações variam; levantamento por conta antes de prometer operação sem serviços pagos.

## 8. Aprovação solicitada

Proposta: aprovar este plano incremental, iniciando Etapas 0 e 1 e preparando o núcleo da Etapa 2. Conectar/publicar em contas externas somente após consentimento explícito do vendedor e requisitos oficiais cumpridos. As demais etapas seguem seus critérios e dependências; não marcar conectores sem autorização como concluídos.

Na aprovação, informar os marketplaces em que a Vox já vende e qual priorizar. Não enviar tokens, segredos, senhas ou certificados no chat. O fornecimento seguro de credenciais será tratado quando o conector estiver pronto para configuração. Até aprovação, não alterar código funcional ou schema para este novo escopo.
