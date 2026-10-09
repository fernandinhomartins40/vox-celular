# Painel do lojista

Acesso pelo menu **Painel do lojista** no rodapé ou `/admin/login`.

O painel existente permite consultar métricas, administrar produtos/fotos/preços/estoque/destaques, consultar e avançar pedidos, consultar clientes e editar banner, horários e redes sociais. **Minha conta** permite trocar a senha com confirmação da senha atual. Os fechamentos por WhatsApp continuam sujeitos à confirmação da equipe; o painel não representa pagamento automático.

## Seed de acesso

`apps/api/src/seed.ts` cria exclusivamente um usuário LOJISTA, sem limpar banco, cadastrar produtos fictícios ou alterar senhas existentes. Repetições preservam o usuário existente. Requer uma loja inicializada por bootstrap.

Em desenvolvimento, defina `TEST_ADMIN_PASSWORD` com pelo menos 12 caracteres e execute `npm run db:seed --workspace=@vox/api`. Email padrão: `teste.lojista@voxcelular.com.br`; pode ser informado em `TEST_ADMIN_EMAIL`.

Na VPS, execute o workflow único pela main com `create_test_admin=true`. O deploy gera uma senha aleatória de 36 caracteres, guarda as credenciais de aplicação em `/opt/voxcelular/test-admin.env` com permissão 600 e executa o seed no container temporário de migração. Não imprime senha nos logs, não modifica credenciais SSH e não ativa seed em deploys comuns. O operador autorizado pode consultar esse arquivo para fornecer o acesso solicitado. Após trocar a senha pelo painel, a senha inicial do arquivo deixa de funcionar; repetir o seed não a restaura.

Teste o painel usando essa conta e altere a senha em **Minha conta** antes do uso diário. Não compartilhe as credenciais publicamente.
