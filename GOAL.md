# PWA e aplicativos do cliente — Vox Celular

Plano de execução em 13/10/2026. Trabalhar na main, reutilizando React/Vite, Expo Router, Express/Prisma e os dados reais da loja.

## Análise e decisão

A aplicação já possui PWA (manifest, service worker, instalação guiada e offline público), telas nativas Android/iOS, catálogo, compras/pedidos, serviços, novidades e guias oficiais de operadoras. Há configuração administrativa de DeepSeek/Qwen com credenciais cifradas, limite mensal, cache e fallback explícito por regras. Manter essas implementações; não criar outro backend ou substituir os aplicativos por wrappers.

## Tarefas

- [x] Inspecionar arquitetura, fluxos existentes e alterações locais do usuário.
- [x] Pesquisar requisitos oficiais Google/Apple, PWA, Expo e DeepSeek.
- [x] Completar necessidades do wizard: fotos, estudos, redes sociais e preferência simples; usar somente atributos conferidos e informar limites da comparação.
- [x] Aplicar o mesmo contrato nas telas web e nativas, preservando o fluxo de três etapas e compras existentes.
- [x] Preparar perfis de build Android/iOS e identidade visual nativa com recursos existentes.
- [x] Documentar requisitos de publicação e dependências externas, sem inventar certificados, contas ou links de download.
- [x] Compilar web/API, verificar tipos e bundles Android/iOS; executar testes de recomendação, IA, PWA e fluxos existentes compatíveis com o ambiente.
- [x] Commit apenas desta entrega; push na main e acompanhamento do GitHub Actions autorizado.
- [x] Registrar resultado e limites de validação neste arquivo.

## Dependências externas

Chaves e tarifas de IA configuradas pelo lojista são necessárias para chamada real; seleção local continua funcional sem elas. Contas Google Play/Apple/Expo, certificados e assinatura são necessários para builds de distribuição e publicação. Testes físicos Android/iOS e Safari exigem dispositivos/ambiente correspondente. Histórico do repositório registra bloqueio de GitHub Actions por faturamento: verificar execução atual após push. Nenhum deploy manual ou escrita direta na VPS está autorizado por este plano.

Alterações pré-existentes em schema Prisma, pedidos, promoções, carrinho e promoções do cliente pertencem ao trabalho local anterior e não serão incluídas no commit desta entrega.

## Evidências locais

Web/API compilados; TypeScript nativo aprovado; bundles Hermes Android e iOS exportados. Testes de ranking, limites/privacidade do provedor, orçamento/cache de IA, carrinho/configuração/links nativos e guias offline aprovados. PostgreSQL descartável + HTTP real validaram as novas necessidades, preço/estoque real do banco de teste, isolamento e fallback de IA sem chave. A suíte de banco também validou autenticação, concorrência de orçamento, notificações e fluxos existentes.

Chromium aprovou o wizard em 390/768/1440 px, ajuda das operadoras, instalação/manifest/ícones, fallback offline, API fora do cache e atualização segura do service worker. Testes de interface usam fixtures isoladas; não são prova de transação comercial em produção. Corrigido teste PWA antigo que consultava cache v1 embora o worker atual utilize v3 e módulos públicos de catálogo/guias.

Incluída Algar nas telas web/nativa, editor e validação de guias online/offline, com domínio oficial `algar.com.br`. Conteúdo editorial continua no banco existente; nenhum plano/preço de operadora foi inventado ou inserido em produção.

Requisitos e fontes oficiais pesquisados estão em [PUBLICACAO_APPS_CLIENTE.md](docs/PUBLICACAO_APPS_CLIENTE.md). Implementação local preparada; aceite final de publicação continua dependente de binários assinados, dispositivos, credenciais e revisão das lojas.

## Resultado de entrega

