# Distribuição Vox Celular

Revisão: 13/10/2026. Reutilizar o PWA React/Vite e o aplicativo Expo existente, ambos com a mesma API Express/Prisma. O aplicativo tem telas nativas de catálogo, assistente, serviços, pedidos e conta. Não há backend paralelo.

## PWA

Instalação em `/instalar`; manifest em `/manifest.webmanifest`, ícones Vox e service worker existentes. Android: Chrome, menu de instalação. iPhone/iPad: Safari, Compartilhar, Adicionar à Tela de Início. Requer HTTPS em produção. Offline exibe somente cópias públicas limitadas e datadas; preço, estoque e confirmação de pedidos exigem rede. Conferir instalação e atualização com carrinho em aparelhos reais.

Referência: [instalação de PWA — Google](https://web.dev/learn/pwa/installation).

## Builds nativos

`apps/mobile/eas.json` prepara APK interno (`preview`), app iOS para simulador (`simulator`) e AAB/IPA de distribuição (`production`). O ícone deriva da marca já usada no PWA. API de produção configurada por perfil; chaves de IA ficam exclusivamente na API.

Após vincular a conta/projeto Expo real, no diretório `apps/mobile`, usar EAS CLI autenticado:

```sh
eas build --platform android --profile preview
eas build --platform ios --profile simulator
eas build --platform all --profile production
```

Esses comandos geram builds; não publicam automaticamente. Assinaturas/provisionamento são fornecidos pelas contas autorizadas, nunca pelo chat nem pelo Git. Os jobs manuais Android e iOS já presentes no GitHub continuam disponíveis para APK de teste e simulador. Bundle JavaScript exportado não equivale a APK/AAB/IPA compilado e instalado.

Referências: [EAS Build](https://docs.expo.dev/build/introduction/), [perfis eas.json](https://docs.expo.dev/eas/json/), [versionamento remoto](https://docs.expo.dev/build-reference/app-versions/).

## Requisitos para publicação

- Google Play: confirmar target SDK 36 ou superior no AAB gerado, conta verificada, assinatura Play, ficha e capturas reais, classificação, política de privacidade e formulário Data safety. Validar bibliotecas nativas e instalação no teste interno antes de promover a produção. Conferir exigências específicas da conta no Play Console.
- Apple: desde 28/04/2026, enviar com Xcode 26 ou superior e SDK iOS 26 ou superior. Build de distribuição requer Apple Developer, identificador disponível, certificados/provisionamento e App Store Connect. Conferir versão da imagem EAS escolhida antes de compilar. TestFlight e teste físico precedem submissão.
- Ambas: revisar declarações de dados conforme os serviços realmente habilitados, acesso de revisão, exclusão de conta existente, consentimento de IA externa e funcionalidades comerciais. Não anunciar o aplicativo como publicado até aprovação efetiva. Compra de produtos físicos usa o fluxo comercial existente.

Referências: [target SDK — Google](https://developer.android.com/google/play/requirements/target-sdk), [SDK mínimo — Apple](https://developer.apple.com/news/upcoming-requirements/?id=04282026a), [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

## IA e conteúdo real

O lojista configura DeepSeek ou Qwen em Integrações/IA com chave cifrada, tarifas contratadas e limite mensal. Sem configuração ou em falha, a resposta identifica explicitamente a seleção por regras. O cliente autoriza o envio do uso e atributos técnicos, sem identidade, histórico ou pagamento. O provedor devolve apenas IDs dos candidatos; preços, estoque, explicações e filtros permanecem derivados do catálogo. Fotos usam armazenamento conferido; a aplicação não afirma qualidade de câmera sem dados para essa comparação. Capacidade em mAh não comprova autonomia.

Referência: [DeepSeek API](https://api-docs.deepseek.com/guides/codex). Chamada real/latência dependem de chave e saldo do provedor.

Novidades, promoções, serviços e guias devem ser cadastrados/revisados pelo lojista nas telas existentes. Não inserir exemplos como conteúdo de produção nem inventar planos das operadoras.

## Pendências externas

Contas das lojas/Expo, assinaturas, certificados, conteúdo editorial revisado, dados técnicos conferidos e testes físicos. Firebase/APNs e associação verificada de domínios dependem das configurações já documentadas em `apps/mobile/README.md`. A publicação nas lojas depende da revisão e credenciais externas; os perfis preparados não comprovam publicação nem compatibilidade final de um binário.
