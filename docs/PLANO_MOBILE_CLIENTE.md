# Vox Celular — PWA e aplicativos do cliente

Data da auditoria e pesquisa: 11/10/2026. **Status: aprovado pelo usuário em 12/10/2026; implementação em andamento com goal ativo.** A auditoria abaixo registra a base na data da análise; entregas posteriores estão em IMPLEMENTACAO_MOBILE.md. Este plano complementa o multicanal; não declara aqueles conectores concluídos.

## 1. Auditoria da base existente

### Revisão de execução — 13/10/2026

Orientação do usuário: implementar sem complexidade desnecessária. O escopo funcional permanece, mas a entrega passa a ser organizada por jornadas utilizáveis, reutilizando a API, banco, componentes e workflow existentes. Não criar novas camadas, serviços ou abstrações sem uma necessidade concreta.

1. **Comprar:** catálogo → carrinho → pedido. Fechar preço, disponibilidade, acessórios e acompanhamento no mesmo fluxo.
2. **Pedir ajuda:** serviço → solicitação → acompanhamento. Orçamento e agenda ficam junto do protocolo, sem novas áreas de navegação.
3. **Gerenciar a conta:** dados, avisos e privacidade agrupados em Conta, com ações e textos diretos.
4. **Usar como aplicativo:** concluir PWA e app nativo sobre os mesmos fluxos; preparar instalação, links e push. Contas/certificados externos ficam como dependências de ativação identificadas.

Para cada entrega: implementar o fluxo completo, executar as verificações relevantes uma vez, corrigir falhas e registrar a evidência. Ampliar testes somente quando houver risco ou falha concreta. Não adiar funcionalidades visíveis para perseguir todos os casos extremos; preservar as verificações necessárias de autorização, estoque, dados e pagamentos.

Aceite em duas colunas: **implementação validada localmente** e **ativação/validação externa**. Uma dependência externa não impede concluir código independente, nem permite declarar o plano inteiro concluído. O bloqueio de faturamento do Actions deve ser registrado como impedimento de deploy, sem substituir o desenvolvimento por verificações repetidas do mesmo bloqueio.

Foram inspecionados Prisma, rotas da API, autenticação, ponto de entrada e rotas do React, landing page, painéis do cliente, catálogo, configuração do Vite, Compose e workflow. Consulta de produção somente de leitura: readiness OK; memória instantânea de aproximadamente 31 MiB no banco, 30 MiB na API e 3 MiB no web. Isso é uma fotografia em baixa carga, não benchmark nem garantia de capacidade futura.

| Área | Reutilizar | Corrigir ou ampliar |
| --- | --- | --- |
| Aplicação ativa | `apps/web/src/main.jsx` → `router.jsx` → `LandingPage.jsx`, React/Vite; painéis e marca compartilhados | `App.jsx` ainda contém catálogo estático, mas não é a rota ativa. A pasta `app/` não será adotada como segunda aplicação |
| Catálogo | Produtos reais, preço Decimal, disponibilidade, imagens WebP locais, edição com crop/compressão | `specs` é lista de texto livre; faltam tipo celular/tablet, marca/modelo, características verificadas e compatibilidade entre acessórios/aparelhos |
| Compras | POST de pedidos com idempotência, decremento transacional de estoque, cancelamento com liberação única; consulta e timeline | Pagamento continua aguardando confirmação: não existe gateway nem prova de liquidação. Promoções precisam de regra explícita no checkout antes de prometer preço promocional |
| Cliente | Cadastro/login, pedidos, benefícios, pontos e resgates | Favoritos, preferências consentidas, recuperação/verificação de conta, encerramento de sessões, exportação/exclusão de dados |
| Segurança | bcrypt, JWT com versão revogável ao trocar senha, isolamento por loja nas rotas protegidas | JWT de sete dias no localStorage, logout apenas local, tabela Sessao sem uso efetivo; API sem proteção geral de abuso. `/loja` usa findFirst: resolução da loja precisa ser explícita |
| Serviços | Conteúdo da landing administrável e contato humano por WhatsApp | Não há entidades ou fluxo persistente de orçamento, ordem de serviço, agenda e acompanhamento |
| Conteúdo | Landing configurável, promoções consultáveis, componentes reutilizáveis | Notícias, guias das operadoras, revisão editorial, segmentação e gestão completa das campanhas |
| Mobile | Layout responsivo existente | Sem manifest, service worker, instalação, push ou projeto Android/iOS |
| Infraestrutura | Uma API e PostgreSQL; imagens na VPS; builds paralelos no GitHub, GHCR e deploy automático na main | APIs versionadas/compatíveis com aplicativos antigos; tarefas duráveis e limites para notificações/IA, sem modelo de IA local |

