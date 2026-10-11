# Plano de Implementação

## Resumo da aplicação
Loja pública React, administração de produtos/pedidos/clientes/configurações, área do cliente com pedidos, promoções e fidelidade. Express/Prisma/PostgreSQL; contato e fechamento por WhatsApp. VPS otimizada; deploy exclusivamente GitHub Actions.

## Principais problemas encontrados
P0: recompensas de outra loja ou inativas podem ser resgatadas; concorrência pode deixar saldo negativo. Config aceita campos arbitrários incluindo IDs. P1: vitrine estática ignora produtos cadastrados; busca de pedidos ignora código, contato WhatsApp usa email em vez de telefone; status e timeline não são atômicos. Resgate não atualiza saldo na tela nem mostra erro. Imagem antiga é excluída antes de confirmar atualização no banco.

## Oportunidades de melhoria
| ID | TIPO | SITUAÇÃO ATUAL | OPORTUNIDADE/SOLUÇÃO | ESFORÇO ELIMINADO/BENEFÍCIO | PRIORIDADE | RISCO | TESTE | STATUS |
|---|---|---|---|---|---|---|---|---|
| OP-01 | AUTOMATIZAR | Vitrine estática | Catálogo real carregado por loja, vazio/erro/retry | Cadastrar uma vez e aparecer na vitrine | P1 | Baixo | Build, integração, navegador | DONE |
| OP-02 | JUNTAR | Só categorias fixas | Busca, categorias reais, ordenar preço e disponibilidade | Localizar produto sem percorrer catálogo | P2 | Baixo | Testes lógica, navegador | DONE |
| OP-03 | ANTECIPAR | Pedido ID técnico/contato incorreto | Código legível, busca por código, WhatsApp do cliente, erro/saving | Próximo passo no mesmo contexto | P1 | Baixo | Integração, lint | DONE |
| OP-04 | AUTOMATIZAR | Saldo fica desatualizado | Atualizar fidelidade após resgate, informar erros, impedir concorrência | Eliminar reload/conferência manual | P0 | Médio | Integração concorrente | DONE |
| OP-05 | ELIMINAR | Entrada insegura e foto perdida em falha | Allowlist de config; atualizar banco antes de remover imagem antiga | Preservar dados e isolamento | P0 | Baixo | Integração | DONE |
| OP-06 | CRIAR/JUNTAR | Cadastro sem ação na interface | Formulário conectado ao cadastro existente e loja atual | Criar conta sem atendimento manual | P1 | Baixo | Cadastro real no Chromium | DONE |
| OP-07 | ELIMINAR | Promoções com data fixa e falha invisível | Data corrente, ofertas reais e erro explícito | Evitar informação enganosa | P2 | Baixo | Lint/build | DONE |

## Ordem de implementação
Segurança/transações → catálogo real e busca → pedidos/feedback → integração/lint/build/navegador → corrigir → relatório.

## Plano de execução e análise por fluxo
| Fluxo | Objetivo e desperdício | Reconstrução/menor esforço | Decisão |
|---|---|---|---|
| Encontrar produto | Vitrine fictícia e navegação por categorias fixas | Buscar → escolher → adicionar; reutilizar cadastro/estoque/preço | OP-01/02, sem índice/serviço novo |
| Atender pedido | Procurar pelo ID interno e abrir WhatsApp incorreto | Buscar código → contatar ou avançar; reaproveitar telefone e timeline | OP-03 |
| Resgatar benefício | Recarregar para conferir saldo e erro invisível | Escolher recompensa → resgatar → apresentar código | OP-04, débito condicional transacional |
| Configurar loja | Formulário enviava campos sem persistência | Editar campos suportados → salvar → refletir no site | OP-05, sem inventar regra comercial |
| Criar conta | Botão sem ação embora API pronta | Criar conta → informar nome/email/senha → enviar | OP-06, reutilizar cadastro e bônus existentes |
| Consultar promoções | Falha confundida com ausência de ofertas e mês fixo | Mostrar dados reais, erro distinto e data corrente | OP-07 |
| Pagar/cancelar/acumular pontos | Sem regra/integração comprovada | Não inferir confirmação comercial a partir de WhatsApp | Bloqueado por regra comercial |