Implementação enviada à main no commit `6ceea37`. [Workflow do push](https://github.com/fernandinhomartins40/vox-celular/actions/runs/38500625417) e [workflow manual com builds Android/iOS solicitados](https://github.com/fernandinhomartins40/vox-celular/actions/runs/38500667713) terminaram em falha: GitHub informou que os jobs não iniciaram por pagamentos recentes com falha ou limite de gastos. Jobs de build nativo e deploy foram ignorados; nenhum APK/app de simulador foi gerado e este código não foi implantado por essas execuções. Resolver faturamento/limite e reexecutar os workflows; depois concluir testes físicos e distribuição assinada com as contas das lojas.

Execução local encerrada com as tarefas de código/documentação/testes acima atendidas e dependências externas explícitas. Objetivo final de aplicativos instaláveis publicados permanece pendente; não confundir preparação de código/bundles com publicação ou deploy.

## Atualizações de 14/10/2026

- Cadastro/login/refresh web corrigidos para aceitar os dois domínios HTTPS oficiais, com e sem `www`, compartilhando a política com CORS e mantendo outras origens bloqueadas. Testes unitários e HTTP/PostgreSQL locais aprovados.
- PWA inicia em `/app`, com catálogo/carrinho e atalhos de cliente. No modo instalado, acessos à raiz e à prévia da landing redirecionam para o app, preservando parâmetros e âncoras. Navegação comum do site continua disponível no navegador; testes Chromium em três tamanhos aprovados.
- Expo atualizado para 57.0.29 e os quatro pacotes apontados pelo verificador. Lockfile atualizado; `expo install --check`, tipos, bundles Android/iOS e validação mobile no Actions aprovados.
- Após o usuário tornar o repositório público, os jobs voltaram a iniciar. A execução revelou um teste antigo que não abria a aba de solicitação de serviço; corrigido e validado nos sete tamanhos dos painéis. Encontrado também overflow na tela offline com texto longo; corrigidas largura/quebra de texto e versão do cache, com teste offline Chromium aprovado.
- O deploy continua exclusivamente por Actions. O status final de cada execução pode ser consultado na aba Actions do repositório; builds de distribuição assinados, dispositivos e publicação nas lojas continuam com as dependências externas já descritas.

### Experiência de aplicativo solicitada pelo usuário

- Entrada do PWA em `/app/login`; após autenticação, início em `/app`. Links para a loja usam `/app/loja` e a landing não é renderizada no modo instalado.
- Interface própria de início e catálogo, independente da apresentação da landing, com cinco abas inferiores fixas, busca/categorias, cartões compactos e assistente em destaque. Reutilizados API, filtros de catálogo, detalhes de produto, carrinho e pedidos existentes.
- Consulta de leitura confirmou ausência de configuração de IA na produção. Integração DeepSeek/Qwen existe; ativação real depende da chave/tarifas configuradas pelo lojista. Sem isso, a seleção por regras continua explicitamente identificada.
- Compilação e Chromium validaram login, início, assistente, navegação inferior, catálogo próprio, preço atual no carrinho e proteção da landing em três tamanhos. A configuração do SDK para APK foi corrigida para não solicitar o pacote removido `tools`.
- A compilação Android revelou dependência nativa ausente: declarados Reanimated 4.5.1 e Worklets 0.10.1, versões recomendadas pelo Expo instalado. Compatibilidade, tipos, bundles e autolinking Android locais aprovados; incluída verificação de autolinking no Actions antes do Gradle.

### Discovery: redesign solicitado em 14/10/2026

- [x] Substituir formulário simultâneo por uma escolha por tela: formato, orçamento, uso e prioridade; três fases de progresso e recomendação final.
- [x] Tela cheia com azul Vox, ação amarela, elementos com volume e animações suaves; movimento reduzido respeitado. O menu inferior fica no app e sai do caminho durante a descoberta.
- [x] Recomendações reais apresentadas uma por vez, alternativas por toque e detalhes técnicos/acessórios em janela opcional. Preservados orçamento, revalidação de preço/estoque e autorização explícita da IA externa.
- [x] Botão central do menu inferior com vidro, relevo, brilho e borda luminosa animada.
- [x] Gerar e integrar três imagens 3D horizontais para o banner: desktop, tablet e mobile, selecionadas por `picture`, WebP de aproximadamente 13–26 KB. Prompts e arquivos em `docs/DISCOVERY_ASSETS.md`.
- [x] Validar encaixe de todas as escolhas e recomendações em seis dimensões, incluindo 320×568 e 844×390, sem rolagem da página nem controles cortados. Detalhes opcionais mantêm rolagem interna acessível quando necessário.
- [x] Validar consulta local/IA autorizada e fallback, critérios técnicos, mudança de preço/orçamento, compatibilidade e compra de acessórios, retorno ao app, login e imagens responsivas.
- [x] Implementação, compilação, lint dos componentes alterados e testes Chromium concluídos. Publicação pelo workflow automático da main; o status de implantação é registrado no GitHub Actions.
