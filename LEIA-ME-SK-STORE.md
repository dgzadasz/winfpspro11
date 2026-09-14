# SK$ STORE — correções e publicação

## O que foi alterado

- Bot: a confirmação de recebimento da interação agora sai antes de consultar o banco. Depois, o servidor atualiza a mensagem no Discord. Erros do banco geram uma resposta privada; falha ao atualizar a mensagem não é apresentada como falha ao salvar o pedido.
- Validação do endpoint: usa DISCORD_PUBLIC_KEY da sua aplicação, verifica a assinatura sobre os bytes originais e responde ao PING. Removida a chave fixa do projeto. Uma chave ausente ou incorreta continua sendo rejeitada, como exige o Discord.
- Carrinho: permanece salvo no mesmo navegador, atualiza entre abas, permite remover produtos e evita duplicar acessos da mesma conta. Cada produto é pago individualmente. A quantidade antiga foi normalizada para 1 porque o checkout não cobrava quantidades maiores. Após o checkout detectar aprovação, o produto é removido; os demais permanecem.
- Checkout: mantém o número do pedido na URL, permite reabri-lo, consulta o status a cada cinco segundos enquanto pendente e oculta o Pix quando aprovado ou cancelado.
- Cancelamento: migração de banco 0003 incluída no registro de migrações. O código verifica o resultado para não informar cancelamento quando uma aprovação simultânea venceu, ou vice-versa.
- Suporte: link no menu principal e no checkout, além do rodapé. Mantido o convite que estava no projeto: https://discord.gg/xJY2PZ6Zx . A validade do convite não foi confirmada.
- Hospedagem: Dockerfile, .dockerignore, render.yaml, .env.example e /api/health.

## Produtos que estão no site

| Produto | Preço | Oferta cadastrada |
|---|---:|---|
| Daily Pass | R$ 10,00 | 1 dia |
| Weekly Pass | R$ 40,00 | 7 dias |
| Monthly Pass | R$ 120,00 | 30 dias |
| Lifetime | R$ 300,00 | Acesso vitalício |
| Pack Sensi Normal | R$ 19,90 | Presets Android e iPhone |
| Pack Sensi Premium | R$ 39,90 | Presets e assistente IA |
| Pack Sensi Emulador | R$ 29,90 | Configurações para PC |

Os três downloads são arquivos Markdown de texto em server/private-packs. Há presets e orientações nesses arquivos, não aplicativos ou instaladores. O Premium libera a página /premium-ai após aprovação. O material e a validade dos presets não foram avaliados como produto para cada jogo/aparelho.

Os quatro passes registram compra e aprovação, mas não foi encontrada entrega automática de um aplicativo, atribuição de cargo Discord ou expiração automática do acesso pelo prazo do plano. A entrega desses passes precisa continuar sendo feita pelo seu processo de atendimento.

## Configurar o bot e corrigir a validação no Discord

1. Publique esta versão em um servidor Node persistente com HTTPS e banco configurado.
2. No Discord Developer Portal, abra a mesma aplicação do bot. Em General Information, copie Public Key para DISCORD_PUBLIC_KEY na hospedagem. Não é o Client Secret nem o token do bot.
3. Configure DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_ADMIN_ID e DISCORD_LOG_CHANNEL_ID. Os IDs do administrador e canal precisam corresponder a quem clica e onde estão os botões.
4. Configure DISCORD_REDIRECT_URI como https://SEU-DOMINIO/api/discord/callback e cadastre exatamente esse endereço em OAuth2 > Redirects. Troque a URL antiga da Manus ao migrar.
5. Em Interactions Endpoint URL, use https://SEU-DOMINIO/api/discord/interactions e salve. Esse endereço não é o callback OAuth e não é um webhook de canal.
6. Reinicie/republique após alterar as variáveis. Garanta que o endpoint esteja público, sem tela de login ou proteção que bloqueie o POST do Discord.
7. O bot precisa conseguir visualizar o canal e enviar mensagens, embeds e anexos. Gere um pedido de teste, confira seu recebimento e teste o botão com o administrador configurado.

O navegador abrir o endereço de interações não valida o endpoint: o Discord faz um POST assinado. Erro 401 indica assinatura/chave inválida; não se deve remover essa verificação para passar na validação.

Documentação: https://docs.discord.com/developers/interactions/receiving-and-responding . O Discord exige resposta inicial em até três segundos. O código agora responde antes do banco, mas não consegue responder enquanto a hospedagem está adormecida ou fora do ar.

## Hospedagem gratuita: escolha realista

Não há como garantir uma hospedagem gratuita sem indisponibilidade. Este projeto usa React + Express + MySQL e executa a atualização do Discord após a resposta inicial. Precisa de um processo Node persistente; não basta enviar apenas os arquivos visuais para uma hospedagem estática.