OP-06 (CRIAR/JUNTAR, P1, baixo risco): ligar cadastro existente à tela, eliminar credenciais demo e obter loja atual no envio. Teste: cadastro real no Chromium e API.
OP-07 (ELIMINAR, P2, baixo risco): retirar promessa de personalização sem algoritmo e data fixa; mostrar erro real. Teste: lint/build.
Cinco movimentos avaliados: eliminar campos/feedback fictícios; juntar busca/filtros e contato/status; automatizar vitrine e saldo; antecipar estoque e próxima ação; criar acesso ao cadastro já existente. Nenhum novo serviço, coleta adicional ou automação financeira.

## Itens que não serão alterados
Identidade visual e recorte de imagens preservados. Checkout por WhatsApp não implica pedido confirmado/pagamento; não inventar sincronização ou criar pedidos automaticamente. Pontos por entrega e cancelamento exigem regra comercial; não automatizar. Dados estáticos não utilizados não serão removidos por suposição. Não alterar schema destrutivamente nem criar containers/dependências de runtime.

## Bloqueios reais
Frete, parcelas e slogan do formulário antigo não tinham persistência; os campos suportados foram conectados ao site. Definir novas condições comerciais, pagamento automático, cancelamento, pontuação por entrega e recuperação automática de senha exige regras ou integrações ainda não definidas. Docker local indisponível; testes de banco real foram executados com sucesso no runner GitHub com dados descartáveis. Produção não foi usada para criar dados de teste.

## Validação final
OP-01 a OP-07 implementadas, validadas e publicadas na main. Builds/lint/testes locais aprovados; PostgreSQL real e Chromium aprovados, incluindo a execução de produção 37988464216. Não há implementação segura pendente entre essas sete oportunidades. Relatório em docs/IMPLEMENTATION_REPORT.md.

## Publicação validada
Workflow main 37988464216 aprovado, incluindo deploy. Release e845bfd636aacd74fbaf511cc06ae6b938ed4cb7 ativa. HTTPS https://www.voxcelular.com.br respondeu 200; /api/ready retornou ok:true; vox_web, vox_api e vox_db saudáveis. Trabalhar diretamente na main nas próximas alterações.

## Redesign fornecido pelo usuário
Implementar as pranchetas desktop e mobile com assets locais: cabeçalho/busca compartilhada, hero, benefícios, categorias, cartões de produtos reais, faixa TIM, três passos, serviços, depoimentos, contato e navegação inferior mobile. Preservar carrinho, WhatsApp, cadastro e acesso ao lojista. Converter assets para WebP sem ampliar; manter originais. CSS restrito à landing page para preservar painel/área do cliente. Validar visualmente em 390/1440 px e no Chromium com API/PostgreSQL real. Status: concluído e publicado na main; workflow 37998597330 aprovado, domínio validado em 390/1440 px.

## Rodada atual — todos os painéis como produto em três passos

Análise realizada sobre as 14 páginas de cliente/lojista, rotas e componentes compartilhados, contratos de autenticação/produtos/pedidos/clientes/fidelidade/promoções/config/dashboard, schema e testes de produção. O sistema de design já publicado será evoluído. Não haverá dependências, serviços permanentes ou migrations novos.

