# Plano de Implementação

## Resumo da aplicação
Loja pública React, administração de produtos/pedidos/clientes/configurações, área do cliente com pedidos, promoções e fidelidade. Express/Prisma/PostgreSQL; contato e fechamento por WhatsApp. VPS otimizada; deploy exclusivamente GitHub Actions.

## Principais problemas encontrados
P0: recompensas de outra loja ou inativas podem ser resgatadas; concorrência pode deixar saldo negativo. Config aceita campos arbitrários incluindo IDs. P1: vitrine estática ignora produtos cadastrados; busca de pedidos ignora código, contato WhatsApp usa email em vez de telefone; status e timeline não são atômicos. Resgate não atualiza saldo na tela nem mostra erro. Imagem antiga é excluída antes de confirmar atualização no banco.

## Oportunidades de melhoria
| ID | TIPO | SITUAÇÃO ATUAL | OPORTUNIDADE/SOLUÇÃO | ESFORÇO ELIMINADO/BENEFÍCIO | PRIORIDADE | RISCO | TESTE | STATUS |
|---|---|---|---|---|---|---|---|---|
| OP-01 | AUTOMATIZAR | Vitrine estática | Catálogo real carregado por loja, vazio/erro/retry | Cadastrar uma vez e aparecer na vitrine | P1 | Baixo | Build, integração, navegador | DOING |
| OP-02 | JUNTAR | Só categorias fixas | Busca, categorias reais, ordenar preço e disponibilidade | Localizar produto sem percorrer catálogo | P2 | Baixo | Testes lógica, navegador | DOING |
| OP-03 | ANTECIPAR | Pedido ID técnico/contato incorreto | Código legível, busca por código, WhatsApp do cliente, erro/saving | Próximo passo no mesmo contexto | P1 | Baixo | Integração, lint | DOING |
| OP-04 | AUTOMATIZAR | Saldo fica desatualizado | Atualizar fidelidade após resgate, informar erros, impedir concorrência | Eliminar reload/conferência manual | P0 | Médio | Integração concorrente | DOING |
| OP-05 | ELIMINAR | Entrada insegura e foto perdida em falha | Allowlist de config; atualizar banco antes de remover imagem antiga | Preservar dados e isolamento | P0 | Baixo | Integração | DOING |

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
Página de configurações contém campos que não existem no schema (frete/parcelas/slogan). Não fingir persistência desses campos; plano de consolidação completo exige decisão sobre regras comerciais. Docker local indisponível; testes de banco real serão executados no runner GitHub com dados descartáveis. Produção não será usada para criar dados de teste.
