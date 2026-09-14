# SK$ STORE

## Fluxo de compra

1. O cliente autentica o Discord.
2. O servidor cria o pedido e o payload Pix.
3. O pedido é registrado no PostgreSQL e enviado ao canal de compras.
4. O administrador confirma ou cancela pelo Discord.
5. Apenas pedidos aprovados liberam guia, ZIP e IA Premium.

## Domínios

- `shared/catalog.ts`: catálogo versionado e dados próprios dos produtos.
- `server/orders.ts`: ciclo de vida do pedido e idempotência de status.
- `server/pack-archive.ts`: geração/entrega protegida de materiais.
- `server/reviews.ts`: avaliação somente após aprovação.
- `server/sensi-ai.ts`: assistente especializado com provedor configurável.
- `client/src/pages/Dashboard.tsx`: área autenticada do cliente.

## Produção

Defina as variáveis de `.env.example` no Render. Segredos nunca devem ser enviados ao GitHub. O endpoint `/api/health` confirma que o processo está ativo; logs incluem `X-Request-Id` para diagnóstico.
