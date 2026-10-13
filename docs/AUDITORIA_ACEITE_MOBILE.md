# Auditoria dos critérios de aceite mobile

13/10/2026. Plano de referência: PLANO_MOBILE_CLIENTE.md, escopo integral preservado. Nenhuma etapa é declarada concluída por esta auditoria. Histórico de comandos e incrementos em IMPLEMENTACAO_MOBILE.md. Inspeção atual: schema Prisma, rotas API, telas mobile, worker PWA, scripts locais e workflow.

| Etapa do plano | Evidência disponível | Pendência para aceite |
| --- | --- | --- |
| 0 — Fundamentos | Sessões rotativas, revogação, loja pública explícita, limites de autenticação, consentimento e exportação; HTTP real local valida cadastro/papéis/logout/refresh | Recuperação e verificação de conta; solicitação/exclusão com retenção comercial; política promocional aplicada ao checkout; completar testes de abuso/isolamento em todos os endpoints |
| 1 — PWA e cliente | Manifest, instalação guiada, offline público seguro, favoritos/comparação; Chromium real valida worker waiting e atualização entre duas abas | Catálogo offline limitado com data e aviso de preço/estoque; guias aprovados offline; instalação Android/iOS real; Safari; atualização com carrinho e checkout completos |
| 2 — Serviços e conteúdo | Serviço, solicitação/protocolo/histórico e agenda persistentes; HTTP real confirma capacidade concorrente e liberação; GuiaOperadora com publicação/revisão/validade | Novidades e gestão editorial; orçamento estruturado com decisão do cliente; completar fluxo de mudança de horário; CRUD/validação integral em todas as interfaces |
| 3 — Assistente | Atributos verificáveis, ranking, adaptadores e cofre/configuração; PostgreSQL real valida reservas concorrentes de custo | Relação explícita de compatibilidade entre acessórios/aparelhos; cobertura integral do wizard; chamada real de cada provedor com chave e tarifas contratadas; qualidade de recomendação e latência medidas |
| 4 — Notificações | Outbox, consentimento, inscrições cifradas, entrega limitada e estados terminais; PostgreSQL real valida claims/expiração/settlement; HTTP valida revogação e isolamento | Recebimento real, recusa e revogação em navegadores/dispositivos; recuperação operacional de processamento interrompido sem reenvio incerto; medições sob carga |
| 5 — Android/iOS | Telas Expo, API compartilhada, SecureStore, carrinho/resgate idempotentes; typecheck e exportação de bundles | APNs/FCM nativos; deep links verificados; APK/AAB e archive instaláveis; testes representativos em aparelhos/emuladores; compra/serviço completos. Bundle exportado não comprova build instalável |
| 6 — Distribuição | README mobile e configuração inicial do app | Pipeline de builds, assinatura protegida, materiais de loja, declarações de privacidade revisadas, contas/certificados e autorização de submissão; testes internos/TestFlight |

## Próximas entregas de implementação

1. Completar recuperação/verificação e encerramento de conta com registros comerciais preservados, limites de abuso e canais de confirmação. Separar preparação técnica da ativação de remetente externo.
2. Completar conteúdo editorial e compatibilidade explícita de acessórios; integrar gestão do lojista e leitura web/native sem inferir compatibilidade de nomes comerciais.
3. Completar orçamento/decisão e revisão de agenda, mantendo capacidade transacional e histórico.
4. Implementar catálogo/guias offline com limites, atualização explícita e sem escritas comerciais offline.
5. Preparar builds instaláveis, links e push nativo; validar dispositivos e distribuição somente com evidência real.

Esta ordem não cancela requisitos anteriores nem dispensa validação transversal de acessibilidade, payload, RAM, CPU/I/O e latência. Testes novos devem verificar comportamento relevante, sem replicar implementação.

## Dependências e limites de evidência

- GitHub Actions não iniciou os jobs dos últimos commits por pagamentos/limite de gastos. Push é comprovado; deploy desses commits não é. Trabalho local continua disponível.
- Contas, tarifas e chaves reais são necessárias para validar IA externa. Não solicitar segredos no chat nem introduzir chamadas pagas implícitas.
- Certificados/contas de loja, APNs/FCM e dispositivos são necessários para validação/distribuição correspondente; não impedem implementar código e preparar pipelines.
- Falta de modelos/rotas de notícia, compatibilidade e exclusão no código inspecionado é uma lacuna de implementação, não bloqueio externo.
- Aprovação de escrita direta na VPS continua obrigatória; esta auditoria não autoriza seeds, mudanças de banco ou deploy manual.

Antes de encerrar o goal, rever cada seção do plano, artefatos e critérios contra o estado atual. Uma linha desta tabela é ponto de partida para auditoria detalhada, não prova de que todos os seus subitens foram conferidos.
