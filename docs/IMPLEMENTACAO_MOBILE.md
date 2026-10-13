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

### Claim transacional da fila
Serviço interno claimNotification seleciona um evento pendente/valido com consentimento e assinatura ativa, usando FOR UPDATE SKIP LOCKED e marca PROCESSANDO/incrementa tentativa dentro da transação. Rede ficará fora da transação. Retirada de consentimento cancela também PROCESSANDO; worker deverá reconferir imediatamente antes de enviar. Não existe reclaim automático de processo interrompido, pois entrega pode ser ambígua; recibos por assinatura/reconciliação ainda necessários. Serviço não está agendado nem envia push. Build e teste de política de tentativas passaram; concorrência SQL ainda não executada em PostgreSQL.

### Registros por assinatura para entrega
Migração aditiva EntregaPush cria chave única aviso/assinatura, tentativas, próximo envio e confirmação. Claim prepara até dez registros na mesma transação, skipDuplicates sem redefinir estado existente. Remover aviso/assinatura limpa registros relacionados por cascade; não altera pedidos/serviços. Prisma generate e build final passaram. Transporte, confirmação real, recuperação e testes SQL concorrentes continuam pendentes; esquema não garante sozinho ausência de duplicação remota.

### Revogação das entregas por assinatura
Revogar notificações cancela EntregaPush PENDENTE e PROCESSANDO do titular e da loja na mesma transação que desativa assinaturas e cancela avisos. O teste runtime cria dois eventos distintos para respeitar a chave única aviso/assinatura e verifica ambos os cancelamentos. Build API, sintaxe do teste e git diff --check passaram localmente; execução da integração PostgreSQL ainda pendente. Essa alteração não constitui transporte push nem pode recolher uma mensagem já enviada.
### Seleção de entrega por assinatura
claimNotificationDelivery seleciona uma entrega elegível, obtém o bloqueio do usuário e reconfere consentimento, tenant, assinatura ativa, validade, estado e limite de tentativas antes de marcar PROCESSANDO com bloqueio de linha. Remoção de assinatura usa o mesmo bloqueio do usuário. Rede permanece fora da transação; transporte deve reconferir autorização imediatamente antes do envio. Teste PostgreSQL descartável adicionado ao workflow para concorrência e exclusão de consentimento/assinatura inativa; build API e diff check passaram, execução SQL ainda pendente. Não há worker agendado nem envio push neste incremento.
### Autorização imediatamente antes do transporte
authorizeNotificationDelivery fornece apenas ao transporte interno os dados de uma entrega PROCESSANDO, com tentativas válidas, aviso PROCESSANDO e não expirado, consentimento atual e assinatura ativa pertencente ao mesmo cliente/loja. Não há rota pública para esse retorno, que inclui credenciais cifradas. Integração cobre revogação depois do claim, desativação, expiração exata, tenant divergente e entrega ainda não assumida. Build API e diff check passaram. Docker local não possui daemon Linux disponível, portanto testes PostgreSQL não executados localmente. A consulta é uma autorização no instante da leitura; não promete recolher mensagens já aceitas nem eliminar a janela entre leitura e rede. Transporte e worker continuam pendentes.
### Recebimento push no service worker
Service worker trata push e notificationclick com texto genérico fixo, sem exibir título/mensagem recebidos na tela bloqueada. Payload é limitado a 4096 caracteres; tag utiliza ID restrito, sem renotificação; caminhos usam lista fechada de pedidos/serviços/benefícios e fallback avisos. Clique fecha notificação, foca janela já no destino ou abre somente URL da própria origem. Teste executa o código real em VM com APIs simuladas e cobre conteúdo privado, JSON inválido, payload excessivo, prototype key, URL externa e reuso de janela. Teste, lint web e build passaram; esse teste não substitui entrega real/browser/dispositivo. Não há inscrição via permissão, VAPID ou transporte ativo ainda. Referências: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/push_event e https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/notificationclick_event.
### Chaves VAPID persistentes
Aplicação gera par P-256 em arquivo vapid.json junto ao cofre existente (volume secrets), com criação exclusiva e modo 0600. Chave pública/privada são validadas por correspondência criptográfica e base64url canônico. Promise compartilhada impede geração concorrente no processo; arquivo existente prevalece entre processos. Arquivo perdido com assinaturas exige restauração; corrupção não provoca rotação automática. Retorno é copiado para evitar mutação do cache. GET autenticado /push/config para cliente expõe somente chave pública e entregaConfigurada=false, pois o transporte ainda não foi ativado. Build e teste local de geração/persistência/recuperação passaram; testes HTTP acrescentados ao runtime CI ainda não executados com PostgreSQL. secrets/ já está ignorado no git. Backup do volume deve preservar também vapid.json. Referência do formato VAPID e integração: https://github.com/web-push-libs/web-push.
### Transporte web push cifrado
Adicionado web-push para gerar requisições com aes128gcm e VAPID por chamada, sem configuração global compartilhada. sendWebPush valida assinatura/destino/subject, envia somente ID e destino cifrados, usa TTL limitado pela validade e teto de um dia, topic hash estável, POST sem redirects e timeout de 10 segundos. Corpo da resposta é descartado sem leitura/log. Resultado distingue aceite remoto, assinatura inválida (404/410), rejeição, falha temporária e resultado ambíguo de rede; não há retry interno. Aceite remoto não representa entrega ao aparelho. Build e testes locais de geração de request com HTTP simulado e persistência VAPID passaram. Nenhum envio real, worker automático ou confirmação em dispositivo foi executado. Integração com settlement da fila, inscrição no navegador e validação real permanecem pendentes. Biblioteca/documentação oficial: https://github.com/web-push-libs/web-push.
### Registro durável do resultado de transporte
settleNotificationDelivery grava somente PROCESSANDO com a tentativa esperada, sob bloqueio do usuário, sem sobrescrever resultados terminais, cancelamentos ou uma nova tentativa. Reconferência de cliente/loja/assinatura/consentimento preserva revogação. Aceite remoto grava ACEITA/confirmadaEm (confirmação do serviço, não do aparelho); falha de rede grava INCERTA sem replay; 404/410 desativam assinatura e cancelam outras entregas abertas dela; falhas temporárias têm backoff e limite de cinco tentativas. Política unitária e build passaram. Integração PostgreSQL cobre tentativa divergente, resposta atrasada, resultado duplicado, assinatura inválida e revogação, mas execução SQL ainda pendente. Transporte não está agendado; fechamento agregado de eventos e composição do worker seguem pendentes.
### Composição do ciclo de processamento
processNotification prepara no máximo um evento e assume no máximo uma entrega por chamada. Carrega configuração antes de retirar trabalho; autoriza antes de abrir credenciais e novamente após o cofre; troca de ciphertext/revogação impede usar a assinatura anterior. Transporta somente ID estável do aviso e destino, sem título/mensagem privados. Resultado é registrado na tentativa assumida; exceção de transporte fica ambígua, falha do cofre antes de rede é rejeição local. Nenhum timer/processo é iniciado pela importação. Build e testes com dependências simuladas passaram, incluindo ordem, revogação, rotação, falhas de configuração/cofre/rede e payload mínimo. Políticas de resultado e transporte também passaram novamente. Composição real com PostgreSQL, encerramento agregado de eventos, agendamento, inscrição browser e testes em aparelho permanecem pendentes. Não houve envio real.
### Encerramento agregado dos avisos
finalizeNotifications usa uma instrução SQL com FOR UPDATE SKIP LOCKED, lote máximo 25 e atualização somente de avisos PROCESSANDO. Entregas abertas ou estados desconhecidos impedem fechamento; cancelamento anterior é preservado. Estados resultantes distinguem CONCLUIDA (todos aceitos pelo serviço), PARCIAL, INCERTA, FALHA e CANCELADA (inclusive sem entregas). Processador executa fechamento depois de settlement e quando não encontra entrega. Build e teste de composição passaram. Integração PostgreSQL ampliada para estados abertos/desconhecidos, aceite/falha/cancelamento, resultado parcial e limite de lote; execução SQL permanece pendente. Não equivale a recibo no aparelho nem ativa timer/transporte automaticamente.
### Respeito ao Retry-After do serviço push
Transporte interpreta Retry-After em segundos ou data HTTP, com cabeçalho limitado a 80 caracteres; prazo relativo usa o instante estimado de recebimento (tempo monotônico decorrido incluído). Valores numéricos muito grandes permanecem futuros e não causam fallback antecipado. Settlement agenda o maior prazo entre backoff interno e prazo remoto, sem ultrapassar expiração nem cinco tentativas. Datas inválidas/passadas não reduzem o backoff. Build, testes de transporte/política/processador passaram localmente com HTTP simulado. Persistência SQL/entrega real continuam pendentes. Formatos conforme RFC 9110 seção 10.2.3: https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3.
### Expiração limitada da fila
expireNotifications seleciona até 25 avisos vencidos PENDENTE/PROCESSANDO com bloqueio e SKIP LOCKED, usando índice de validade existente. Na mesma transação, entregas pendentes viram EXPIRADA; entregas em processamento viram INCERTA, porque podem já ter alcançado o serviço. Aceites existentes são preservados na agregação (conclusão total ou parcial); não há replay da incerteza. Processador executa expiração antes de assumir novo trabalho e não assume entrega se essa etapa falhar. Build e teste de composição passaram. Integração PostgreSQL ampliada para limite de lote, data exata e distinção pendente/em processamento; execução SQL segue pendente. Nenhum agendamento automático ativado.
### Worker serial no processo da API
Worker usa setTimeout após conclusão da rodada, sem sobreposição: 15 segundos após trabalho, 60 segundos ocioso ou com falha, no máximo uma requisição por rodada. Não cria contêiner/processo adicional. Configuração WEB_PUSH_ENABLED=true com subject VAPID válido é necessária; Compose usa origin HTTPS da loja por padrão e permite desativação. CI com CORS_ORIGIN HTTP permanece sem envio. Endpoint de configuração informa se o worker está configurado, sem prometer entrega. SIGTERM/SIGINT param novos agendamentos imediatamente e aguardam a rodada atual antes de desconectar Prisma, dentro do timeout geral existente. Build, testes locais de serialização/recuperação/stop/composição e Compose config com valores fictícios passaram. Espera fixa de teste corrigida para sinal de conclusão. Execução SQL real, medição VPS e entrega em dispositivo continuam pendentes; nenhum deploy ocorreu durante esta implementação.
### Inscrição web pelo cliente
Painel da conta oferece preparar e permitir neste aparelho. Preparação confere navegador/contexto seguro, consentimento salvo, configuração ativa e service worker, sem pedir permissão. Botão seguinte chama requestPermission sincronamente no gesto; após concessão, reutiliza inscrição compatível ou cria nova, envia somente endpoint/keys e confirma cadastro após resposta do servidor. Geração de sessão é conferida em cada fronteira assíncrona para impedir trocar titular durante o fluxo. Falha de cadastro tenta remover somente inscrição recém-criada; inscrição existente com chave VAPID divergente exige ação explícita no navegador. Testes do helper com APIs simuladas, lint e build passaram. Não comprova entrega browser/aparelho; validação visual específica e inscrição/entrega real seguem pendentes.
### Desativação do aparelho atual
Painel oferece ação explícita com confirmação para desativar neste aparelho. Helper consulta assinatura local, remove no servidor pelo hash do endpoint sob tenant/usuário/bloqueio e então chama unsubscribe, conferindo sessão em cada fronteira. Falha ou retorno falso do navegador não vira confirmação indevida de conclusão. Rota não revela a existência de assinatura de outro titular e remoção usa cascade existente das entregas. Testes simulados cobrem ordem servidor/navegador e troca de sessão; builds API/web, lint web, sintaxe runtime e diff check passaram. Runtime CI ampliado para isolamento, role, endpoint inválido e cascade; execução PostgreSQL e teste browser real continuam pendentes.
### Validação do painel de notificações em navegador
Teste Playwright executado no Chromium local com build de produção em 390/768/1440 pixels. Verificou erro de consentimento sem pedir permissão, preparação sem prompt, gesto explícito para ativar, confirmação após cadastro, desativação servidor/navegador, ausência de erros JS e ausência de overflow horizontal. API e objetos push foram simulados; não comprova inscrição/entrega reais nem Safari. Script adicionado ao workflow. Docker Desktop local foi iniciado para tentar testes SQL, mas a consulta ao engine retornou HTTP 500; PostgreSQL permanece não validado nesta rodada.
### Detalhes de produto no aplicativo nativo
Catálogo e favoritos oferecem Ver detalhes para uma tela com imagem/estado sem imagem, descrição, até 12 especificações cadastradas, preço/disponibilidade e características estruturadas somente quando verificadas. Compra e favoritos reutilizam componentes existentes; foco da tela recarrega produto para reduzir dados desatualizados. GET público /produtos/:id exige loja e produto ativo, retorna 404 para outra loja/inativo e no-store. Build API, typecheck, sintaxe runtime e exportação Expo Android/iOS passaram. Runtime CI inclui consulta individual, loja divergente, parâmetro ausente e produto inativo; execução PostgreSQL e teste em aparelho permanecem pendentes. Exportação de bundles não equivale a build instalável/publicação.
### Compra direta e atualização dos favoritos nativos
Favoritos reutilizam CartButton com loja/estoque reais do produto, permitindo adicionar e abrir carrinho sem retornar ao catálogo. useFocusEffect atualiza lista/preços/estoque ao voltar, limpa dados antigos durante carga e mantém somente escolhas de comparação ainda existentes; troca de sessão limpa seleção. Remoção fica vinculada à revisão da sessão em que a lista foi carregada, usando requestForSession e impedindo resposta antiga de alterar uma tela carregada para outra revisão. Typecheck, testes existentes de sessão/carrinho e exportação Android/iOS passaram. Interação real da tela em aparelho e compra real seguem pendentes; testes existentes validam os serviços compartilhados, não a interface nativa completa.
### Sessão vinculada nos pedidos e serviços nativos
Pedidos limpam lista/acompanhamento na recarga e usam requestForSession. Solicitação de serviço captura revisão do formulário; envio/histórico usam essa revisão e resultados antigos não atualizam uma tela vinculada a nova sessão. Foco com mudança de sessão limpa dados do aparelho/problema, protocolo e chave da tentativa, evitando reaproveitar formulário de outro titular. Na mesma sessão, protocolo concluído é preservado ao navegar e voltar. Typecheck, testes existentes de concorrência de sessão e exportação Android/iOS passaram. Esses testes cobrem o serviço compartilhado de sessão; interação real das telas, agenda e solicitação em aparelho continuam pendentes.
### Atendimento contextual do pedido no app
Pedido nativo oferece Falar com a loja sobre este pedido. Consulta perfil e loja vinculados à revisão em que os pedidos foram carregados; confere sessão antes de abrir HTTPS wa.me com telefone brasileiro validado e código do pedido codificado. Mensagem não inclui itens, preço, dados pessoais ou pagamento; cliente revisa/envia no WhatsApp. Cancelamento direto permanece conforme regra atual do backend (lojista), sem alterar permissão comercial. Typecheck, teste de destino/telefone/encoding e exportação Android/iOS passaram. Teste de abertura real no aparelho e atendimento humano seguem pendentes; nenhum envio de mensagem executado pelo agente.
### Logout e assinatura do navegador
Logout web captura inscrição com espera máxima de dois segundos, inclui endpoint no encerramento e tenta unsubscribe local sem bloquear saída. Backend remove apenas hash pertencente ao usuário/loja e revoga sessão na mesma transação; outros aparelhos permanecem. Geração da sessão impede logout atrasado de limpar um novo login. Espera da rede é limitada a dez segundos para permitir saída local; offline/erro não comprova revogação remota ou unsubscribe. Builds API/web, lint, testes de captura/timeout e concorrência de sessão passaram. Runtime CI adiciona isolamento entre clientes, remoção de um aparelho e token revogado, mas execução PostgreSQL continua pendente. Fluxo completo de logout/push em browser real ainda não validado.
### Integração PostgreSQL local e correção de fuso
Executor `.github/scripts/test-local-postgres.ps1` inicializa cluster exclusivo descartável PostgreSQL portátil, somente 127.0.0.1:54329, aplica migrations e executa testes de orçamento IA, retenção e entrega push. Exige modo local-disposable, marcador explícito e URL fixa; guarda continua recusando produção. Dados/binários ficam em .git; servidor é parado no finally e variáveis do processo restauradas. Cluster de teste usa trust apenas no loopback, 16 MB shared_buffers/20 conexões e não é adequado a produção. Caminhos curtos evitam problema ANSI dos utilitários Windows com diretório Usuário.
PostgreSQL 16.15 real revelou comparação incorreta entre parâmetro Date (timestamptz) e DateTime Prisma (timestamp UTC) em sessão America/Sao_Paulo: aviso no instante exato de expiração ainda era autorizado. Consultas de autorização, claim e expiração agora vinculam ISO UTC com cast explícito timestamp. Integração força fuso não UTC em todas as novas conexões para impedir regressão também no CI. Todas as 22 migrations, build API, guarda, orçamento concorrente/isolamento, retenção e suíte de entrega passaram após correção. Banco de produção não foi acessado nem alterado. Entrega em dispositivo, runtime HTTP completo e publicação mobile continuam pendentes.
Reprodução no Windows com binários PostgreSQL oficiais já extraídos: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .github/scripts/test-local-postgres.ps1 -PostgresBin CAMINHO/pgsql/bin`. Bypass vale só para esse processo; não altera política do Windows. Distribuição oficial: https://www.postgresql.org/download/windows/ e https://www.enterprisedb.com/download-postgresql-binaries.
### Validação HTTP com PostgreSQL local real — 13/10/2026
`test-api-local.mjs` integrado ao executor portátil inicia API real com banco exclusivo vazio, uploads/cofre temporários e worker remoto desativado. Recusa banco não descartável, loja existente e porta TCP ocupada. Valida cadastro nativo, restrição de papel, produto individual isolado por loja, três compras concorrentes com mesma chave e um único pedido/decremento, cancelamento repetido com uma única devolução de estoque, disputa de dois clientes por uma vaga, liberação após cancelamento, inscrição push com consentimento e metadados sem segredos, logout alheio sem remover assinatura, logout do titular preservando outro aparelho, token revogado e rotação/rejeição de replay do refresh. API e PostgreSQL foram encerrados após a suíte; diretório temporário é verificado antes de remoção e variáveis restauradas. Execução completa terminou com código zero, incluindo 22 migrations, build e integrações de IA/retenção/entrega. Não valida Nginx, Docker, backup, OOM, dispositivos ou recebimento real de push; esses requisitos permanecem pendentes. Nenhum acesso à VPS ou chamada a marketplace/IA/push externo foi realizado.

### Privacidade e favoritos no HTTP real — 13/10/2026
Suíte local ampliada e executada com código zero: três inclusões simultâneas de favorito permanecem únicas; outro cliente não lista/remove favorito do titular e lojista recebe 403. Exportação própria contém apenas metadados push, exportação alheia permanece vazia. Revogação do consentimento cancela aviso PROCESSANDO e entregas PENDENTE/PROCESSANDO, desativa inscrições e recusa novo cadastro. Renovação não ressuscita trabalho cancelado. Todas as verificações anteriores e 22 migrations também passaram na mesma execução; API/banco locais encerrados. Não comprova recall de mensagem já aceita por serviço remoto ou interação em aparelho.


### Atendimento contextual de serviços no app — 13/10/2026
Confirmação e histórico nativos oferecem Falar com a loja sobre este atendimento. Consulta perfil e telefone da loja usando a revisão da sessão, confere titular antes de abrir HTTPS wa.me e preenche somente protocolo; não inclui aparelho, problema ou dados pessoais. Helper compartilhado mantém destino fixo, valida telefone brasileiro e codifica texto. Usuário revisa/envia no WhatsApp; nenhum envio automático. Typecheck, testes de telefone/protocolo/encoding, concorrência de sessão e exportação de bundles Android/iOS passaram. Não equivale a APK/IPA, publicação ou abertura real no aparelho; mudança/cancelamento de horário continuam sujeitos ao atendimento e regras atuais.


### Estado assíncrono dos serviços vinculado à sessão — 13/10/2026
Envio nativo registra a revisão da sessão no bloqueio de operação. Mudança de conta no foco reinicia bloqueio e indicadores; finally de envio anterior só libera sua própria revisão, evitando interferir no envio da nova conta. Erros, histórico e indicadores de contato também exigem revisão atual do formulário e da sessão. Typecheck e testes existentes de concorrência do serviço de sessão passaram; estes não validam a interação React Native da tela, que continua pendente em aparelho. Sem alteração de regras comerciais ou banco.


### Favoritar e abrir lista no app — 13/10/2026
FavoriteButton limpa mensagens e operação ao receber foco ou mudar produto. Envio usa revisão da sessão e identidade da operação; resposta após troca de conta, saída ou nova operação não modifica estado. Bloqueio por ref evita duplo toque antes da renderização. Após confirmação do servidor, Ver meus favoritos abre diretamente a lista, reduzindo navegação. Typecheck e testes existentes do serviço de sessão passaram; testes desses serviços não comprovam interação/renderização do componente, ainda pendente em dispositivo.


### Preferências nativas sem resposta atrasada — 13/10/2026
Tela de privacidade limpa preferências e bloqueio ao receber foco e invalida operação ao sair. Salvar captura revisão carregada e identidade exclusiva; retorno, erro e finally só alteram tela da mesma operação/sessão. Ref impede duplo toque antes da renderização; formulário de conta antiga não é enviado para novo titular. Typecheck e suíte existente do serviço de sessão passaram. Não representam teste interativo da tela React Native; esse permanece pendente. Nenhuma mudança de consentimento em produção foi executada.


### Aviso de atualização disponível do PWA — 13/10/2026
Registro do service worker detecta worker waiting ou nova instalação concluída com controlador existente e informa nova versão em aviso acessível, dispensável. Primeira instalação não anuncia atualização. Orienta concluir atividade e fechar todas as abas antes de reabrir; não chama skipWaiting nem recarrega checkout. Build web e lint passaram. Teste browser real com duas versões e múltiplas abas permanece pendente; aviso não comprova ativação da versão nova.


### Atualização PWA validada em Chromium real — 13/10/2026
Novo teste serve duas versões do worker real em origem local exclusiva e abre duas abas. Primeira instalação não exibe aviso; update instala worker waiting, exibe aviso responsivo, mantém marcador da página (sem reload), permite dispensar e preserva waiting. Após fechar ambas as abas, reabertura verifica ativação sem aviso. Execução Playwright Chromium terminou com código zero e sem erros de página. Teste adicionado ao job browser existente, usando mesmo servidor/ferramentas. Safari/iOS e checkout interativo completo continuam pendentes; este teste comprova ciclo do worker e preservação de página, não compra real.


### Solicitação autenticada de encerramento — 13/10/2026
Nova entidade única por cliente com FK restritiva e status SOLICITADA, sem exclusão automática ou alegação de anonimização concluída. GET/POST privacidade/encerramento exigem cliente e isolam loja/titular. POST exige senha atual, confirmação explícita e limite de tentativas; transação revalida hash e reaproveita solicitação existente. Resposta esclarece conta ainda ativa e preservação de registros. PostgreSQL real aplicou 23 migrations; build e suíte HTTP passaram, incluindo senha incorreta, papel lojista, duas solicitações simultâneas únicas, isolamento e conta preservada. UI web/native, tratamento pelo lojista, decisão de retenção e encerramento efetivo permanecem pendentes; esta entrega é somente a primeira parte do fluxo.


### Solicitação de encerramento no aplicativo — 13/10/2026
Privacidade inclui componente de solicitação/status: consulta ao receber foco, senha atual protegida e confirmação explícita antes do envio, protocolo somente após resposta do servidor. Explica conta ainda ativa e registros preservados; erro oferece consultar status antes de repetir. Operação e leitura vinculadas à sessão/foco; ref impede duplo toque e senha é limpa após tentativa/saída, sem persistência local. Typecheck e testes do serviço de sessão passaram. Interação em aparelho, tela web, gestão da solicitação e encerramento efetivo permanecem pendentes. Não representa conformidade final de publicação das lojas.


### Solicitação de encerramento na web — 13/10/2026
Minha conta do cliente inclui seção de solicitação/status com senha atual, confirmação explícita, bloqueio de envio duplicado, consulta após erro e protocolo somente após resposta da API. Usa geração da sessão e escopo ativo para descartar resposta após troca de conta/desmontagem. Senha não é persistida e é limpa após tentativa. Texto informa que solicitação não é exclusão concluída. Build e lint passaram após corrigir atualização síncrona no effect. Interação/layout em navegador, gestão pelo lojista e encerramento efetivo continuam pendentes.


### Formulário web de encerramento validado em Chromium — 13/10/2026
Playwright executou UI de produção em 390/768/1440 px com API simulada: botão exige senha e confirmação, erro de senha aparece, consulta/retry limpa senha e confirmação, protocolo exibido após resposta e recuperado na recarga, sem overflow ou erros de página. Script incluído no job browser existente. API/PostgreSQL reais foram validados separadamente na entrega anterior; este teste não comprova integração browser-backend real, Safari, encerramento efetivo ou dispositivo nativo.


### Visibilidade de solicitações para o lojista — 13/10/2026
API de clientes inclui somente id/status/data da solicitação vinculada ao cliente da loja autenticada, com no-store. Painel Clientes oferece filtro persistido em URL, contagem, indicador e protocolo no detalhe existente, evitando criar outra página. Nenhum botão declara conclusão ou apaga registros. Builds API/web, lint e 23 migrations/suíte HTTP PostgreSQL real passaram, incluindo metadados corretos para lojista e 403 para cliente. Interação/renderização do filtro no navegador e encerramento efetivo ainda pendentes.


### Início de análise de encerramento — 13/10/2026
POST privacidade/encerramento/:id/analisar exige lojista da mesma loja e corpo vazio; bloqueio transacional serializa transição SOLICITADA para EM_ANALISE e repetição é idempotente. Não altera conta/dados nem sinaliza conclusão. Clientes web/native e detalhe administrativo apresentam Em análise com texto legível. HTTP/PostgreSQL real passou para restrição ao cliente, inexistente 404, duas chamadas simultâneas e status visível ao titular; 23 migrations, builds, typecheck e lint passaram. Botão do lojista, auditoria de responsável, encerramento efetivo e testes interativos desta transição permanecem pendentes.


### Iniciar análise pelo detalhe do cliente — 13/10/2026
Painel Clientes oferece ação Iniciar análise do encerramento no detalhe existente, atualizando status somente após confirmação API. Bloqueio por ref impede duplo clique; geração de sessão/identidade de operação descartam respostas antigas e cleanup invalida ao sair. Filtro e indicador incluem SOLICITADA e EM_ANALISE para manter pendências visíveis. Build e lint web passaram; API já validada com HTTP/PostgreSQL real. Interação browser deste botão, auditoria de responsável e encerramento efetivo permanecem pendentes.


### Auditoria do início de análise — 13/10/2026
Solicitação registra id do lojista autenticado e instante de início na mesma transação que muda status. FK restritiva preserva referência; campos opcionais não fabricam histórico para registros antigos. Repetição/concorrrência mantêm responsável/data originais. Auditoria não é exposta nos endpoints do cliente. PostgreSQL real aplicou 24 migrations; build e suíte HTTP passaram, incluindo responsável correto, data válida e data inalterada após repetição. Exibição administrativa da auditoria, encerramento efetivo e validação interativa permanecem pendentes.


### Auditoria administrativa e teste do lojista — 13/10/2026
Lista e resposta de início de análise expõem nome/data somente ao lojista, para exibição imediata no detalhe; endpoints cliente continuam sem identificação do responsável. Playwright Chromium com API simulada passou em 390/768/1440: filtro remove cadastro sem solicitação, inicia análise uma vez, mostra nome/data, remove ação e mantém pendência após fechar diálogo, sem overflow/erros. Teste aguarda alteração assíncrona da URL antes de conferir filtro. Builds API/web e lint passaram. Script adicionado ao workflow. Integração HTTP da projeção nova, aparelho nativo e encerramento efetivo permanecem pendentes.


### Compatibilidade explícita de acessórios — 13/10/2026
Nova relação única acessório/aparelho com observação, responsável e data de aprovação. PUT exige lojista, produtos ativos da mesma loja e tipos explícitos acessorio/celular/tablet; transação limita 100 aparelhos por acessório sem inferir pelo nome. GET público exige loja/produto, omite responsável e relações com produtos inativos, limite 100. DELETE restringe ambos os produtos à loja autenticada. PostgreSQL real aplicou 25 migrations; build e HTTP passaram para cadastro/repetição, papel, tipos, outra loja e produto inativo. DELETE compilado, mas ainda sem integração específica. Gestão web, apresentação web/native, ranking/assistente e revisão de relações após alterações de atributos permanecem pendentes. Esta é base de compatibilidade, não funcionalidade integral concluída.


### Compatibilidades nos detalhes nativos — 13/10/2026
Detalhe consulta relações públicas da mesma loja após carregar produto e apresenta item relacionado, observação e data da aprovação; link abre diretamente detalhe relacionado. Estados de carga, erro/retry e vazio são distintos, com orientação para confirmar acessório quando não cadastrado. Respostas após sair/mudar produto são descartadas e falha de compatibilidade não impede exibir o produto. Typecheck, testes existentes de sessão e exportação Android/iOS passaram; esses testes não validam interação da tela nem compra em aparelho. Gestão web, exibição web, integração assistente e revisão ao mudar atributos ainda pendentes.


### Compatibilidade no detalhe web — 13/10/2026
Modal público consulta relações da loja/produto e mostra nome, observação e data conferida. Botão Ver este produto consulta produto ativo atual e abre no mesmo modal, sem voltar à busca. Falha é distinta de compatibilidade ausente; ausência orienta confirmar antes de comprar. Consulta é de leitura e não deduz compatibilidade. Respostas após fechamento são descartadas. Build e lint passaram. Validação interativa/responsiva deste componente e gestão de relações pelo lojista permanecem pendentes; API de consulta foi validada separadamente com PostgreSQL real.


### Compatibilidade web validada em navegador — 13/10/2026
Playwright Chromium em 390/768/1440 com API simulada passou: detalhe exibe observação aprovada, botão consulta produto relacionado e troca modal, item sem cadastro mostra desconhecimento e erro 503 aparece como falha sem alegar ausência. URL consultada usa loja explícita; sem overflow/erros de página. Script incluído no job browser existente. Não comprova UI com backend real nem interação nativa/Safari; gestão e revisão de compatibilidade seguem pendentes.


### Compatibilidade vinculada aos atributos conferidos — 13/10/2026
Aprovação guarda cópia dos atributos técnicos dos dois produtos. Consulta compara conteúdo com ordenação estável de campos e omite relações com atributos divergentes; preço/estoque não invalidam conferência. Reaprovar atualiza cópias/responsável/data. Relações anteriores à migration recebem cópias vazias e exigem conferência correspondente antes de aparecer com atributos tipados. Se atributos forem restaurados exatamente ao conteúdo aprovado, a conferência original volta a corresponder; não há inferência por nome. PostgreSQL real aplicou 26 migrations e suíte HTTP passou para alteração, reaprovação, mudança só de preço e DELETE restrito ao lojista. Build passou. Gestão e indicação administrativa de relações desatualizadas continuam pendentes.


### Gestão de compatibilidade na edição do produto — 13/10/2026
Consulta admin autenticada apresenta relações atuais/desatualizadas sem expor cópias de atributos ou identificador do aprovador. Edição de produto existente tem seção recolhível: seleciona produto ativo de tipo correspondente, descreve conferência, aprova ou remove e recarrega relações após resposta. Usa atributos salvos e explica necessidade de salvar tipo antes de relacionar; cadastro de relação é independente do formulário de preço/imagem ainda não salvo. Operação vinculada à sessão/escopo e bloqueio por ref. Builds API/web e lint passaram; 26 migrations e suíte HTTP PostgreSQL real passaram, incluindo classificação atual/desatualizada e 403 cliente. Teste interativo completo do formulário permanece pendente. Não declara integração assistente concluída.


### Editor de compatibilidade validado em Chromium — 13/10/2026
Playwright com API simulada em 390/768/1440 passou: edição abre seção, aprovação exige produto/observação e envia par explícito, resposta atualiza lista/limpa campos, remoção elimina relação e reabertura mostra relação desatualizada como oculta. Sem overflow ou erros de página. Script incluído no job browser existente. Backend foi validado separadamente com PostgreSQL real; integração UI-backend real, Safari/aparelho e integração assistente ainda pendentes.


### Consulta de compatibilidade junto ao assistente — 13/10/2026
Resultados web consultam relações explícitas da loja/produto usando componente público, apresentando observação/data sem enviar relações a IA nem alterar ranking. App oferece Ver detalhes e compatibilidade diretamente em cada resultado. Typecheck mobile, build/lint web e teste Chromium do assistente em três larguras passaram com API simulada, incluindo acessório conferido e invariantes anteriores de orçamento/preço/especificações. Não declara ranking de acessórios, compra conjunta ou teste do link nativo em aparelho concluídos; esses fluxos permanecem pendentes.


### Revisar conferência sem refazer seleção — 13/10/2026
Editor oferece Revisar conferência para relação cujo produto relacionado continua elegível. Ação preenche seleção/observação e foca o texto; nenhuma aprovação é enviada até confirmação explícita. Teste Chromium existente ampliado passou em três larguras com API simulada: preenche dados anteriores, não envia automaticamente e reaprovando atualiza lista. Build e lint passaram. Novo goal criado após remoção do anterior, mantendo escopo integral e dependências. Backend, dispositivo e demais pendências continuam conforme auditoria; não há deploy comprovado deste incremento.


### Base editorial de novidades — 13/10/2026
Nova entidade por loja com título/resumo/texto, fonte HTTPS, revisão, validade e rascunho/publicação. CRUD inicial: listar admin, criar, editar; consulta pública lista 30 resumos vigentes e detalhe somente publicado/vigente da loja explícita. Validação exige revisão não futura, validade posterior e conteúdo publicado não vencido; nenhum HTML é interpretado nem fonte externa buscada. Criação serializada limita 100 registros por loja. PostgreSQL real aplicou 27 migrations; build e suíte HTTP passaram para papel cliente, rascunho oculto, publicação/detalhe, loja divergente e validade expirada. Interfaces editorial/web/native, auditoria do responsável, remoção/arquivo e conteúdo real continuam pendentes. Não declara módulo integral concluído.


### Novidades no app nativo — 13/10/2026
Início oferece Novidades da Vox. Tela lista resumos e abre leitura com fonte, revisão e validade; consulta loja explícita e API vigente ao receber foco. Conteúdo é texto simples; fonte abre somente HTTPS sem credenciais de URL. Estados de carregamento, vazio e erro/retry separados; respostas após sair são descartadas. Typecheck, suíte existente de sessão e exportação Android/iOS passaram. Não comprova interação em aparelho, conteúdo editorial real ou publicação instalável; gestão pelo lojista e interface web continuam pendentes.


### Correção do seletor de senha no CI real — 13/10/2026
Workflow 38417964982 concluiu builds API/web e exportação mobile com sucesso, mas teste Chromium contra API/PostgreSQL real falhou por seletor Senha atual ambíguo entre formulários Alterar senha e Solicitar encerramento. Teste agora delimita formulário de alteração antes de selecionar campo. Sintaxe validada; execução integral da correção aguarda novo workflow. Deploy do run anterior foi pulado; não está comprovado. Não altera comportamento de autenticação.


### Novidades públicas na web — 13/10/2026
Rota /novidades acessível pelo rodapé mostra resumos vigentes e leitura por id com fonte/revisão/validade e volta à lista/loja. Consulta loja explícita; chave por id e cleanup evitam resposta antiga atualizar artigo novo. Texto renderizado como texto simples, sem HTML interpretado; estados de carga/vazio/erro e atualização manual. Build e lint passaram. Interface editorial, conteúdo real e teste interativo desta rota seguem pendentes. Workflows continuam executando/enfileirados; deploy novo ainda sem evidência de conclusão.


### Leitura de novidades validada em Chromium — 13/10/2026
Playwright com API simulada passou em 390/768/1440: lista abre artigo, conteúdo com aparência de script permanece literal sem executar, fonte tem proteção de nova aba, volta à lista vazia e consulta loja explícita. Sem overflow/erros de página. Script incluído no workflow. Não comprova integração UI-backend real, Safari ou dispositivo nativo; gestão editorial segue pendente.


### Editor de novidades no painel — 13/10/2026
Nova rota administrativa/menu Novidades permite criar rascunho, editar texto/fonte/datas, revisar prévia literal e publicar/despublicar. Datas indicam fuso do dispositivo e são enviadas como instantes ISO; API valida revisão/validade. Lista distingue rascunho, publicada e vencida/oculta. Operação vinculada à geração da sessão, bloqueio por ref e campos desabilitados durante envio. Build e lint passaram; teste interativo do editor, auditoria do responsável e remoção/arquivo permanecem pendentes. Backend editorial já foi validado separadamente com PostgreSQL real; isso não comprova integração desta tela com produção.


Correção do registro anterior: o build inicial passou, mas lint falhou por Date.now durante renderização; commit d9078d6 foi enviado antes da correção. Editor agora calcula vencimento usando instante capturado na consulta, sem função impura no render. Lint e build foram executados novamente e terminaram com código zero após ajuste. Teste interativo ainda pendente.


### Editor editorial validado em Chromium — 13/10/2026
Playwright com API simulada em 390/768/1440 passou: rascunho com datas ISO, prévia literal sem script, campos preservados ao editar, publicação e retorno a rascunho. Sem overflow/erros de página. Teste incluído no job browser existente. API/PostgreSQL editorial foi validada separadamente; não representa integração UI-backend real, conteúdo editorial real ou auditoria de responsável concluídos.


### Fixtures dos painéis atualizadas e suíte validada — 13/10/2026
Workflow 38419361655 passou builds/bundles mas falhou no teste geral por endpoint simulado desconhecido /privacidade/encerramento. Fixtures agora incluem solicitação nula, lista push e compatibilidade admin vazias; rejeição de outras requisições desconhecidas foi preservada. Execução local Playwright terminou com código zero em 390/768/1440 para ambos os painéis, rotas/navegação/foco, pedidos, fluxo de produto, serviços/benefícios, formulários e falhas. API simulada; não comprova UI-backend real. CI mantém conjunto completo de sete larguras, cuja execução corrigida ainda aguarda workflow. Auditoria editorial de responsável permanece pendente.


### Responsável pela revisão editorial — 13/10/2026
Novidade registra referência ao lojista autenticado na criação e última edição, sem permitir enviar responsável no payload. FK restritiva preserva referência e registros anteriores ficam sem responsável inventado. Lista administrativa inclui nome para exibição; endpoints públicos mantêm seleção explícita sem identificação. PostgreSQL real aplicou 28 migrations e suíte HTTP passou para responsável correto, nome administrativo e ausência de id na leitura pública. Builds API/web e lint passaram. Histórico completo de versões editoriais não foi implementado; registro representa apenas última revisão. Conteúdo real e integração UI-backend completa continuam pendentes.


### Proteção contra sobrescrita editorial — 13/10/2026
Novidade tem versão incremental. PUT exige versão carregada e atualiza somente se corresponder, retornando 409 em edição antiga e 404 para registro fora da loja/inexistente. Editor envia versão e oferece descartar formulário/carregar dados atuais explicitamente após erro, sem descartar texto antes da decisão. PostgreSQL real aplicou 29 migrations e suíte HTTP passou para recusa de versão antiga/conteúdo preservado. Chromium com API simulada em três larguras passou para publicação/despublicação com versões, conflito preservando formulário e recarga explícita do conteúdo mais recente. Builds e lint passaram. Teste UI com backend real e histórico completo de versões permanecem pendentes.


### Arquivamento editorial reversível — 13/10/2026
Novidade pode ser arquivada/restaurada com versão esperada e autorização da loja. Ambas as ações deixam publicado=false; arquivo permanece preservado e PUT não edita registro arquivado. Consulta pública exclui arquivados. Painel pede confirmação, mostra Arquivada, oculta edição e oferece restaurar rascunho; operação vinculada à sessão. PostgreSQL real aplicou 30 migrations; suite HTTP passou para 403 cliente, ocultação, preservação do texto, bloqueio de edição e restauração não publicada. Builds API/web e lint passaram. Teste interativo dos botões ainda pendente. Limite de 100 registros continua incluindo arquivados para evitar crescimento ilimitado; arquivo não é exclusão nem histórico completo.


### Arquivo editorial validado em Chromium — 13/10/2026
Teste do editor ampliado passou com API simulada em 390/768/1440: cancelar confirmação não envia arquivo, arquivar preserva texto e remove edição, restaurar volta a rascunho sem publicação. Versão esperada é conferida também nas ações de arquivo. Testes anteriores de rascunho/publicação/conflito permanecem passando. Backend validado separadamente com PostgreSQL real; isso não comprova interação UI-backend real ou produção.


### Filtros editoriais e marco de CI — 13/10/2026
Painel Novidades oferece busca por título e filtro de rascunhos, publicadas, vencidas e arquivo, calculados sobre dados carregados/instante da consulta. Chromium com API simulada passou em três larguras, incluindo filtros sem resultado e restauração; nome acessível do seletor corrigido após falha inicial. Build/lint passaram. Workflow 38421023702 (commit 80c2e21) concluiu com sucesso builds/bundles e todos os testes das imagens, incluindo Chromium contra API/PostgreSQL reais e painéis em sete larguras. Job de deploy 115382545767 nem iniciou: anotação de pagamento/limite de gastos. Portanto não há deploy comprovado; este marco valida somente aquele commit, não alterações posteriores.


### Base de orçamento e decisão de serviços — 13/10/2026
Orçamento por solicitação tem versão única, valor inteiro em centavos, descrição, validade, emissor e decisão com data. Emissão exige lojista/mesma loja e estado de análise, substitui propostas pendentes preservando versões e limita 20 revisões. Cliente consulta somente próprios orçamentos; aceite/recusa autenticados respeitam estado e validade, repetição da mesma decisão é idempotente e decisão oposta não sobrescreve. Execução de serviço com orçamento exige última versão ACEITA; atendimento sem orçamento mantém regra anterior. Histórico registra proposta/decisão. PostgreSQL real aplicou 31 migrations e suíte HTTP passou para leitura isolada, bloqueio antes de aceite, decisão alheia negada, aceite repetido, decisão oposta recusada e execução após aceite. Build passou. Interfaces, idempotência de emissão, testes específicos de validade/substituição/recusa, notificações e exportação dos orçamentos permanecem pendentes; não declara fluxo completo concluído.


### Emissão de orçamento sem duplicar tentativas — 13/10/2026
POST de orçamento exige UUID de tentativa; índice único por solicitação/chave e bloqueio existente serializam repetição. Mesma proposta retorna orçamento original antes de validar estado comercial, preservando versão/histórico; chave com valor/descrição/validade diferente é recusada. Validação inicial ainda exige validade futura, portanto recuperação de tentativa após vencimento continua pendente e deve usar consulta. PostgreSQL real aplicou 32 migrations; build e suíte HTTP passaram para repetição simultânea, uma proposta persistida e reutilização divergente recusada. Interfaces ainda não implementadas; não houve mudança em produção.


### Recuperação de orçamento após validade — 13/10/2026
Validação de instante futuro foi movida para emissão nova dentro da transação, após consulta de chave existente. Recuperação de proposta existente com conteúdo idêntico funciona mesmo vencida; não cria nova versão nem permite aceite vencido. Nova chave vencida continua recusada. PostgreSQL real, 32 migrations, build e suíte HTTP passaram para recuperação da fixture vencida, recusa de nova emissão vencida e aceite vencido. Fixture altera validade diretamente no banco descartável para simular passagem do tempo; não é teste de relógio real. Interfaces continuam pendentes.


### Consulta e decisão de orçamento no painel cliente — 13/10/2026
Cada atendimento web oferece consulta explícita de orçamentos, versões, valor em centavos formatado, descrição e validade. Última proposta pendente oferece aceitar/recusar com confirmação; API valida validade/estado/titular. Após decisão, consulta novamente e atualiza histórico do atendimento. Ref evita duplo clique e geração de sessão descarta resultado de outra conta. Build e lint passaram. Teste interativo, estado após desmontagem, indicação visual de validade vencida, formulário lojista e interface nativa continuam pendentes; backend foi validado separadamente com PostgreSQL real.


### Estado de validade no orçamento web — 13/10/2026
Consulta captura instante para indicar proposta PENDENTE vencida, orientar nova proposta e ocultar botões de decisão. Estado visual corresponde ao momento da consulta; API segue verificando instante real ao enviar. Cleanup impede atualizações após desmontagem e geração protege troca de conta. Build/lint passaram; teste interativo/relógio da tela e interface nativa seguem pendentes.


### Orçamento cliente validado em Chromium — 13/10/2026
Playwright com API simulada em 390/768/1440 passou: consulta descrição/valor, cancelar confirmação não envia, aceite envia decisão explícita e atualiza status, proposta vencida oculta decisão e orienta nova proposta, sem overflow/erros. Script incluído no workflow. Backend foi validado separadamente com PostgreSQL real; teste não comprova integração browser-backend real, recusa interativa ou dispositivo nativo.


### Revisão e recusa de orçamento validadas — 13/10/2026
Suíte HTTP PostgreSQL real ampliada passou: segunda emissão cria versão 2 e preserva primeira como SUBSTITUIDO; primeira não pode ser aceita, recusa repetida da segunda gera único evento, atendimento volta à análise e não entra em execução sem aceite. Mesma rodada aplicou 32 migrations e passou build/integrações anteriores. Não representa teste interativo de recusa na web nem interface de emissão lojista concluída.


### Orçamentos na exportação privada — 13/10/2026
Exportação em streaming inclui coleção orcamentosServico com versões, valor, descrição, validade/status/decisão, limitada por lotes de 100 e instante da exportação. Consulta restringe solicitação ao titular/loja; omite emissor e chave de tentativa. PostgreSQL real, 32 migrations, build e suíte HTTP passaram para três versões próprias, estado ACEITO, ausência de campos internos e exportação alheia vazia. Teste não cobre volume superior a 100 orçamentos nem interface nativa de exportação; esses pontos permanecem pendentes.


### Aviso consentido de orçamento emitido — 13/10/2026
Emissão nova inclui outbox na transação comercial com chave por orçamento, destino serviços e mensagem genérica sem valor/descrição. Repetição retorna antes do enqueue, evitando avisos duplicados; consentimento usa bloqueio compartilhado existente. PostgreSQL real e suíte HTTP passaram para um aviso após repetir, conteúdo sem dados da proposta e nenhuma emissão de aviso após revogação. Build e 32 migrations passaram. Não comprova recebimento em aparelho nem aviso de decisão, que permanece pendente.


### Emissão de orçamento no painel lojista — 13/10/2026
Detalhe do atendimento inclui consulta de versões/decisões e formulário de valor em reais, descrição e validade nos estados de análise/aguardando cliente. Valor admite até duas casas sem arredondar entrada inválida; API recebe centavos. Tentativa mantém UUID/payload após falha, limpar após confirmação ou alterar campo cria nova tentativa. Consulta permite conferir emissão incerta; orienta aguardar aceite. Operação bloqueia duplo clique e descarta retorno após saída/troca de sessão. Build e lint passaram. Teste interativo, persistência de tentativa após recarregar e interface nativa permanecem pendentes. Backend já validado separadamente com PostgreSQL real.


### Emissão lojista validada em Chromium — 13/10/2026
Playwright com API simulada passou em 390/768/1440: entrada 125,50 vira 12550 centavos; erro 503 preserva campos, repetir usa UUID/payload idênticos e resposta confirmada limpa formulário, sem overflow/erros. Teste incluído no workflow. Não comprova recuperação após reload ou integração UI-backend real, apenas comportamento do formulário e tentativa em memória.


### Orçamento no acompanhamento nativo — 13/10/2026
Histórico de atendimentos inclui consulta explícita de versões, valor/descrição/validade em Brasília e decisão com confirmação Alert. Proposta vencida no instante de consulta orienta nova proposta e não oferece decisão; servidor valida validade atual. RequestForSession usa revisão do histórico; duplo toque bloqueado por ref e respostas após desmontar/trocar conta descartadas. Typecheck e testes existentes do serviço de sessão passaram; não cobrem interação/renderização do componente. Exportação bundles deste incremento, aparelho, atualização automática do histórico após decisão e recuperação persistente continuam pendentes.


### Histórico nativo após decisão de orçamento — 13/10/2026
Aceitar ou recusar uma proposta agora solicita atualização do histórico do atendimento após a confirmação e consulta dos orçamentos, preservando a proteção por sessão e desmontagem. Typecheck e exportação Metro dos bundles Android/iOS passaram. Exportação não equivale a APK/AAB/archive instalável; interação em aparelho e publicação permanecem pendentes.