## 2. Arquitetura proposta e decisão técnica

**PWA:** ampliar o React existente, preservando site e painel. **Android/iOS:** novo workspace `apps/mobile` com React Native e Expo Router, com telas nativas. Mesma API Express/PostgreSQL, mesmo catálogo e regras comerciais. Extrair apenas contratos, cliente de API, validações e tokens de design para pacotes compartilhados; não duplicar cadastro, estoque, pedidos ou serviços.

| Opção | Avaliação para a Vox |
| --- | --- |
| React Native + Expo | Recomendado: componentes nativos, navegação e recursos do dispositivo; reaproveita JavaScript/TypeScript e domínio, exige implementar a apresentação mobile |
| Capacitor | Maior reaproveitamento do HTML/CSS; interface continua baseada em WebView. Possível com trabalho de UX/plugins, mas menos alinhado ao pedido de aplicativo nativo |
| Flutter | Interface consistente e bom suporte mobile; adiciona Dart e outra implementação do cliente de domínio, sem vantagem demonstrada nesta base |
| Swift/Kotlin separados | Máximo controle por plataforma; duas interfaces e maior esforço de evolução, desnecessário no escopo inicial |

A escolha é uma recomendação de arquitetura, não um resultado de benchmark. Validar protótipo em aparelho Android de entrada e iPhone antes de fechar a versão do SDK. Expo não exige contratar EAS: builds Android podem acontecer no GitHub; iOS exige macOS/Xcode. EAS é alternativa opcional de build/distribuição, não novo backend ou storage obrigatório.

Manter workflow único, acrescentando validações/builds mobile em jobs separados quando aplicável. Assinatura apenas em contexto protegido, sem certificados no Git. Deploy da web/API continua automático na main; envio às lojas depende de contas e aprovação de publicação. Mudanças destrutivas de banco não serão usadas para atualizar versões mobile.

## 3. Navegação e jornadas

Até cinco áreas: **Início · Loja · Assistente · Ajuda · Conta**. Carrinho acessível no topo; serviços e operadoras agrupados em Ajuda; pedidos, favoritos, benefícios, privacidade e preferências agrupados em Conta. Navegação pública sem exigir cadastro para consultar catálogo ou usar ajuda.

| Tarefa | Jornada principal |
| --- | --- |
| Escolher aparelho | 1. Necessidades em perguntas progressivas → 2. Até três opções explicadas → 3. Comparar e decidir/adicionar ao carrinho |
| Compra recorrente | 1. Escolher → 2. Revisar carrinho e disponibilidade → 3. Confirmar pedido no servidor |
| Orçamento | 1. Escolher serviço → 2. Informar aparelho/problema → 3. Enviar e acompanhar protocolo |
| Operadora | 1. Escolher operadora → 2. Escolher problema → 3. Guia e canal oficial |
| Favorito | Marcar no produto; lista em Conta; abrir ou adicionar à compra |

Três passos são um objetivo de organização, não promessa de três toques: autenticação, consentimento, verificação e confirmação de pagamento podem exigir ações adicionais. Não esconder decisões relevantes para reduzir contagem.

Identidade atual azul/vermelho e logo preservadas. Cards com preço/disponibilidade, textos curtos, comparador de até três aparelhos, perguntas adaptativas e opção “Não sei”. Estados claros de carregamento, falha, catálogo insuficiente e ausência de rede. Safe areas, teclado, voltar do Android, fontes ampliadas, VoiceOver/TalkBack e alvos de toque adequados. Meta web WCAG 2.2 AA com testes manuais, não apenas ferramenta automática.

## 4. Backend e dados

Migrações incrementais, tenant em toda entidade e autorização no servidor:

