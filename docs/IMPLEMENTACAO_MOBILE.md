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
