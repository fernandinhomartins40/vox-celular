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

## Itens que não serão alterados
Identidade visual e recorte de imagens preservados. Checkout por WhatsApp não implica pedido confirmado/pagamento; não inventar sincronização ou criar pedidos automaticamente. Pontos por entrega e cancelamento exigem regra comercial; não automatizar. Dados estáticos não utilizados não serão removidos por suposição. Não alterar schema destrutivamente nem criar containers/dependências de runtime.

## Bloqueios reais
Página de configurações contém campos que não existem no schema (frete/parcelas/slogan). Não fingir persistência desses campos; plano de consolidação completo exige decisão sobre regras comerciais. Docker local indisponível; testes de banco real serão executados no runner GitHub com dados descartáveis. Produção não será usada para criar dados de teste.
