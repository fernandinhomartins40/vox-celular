# Configuração de marketplaces

Proteção de recuperação: se houver credenciais no banco e o arquivo da chave estiver ausente, o servidor bloqueia a geração de outra chave e o salvamento. Restaurar o volume privado correspondente ao dump antes de reiniciar a API. Isso evita misturar credenciais cifradas com chaves incompatíveis.

Painel: Configurações da loja → Configurar marketplaces (`/admin/configuracoes/integracoes`). Sete canais: Mercado Livre, Magalu, Shopee, Amazon, Casas Bahia, Americanas/SkyHub e SHEIN.

Campos individuais, senha mascarada, preservação de valores salvos ao deixar vazio e remoção explícita. Credenciais nunca retornam ao navegador depois do salvamento; somente nomes dos campos configurados. Nenhum valor é guardado em localStorage, arquivos do projeto ou logs.

Persistência real: tabela IntegracaoMarketplace, relação com loja, AES-256-GCM com nonce aleatório e autenticação adicional por loja/canal. Chave aleatória de 32 bytes gerada na primeira configuração em `/app/secrets/marketplace.key`, volume privado `voxcelular_secrets`, não servido por HTTP e preservado entre deploys. A imagem prepara o diretório para o usuário node. Nunca excluir esse volume: perder a chave torna as credenciais indecifráveis. Backup de deploy inclui `secrets.tar.gz` com modo 600 quando o volume existe; junto ao dump permite recuperação e deve ser protegido como segredo. Backup externo e rotação de chave ainda precisam de implantação operacional.

Estados distintos: CONFIGURADO não significa conectado; ACESSO_VERIFICADO significa apenas consulta de leitura bem-sucedida. Salvar qualquer alteração invalida verificação anterior. Nenhum canal publica anúncios ou sincroniza estoque automaticamente neste incremento.

Verificação real disponível para Mercado Livre (`GET https://api.mercadolibre.com/users/me`) e Americanas/SkyHub (consulta de pedidos com limite 1 e headers oficiais). Não devolve dados pessoais do pedido ou corpo de erro do provedor. Timeout 10 segundos, URLs fixas, redirects bloqueados. Consulta exige token válido/autorização, não apenas app ID e segredo. Homologação é salva, mas este teste não acessa sandbox. Demais canais retornam explicitamente operação ainda não implementada; não existe sucesso simulado.

Fontes: [Mercado Livre OAuth](https://developers.mercadolivre.com.br/autenticacao-e-autorizacao), [SkyHub consulta e headers](https://desenvolvedores.skyhub.com.br/pedidos/consulta-de-pedidos), [Magalu OAuth](https://developers.magalu.com/docs/first-steps/create-an-application/authentication-authorization/index.html), [Amazon onboarding](https://developer-docs.amazon.com/sp-api/docs/onboarding-overview), [Casas Bahia onboarding](https://developers.grupocasasbahia.com.br/marketplace/docs/como-iniciar), [Shopee](https://open.shopee.com/), [SHEIN](https://open.sheincorp.com/pt/solution).

Pendências: conectores comerciais, OAuth/renovação e validação de campos/contratos Shopee/SHEIN no portal autorizado; permissões adicionais, trilha de auditoria, regras e filas do plano. As chaves não impedem desenvolver esses módulos; impedem apenas validar operações reais contra as contas externas.