**Para testar com configuração mais simples: Render Free + banco MySQL compatível externo.** O Render suspende o serviço após 15 minutos sem tráfego, e o retorno pode levar cerca de um minuto. Por isso, ele pode reproduzir falhas de interação no primeiro clique. É uma opção de teste, não uma promessa de bot sempre disponível. Fonte: https://render.com/docs/free .

O TiDB Cloud Starter oferece uma faixa gratuita e conexão compatível com MySQL; confirme o limite vigente na conta e use os dados de conexão com TLS fornecidos pelo painel. Sua compatibilidade com as migrações deste projeto precisa ser validada antes da transferência definitiva. Fontes: https://docs.pingcap.com/tidbcloud/create-tidb-cluster-serverless/ e https://docs.pingcap.com/tidbcloud/serverless-limitations/ .

**Para tentar manter o processo ligado sem mensalidade: uma VM Oracle Always Free.** Pode hospedar o Node e MySQL, mas requer configuração de Linux, HTTPS, firewall e backups. A disponibilidade de recursos é limitada e instâncias ociosas podem ser recolhidas. Não é garantia de continuidade. Use somente recursos marcados Always Free. Fonte: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm .

O Dockerfile incluído serve como base para um servidor persistente. Em uma VM com Docker e um banco acessível, copie a configuração para .env, execute `docker build -t sk-store .` e depois `docker run -d --name sk-store --restart unless-stopped --env-file .env -p 127.0.0.1:3000:3000 sk-store`. Configure um proxy HTTPS na frente da porta 3000 e faça backup do banco. O Dockerfile não instala banco nem configura domínio/HTTPS automaticamente.

## Passos para testar no Render

1. Extraia o ZIP e envie o projeto para um repositório privado seu. Não envie .env ou tokens.
2. Crie um banco MySQL compatível e configure DATABASE_URL. Para preservar pedidos anteriores, exporte e importe o banco antigo; apontar para um banco novo não transfere os dados.
3. Com Node 22 e pnpm 10.4.1, na pasta do projeto rode `pnpm install --frozen-lockfile`. Preencha .env a partir de .env.example. Gere um JWT_SECRET aleatório com pelo menos 32 caracteres, por exemplo com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. Faça backup antes de migrar. Rode `pnpm exec drizzle-kit migrate` contra o banco configurado. Para banco antigo com tabelas, mas sem histórico de migrações, alinhe esse histórico antes; não apague as tabelas para contornar erro. A migração 0003 adiciona o status cancelled.
5. No Render, crie um Blueprint a partir do repositório usando render.yaml. Escolha o plano Free. Informe as variáveis solicitadas. O Dockerfile compila e inicia a aplicação.
6. Use a URL HTTPS fornecida pelo Render para definir DISCORD_REDIRECT_URI; cadastre também o callback e endpoint no Discord como descrito acima. O /api/health verifica que o processo está no ar, não a conexão do banco ou o bot.
7. Defina PIX_KEY, PIX_NAME e PIX_CITY com seus dados corretos. Confira o recebedor no aplicativo do banco antes de usar a loja.
8. Para IA Premium, configure BUILT_IN_FORGE_API_URL e BUILT_IN_FORGE_API_KEY em Environment. O código atual usa o serviço Manus Forge. Uma hospedagem gratuita não inclui esse serviço nem garante que a credencial funcione fora da Manus. A troca de fornecedor de IA exige configuração/adaptação e teste próprios.
9. Teste login, pedido Pix, confirmação, cancelamento, download e IA no ambiente publicado antes de direcionar compradores.

O carrinho é local ao navegador e domínio: não acompanha automaticamente o usuário em outro dispositivo, nem migra do domínio antigo para o novo. Pedidos criados estão no banco e vinculados à conta Discord.

Cancelar um pedido não estorna um Pix já enviado. Se houve pagamento, o atendimento deve verificar a transferência. A confirmação de recebimento continua manual.

## Verificação realizada nesta entrega

TypeScript sem erros; build de produção concluído; 19 testes locais passaram, cobrindo interações assinadas, autorização, banco lento, cancelamento, falhas, carrinho, concorrência de status, Pix, packs e logout. Inicialização de produção e respostas HTTP de página inicial, carrinho, checkout e sessão foram verificadas; interações sem assinatura retornaram 401.

Não houve acesso à sua conta Discord, banco de produção ou hospedagem. Os testes de credenciais reais que já existiam no projeto não foram executados. A migração em banco real, login real, entrega de mensagem, IA e publicação externa permanecem sem validação. Nenhum site foi publicado ou pedido real alterado.

## Atualização dos packs para Free Fire

Os arquivos em `server/private-packs` foram atualizados para Free Fire e Free Fire MAX no celular e no PC/emulador. Eles incluem presets na escala 0–200 para celular, valores iniciais de emulador, tamanhos de botão, HUD, controles, treino e correção por sintoma.
