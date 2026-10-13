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

### Incremento 8: gestão de acessos

Minha conta passa a listar sessões recentes em uma área expansível, indicando a atual e permitindo encerrar outros acessos com confirmação. API retorna apenas id e datas; nenhuma credencial. Remoção é restrita ao próprio usuário, revoga access/refresh daquela sessão e preserva acesso atual. Sessões inválidas por troca de senha ficam fora da lista. Tokens legados sem sessão podem não aparecer; trocar senha permanece o mecanismo para revogação global.

### Incremento 7: escolhas de privacidade

Personalização e notificações são desabilitadas por padrão para contas existentes e novas. Minha conta permite consentir/revogar com versão fixa do aviso, histórico transacional e repetição idempotente. Preferências e histórico estão na exportação pessoal. Autorização vinculada ao cliente/loja; UI não preseleciona consentimentos.

Ainda não há envio de notificações ou personalização ativa. Consentimento registrado não substitui permissão do aparelho nem análise dos contratos de IA. As próximas implementações devem consultar estas escolhas antes de utilizar preferências ou enviar campanhas. Exclusão/anonimização, recuperação de conta e política pública completa continuam pendentes.

### Incremento 6: cópia dos dados do cliente

Em Minha conta, clientes podem baixar JSON com cadastro, pedidos/itens/timeline, favoritos, histórico de pontos e resgates. Endpoint autenticado e exclusivo do titular; não inclui senhas, tokens ou configurações comerciais. Banco consultado em lotes de 100, com backpressure e cancelamento ao desconectar, sem montar todo o histórico em memória na API. Arquivo privado servido com no-store e attachment.

A exportação exclui registros criados após seu início; alterações concorrentes não são congeladas numa transação longa. Novas entidades de serviços/consentimento deverão ser incluídas quando implementadas. Exportação não implica exclusão de conta, anonimização ou conclusão da adequação de privacidade, ainda pendentes.

### Incremento 5: catálogo técnico estruturado

Produtos passam a ter tipo, marca, modelo, RAM, armazenamento, bateria, fonte HTTPS e indicador de conferência, todos opcionais. Migração preserva o catálogo, sem completar características antigas por inferência. O cadastro em três passos mantém os dados técnicos numa seção opcional do primeiro passo. Marcação como verificado exige fonte; data de conferência é registrada pelo servidor, preservada quando os atributos não mudam.

Comparador mostra campos estruturados, ausência de informação e fonte consultada pela loja. Testes de esquema cobrem limites, fonte, atributos desconhecidos e dados vazios; testes de API cobrem persistência/serialização e data de verificação. Características adicionais como câmera, conectividade, compatibilidade e dimensões ainda precisam ser ampliadas antes de fechar o assistente.

### Incremento 4: proteção de autenticação

Login, cadastro, renovação e alteração de senha possuem janela limitada de tentativas, resposta 429 e Retry-After. Identificadores são hashes, sem guardar e-mail nos contadores. Limite global de 300 requisições/minuto e 40 por identidade em cinco minutos; memória limitada a 2000 entradas, com expiração e recusa quando cheia. Não confia em cabeçalhos de IP enviados pelo cliente. Limites são por processo e reiniciam junto à API; proteção distribuída persistente e recuperação/verificação de conta permanecem pendentes. Teste cobre isolamento, capacidade e recuperação da janela.

### Incremento 3: sessões curtas e renovação

Novos logins recebem access token de 15 minutos ligado a sessão revogável. Refresh aleatório, armazenado somente como hash SHA-256 no PostgreSQL, com validade absoluta de 28 dias e rotação atômica. Até dez sessões por usuário; logout elimina a sessão no servidor. Troca de senha invalida access e refresh anteriores por versão da conta.

Web recebe refresh apenas em cookie HttpOnly, SameSite=Strict, Secure em origem HTTPS; login/refresh web exigem Origin configurado. Access token novo fica em memória, sem persistência no localStorage. O perfil sem token permanece para navegação; renovação em reload ou expiração acontece por cookie, com no máximo uma repetição da requisição. Aplicativo nativo recebe refresh para armazenamento seguro do sistema, a implementar junto ao app.

Compatibilidade: JWTs legados permanecem válidos até expirar ou ocorrer revogação por senha/logout. Perfis legados podem usar o token existente durante a transição; novo login remove essa persistência. Sem rede, saída local continua possível, mas não equivale a revogação comprovada no servidor. Privacidade, recuperação/verificação de conta e proteção geral de abuso ainda são etapas pendentes.

