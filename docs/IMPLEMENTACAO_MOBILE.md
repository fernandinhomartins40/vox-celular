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

