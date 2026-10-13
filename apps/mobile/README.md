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
adaptadores de IA, exportação de dados e push
continuam em implementação; a existência do workspace não prova esses recursos concluídos.

Identificadores Android/iOS propostos: `br.com.voxcelular.cliente`.
Confirmar disponibilidade nas contas das lojas antes de distribuição. Certificados,
provisionamento, assinatura Android, contas Apple/Google e testes físicos ainda necessários.
Não versionar certificados, arquivos de assinatura ou secrets. Build Android requer SDK/Java;
build iOS requer macOS/Xcode. Não instalar toolchains ou executar builds na VPS.

Referências: [Expo Router](https://docs.expo.dev/router/installation/),
[SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

## Associação de links
O app declara os domínios www.voxcelular.com.br e voxcelular.com.br. A API gera os documentos públicos em /.well-known/assetlinks.json e /.well-known/apple-app-site-association. Configure MOBILE_ANDROID_SHA256 com fingerprints SHA-256 do certificado de assinatura (separados por vírgula) e MOBILE_APPLE_TEAM_ID com o Team ID de dez caracteres. São identificadores públicos, nunca arquivos/chaves privadas. Sem configuração, a associação fica vazia. Ativação na VPS requer o fluxo autorizado de configuração/Actions; verificar HTTPS sem redirect em ambos os hosts e instalar app assinado para validar. Não considerar este recurso verificado somente por compilar.
