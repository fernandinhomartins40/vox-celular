# Aplicativo nativo Vox Celular

Workspace React Native/Expo Router, com telas nativas e a mesma API Express da web.
Navegação principal: Início, Loja, Assistente, Ajuda e Conta. Carrinho no cabeçalho; serviços em Ajuda e dados pessoais em Conta.
Implementação inicial; não publicado nem validado em dispositivo real.

Na raiz do repositório: `npm ci`. Para desenvolvimento: `npm run start --workspace @vox/mobile`.
`npm run typecheck --workspace @vox/mobile` verifica tipos; `npm run export --workspace @vox/mobile`
gera bundles, sem assinar ou publicar aplicativos.

API padrão: `https://www.voxcelular.com.br/api`. Configure `EXPO_PUBLIC_API_URL`
somente para outra API HTTPS autorizada. Variáveis `EXPO_PUBLIC_*` são públicas:
nunca colocar chaves de provedor, senhas ou refresh tokens nelas.

Refresh token usa Expo SecureStore e access token fica em memória. Não há AsyncStorage
para credenciais. Carrinho e chave de confirmação pendente usam AsyncStorage, sem credenciais. O catálogo consulta os preços/estoque reais e não confirma compras offline.
Cadastro e login de cliente, restauração de sessão, pedidos com histórico, favoritos com comparação, preferências de privacidade, gerenciamento de acessos, pontos e resgates, serviços com agenda, carrinho com confirmação, assistente por regras e ajuda das operadoras têm telas nativas ligadas à API.
Esses fluxos ainda precisam de teste funcional em emulador/aparelho.
Privacidade inclui exportação dos dados pela API autenticada para um arquivo JSON
temporário, compartilhado pela janela do sistema e removido após seu encerramento.
O usuário escolhe onde salvar; cancelar a janela não comprova que o arquivo foi salvo.
Os testes locais usam módulos nativos simulados; compartilhamento em Android/iOS
ainda exige validação em aparelho. Push nativo e integração real dos provedores de IA
continuam pendentes; a existência do workspace não prova esses recursos concluídos.

Privacidade também permite cadastrar o aparelho para notificações após salvar o
consentimento, solicitar a permissão do sistema e remover aparelhos cadastrados.
Configure o identificador público real do projeto Expo em `EXPO_PUBLIC_EXPO_PROJECT_ID`
(variável de repositório no GitHub para os builds), ou em `extra.eas.projectId` no
app config. Não é uma chave secreta. Sem projeto configurado, a ação informa que
notificações ainda não estão disponíveis nesta versão; não inventa um identificador.
FCM/APNs e ligação do envio/recibos à fila ainda precisam de configuração/implementação.

O build Android aceita o secret GitHub `VOX_ANDROID_GOOGLE_SERVICES_JSON_BASE64`
com o `google-services.json` do aplicativo Android codificado em base64. O workflow
valida o package `br.com.voxcelular.cliente`, prepara o arquivo ignorado em
`.native-config/` e o remove ao terminar. Não usar nesse secret o JSON de conta de
serviço com chave privada; essa credencial pertence à configuração de envio no
projeto Expo. Sem o arquivo cliente, o APK de teste pode ser gerado para os demais
fluxos, mas o cadastro FCM não está configurado. Arquivo e chave não devem ser
enviados pelo chat. O transporte/recibos já usam o worker da API quando habilitado;
a entrega real ainda requer validação.

Identificadores Android/iOS propostos: `br.com.voxcelular.cliente`.
Confirmar disponibilidade nas contas das lojas antes de distribuição. Certificados,
provisionamento, assinatura Android, contas Apple/Google e testes físicos ainda necessários.
Não versionar certificados, arquivos de assinatura ou secrets. Build Android requer SDK/Java;
build iOS requer macOS/Xcode. Não instalar toolchains ou executar builds na VPS.

Referências: [Expo Router](https://docs.expo.dev/router/installation/),
[SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

## Associação de links
O app declara os domínios www.voxcelular.com.br e voxcelular.com.br. A API gera os documentos públicos em /.well-known/assetlinks.json e /.well-known/apple-app-site-association. Configure MOBILE_ANDROID_SHA256 com fingerprints SHA-256 do certificado de assinatura (separados por vírgula) e MOBILE_APPLE_TEAM_ID com o Team ID de dez caracteres. São identificadores públicos, nunca arquivos/chaves privadas. Sem configuração, a associação fica vazia. Ativação na VPS requer o fluxo autorizado de configuração/Actions; verificar HTTPS sem redirect em ambos os hosts e instalar app assinado para validar. Não considerar este recurso verificado somente por compilar.

## APK de teste no GitHub
No workflow Build and Deploy Production, execução manual com build_android_test habilitado prepara APK standalone com assinatura de teste. Artefato vox-android-test-COMMIT fica disponível por sete dias se a compilação passar. Não é assinatura de distribuição, não publica na loja e ainda exige instalação/validação em aparelho. A execução manual também percorre o workflow normal de deploy autorizado. Builds ocorrem no GitHub, nunca na VPS. Referência: https://docs.expo.dev/guides/local-app-production/.

## iOS para simulador no GitHub
Execução manual do mesmo workflow com build_ios_simulator gera app Release para simulador no runner macOS, sem certificado de distribuição. Artefato zip dura sete dias se compilação passar. Não é IPA para iPhone físico nem publicação/TestFlight. Pode executar junto ao job Android; ambos independem do deploy web/API. Ainda requer execução Xcode e teste no simulador antes de declarar validação.
