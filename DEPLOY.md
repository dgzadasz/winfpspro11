# Publicação no Render

1. Crie um Web Service apontando para a branch `main`.
2. Use `pnpm install --frozen-lockfile` no build e `pnpm start` no start.
3. Configure `DATABASE_URL` com o PostgreSQL do Render. Na primeira inicialização o servidor cria as tabelas necessárias.
4. Copie as variáveis de `.env.example` para o ambiente do serviço. Segredos nunca devem ser commitados.

## Pix manual

O fluxo atual é manual: o site gera o QR Code usando `PIX_KEY`, registra o pedido no canal de compras do Discord e o administrador confirma ou cancela pelos botões. Após a confirmação, a licença é criada e o acesso protegido é liberado. Sem `PIX_KEY`, o servidor retorna um erro controlado em vez de criar um pedido inválido.

## Discord

Cadastre no portal do Discord a URL pública de callback e a URL de interações configuradas no serviço. O administrador precisa de `DISCORD_ADMIN_ID`; membros com `DISCORD_CONFIRM_ROLE_ID` também podem confirmar pedidos. O endpoint valida assinatura e canal antes de aceitar ações.

## Verificação

```bash
pnpm check
pnpm build
pnpm test -- --run
```