| ID | TIPO | PRIORIDADE | PROBLEMA / EVIDÊNCIA | SOLUÇÃO / ESFORÇO ELIMINADO | ÁREAS | RISCO | TESTE | STATUS |
|---|---|---|---|---|---|---|---|---|
| OP-08 | JUNTAR/ANTECIPAR | P1 | Código do pedido no histórico de clientes sem ação; resumo abre lista genérica | Links contextuais com pedido/cliente/status na URL, abertura do pedido correto e filtro pré-preenchido, sem procurar de novo | Pedidos, clientes, dashboards | Baixo | Navegador com dados reais/isolados | DONE |
| OP-09 | ELIMINAR/AUTOMATIZAR | P1 | Editor de produto tem três abas, mas não guia conclusão; recorte obrigatório; erros de ativação só no console | Três etapas guiadas com validação e revisão; imagem pronta automaticamente com recorte opcional; preservar campos avançados; feedback de ativação/destaque | Produtos | Médio | Criação/edição, payload e imagem persistidos, teclado | DONE |
| OP-10 | ANTECIPAR | P1 | Dashboard mostra estoque baixo sem acesso ao subconjunto; catálogo sem busca de administração | Busca combinada e filtros de estoque/visibilidade; indicador abre produtos que precisam de atenção | Dashboard/produtos | Baixo | Busca sem acentos, filtros combinados | DONE |
| OP-11 | JUNTAR | P1 | Ofertas e pontos são destinos separados do mesmo objetivo de benefício | Central de benefícios com pontos, recompensas e ofertas; manter URLs antigas compatíveis | Cliente, router, navegação | Baixo | Todas as rotas, aba selecionada, histórico do navegador | DONE |
| OP-12 | RECUPERAR/ANTECIPAR | P1 | Resgate persistido no banco, código só existe no modal; falha no GET após POST parece falha de débito | API retorna resgates próprios e saldo confirmado; código recuperável ao voltar; separar erro de atualização de falha de resgate; revisão explícita do débito | Fidelidade API/UI | Médio | Concorrência, isolamento, recarga e falha parcial | DONE |
| OP-13 | ELIMINAR/JUNTAR | P1 | Cliente não pode trocar senha pela interface apesar de endpoint existente; novas contas têm contato vazio | Disponibilizar Minha conta para os dois perfis; contato opcional no cadastro existente; reutilizar formulário de senha | Conta/login/router | Baixo | Autorização e senha, cadastro com contato opcional | DONE |
| OP-14 | AUTOMATIZAR/CLAREZA | P1 | totalGasto Decimal serializado como string é somado por concatenação; contatos duplicam DDI; timeline de fallback supõe pagamento | Converter números, rotular média por cliente corretamente, telefone normalizado; datas brasileiras e acompanhamento baseado em fatos; erros no contexto da ação | Clientes/pedidos/helpers | Baixo | Unitários + PostgreSQL + navegador | DONE |
| OP-15 | JUNTAR/ANTECIPAR | P2 | Configuração não mostra resultado antes de salvar; telas vazias sem próximo passo | Prévia de banner/horários, orientações curtas e próximo passo em estados vazios; próximas ações em pedidos; componentes compartilhados de fluxo | Config/UI compartilhada | Baixo | Prévia, gravação, vazio/erro, responsividade | DONE |

### Análise por objetivo e reconstrução do fluxo

| Objetivo / páginas | Trabalho que o sistema pode fazer | Três ações principais propostas |
|---|---|---|
| Entrar/criar conta — logins | Campo opcional de contato já suportado; orientação de senha; estado de envio | Escolher entrar/criar → preencher → enviar |
| Lojista organizar atendimento — visão geral/pedidos/clientes | Levar ao pedido/cliente/filtro correto e preparar mensagem com código e próximo status | Abrir pedido contextual → conferir → atualizar/contatar |
| Cliente acompanhar — início/pedidos | Abrir a compra exata, explicar próxima etapa e preparar contato | Abrir compra → consultar andamento → pedir ajuda se necessário |
| Cadastrar/editar — produtos | Preparar imagem, agrupar descrição/foto e preço/estoque, calcular prévia | Produto e foto → venda → revisar e salvar |
| Corrigir estoque — visão geral/produtos | Localizar automaticamente estoque ativo ≤ 5, manter busca/filtros | Abrir alerta → editar → revisar e salvar; preenchimento dentro da tarefa |
| Fidelidade/ofertas — central de benefícios | Ordenar recompensas utilizáveis, recuperar códigos já gerados e reunir ofertas | Escolher recompensa → revisar débito/confirmar → apresentar/enviar código |
| Configurar — página da loja | Mostrar prévia e dizer onde será exibido | Abrir página → editar e conferir prévia → salvar |
| Conta — cliente/lojista | Reutilizar endpoint seguro de troca de senha | Abrir Minha conta → preencher → salvar |

Três passos são decisões principais, não uma promessa de três cliques para digitar todos os campos. Revisões que protegem dados/pontos e ajustes opcionais de imagem são preservados.

### Ordem, preservação e bloqueios

Helpers/contratos e dados recuperáveis → ligações contextuais e filtros → formulário guiado → central de benefícios/conta → prévia/feedback → testes locais e CI com PostgreSQL → deploy automático na main e leitura de saúde da aplicação.