- Produto: características técnicas estruturadas e opcionais, tipo, marca/modelo, origem da especificação e data de verificação. Não preencher características por suposição ou nome comercial. Compatibilidade de acessórios em relação explícita, aprovada pelo lojista.
- Favorito: relação cliente/produto única; preferências separadas com consentimento e versão do aviso.
- Serviço e SolicitaçãoServiço: catálogo, descrição, preço apenas quando definido, protocolo, estados e histórico. Agenda com capacidade e transação anti-conflito; somente para serviços em que a loja habilitar agendamento.
- Conteúdo: notícia/guia, operadora, tópico, fonte oficial, passos, revisão, validade, responsável e publicação. Campanhas reutilizam Promocao; acrescentar gestão e regra comercial validada.
- Dispositivo/assinatura push: canal web/Android/iOS, titular, consentimento, revogação, tokens protegidos; outbox de notificações com deduplicação e tentativas limitadas.
- Sessões: access token curto, refresh rotativo e revogável; browser com cookie HttpOnly/Secure e defesa CSRF; app com armazenamento seguro do sistema. Não guardar token nativo em AsyncStorage.
- IA: configuração protegida por loja/provedor, métricas de tokens/latência/custo, orçamento e versão do catálogo. API e preços sempre calculados pelo servidor.

Explicar exclusão/anônimização e retenção de registros comerciais; não apagar pedidos indiscriminadamente. Contas Apple/Google exigem fluxos de privacidade aplicáveis e revisão das declarações. Aviso ao cliente sobre processamento externo de IA; enviar somente necessidades sem identificação. Avaliar contratos, região e transferência internacional de dados antes de ativar provedores. Sem CPF, telefone, histórico de pedidos ou credenciais nos prompts.

## 5. Assistente: catálogo antes da IA

1. Backend filtra produtos ativos da loja, em estoque, dentro do orçamento e restrições. Dados ausentes permanecem desconhecidos; não usar ausência como atributo negativo nem inventar avaliações técnicas.
2. Ranking auditável por necessidades e características verificadas; selecionar até três IDs reais. Se não houver candidato, informar a limitação e oferecer mudança de orçamento ou ajuda humana, sem ampliar restrições silenciosamente.
3. Modelo interpreta respostas e explica o conjunto permitido em JSON validado. Não pode definir preço, estoque, realizar SQL, comprar ou escolher IDs fora da lista. Característica não sustentada é descartada; explicação segura baseada em regras permanece disponível, claramente identificada quando IA estiver indisponível.
4. Preço e disponibilidade são reconsultados antes de exibir resultado e novamente no checkout. Respostas técnicas citam os atributos/fonte registrados. Conteúdo das operadoras usa somente guias publicados/revisados, não conhecimento livre do modelo.

Adaptadores independentes para DeepSeek e Qwen; allowlist de endpoints e modelos, timeout, limites de entrada/saída, no máximo uma tentativa adicional e sem cadeia ilimitada de ferramentas. Cache por loja, preferências sem identificação e versão dos dados; invalidação por mudança de catálogo. Orçamento diário/mensal com bloqueio antes da chamada, limite por sessão/IP e concorrência limitada. Nada de rodar LLM ou GPU nesta VPS compartilhada.

**Seleção inicial para avaliação real:** DeepSeek Flash versus Qwen Flash, com alternativa de raciocínio mais cara somente se o benchmark demonstrar melhoria. Não assumir qualidade a partir do preço. Comparar pelo menos 50 cenários em português: orçamento baixo, tablet inexistente, especificação ausente, estoque esgotado, preferências conflitantes, injeção de prompt e indisponibilidade do provedor. Zero produtos/preços inventados é critério obrigatório; medir utilidade com revisão humana, latência p50/p95 e custo por recomendação. Sem chave, desenvolvimento prossegue, mas integração real não será declarada testada.

## 6. Central das operadoras

Começar com TIM, Vivo e Claro, incluindo pré/controle/pós, saldo/consumo, alteração de plano, chip/eSIM, internet/APN, sinal, chamadas/SMS, portabilidade, perda/roubo e aplicativos oficiais. Acrescentar outras operadoras apenas com fonte oficial validada. Não copiar tabelas de planos sem validade/região; direcionar ao catálogo oficial vigente quando a informação mudar com frequência.