Referências: [cookies MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) e [sessões OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

### Incremento 2: favoritos e comparação

Favoritos persistentes por cliente/loja, limitados a 100 itens e com operações idempotentes. Produtos ocultos não aparecem; salvar favorito não reserva estoque. A tela `/area-cliente/favoritos` compara até três produtos com informações cadastradas, indicando dados ausentes sem inferir características.

Detalhes do produto permitem salvar favoritos. A adição ao carrinho atualiza preço e disponibilidade pela API e reutiliza o checkout existente. Testes de interface em 390/768/1440 passaram localmente. O CI inclui testes de API para autenticação, isolamento, repetição, visibilidade e ausência de efeitos sobre estoque.

Esta base não é a entrega completa do plano: não há aplicativo React Native, push, assistente de IA, catálogo offline ou novos serviços persistentes. Instalação real no Safari/iPhone e Chrome/Android ainda exige validação em dispositivos. Os ícones foram derivados programaticamente dos assets existentes, sem redesenhar a marca.

Continuar fundamentos de sessões/privacidade/tenant e catálogo estruturado; depois favoritos/comparação, serviços/conteúdos, assistente, notificações e aplicativos nativos conforme os critérios do plano. Checkout continua exigindo o backend e pagamento permanece aguardando confirmação; não foi adicionado gateway neste incremento.

### Proteção contra renovação de sessão pendente
A troca de conta e a saída invalidam renovações anteriores no cliente web. Respostas atrasadas não restauram o perfil antigo e requisições protegidas pendentes não são repetidas na conta nova. Teste determinístico cobre renovação compartilhada, troca de conta, saída e bloqueio de escrita pendente; incluído no workflow.


### Identificação explícita da loja pública
A descoberta pública usa chave única configurada (PUBLIC_STORE_KEY, padrão vox-celular), ou lojaId explícito validado. Não seleciona a primeira loja do banco. A migração atribui a chave à Vox existente somente quando seu nome é único; o bootstrap define a chave para bancos novos. Identificador inexistente retorna 404, identificador inválido retorna 400. O teste com PostgreSQL cobre duas lojas simultâneas. A consulta somente de leitura confirmou Vox Celular na produção antes do envio. Nenhuma alteração manual na VPS.

O teste visual compartilhado foi atualizado para responder à consulta de preferências adicionada ao painel; passou localmente em 390, 768 e 1440 pixels. A correção não substitui os testes reais da API.


### Escolha guiada pública e ranking do catálogo
Nova rota /assistente acessível pelo rodapé e pelo início da área do cliente: orçamento → uso/requisitos opcionais → até três opções com comparação e carrinho existente. Não exige conta para consultar. Preço e disponibilidade são reconsultados antes do carrinho, e aumento acima do orçamento bloqueia inclusão.

POST /api/assistente/recomendar valida critérios estritos, loja, produtos ativos, estoque, orçamento e requisitos técnicos conferidos. Dados ausentes não são inferidos; filtros mínimos desconhecidos não são relaxados. Ranking explicado por regras, explicitamente identificado sem IA. Preferência por armazenamento no trabalho e RAM em jogos usa somente dados verificados, com aviso de que RAM não garante desempenho. Consulta limitada a 500 itens com aviso quando há mais; proteção global de 180 consultas/minuto em memória limitada. Sem dados pessoais ou chamadas a provedores.

Validação local: builds API/web, lint, invariantes do ranking (incluindo 50 combinações determinísticas, sem alegar benchmark de IA), e navegação em 390/768/1440 pixels com preço atualizado, orçamento respeitado, critérios preservados e estado vazio. CI acrescenta testes com PostgreSQL real de isolamento, estoque esgotado, ocultação e limites. DeepSeek/Qwen, orçamento de IA, avaliação humana e benchmark real seguem pendentes no plano.


A inclusão pelo assistente também reconfirma tipo do aparelho e mínimos técnicos opcionais após reconsultar o catálogo. Se a verificação ou o mínimo deixam de existir, bloqueia o carrinho sem alterar a quantidade existente. Teste visual cobre bloqueio de RAM desconhecida e inclusão após confirmação atual válida.


### Base persistente de serviços
Catálogo Servico por loja com preço opcional (null significa orçamento, não gratuidade). Solicitação do cliente com aparelho/problema, protocolo único, idempotência e histórico persistente. Limite de 10 novas solicitações por cliente/dia e 100 serviços por loja. API separa consulta pública, gestão do lojista e acompanhamento do titular. Transições controladas, estados finais não reabertos e reenvio do mesmo status sem duplicar histórico. Migração aditiva sem excluir dados existentes.

Build da API validado localmente. Testes no workflow usam PostgreSQL real para catálogo, autorização, idempotência, preço desconhecido, ocultação e transições; resultado ainda pendente. Telas de gestão e solicitação, agenda com capacidade, exportação de dados de serviços e notificações ainda precisam ser implementadas. Não há cobrança ou agendamento simulado nesta entrega.


### Tela do cliente para serviços
Área do cliente → Meus serviços: escolher serviço, descrever aparelho/problema, revisar e enviar. Consulta catálogo e histórico reais da API; envio reutiliza chave idempotente em tentativas após falha sem mudar dados. Recibo preservado na tela sem depender de atualização subsequente. Histórico mostra mensagens e status da loja. Preço não definido aparece sob orçamento; envio não promete pagamento ou agendamento. Build/lint aprovados, layout dos painéis com nova rota passou em 390/768/1440. Teste de jornada completa adicionado ao workflow; validação final do envio em andamento. Gestão do lojista e agenda permanecem pendentes.

Jornada completa de serviços também passou localmente em 390 pixels, incluindo revisão e recibo de protocolo (fixtures de navegador; API real validada no CI).


### Gestão de serviços do lojista
Painel Serviços reúne solicitações e catálogo. Permite cadastrar/editar título, descrição, preço opcional e visibilidade; acompanhar protocolo, problema e histórico; salvar próximo status permitido com mensagem ao cliente. Build/lint e testes dos dois painéis passaram em 390/768/1440, incluindo cadastro sob orçamento e solicitação em três etapas. CI detectou fixture de solicitação pertencente a outra loja: API bloqueou corretamente com 404; teste corrigido para usar titular da loja e preservar verificação explícita de rejeição do outro tenant. Nova execução necessária para confirmar a API integralmente.


### Exportação dos dados de serviços
O download de dados pessoais inclui solicitações e mensagens do histórico somente do titular e da loja autenticada. Coleções paginadas em lotes de 100, sem carregar todo o histórico na memória da VPS; não inclui chave idempotente nem dados de outros clientes. Build API passou. Testes CI acrescentados para solicitação concluída, quatro eventos e ausência de registros no export de outra loja; execução real pendente.


### Agenda transacional de serviços
Serviços têm agendamento opt-in desabilitado por padrão. Lojista cria horários futuros até 180 dias, capacidade 1–20, duração até um dia; sobreposição por serviço recusada e máximo 200 horários futuros. Consulta pública informa vagas sem revelar reservas ou titulares. Cliente pode informar horário opcional na solicitação: disponibilidade, tenant, serviço, futuro e capacidade conferidos sob bloqueio transacional. Solicitações canceladas liberam capacidade; repetição idempotente não ocupa segunda vaga. Fechar horário bloqueia reservas novas e mantém registros existentes. Horários não são apagados ou remarcados automaticamente.

Build API aprovado localmente. CI acrescenta tentativa simultânea para uma única vaga (201/409), cancelamento/liberação, horário fechado, sobreposição, autorização e isolamento. Resultado real pendente. Controles visuais do lojista/cliente e inclusão do horário no export ainda precisam ser entregues.


### Seleção de horário pelo cliente
Formulário de serviços inclui horário opcional na segunda etapa apenas quando a loja habilita agendamento. Consulta vagas reais da API, indica lotação, permite atualizar horários ou seguir sem reserva e exibe horário de Brasília na revisão/recibo. Envia horarioId ao backend transacional; não afirma reserva antes do protocolo. Build/lint aprovados; teste de navegador específico para horários ainda pendente, junto dos controles visuais do lojista.


### Controles de agenda do lojista
Painel Serviços → Agenda de atendimento: selecionar serviço ativo, habilitar/desabilitar novas reservas, abrir horário com início/fim e capacidade, consultar quantidade reservada e fechar/reabrir horários. Entrada e exibição usam Brasília explicitamente, sem depender do fuso do navegador. Fechamento preserva reservas já recebidas. Build/lint aprovados. Testes visuais com rota de agenda adicionados; criação e concorrência reais continuam sob CI PostgreSQL.

Teste visual da agenda passou em 390/768/1440; exportação agora inclui início/fim do horário associado à solicitação do titular (API build passou).


### Validação da seleção de agendamento
Testes de navegador passaram em 390/768/1440 com agendamento habilitado, escolha de vaga disponível, opção lotada desabilitada, envio de horarioId e recibo de horário reservado. API PostgreSQL do workflow 38301137522 passou a etapa de migrations/runtime e avançou para testes reais de navegador (deploy ainda não confirmado). Agenda do lojista reunida no mesmo grupo visual de Solicitações/Catálogo, com quebra de linha para telas pequenas. Build/lint aprovados.


### Guias oficiais: persistência e revisão editorial
GuiaOperadora por loja com tópico, resumo, passos, fonte e canal oficiais, revisão/validade e responsável autenticado. API lojista cria rascunho e atualiza documento completo; publicação pública exige vigente e publicado, sem expor identificador do revisor. Máximo 100 guias/loja. Validação HTTPS e fronteira exata do domínio para TIM/Vivo/Claro, sem usuário/senha/porta alternativa, prazo até 180 dias e revisão não futura. Conteúdo em texto simples, sem HTML arbitrário.

Fontes oficiais confirmadas: https://www.tim.com.br/ajuda/tim-chip/esim ; https://vivo.com.br/para-voce/produtos-e-servicos/para-o-celular/esim ; https://www.claro.com.br/atendimento . Não foram copiados procedimentos completos nem criados guias públicos automaticamente. Build e testes de validação passaram localmente; CI real acrescenta persistência, rascunho, publicação, expiração e isolamento. CMS visual e jornada pública em três etapas ainda pendentes.


### Central pública de ajuda
Rota /ajuda no rodapé: operadora → assunto → guia e canal oficial, sem cadastro obrigatório. Nove tópicos previstos; somente guias publicados/vigentes retornados pela API, com fonte/revisão/validade e passos em texto. Sem guia, informa ausência e oferece atendimento oficial. A tela filtra validade também no cliente e atualiza a referência de tempo a cada minuto. Link para serviços da Vox e contato humano preservados. Build/lint e testes em 390/768/1440 passaram, cobrindo fonte, ausência de guia, retorno e layout. CMS visual e conteúdo revisado de todos os tópicos ainda pendentes; não há procedimentos inventados em substituição a conteúdo ausente.


### CMS dos guias
Painel Guias de ajuda cria/edita rascunhos, operadora/tópico, resumo, passos por linha, fonte/canal oficiais e revisão/validade. Prévia textual em tempo real, publicação confirmada pelo revisor; edição de conteúdo desmarca publicação no formulário. API valida domínio/datas, não confia no checkbox. Build/lint passaram e teste visual em 390 passou para rota, prévia e necessidade de reconferência. Cobertura 768/1440 do novo editor ainda aguarda repetição e CI.

Bloqueio externo de deploy identificado pela annotation do job 114988009243 (run 38302292365): GitHub Actions não iniciou por falhas recentes de pagamento ou spending limit da conta. Necessário corrigir Settings → Billing & plans no GitHub. Não há substituição por deploy manual SSH. Desenvolvimento e validação local continuam; não declarar estes commits implantados.


### Carregamento por rota do PWA
Páginas carregadas sob demanda com React lazy/Suspense declarados fora dos componentes. Painel mantém navegação durante carregamento do conteúdo; estado de carregamento acessível. Build principal agora 192,57 kB (61,01 kB gzip), acompanhado por runtime compartilhado e chunks específicos, em vez de reunir todas as páginas no único arquivo de aproximadamente 527 kB. Não comparar esse único arquivo como total de transferência: landing ainda usa seu chunk e dependências. CSS específico do painel/editor também separado pelo build. Build/lint aprovados; assistente e ajuda passaram em três tamanhos após mudança. Não há benchmark físico mobile nem redução de RAM VPS comprovada por esta alteração. Fonte técnica: https://react.dev/reference/react/lazy .

Painéis completos também passaram em 390/768/1440 após divisão, incluindo editor de guias, serviços e agendamento.


### Aplicativo nativo iniciado
Workspace apps/mobile com Expo 57.0.28, React Native 0.86.3 e Expo Router compatível. Catálogo em componentes nativos (FlatList/Image/Text), consulta mesma API HTTPS e dados reais. Infra de sessão: refresh no SecureStore, access em memória, rotação, timeout e proteção de geração contra respostas atrasadas; fila de escrita no storage evita renovação antiga sobrescrever sessão nova. Login visual e demais áreas ainda não implementados. Identificadores propostos br.com.voxcelular.cliente, sem alegar disponibilidade nas lojas.

Validação local: tipos, expo install --check e export Android/iOS passaram (bundles Hermes aproximadamente 2,7/2,4 MB). Não são APK/IPA assinados nem testes físicos. Workflow único ganhou job independente de validação nativa, export e artefato sete dias; resultado CI pendente pelo bloqueio de cobrança. Dockerfiles web/API instalam apenas seus workspaces, mantendo Expo fora das imagens VPS.

Auditoria npm identificou proxy-addr vulnerável; atualização compatível para 2.0.8 realizada. Build API e web/lint passaram após atualização. Outros avisos de dependências/toolchains permanecem a investigar; nenhuma alegação de audit limpo. Referências oficiais: https://docs.expo.dev/router/installation/ e https://docs.expo.dev/versions/latest/sdk/securestore/ .


### Conta e pedidos nativos
Telas nativas Minha conta/Meus pedidos ligadas à autenticação plataforma native e API existente. Login somente para cliente, email/senha com teclado/autocomplete adequados, mostrar/ocultar senha, limpeza da senha após login, restauração por SecureStore e logout com revogação no servidor quando rede confirma. Falha de rede na saída informa limitação e limpa credencial local. Pedidos consultam titular autenticado, itens/status/pagamento reais; não simulam liquidação. Navegação Stack nativa sem WebView.

Typecheck e export Android/iOS passaram após incremento. Isso prova tipos e bundling, não execução real de login em aparelhos. Cadastro, carrinho, timeline/detalhes completos, cinco áreas finais e demais funcionalidades ainda pendentes no nativo. Não foram usados tokens reais ou gravações em produção para validar telas.


### Ajuda nativa das operadoras
Tela nativa /ajuda: operadora → tópico → guias publicados/vigentes da mesma API. Não exige sessão, cita fonte/revisão/validade, usa canal oficial quando falta guia e não inventa passos. Links externos abrem pelo sistema somente após conferir HTTPS e domínio exato/subdomínio da operadora, sem credenciais/porta alternativa. Validade reavaliada a cada minuto; texto e controles nativos acessíveis. Typecheck e bundles Android/iOS passaram. Ainda falta validação funcional/foco/voltar em aparelho e cobertura de todos os conteúdos revisados, sem alegar publicação em lojas.


### Favoritos e comparação nativos
Catálogo permite salvar favoritos pela API autenticada; Minha conta abre lista atualizada com remoção e comparação de até três produtos. Especificações ausentes ou não verificadas aparecem como não informadas. Limite de seleção também protegido no atualizador de estado. Falhas de sessão oferecem acesso à conta; falha inicial não mantém indicador indefinidamente. Cabeçalhos nativos em português para favoritos e ajuda. Typecheck e export Android/iOS passaram; sem comprovação de execução em aparelho ou deploy, que permanece dependente do GitHub Actions.

### Preferências de privacidade nativas
Minha conta abre controles nativos de personalização e consentimento para notificações, consultados pela API autenticada. Alterações ficam como rascunho até confirmação PUT; payload explícito evita enviar campos extras rejeitados pelo contrato estrito. Aviso distingue consentimento de permissão do aparelho e informa que entrega push ainda não está ativada. Não presume autorização inicial, não afirma sucesso offline, e falha de sessão oferece retorno à conta. Typecheck e export Android/iOS passaram; execução física e push continuam pendentes.

### Serviços e agendamento nativos
Tela /servicos integrada ao catálogo, agenda opcional e solicitações reais: escolher serviço → informar aparelho/problema e horário opcional → revisar/confirmar. Preço nulo aparece como sob orçamento; envio não autoriza reparos nem pagamento. Horários de Brasília, vaga confirmada exclusivamente no protocolo da API. Histórico autenticado exibe estados e mensagens da loja. UUID via expo-crypto compatível SDK 57; tentativas com os mesmos dados na tela reaproveitam a chave, bloqueio imediato de envio duplo. Ainda não há recuperação de tentativa após fechar o aplicativo; esta limitação permanece a resolver. Não testa reserva real em produção.

Dependências conferidas por expo install --check; typecheck e export Android/iOS passaram. Android SDK/emulador não encontrados no caminho local padrão/PATH; somente Java detectado. Nenhuma alegação de APK/IPA ou teste físico. Referência do UUID: https://docs.expo.dev/versions/latest/sdk/crypto/ .

Teste .github/scripts/test-mobile-session-races.mjs executa o código real do cliente de API com fetch e SecureStore simulados: uma renovação concorrente, escrita antiga bloqueada após trocar conta, logout não restaurado por resposta atrasada e fila de storage preservando credencial mais recente. Passou localmente e adicionado ao job verify-mobile. Não representa execução do storage nativo no aparelho.

### Carrinho e checkout nativos
Catálogo permite adicionar produtos ao carrinho persistente, ajustar/remover quantidades, revisar preços/estoque e confirmar pedido na mesma API transacional. AsyncStorage contém IDs/quantidades e confirmação pendente vinculada ao titular; nenhuma credencial. Refresh continua no SecureStore. Limites de 30 produtos/100 unidades, operações locais serializadas. Chave e preços revisados salvos antes do envio, repetição após reiniciar recupera a mesma tentativa. Confirmação pendente impede edição/troca de titular; falha de rede mantém chave; rejeição definitiva permite ajustar. Troca de sessão durante persistência impede envio sob outra conta. Sucesso mostra código/total/pagamento reais, sem alegar pagamento concluído. Falha ao apagar a tentativa após confirmação permite repetição idempotente.

API aceita precoCentavos opcional por item, preservando clientes antigos, e recusa divergência antes de reservar estoque. Recuperação de pedido existente precede nova validação de preço. Testes PostgreSQL adicionados para divergência sem reserva, clientes antigo/novo concorrentes e recuperação; execução ainda pendente do CI por cobrança. Build API e typecheck nativo passaram. Testes locais do código real do carrinho com API/storage simulados passaram para concorrência, reinício, chave persistida, preço original, troca de conta, storage indisponível e rejeição definitiva. Não são teste físico ou teste de estoque real. Nova dependência compatível conferida pelo Expo. Referência: https://github.com/react-native-async-storage/async-storage .

### Cadastro nativo e política de novas senhas
Minha conta alterna Entrar/Criar conta, com nome, e-mail, telefone opcional, senha e confirmação. Usa /auth/register plataforma native e restauração existente no SecureStore. Limpa senha/confirmação após sucesso ou alternar formulário. Não inicia autorizações de personalização/push. Mantém carrinho para retomar a compra. Typecheck e bundles Android/iOS passaram; fluxo completo em aparelho ainda pendente.

Novos cadastros web/API/nativo exigem 12–72 caracteres e máximo de 72 bytes UTF-8 no servidor, evitando truncamento silencioso pelo bcrypt. Troca de senha aplica mesma política; login de senhas existentes não ganhou mínimo novo. Teste com bcrypt demonstra equivalência de entradas distintas após 72 bytes e valida rejeição, fronteiras ASCII, acentos e emojis. Build API e teste passaram. Casos de cadastro inválido sem criação de conta adicionados ao teste PostgreSQL do CI, ainda não executados por cobrança. Build/lint web passaram. Não há recuperação automática/verificação por e-mail implementada por este incremento.

### Acompanhamento nativo dos pedidos
Cada pedido permite expandir o histórico real da API, com etapa concluída/pendente, data quando informada e fuso de Brasília. Ausência de eventos não inventa etapas. Cancelamento usa canceladoEm, evitando apresentar pedido cancelado como recebido pelo status anterior. Lista atualiza ao focar a tela e mostra atividade durante atualização por gesto. Typecheck passou; bundles Android/iOS validados neste incremento. Teste físico de navegação e leitura assistiva permanece pendente.

### Gerenciamento nativo de acessos
Minha conta abre sessões reais da API, identifica o acesso atual, mostra início/expiração em Brasília e permite encerrar outro acesso mediante confirmação nativa. Só apresenta sucesso após DELETE confirmado. Atualiza ao focar a tela; erros oferecem acesso à conta. Não inventa aparelho/localização, pois esses metadados não são armazenados. Confirmação de uma lista antiga é recusada se a conta mudar antes de agir.

Cliente de API também revalida a geração após parsing JSON, impedindo retorno de dados privados da conta anterior quando a troca acontece durante a leitura do corpo. Novo teste dessa corrida passou, assim como testes de sessão/storage e carrinho. Typecheck passou. Bundles Android/iOS conferidos; testes físicos continuam pendentes.

### Assistente nativo por regras
Catálogo abre assistente com orçamento/aparelho → uso e memória opcional → até três opções da API. Compara RAM/armazenamento/bateria conferidos, informa dados ausentes, motivos/fonte e consulta limitada a 500 produtos. Sem recomendações inventadas quando não há resultado. Antes de adicionar, reconsulta catálogo e confere loja, disponibilidade, preço, orçamento, tipo e mínimos técnicos verificados; mudança de preço pede revisão explícita. Favoritos e carrinho reutilizam módulos existentes. Não exige autenticação para consultar. Interface identifica seleção por regras, sem afirmar integração DeepSeek/Qwen ainda pendente. Typecheck e export Android/iOS validados; jornadas físicas e testes funcionais desta tela em aparelho permanecem pendentes.

### Benefícios e resgate nativo persistente
Minha conta abre saldo/nível, recompensas, códigos recuperáveis e últimos movimentos reais. Confirmação nativa antes de descontar pontos; código só aparece após resposta da API. Tentativa é persistida no AsyncStorage sem credenciais, vinculada ao titular e recompensa, permitindo retomar após falha de rede/reinício. Outra conta/recompensa não reutiliza a tentativa. Troca de sessão antes de agir sobre lista antiga é recusada. Não afirma código utilizado antes do campo usadoEm.

API ganhou chaveResgate opcional, migração aditiva nullable e índice único cliente/chave. Transação serializada por cliente procura resgate confirmado antes de validar catálogo/saldo, devolvendo mesmo código sem novo débito, inclusive se recompensa foi desativada depois. Reutilização para recompensa diferente gera conflito. Chamadas web antigas sem chave seguem compatíveis. Build API e typecheck passaram; teste local do módulo com API/storage simulados passou para persistência antes de enviar, retomada, isolamento e falha de storage. Testes PostgreSQL adicionados para concorrência, débito único, conflito e recuperação, mas ainda pendentes do CI bloqueado por cobrança. Bundles Android/iOS validados; sem teste físico nem migração direta na VPS.

Confirmação nativa persiste também o custo revisado em pontos; API recusa custo alterado antes de novo débito. Recuperação de código existente segue anterior à validação, preservando tentativas já confirmadas.

### Compatibilidade comercial da API
Endpoint público /api/meta informa contrato 1 e capacidades de checkout com preço revisado e resgate idempotente. Nativo consulta sem cache próprio antes de confirmar; ausência/incompatibilidade/falha impede envio, preservando tentativas existentes. Evita depender dessas proteções quando o servidor ainda está numa versão antiga. Build API, typecheck e testes locais de carrinho/resgates passaram. Ativação permanece vinculada ao deploy via Actions, sem publicação nativa presumida.

Validação direta de capacidades: testes do cliente de API recusam metadados ausentes, contrato antigo, lista de capacidades vazia/inválida e rede indisponível; aceitam contrato/capacidade compatíveis. Testes comerciais verificam zero envios e nenhuma nova tentativa persistida quando o gate recusa. Todos passaram localmente com transporte/storage simulados, sem equivaler a teste de servidor em produção ou aparelho.

### Navegação nativa em cinco áreas
Expo Router agora organiza Início, Loja, Assistente, Ajuda e Conta em abas persistentes. Telas existentes foram movidas para grupo de rotas sem alterar seus URLs de conta/assistente/ajuda. Catálogo fica em /loja; retorno de carrinho/favoritos aponta diretamente para ele. Início usa logo real existente no storage público da aplicação e dados da API, com atalhos a catálogo, assistente e serviços. Carrinho no cabeçalho, serviços agrupados em Ajuda, pedidos/benefícios/privacidade/acessos em Conta. Telas detalhadas continuam no Stack com retorno nativo. Typecheck e export Android/iOS validados. Ainda requer teste físico de abas, deep links, fonte ampliada, TalkBack/VoiceOver e botão voltar.

### Busca e filtros do catálogo nativo
Loja oferece busca por nome/subtítulo/categoria sem distinguir acentos, categorias derivadas do catálogo, contagem de resultados e limpar filtros. Estado vazio distingue catálogo sem produtos de filtros sem correspondência. Controles ficam no cabeçalho rolável da FlatList, evitando ocupar toda a altura em aparelhos pequenos. Removidos atalhos duplicados das abas; assistente permanece como apoio contextual. Filtragem local do catálogo já carregado não comprova redução de consulta SQL ou payload; paginação da API permanece a analisar. Typecheck e bundles Android/iOS validados; teclado/foco e fonte ampliada em aparelho continuam pendentes.

### Troca de senha nativa
Conta oferece senha atual, nova senha e confirmação, com exibição opcional e validação inicial. Usa PATCH autenticado existente; confirma alteração somente após resposta, limpa campos e sessão local sem tentar renovar credenciais já invalidadas pelo tokenVersion. Falha ao limpar storage é informada sem esconder sucesso do servidor. Conta reconsulta ao receber foco para refletir saída/alteração de acesso. Typecheck e testes de corridas de sessão passaram; bundles Android/iOS validados. Teste físico e verificação de alteração real no PostgreSQL seguem pendentes; não houve escrita direta na VPS.

### Consentimentos vinculados à sessão nativa
Cliente de API oferece requestForSession para vincular leitura/gravação à revisão que preparou a tela. Privacidade reconsulta ao focar e grava somente na mesma sessão que carregou as escolhas; troca de conta recusa antes de enviar e após resposta. Teste executa código real com fetch simulado e comprova zero gravações de consentimento da tela antiga sob nova conta; sessão atual permitida. Typecheck, testes de corridas e bundles Android/iOS validados; verificação física continua pendente.

### Adaptadores DeepSeek e Qwen
Módulo aiProvider implementa chamadas HTTP não streaming aos endpoints oficiais, timeout de dez segundos, redirects proibidos, resposta limitada a 64 KiB e saída de até 512 tokens. Configuração estrita de provedor/modelo e workspace Qwen de Singapura; não aceita URL arbitrária. Envia somente uso/tipo e IDs/especificações verificadas de até três candidatos previamente filtrados pelas regras. Não envia nome comercial, preço, loja, identidade, histórico ou fonte textual. Resultado aceita somente IDs distintos do conjunto fornecido; nenhuma explicação livre ou preço do modelo é exibido. Métricas retornam tokens/latência, sem logar chave ou erro bruto do provedor.

Build API e teste local com transporte simulado passaram para privacidade, endpoints, saída inventada/duplicada, campos extras e limite de bytes. Job CI acrescentado. Módulo ainda não conectado à rota pública: configuração criptografada por loja, orçamento transacional, métricas persistentes e ativação com chaves reais permanecem necessários. Nenhuma chamada paga ou teste real de modelo executado. Referências verificadas: https://api-docs.deepseek.com/api/create-chat-completion/ e https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope .

### Cálculo monetário para orçamento de IA
Módulo aiCost calcula custo em micro-USD com BigInt, tarifas configuráveis por milhão de tokens e arredondamento para cima, sem preços de provedor fixados no código. Valida entradas inteiras/limites e verifica espaço para gasto mais reservas pendentes sem overflow de soma. Testes de fronteira, fração monetária, limite exato e excedido passaram; build API passou e job CI acrescentado. Ainda é base matemática: não há reserva persistente/transacional, configuração por loja nem cobrança real validada. Não declara teto mensal aplicado até integração com banco/rota.

### Reserva persistente do orçamento de IA
Migração aditiva cria OrcamentoIa por loja/mês e ReservaIa com valores BigInt em micro-USD. Serviço reserva sob advisory lock transacional por loja/mês, considerando gasto e reservas já abertas. Liquidação é vinculada à loja, serializada e idempotente; falha ambígua contabiliza máximo reservado, sem liberar orçamento que pode ter sido cobrado. Reservas interrompidas permanecem ocupando orçamento até reconciliação: não expiram automaticamente. Configuração e integração com adaptadores/rotas ainda pendentes, portanto teto comercial não está ativado.

Prisma generate e build API passaram, assim como teste matemático de custo. Teste PostgreSQL adicionado ao CI com fixture descartável, para concorrência, isolamento, liquidação única, custo incerto e meses separados. Não executado localmente nem em produção; validação do banco depende do CI. Nenhuma migração aplicada por SSH.

### Orquestração de chamada e orçamento
Serviço interno budgetedRecommendation valida necessidades, reserva custo máximo permitido pelo envelope (100 mil tokens de entrada/512 saída), chama adaptador e liquida consumo retornado. Orçamento insuficiente impede dispatch; falha ambígua liquida máximo reservado. Sem cache de saldo em memória. Tarifas/chaves/limites devem vir de configuração confiável do servidor, nunca entrada pública. Testes com dependências simuladas verificam ordem reserva/chamada/liquidação e falhas; build e testes passaram. Integração de configuração criptografada por loja, aviso de processamento externo, rota pública e métricas detalhadas seguem pendentes. Não representa teste PostgreSQL ou chamada real de provedor.

### Configuração protegida de IA por loja
Migração aditiva ConfiguracaoIa e GET/PUT /api/ia/config exclusivos do lojista. Provedor/modelo fixos compatíveis com adaptadores, workspace Qwen validado, limite/tarifas inteiros em micro-USD. Chave opcional para preservar existente somente no mesmo provedor; troca exige chave nova. Criptografia AES-GCM reutiliza cofre com contexto loja/provedor. GET nunca retorna segredo/ciphertext. Configuração serializada por loja; chave de cofre ausente com registros de IA também exige restauração, evitando criar chave nova sobre dados existentes. Build/Prisma generate passaram. Formulário, testes de isolamento em banco e ativação via rota pública ainda pendentes; ativo false é explícito, sem chamada externa paga.

### Formulário do lojista para IA
Rota /admin/configuracoes/ia e item no menu oferecem provedor, workspace Qwen, chave mascarada, teto mensal e tarifas por milhão em USD. Converte valores decimais em micro-USD inteiros; valida faixa e seis casas. GET não recebe chave; campo vazio preserva chave no mesmo provedor, troca solicita nova. Após salvar limpa chave do estado e informa integração ainda inativa. Usa componentes/classes compartilhados e carregamento por rota. Build/lint aprovados; testes visuais e integração PostgreSQL deste formulário permanecem pendentes. Não afirma chave verificada nem cobrança ativada.

### Consulta do orçamento no painel
GET /api/ia/config/orcamento exclusivo do lojista consulta mês corrente UTC por loja autenticada, gasto, reservas e teto da configuração. Painel apresenta valores USD e explica contabilização conservadora de falhas incertas, sem equiparar estimativa à fatura do provedor. Sem secret/ciphertext na resposta. Builds API/web e lint passaram; integração PostgreSQL e teste visual permanecem pendentes. Chamadas ainda não ativadas pela configuração.

Teste Chromium do formulário de IA passou em 390/768/1440: payload monetário correto, campo password, chave limpa após salvar, ausência do segredo no texto da página, sem overflow horizontal/erros JS. Endpoint simulado para isolar interface; não comprova persistência/criptografia real nem conexão ao provedor. Script incluído no workflow único após instalação do browser.

Teste de integração PostgreSQL da configuração de IA acrescentado ao runtime CI: cliente GET/PUT recusado, limite inválido, ciphertext sem chave literal, resposta sem segredo, preservar chave no mesmo provedor, troca exigindo chave nova, isolamento de configuração/orçamento entre lojas. Usa somente chaves fictícias e não faz chamadas a provedores. Sintaxe validada localmente; execução real não comprovada enquanto workflow não roda com sucesso.

### Remoção da configuração de IA
DELETE exclusivo do lojista remove somente configuração/chave da loja autenticada, serializado com salvamento. Painel pede confirmação e limpa formulário após resposta. Orçamentos/reservas não são apagados. Testes CI adicionados para cliente recusado, outra loja sem efeito e repetição idempotente; execução PostgreSQL ainda pendente. Builds API/web, lint e sintaxe do teste passaram localmente.

Conversão monetária do formulário extraída para aiMoney: interpreta dólares por parte inteira/fração decimal, sem multiplicar decimal de ponto flutuante. Limita seis casas e US$ 1.000; rejeita vírgula, expoente, espaço, fração menor que microdólar e excesso. Testes de fronteira passaram; build/lint passaram e cobertura incluída no CI.

### Rota opcional de recomendação externa
POST /assistente/recomendar-ia integra configuração criptografada e orçamento persistente, exigindo autorizaProcessamentoExterno true com necessidades estritas. Limite global de dez solicitações por minuto/dois voos simultâneos, consulta até 501 produtos e regras determinísticas antes da chamada. Modelo somente ordena/subseleciona IDs dos três candidatos; motivos/preços não são gerados pelo modelo. Fallback explícito por regras se configuração/provedor/orçamento indisponível. Rota /recomendar segue local. Interface ainda não oferece opção externa; ativo false na configuração significa ausência de ativação automática pela UI, não inexistência da nova rota opt-in. Build e testes de adaptador/orquestração passaram. Testes CI acrescentados para recusa sem autorização e fallback sem configuração; não executados em banco. Métricas detalhadas, cache e testes reais com chaves seguem pendentes.

### Opção de IA externa na web
Segundo passo do assistente oferece checkbox opcional desmarcado, explicando envio de uso/dados técnicos ao DeepSeek/Qwen e ausência de identidade/histórico/pagamento. Sem marcar usa /recomendar; marcado usa /recomendar-ia com autorização explícita. Ajustar escolhas desmarca novamente. Resultado exibe aviso da API para IA ou fallback. Build/lint passaram; teste browser desta autorização e chamada real ainda pendentes. Não há autorização persistida no perfil nem personalização por histórico neste incremento.

Teste Chromium do assistente em 390/768/1440 passou após opção externa: default sem envio externo, payload autorizado estrito, fallback visível e autorização desmarcada ao ajustar escolhas. Regressões existentes de orçamento, critérios técnicos, preço atualizado e catálogo vazio também passaram. Respostas simuladas, sem chamada paga ou validação de modelo real.

### Autorização externa no assistente nativo
Segundo passo nativo oferece controle checkbox acessível, desmarcado inicialmente, com aviso sobre uso/dados técnicos enviados e identidade/histórico/pagamento não enviados. Consulta escolhe rota local ou externa conforme autorização, desmarcando ao ajustar escolhas. Resultado usa aviso real da API. Typecheck e bundles Android/iOS validados; teste físico de consentimento e chamadas reais ainda pendentes.

Avisos da configuração atualizados após integração da rota: API distingue ativacaoAutomatica false de consultaExternaDisponivel, sem afirmar provedor validado. Painel explica que salvar não chama provedor, mas consultas explicitamente autorizadas podem fazê-lo conforme orçamento. Builds API/web, lint e sintaxe CI passaram. Chaves reais, sucesso no provedor e deploy continuam não comprovados.

### Recuperação do cofre de credenciais
Falha ao inicializar chave do cofre limpa somente a promise rejeitada, permitindo tentar novamente após restauração/correção do arquivo sem reiniciar API. Inicialização concorrente continua compartilhada; chave válida permanece em memória. Teste com arquivo temporário real passou para chave inválida → corrigida, round-trip criptográfico, contexto de outra loja recusado e ausência da chave fictícia em ciphertext. Build passou; teste incluído no CI. Nenhum segredo real ou arquivo da VPS acessado.

### Cache limitado de seleção por IA
Rota externa reutiliza somente IDs de consultas equivalentes por até cinco minutos, com máximo de 100 entradas e eviction. Hash considera necessidades, updatedAt da configuração e produtos candidatos completos; mudanças de preço/estoque/especificações invalidam seleção. Conteúdo em cache nunca inclui chave ou perfil do cliente. Catálogo é consultado antes de reaproveitar, IDs continuam restritos aos candidatos atuais. Cache é local ao processo e perdido no restart; chamadas concorrentes iguais ainda podem ocorrer. Build e testes de expiração, limite, cópia isolada e hash por entrada passaram. Economia real não medida sem chamada ao provedor.

### Base da fila consentida de notificações
Migração aditiva NotificacaoCliente registra evento por cliente/loja, chave única de deduplicação, conteúdo curto, destino interno permitido, status/tentativas/próxima tentativa. Serviço interno enqueueClientNotification recebe transaction client para gravar junto à operação comercial, confere tenant e consentimento sob o mesmo advisory lock da alteração de preferências. Revogação cancela PENDENTE na mesma transação. Prisma generate e build passaram. Ainda não integrado a eventos comerciais nem worker/assinaturas/push; consentimento será revalidado na entrega. Teste concorrente PostgreSQL e retenção da fila continuam pendentes; não afirma entrega de notificações.

### Eventos de atualização de atendimento
Mudança válida de status enfileira aviso genérico na mesma transação do histórico, somente com consentimento ativo. Conteúdo não inclui diagnóstico/mensagem privada; destino /servicos. Repetição do status retorna antes de gravar novo evento. Testes CI acrescentados para evento único, ausência de texto privado, cancelamento pela revogação e bloqueio de eventos novos após retirada. Build e sintaxe passaram; teste PostgreSQL e entrega push ainda pendentes.

### Eventos de atualização de pedido
PATCH de status serializa por pedido e compara estado anterior dentro da transação. Só mudança efetiva enfileira aviso genérico para /pedidos, mediante consentimento atual; repetição do status não gera evento. Conteúdo não inclui itens/preço/pagamento. Histórico e aviso ficam na mesma transação. Build API passou. Testes PostgreSQL específicos de concorrência/eventos de pedido e transporte push seguem pendentes; não afirma entrega.

Cobertura PostgreSQL dos eventos de pedido adicionada ao runtime CI: fixture descartável, duas mudanças simultâneas para mesmo status, evento único, destino correto, texto sem nome de produto, cancelamento pela revogação e ausência de novos eventos. Sintaxe validada localmente; não declarar integração aprovada antes de executar CI.

### Consulta dos avisos do cliente
GET /api/notificacoes exige cliente autenticado e filtra cliente/loja no servidor, até 100 registros recentes, campos públicos explícitos e no-store. Não mostra avisos cancelados ou quando consentimento atual está retirado. Não marca fila como entregue: inbox e transporte push são independentes. Build passou; testes CI adicionados para autenticação, papel, revogação, isolamento e campos privados ausentes. Execução PostgreSQL, interface e push ainda pendentes.

### Avisos no aplicativo nativo
Conta abre /avisos, consulta API autenticada vinculada à revisão de sessão e atualiza ao focar. Lista limitada pelo servidor, datas de Brasília, estados de carga/falha/vazio e link às preferências. Destinos validados por chave própria em allowlist de pedidos/serviços/benefícios; não abre URL arbitrária da resposta. Interface distingue lista de avisos de entrega push. Typecheck e bundles Android/iOS validados; teste físico e integração real com fila permanecem pendentes.

### Avisos no painel web
Rota protegida /area-cliente/avisos usa header/cards compartilhados, consulta API autenticada, atualização manual e estados de erro/carga/vazio. Links somente allowlist interna, datas Brasília e acesso às preferências. Carregamento por rota mantém página fora do bundle inicial. Build/lint passaram; teste visual específico e integração real da fila permanecem pendentes. Lista não comprova push entregue.

Teste Chromium de avisos passou em 390/768/1440: link interno permitido, URL externa sem link, atualização para estado vazio sem manter dados antigos, sem overflow/erros JS. Usa respostas simuladas; não equivale à integração de fila/PostgreSQL ou push. Build web final passou e teste acrescentado ao workflow.

### Validade dos avisos
Novos eventos expiram após sete dias; deduplicação não renova validade. Consulta autenticada filtra expiresAt futuro. Migração aditiva preserva registros existentes, com validade inicial já expirada para evitar notificações antigas reapresentadas. Prisma generate/build passaram; teste CI acrescentado para aviso vencido oculto, ainda não executado em banco. Worker deverá usar a mesma validade; retenção/limpeza física ainda pendentes.

### Retenção limitada da fila de avisos
API agenda uma passagem a cada seis horas, sem processo adicional, removendo no máximo 100 avisos expirados há mais de 30 dias. Seleção ordenada por validade/id e revalidação no DELETE; índice aditivo correspondente. Não remove pedidos, serviços ou consentimentos. Não sobrepõe passagens no processo e cancela timer no shutdown. Build e teste de cálculo de corte passaram; operação de exclusão com PostgreSQL ainda requer validação de integração. Capacidade máxima de limpeza atual é 400 registros/dia; medir volume antes de ajustar frequência/lote. Não houve limpeza manual na VPS.

Teste PostgreSQL de retenção acrescentado ao CI com guard NOTICE_RETENTION_TEST=ci-disposable: 105 avisos antigos, limite de 100 por passagem, preservação do corte exato e aviso válido, cadastro preservado e cleanup da fixture. Build e teste matemático passaram localmente. Teste de banco ainda não executado; função de retenção opera globalmente no banco descartável, portanto este script não deve ser usado em produção.

Guard de integração reforçado: testes de orçamento IA e retenção exigem CI=true, flag descartável e conexão exatamente correspondente ao host/usuário/banco/credencial fictícia do Compose CI. Não expõe URL ao falhar. Teste unitário do guard recusou host VPS, credencial/banco distintos, ausência de CI e URL inválida; build passou. Isso reduz execução acidental fora da fixture; não substitui execução de integração pendente.

### Avisos na exportação do titular
Exportação autenticada inclui coleção avisos com conteúdo, estado e validade dos registros retidos, inclusive expirados/cancelados, sem depender do consentimento atual de entrega. Filtra cliente/loja, usa cursor e lotes de 100 e não exporta chave de deduplicação ou IDs internos do tenant. Build e sintaxe passaram. Testes CI acrescentados para registros expirados, campos internos ausentes e isolamento do outro cliente; execução PostgreSQL permanece pendente.

### Política de tentativas de push
Módulo notificationRetry define até cinco tentativas, intervalos de 1/5/15/60 minutos e recusa agendamento no limite ou após validade. Falha de assinatura inválida retorna revogação; permissão retirada cancela. Datas/tentativas inválidas recusadas. Build e testes de fronteiras passaram; cobertura incluída no CI. Ainda não integrado ao worker/transportes, portanto não comprova entrega nem limpeza efetiva de tokens.

### Validação preparatória de assinaturas web push
Schema estrito valida endpoint HTTPS de hosts exatos Google/Mozilla/Apple, sem userinfo, porta alternativa ou fragmento; tamanho da URL e chaves base64url limitados. Testes de spoof de domínio, loopback, credenciais na URL, formato e campos extras passaram com build. Não é validação criptográfica da chave pública nem entrega real; suporte aos endpoints efetivamente retornados por cada navegador precisa de teste físico e poderá ampliar allowlist com evidência. Referências: https://mozilla-services.github.io/autopush-rs/ e https://bugs.webkit.org/show_bug.cgi?id=247128 .

Validação das chaves web push reforçada: p256dh deve decodificar para ponto não comprimido de 65 bytes válido em prime256v1; autenticação e chave pública devem ter base64url canônico. Teste gera chave pública real localmente, aceita formato válido e recusa ponto zero/texto de comprimento válido mas inválido e bits finais não canônicos. Build/testes passaram; sem conexão a serviço push.

### Persistência protegida de assinaturas web push
Migração aditiva AssinaturaPush, endpoint hash único e conteúdo criptografado com contexto loja/cliente. PUT autenticado exige cliente/consentimento, serializa com revogação e endpoint, limite dez registros por cliente e recusa transferência entre titulares. DELETE remove somente assinatura própria/loja. Revogar consentimento desativa assinaturas sem reativá-las automaticamente depois; cofre ausente também exige restauração se houver assinaturas. Resposta nunca devolve endpoint/chaves e informa entregaConfigurada false. Prisma/build/testes de validação passaram. Testes PostgreSQL de cadastro/ownership, UI de permissão, transportes e worker continuam pendentes; não comprova entrega real.

### Consulta e testes das assinaturas push
GET /push/web lista até dez assinaturas próprias com id/ativo/datas, sem endpoint/hash/ciphertext. Build passou. Runtime CI ganhou fixtures de chave P-256 local e endpoint fictício: cadastro consentido, segredo ausente da lista, cliente sem consentimento recusado, tentativa de assumir endpoint de outra conta em conflito, remoção estrangeira sem efeito, revogação desativa e remoção própria. Sintaxe passou; execução PostgreSQL ainda pendente. Nenhum endpoint fictício recebe envio.

### Gerenciamento web das assinaturas
Minha conta do cliente inclui consulta sob demanda de assinaturas, estado ativo/desativado e data, sem metadados inventados de aparelho nem segredo. Remoção individual pede confirmação e só atualiza lista após DELETE confirmado. Estado vazio/carga/erro e sucesso acessíveis. Build/lint passaram; teste visual específico e persistência real ainda pendentes. Cadastro via permissão do navegador e entrega push continuam em implementação.

### Assinaturas push na exportação do titular
Coleção assinaturasPush adicionada à exportação em lotes/cursor, com id/ativo/datas de registros próprios e tenant explícito. Nenhum endpoint/hash/ciphertext/chave de autenticação exportado. Teste runtime CI cobre registro correspondente, ausência de campos sensíveis e outro titular vazio. Build/sintaxe passaram; execução PostgreSQL permanece pendente.