Não automatizar pagamentos, entregas, cancelamento, crédito de pontos, frete nem criação de pedidos a partir de WhatsApp: não há integração/regra comercial que comprove esses eventos. Não criar gestão comercial de campanhas/recompensas nesta rodada. Nenhum bloqueio impede as melhorias seguras acima. Produção só recebe o deploy autorizado por GitHub Actions; testes que gravam usam ambientes isolados.
# Editor completo da landing page — rodada atual

| ID | Prioridade | Evidência | Implementação | Validação | Status |
|---|---|---|---|---|---|
| LP-01 | P1 | Formulário estreito com apenas banner/horários/redes | Usar toda a área do painel, 13 abas por seção e design geral | Navegador 390/768/1440/1920, teclado | DONE |
| LP-02 | P1 | Prévia anterior era um cartão genérico | Componentes públicos compartilhados em iframe isolado; largura real 1440/390, atualizações por mensagem com origem verificada | Edição sem publicar, recarga e comparação pública | DONE |
| LP-03 | P1 | Conteúdo fixo das demais seções | Configuração JSON por loja com defaults compatíveis; textos/listas/links/imagens e design; produtos mantêm fonte única | PostgreSQL, permissões e conteúdo inválido | DONE |
| LP-04 | P1 | Imagens sem gerenciamento no editor | Upload WebP limitado, validado e armazenado no volume persistente da loja | Upload real, acesso público e recarga | DONE |

Implementar → lint/build → testes locais e CI reais → corrigir → deploy automático main → saúde HTTPS. Migration aditiva, sem substituir conteúdo existente. Prévia desativa navegação/envios; salvar publica todas as abas juntas. Arquivos enviados são preservados, inclusive se um rascunho for abandonado; não apagar imagens existentes automaticamente.

# Simplificar os painéis de ponta a ponta (10/10/2026)

Revisados: login/cadastro, inícios, pedidos dos dois perfis, produtos/cadastro/recorte, clientes/histórico, benefícios/resgates/ofertas, conta/senha e editor/prévia; rotas, contratos de API, autenticação, persistência, componentes e testes existentes.

| ID | Prioridade | Evidência / esforço atual | Solução e benefício | Teste | Status |
|---|---|---|---|---|---|
| UX-01 | P1 | Navegação mobile depende de abrir o menu em toda troca | Atalhos persistentes para tarefas principais; menu completo preservado | 320 a 1920 px, teclado e rotas | DONE |
| UX-02 | P1 | Inícios repetem ações e mostram histórico antes de pendências | Priorizar pedidos em andamento; indicadores secundários recolhidos | Estados sem dados, parcial e pendentes | DONE |
| UX-03 | P1 | Listas longas e filtros sem saída clara | Paginar apresentação, contagem, limpar filtros e preservar busca/contexto | Próxima/anterior, busca em todo conjunto, recarga | DONE |
| UX-04 | P1 | Ações de produto/cliente apenas por ícones; pedido exige procurar cliente | Botões com texto, acesso contextual a cliente e retorno aos filtros | Editar/publicar/destacar, cliente-pedido-voltar | DONE |
| UX-05 | P1 | Editor exige nomes técnicos de ícones, URLs e lista extensa | Escolhas legíveis, imagens por arquivo e configurações avançadas recolhidas | 13 abas, upload real, mesma prévia | DONE |
| UX-06 | P2 | Trocar aba de benefícios descarta contexto e recarrega | Manter seção visitada e sua revisão; conta com mostrar senha | Resgate, alternar abas, senha dos dois perfis | DONE |
| UX-07 | P1 | Entrar na conta perde o destino da tarefa | Retornar ao destino interno autorizado após login; perfis incompatíveis seguem para seu painel | URLs externas rejeitadas e login contextual dos dois perfis | DONE |

Três ações principais: escolher tarefa/item, revisar ou editar, concluir. Não retirar revisão de pontos, confirmação de entrega ou validação do servidor. Paginação nesta rodada limita elementos renderizados; consultas continuam completas para compatibilidade e filtros globais. Sem novos serviços, dependências ou regras comerciais. Nenhum bloqueio.