Fontes verificadas nesta auditoria: [TIM Ajuda](https://www.tim.com.br/ajuda), [TIM eSIM](https://www.tim.com.br/ajuda/perguntas-frequentes/celular/chip-e-esim/esim), [Vivo dúvidas](https://vivo.com.br/para-voce/ajuda/duvidas), [Vivo eSIM](https://vivo.com.br/para-voce/produtos-e-servicos/para-o-celular/esim), [Claro atendimento](https://www.claro.com.br/atendimento), [Claro eSIM](https://www.claro.com.br/celular/esim). Estes links são fontes iniciais, não prova de que todos os tutoriais já foram pesquisados ou produzidos.

Cada artigo terá fonte e “Revisado em”. Proposta: revisão mensal de atendimento/planos e trimestral dos tutoriais, antecipada quando a fonte mudar. Checagem periódica de links gera pendência editorial, sem publicar automaticamente texto externo. Conteúdo vencido apresenta aviso e canal oficial; instruções sensíveis despublicadas se não puderem ser confirmadas. APN varia por operadora/aparelho: apresentar guia específico e não executar configurações no dispositivo.

## 7. PWA e offline

Manifest com identidade, scope/start_url, modo standalone, ícones 192/512 maskable e apple-touch-icon; instalação guiada por plataforma sem prometer prompt em todos os navegadores. Cache versionado e limitado de shell, imagens públicas e guias aprovados; limpeza de versões antigas. Mostrar atualização disponível sem recarregar no meio do checkout.

Não armazenar no service worker autenticação, pedidos privados, pagamento ou escritas. Catálogo salvo é apenas consulta, com data e aviso de indisponibilidade/preço não confirmado. Sem fila offline de compra. Favoritos locais pendentes, se adotados, não representam sincronização concluída. Limpar dados privados no logout e isolar contas no mesmo aparelho.

Web Push usa consentimento explícito, contexto HTTPS, inscrição VAPID e revogação; no iOS exige experiência adicionada à tela inicial e suporte a partir de 16.4. App nativo usa APNs/FCM, com opção de envio direto; o serviço de push da Expo é opcional. Push não conterá detalhes pessoais na tela bloqueada.

## 8. Publicação Android/iOS

Pesquisa vigente: Google Play exige target Android 16/API 36 para novos apps e atualizações desde 31/08/2026. Apple exige builds com Xcode 26+ e SDK iOS 26+ desde 28/04/2026; isso não significa exigir iOS 26 no aparelho. Proposta de suporte inicial Android 8+ e iOS 16+, condicionada aos mínimos do SDK Expo estável escolhido e testes; ajustar antes de implementar se incompatível.

Preparar package/bundle ID, ícones adaptativos, splash, links verificados, permissões mínimas, assinatura, AAB Android e archive iOS. Sem HTTP liberado globalmente. Navegação/armazenamento seguro, notificações de pedidos/serviços e abertura por deep links entregam valor nativo real. Compra de produtos físicos usa o fluxo comercial apropriado; não introduzir venda de conteúdo digital nesta etapa.

Play Console: verificação do desenvolvedor, Data Safety, política pública, classificação, testes exigidos para o tipo de conta e exclusão de conta no app e pela web. Apple: privacidade, manifests aplicáveis, exclusão de conta, classificação, conta de revisão, TestFlight e revisão de funcionalidade mínima. Apenas email/senha inicialmente; revisar regra de Sign in with Apple se login social entrar no escopo. Publicação depende da conta da Vox, certificados, dispositivos e análise das lojas; geração de projeto não equivale a app aprovado.

## 9. Etapas e critérios de aceite

| Etapa | Entrega | Critério principal |
| --- | --- | --- |
| 0 — Fundamentos | Sessões, tenant público determinístico, rate limits, contratos, privacidade e política promocional | Testes de isolamento, expiração/revogação, abuso e concorrência; fluxos existentes preservados |
| 1 — PWA e experiência cliente | Navegação até cinco áreas, instalação, offline seguro, favoritos e comparação | Instalação real Android/iOS; atualização não perde carrinho; offline jamais confirma compra |
| 2 — Serviços e conteúdos | Orçamentos persistentes, agenda opcional, central das operadoras, novidades e gestão pelo lojista | Protocolos reais, sem conflito de agenda, fontes/validade visíveis; CRUD autorizado |
| 3 — Assistente | Características verificadas, wizard adaptativo, ranking, DeepSeek/Qwen, configuração e custos | Integração real quando houver chave; nenhum ID/atributo/preço inventado; orçamento respeitado; fallback explícito |
| 4 — Notificações | Preferências e consentimento, web push e entrega durável | Recusa/revogação respeitadas, sem duplicatas, tokens inválidos limpos e falhas tratadas |
| 5 — Android/iOS | Telas nativas, API compartilhada, secure storage, deep links e push nativo | Builds instaláveis, testes em aparelhos/emuladores representativos e compra/serviço de ponta a ponta |
| 6 — Distribuição | AAB/archive assinados, documentação, materiais e checklist de publicação | Testes internos/TestFlight e submissão quando autorizada e contas disponíveis; limitações explícitas |

Validar cada incremento com PostgreSQL real no CI, navegadores mobile/desktop, testes de integração e revisão de acessibilidade. Smoke tests iOS Safari/PWA em dispositivo real são necessários; Chromium emulado não substitui Safari ou app nativo. Medir carregamento, payloads, memória, CPU/I/O e latência sob carga controlada antes/depois; metas iniciais: sem OOM, respeitar pool/limites atuais e evitar crescimento sem limite de cache/logs. Notificações inicialmente processadas com concorrência pequena e persistência no PostgreSQL; se precisarem de processo adicional, justificar com medição e orçamento explícito de recursos.

Dependência principal entre etapas: fundamentos antes de escritas comerciais novas; catálogo estruturado antes da recomendação técnica; consentimento antes de push; builds e testes antes da distribuição. Chaves, contas e certificados bloqueiam apenas sua ativação/validação correspondente, não as demais entregas.

## 10. Custos estimados e controle

Valores em USD consultados em 11/10/2026; sem conversão cambial, impostos, engenharia ou dispositivos. Reconfirmar no momento de contratar.

- DeepSeek Flash: entrada sem cache US$0,15–0,30/milhão e saída US$0,60–1,20/milhão, conforme horário. Simulação de 10 mil sessões com uma chamada de 3 mil tokens de entrada e 800 de saída: **US$9,30–18,60/mês**, antes de cache, retries e outras chamadas.
- Qwen3.5 Flash, implantação internacional consultada: entrada US$0,10/milhão e saída US$0,40/milhão. Mesma simulação: **US$6,20/mês**. Modelos/regiões têm preços distintos; comparar versão e região efetivamente contratadas.
- Proposta de teto inicial de IA: US$25/mês por loja, ajustável pelo lojista e com bloqueio automático. Não é contratação nem garantia de custo; custos reais dependem das sessões/tokens.
- Apple Developer Program: US$99/ano; Play Console: US$25 de inscrição única. Podem existir condições locais e taxas.
- Builds: GitHub macOS/Android ou EAS conforme cota/plano. Medir minutos de build antes de escolher plano pago; não estimar como gratuito ilimitado.
- VPS e storage atuais reutilizados. Não aumentar plano antes de medir. Backup, retenção e tráfego extra de imagens/push devem entrar na medição. Estimativa de prazo/custo de desenvolvimento requer capacidade disponível; não inventar valor de contratação.

## 11. Fontes técnicas oficiais

- [Expo Router](https://docs.expo.dev/router/introduction/), [EAS Build](https://docs.expo.dev/build/introduction/), [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) e [push](https://docs.expo.dev/push-notifications/overview/).
- [Capacitor: ambiente](https://capacitorjs.com/docs/getting-started/environment-setup).
- [MDN: cache de PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching) e [WebKit: push na tela inicial](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
- [Google Play: target API](https://support.google.com/googleplay/android-developer/answer/11926878) e [inscrição](https://support.google.com/googleplay/android-developer/answer/6112435).
- [Apple: requisitos vigentes](https://developer.apple.com/news/upcoming-requirements/), [revisão](https://developer.apple.com/app-store/review/guidelines/) e [inscrição](https://developer.apple.com/programs/enroll/).
- [DeepSeek: modelos/preços](https://api-docs.deepseek.com/quick_start/pricing/) e [Alibaba Qwen: modelos](https://www.alibabacloud.com/help/en/model-studio/models) / [preços](https://www.alibabacloud.com/help/en/model-studio/model-pricing).

## Decisão solicitada

Aprovar este escopo e a arquitetura **PWA no React existente + aplicativo React Native/Expo + backend compartilhado**, com implementação incremental das etapas acima. Após aprovação, trabalhar na main e publicar web/API pelo workflow autorizado. Não enviar aplicativo às lojas nem contratar serviços pagos sem autorização correspondente.
