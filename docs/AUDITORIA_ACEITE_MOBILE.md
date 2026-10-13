# Auditoria dos critérios de aceite mobile

13/10/2026. Plano de referência: PLANO_MOBILE_CLIENTE.md, escopo integral preservado. Nenhuma etapa é declarada concluída por esta auditoria. Histórico de comandos e incrementos em IMPLEMENTACAO_MOBILE.md. Inspeção atual: schema Prisma, rotas API, telas mobile, worker PWA, scripts locais e workflow.

| Etapa do plano | Evidência disponível | Pendência para aceite |
| --- | --- | --- |
| 0 — Fundamentos | Sessões rotativas, revogação, loja pública explícita, limites de autenticação, consentimento e exportação; recuperação/verificação com SMTP configurável, encerramento transacional com dados de contato removidos, histórico comercial preservado e novas compras/serviços/resgates bloqueados; HTTP/PostgreSQL local valida revogação e obrigações pendentes | Entrega SMTP real, revisão da política de retenção e teste de concorrência ampliado; política promocional aplicada ao checkout; completar testes de abuso/isolamento em todos os endpoints |
| 1 — PWA e cliente | Manifest, instalação guiada, offline público seguro, favoritos/comparação; Chromium valida worker waiting e atualização entre duas abas. App nativo e página offline web salvam catálogo/guias públicos limitados por quantidade, tamanho e 48 horas; Chromium verifica página/módulos em cache sem rede e cópia criada online | Navegação arbitrária offline não comprovada; teste offline em aparelho; instalação Android/iOS real; Safari; atualização com carrinho e checkout completos |
| 2 — Serviços e conteúdo | Solicitação/protocolo/histórico, agenda, orçamentos versionados e decisão persistentes; HTTP/PostgreSQL valida capacidade e transferências concorrentes, repetição e isolamento. Web valida confirmação/conflito/refresh de agenda com API simulada; interface nativa compilada/exportada. Novidades com revisão, validade, controle de versão e arquivo, leitura web/native e gestão lojista; Chromium com API simulada valida edição e conflito | Teste interativo nativo de orçamento e troca de horário; integração browser-backend real dos fluxos novos; CRUD/validação integral nas interfaces; revisão editorial de conteúdo real |
| 3 — Assistente | Atributos verificáveis, ranking, adaptadores e cofre/configuração; PostgreSQL valida reservas concorrentes de custo. Compatibilidade explícita aprovada pelo lojista e inclusão confirmada de acessórios no carrinho web/nativo após reconsulta de preço, estoque e relação; testes API/Chromium simulado | Compra conjunta completa até checkout em aparelho e backend real; cobertura integral do wizard; chamada real de cada provedor com chave e tarifas contratadas; qualidade de recomendação e latência medidas |
| 4 — Notificações | Outbox, consentimento, inscrições cifradas, entrega limitada e estados terminais; PostgreSQL real valida claims/expiração/settlement; HTTP valida revogação e isolamento | Recebimento real, recusa e revogação em navegadores/dispositivos; recuperação operacional de processamento interrompido sem reenvio incerto; medições sob carga |
| 5 — Android/iOS | Telas Expo, API compartilhada, SecureStore, carrinho/resgate idempotentes; typecheck e exportação de bundles | APNs/FCM nativos; deep links verificados; APK/AAB e archive instaláveis; testes representativos em aparelhos/emuladores; compra/serviço completos. Bundle exportado não comprova build instalável |
| 6 — Distribuição | README mobile e configuração inicial do app | Pipeline de builds, assinatura protegida, materiais de loja, declarações de privacidade revisadas, contas/certificados e autorização de submissão; testes internos/TestFlight |

## Próximas entregas de implementação

1. Validar entrega SMTP real e política de retenção da Vox; ampliar testes de concorrência do encerramento e tratamento de falhas de envio.
2. Integrar compra conjunta de acessórios compatíveis ao assistente e validar todos os fluxos editoriais com conteúdo revisado.
3. Validar orçamento/decisão e revisão de agenda de ponta a ponta na web e em aparelho nativo, mantendo capacidade transacional e histórico.
4. Validar catálogo/guias offline em aparelho e Safari, navegação PWA sem rede e atualização do carrinho, sem escritas comerciais offline.
5. Preparar builds instaláveis, links e push nativo; validar dispositivos e distribuição somente com evidência real.

Esta ordem não cancela requisitos anteriores nem dispensa validação transversal de acessibilidade, payload, RAM, CPU/I/O e latência. Testes novos devem verificar comportamento relevante, sem replicar implementação.

## Dependências e limites de evidência

- GitHub Actions não iniciou os jobs dos últimos commits por pagamentos/limite de gastos. Push é comprovado; deploy desses commits não é. Trabalho local continua disponível.
- Contas, tarifas e chaves reais são necessárias para validar IA externa. Não solicitar segredos no chat nem introduzir chamadas pagas implícitas.
- Certificados/contas de loja, APNs/FCM e dispositivos são necessários para validação/distribuição correspondente; não impedem implementar código e preparar pipelines.
- Recuperação/verificação, encerramento efetivo e compra conjunta ainda possuem lacunas de implementação; configuração externa não impede preparar código e testes correspondentes.
- Aprovação de escrita direta na VPS continua obrigatória; esta auditoria não autoriza seeds, mudanças de banco ou deploy manual.

Antes de encerrar o goal, rever cada seção do plano, artefatos e critérios contra o estado atual. Uma linha desta tabela é ponto de partida para auditoria detalhada, não prova de que todos os seus subitens foram conferidos.
