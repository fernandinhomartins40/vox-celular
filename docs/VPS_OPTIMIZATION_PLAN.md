# Plano de Otimização da VPS

## Estado atual
Monorepo npm: React 19/Vite 8, Express 4/Node 22, Prisma 6.19.3 (lock)/PostgreSQL 16. Uploads em volume, JWT; sem Redis, workers, filas, cron ou WebSockets na aplicação. Nginx do host atende TLS de aplicações vizinhas. Antes: Node serve para frontend e proxy Nginx separados; builds sem cache na VPS; migrations duplicadas; seed destrutivo com contas demo.

## Baseline
MEASURED em 09/10/2026, 15:13 BRT: VPS 72.60.10.108, x86_64, 4 CPUs, 15988 MiB RAM (4948 usados, 10267 disponíveis), swap 2047 MiB (501 usados); disco 194 GiB (51 usados), inodes 4%. Docker: 58 containers/55 ativos, 88 imagens/38.28 GB lógicos, volumes 3.627 GB, cache 5.066 GB. Vox não possui containers, volumes próprios nem /opt/voxcelular. Porta 3096 pertence a makucho-nginx; 3196 livre. RAM/CPU/picos/latência de Vox: NOT_MEASURED. Nenhum recurso vizinho alterado.

## Desperdícios encontrados
Compilação na VPS, npm install sem lock, Node para estáticos, proxy duplicado, migrations duplicadas, logs ilimitados, ausência de limites, dashboard somando listas completas no Node, pool dependente de CPUs, filtros/relações sem índices, prune global, seed destrutivo. Modal tinha atualização de estado via effect que causava render adicional; lint também encontrou módulos misturando hooks/rotas/componentes e geração de cupom aleatório em render.

## Plano
DONE significa implementação no repositório e verificações disponíveis concluídas. Testes de containers, carga e deploy real continuam BLOCKED até haver Docker Linux local ou execução no GitHub Actions. Não significa aplicação implantada nem economia de runtime comprovada.

| ID | PRIORIDADE | ÁREA | PROBLEMA/EVIDÊNCIA | SOLUÇÃO | GANHO ESPERADO | RISCO | TESTE | ROLLBACK | STATUS |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | P0 | Deploy | Porta ocupada, seed destrutivo, prune global | 3196 + preflight, bootstrap seguro, sem prune | Evitar interferência/perda | Baixo | Scripts/configuração | Reverter commit | DONE |
| 2 | P1 | CI | Build sem cache na VPS | API/web paralelos, GHCR por digest | Zero compilação na VPS | Médio | actionlint; imagens no CI pendentes | Manifest anterior | DONE |
| 3 | P1 | Containers | Node serve + proxy | Nginx estáticos e proxy no web | 4 → 3 residentes declarados | Médio | Build; SPA/API/uploads no CI pendentes | Imagem anterior | DONE |
| 4 | P1 | Recursos | Sem limites/rotação | Limites ajustáveis, loopback, logs limitados | Conter consumo agregado | Médio | Compose; carga no CI pendente | Ajustar .env | DONE |
| 5 | P2 | Runtime | Listas para somar, pool automático | Aggregates, pool explícito, shutdown gracioso | Menos objetos/conexões | Baixo | Build/startup; integração no CI pendente | Reverter commit | DONE |
| 6 | P2 | Banco | Filtros sem índices | Migration aditiva, 10 índices | Menos scans conforme dataset | Baixo | Prisma validate/diff; apply no CI pendente | Manter índices; remoção exige revisão | DONE |
| 7 | P1 | Recuperação | Sem backup/rollback validado | Backup DB/uploads, promoção após saúde/TLS | Recuperabilidade | Médio | ShellCheck; restore real no CI pendente | Manifest + backup | DONE |
| 8 | P3 | Frontend | Render extra e lint falhando | Modal por identidade com cleanup; módulos coerentes; cupom real | Evitar render e timer antigo | Baixo | Lint/build | Reverter commit | DONE |
| 9 | P1 | Validação real | Docker Linux indisponível | Job verify com PostgreSQL e imagens reais | Evitar deploy sem integração | Médio | Não executado nesta sessão | Corrigir antes do deploy | BLOCKED |

## Ordem de execução
Docker/contexto → Compose/proxy → runtime/banco → deploy/workflow → lint/build/scripts/startup → comparação/relatório. Concluída a implementação. Publicação, execução de CI e validação de runtime dependem de ambiente externo.

## Limpezas recomendadas que exigem autorização
Nenhuma executada. Dados/volumes/uploads/backups: PERSISTENT_DATA. Imagens/manifests anteriores: REQUIRED_FOR_ROLLBACK. Recursos vizinhos: UNKNOWN_USE. Não executar prune global. Retenção de imagens e backups precisa de política explícita preservando rollback e recuperação, ainda sem ganho estimável para Vox.

## Métricas para comparação
Containers, builds/migrations por deploy, imagens, RAM/CPU/latência sob mesma carga, logs, conexões, persistência, recuperação. Sem runtime anterior não declarar percentuais de RAM. Orçamento inicial de limites: 768 + 512 + 64 = 1344 MiB residentes, mais migration temporária de 512 MiB; são limites configurados, não consumo nem pico medido.

## Bloqueios reais
Docker Desktop não inicia: Virtual Machine Platform desabilitado. Não habilitar recurso de Windows/reiniciar máquina automaticamente. Publicação/deploy dependem de GitHub Actions e do secret VPS_PASSWORD existente, nunca lido. Sem push, commit ou execução de workflow nesta sessão. Nenhum deploy manual.
