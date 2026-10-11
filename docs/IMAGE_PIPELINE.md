# Imagens e catálogo de apresentação

Os uploads ficam no volume `voxcelular_uploads`, montado em `/app/uploads`, com URLs da própria aplicação. O backup do workflow inclui esse volume. Não há serviço externo de armazenamento ou processamento de imagens.

## Uploads

Produto: 900 × 900. Imagem do banner: 900 × 900. Fundo do banner: 1600 × 700. Categorias: 800 × 450. Portabilidade: 600 × 450. Os componentes públicos mantêm seus tamanhos responsivos e `object-fit`, sem depender da proporção do arquivo original.

O navegador aceita JPG, PNG, WebP, AVIF, GIF, BMP e SVG que consiga abrir, até 15 MB e 40 megapixels. GIF usa imagem estática. Formatos não decodificados pelo navegador apresentam erro e preservam o conteúdo anterior. O editor oferece enquadramento inteiro ou recorte, zoom e posição; produto mantém sua ferramenta de recorte quadrado. Canvas converte para WebP, reduz qualidade progressivamente e limita a saída a 300 KB (600 KB no fundo). O original não é enviado nem armazenado.

A API verifica o conteúdo com Sharp, limita entrada a 5 MB/12 megapixels, remove metadados e grava WebP nas dimensões do perfil. Limite de saída: 400 KB/700 KB. Cache interno de Sharp desativado, uma thread de processamento, no máximo uma conversão ativa e timeout de oito segundos. Arquivos inválidos e excesso de demanda são recusados; dados anteriores permanecem.

Cada pasta de imagens da loja tem teto de 100 MB e mil arquivos. Novas gravações são recusadas quando restam menos de 128 MB no filesystem. Landing e catálogo usam hash do conteúdo para reutilizar imagens repetidas. Produtos usam nomes exclusivos e removem a imagem anterior somente após atualizar o banco. Imagens de rascunhos da landing não são apagadas automaticamente; a quota limita acúmulo sem destruir conteúdo referenciado. URLs locais de arquivos imutáveis recebem cache de um ano.

## Catálogo

16 imagens geradas com a ferramenta integrada `imagegen`, em `apps/api/assets/catalog/product-0.webp` até `product-15.webp`. Total otimizado: 340706 bytes. Ilustrações fotográficas para apresentação, não fotografias oficiais dos fabricantes. Fundos brancos, luz de estúdio, objeto completo e margens consistentes.

Prompts: fotografia quadrada realista de catálogo, produto centralizado, fundo branco contínuo, sombra suave e iluminação difusa, margens de 12%, sem legendas ou marca-d'água. Sujeitos por arquivo:

0. Samsung Galaxy A55 grafite, frente/traseira, três câmeras verticais, tela abstrata azul/violeta.
1. iPhone 15 preto, frente/traseira, duas câmeras diagonais, tela rosa.
2. Motorola Edge 50 azul, frente/traseira e tela azul.
3. Xiaomi Redmi 13 grafite, frente/traseira e tela verde.
4. Samsung Galaxy A35 azul-marinho, três câmeras e tela violeta.
5. Motorola Moto G85 cinza, frente/traseira e tela azul.
6. iPhone 14 midnight revisado, frente/traseira, tela azul.
7. Samsung Galaxy S23 preto revisado, três câmeras, frente/traseira.
8. Capa transparente com bordas e reflexos realistas.
9. Películas de vidro transparente sobrepostas, borda preta.
10. Carregador USB-C branco 20 W, dois pinos redondos.
11. Cabo branco USB-C para USB-C, enrolado e conectores visíveis.
12. Fones Bluetooth pretos com estojo aberto.
13. Power bank preto 10000 mAh, portas e indicadores visíveis.
14. Suporte veicular preto, articulação, braços e ventosa.
15. Smartwatch esportivo preto, pulseira de silicone e anéis de atividade.

`publish_demo_catalog` é uma opção explícita do workflow. O script altera somente os registros originais do seed identificados por ID e rótulo: retira os rótulos, publica produtos/ofertas e instala imagens no volume local. Preserva imagens já editadas e, em execuções posteriores, cadastros que já perderam o rótulo. O seed original reconhece o lote pelo ID, mesmo após mudar os códigos de apresentação. Dados comerciais e configurações existentes são preservados.

Validação: testes locais de conversão de quatro formatos, dimensões, metadados, falsificação e excesso de pixels; testes de recorte/zoom e publicação no navegador; CI com PostgreSQL valida catálogo público, imagem local acessível e repetição preservando edições.
