# Deploy — `coachmatch` (Serverless Framework)

> Este serviço compartilha um **HTTP API do API Gateway** (`qht6965nv9`, `sa-east-1`)
> com rotas e authorizers criados **manualmente**. Um `serverless deploy` completo
> feito às cegas **quebra** (conflito de rotas) — leia o porquê antes de deployar.

## TL;DR

| Objetivo | Comando | Toca o API Gateway? |
| --- | --- | --- |
| Rodar local | `serverless offline --stage local` | Não (sobe servidor local) |
| Atualizar código de uma função | `serverless deploy function --function <fn> --stage dev` | **Não** |
| Deploy completo | `serverless deploy --stage dev` | **Sim — só com change set revisado** |

Regra de ouro: **na AWS, use `deploy function`**. `deploy` completo só de forma deliberada.

## Por que o `deploy` completo é arriscado aqui

O API Gateway `qht6965nv9` tem **propriedade misturada**:

- **Gerenciado por este stack (CloudFormation `coachmatch-dev`):** apenas
  `GET /coach/me`, `PUT /coach/me`, `GET /student/me`, `POST /student/me/profile`,
  `POST /student/me/health` e as legadas `GET /gyms`, `POST /gyms/suggest`.
- **Criado manualmente (fora do stack):** `/coach/gyms`, `/student/gyms`,
  `/coach/gyms/suggest`, `/student/gyms/suggest`, **todas** as rotas `*/schedule*`
  (Lambdas Python), `*/specialties`, `*/upload-url`, os **dois authorizers JWT**
  (`bg0uj6` coach / `ahu157` student) e a rota órfã `ANY /student/me`.

O Serverless **não deleta** o que não é dele (as rotas manuais/Python ficam intactas),
mas um `deploy` completo do `serverless.yml` atual iria:

1. **Criar** `/coach/gyms`, `/student/gyms`, `/coach/gyms/suggest`, `/student/gyms/suggest`
   → já existem manualmente → `ConflictException` → **rollback do stack inteiro**.
2. **Criar** `cognitoAuthorizer` + `cognitoStudentAuthorizer` → o stack não possui
   authorizer nenhum hoje → geraria **duplicatas** dos manuais.
3. Renomear `/gyms` → `/coach/gyms` → CF deleta a rota legada e tenta recriar como
   `/coach/gyms` (que colide, item 1).

## Fluxos

### Local (`serverless-offline`)

```bash
serverless offline --stage local
```

- `httpApi.id` fica **vazio** no stage `local`, então o offline sobe o próprio servidor.
- As rotas vêm dos `events: httpApi` do `serverless.yml`.
- O authorizer roda local via `custom.serverless-offline.ignoreJWTSignature: true`
  (valida o formato do JWT, ignora a assinatura). Os dois authorizers (coach/student)
  funcionam.

> Por isso as rotas e authorizers **precisam** continuar declarados no `serverless.yml`,
> mesmo sendo manuais na AWS — é o que faz o local funcionar.

### Atualizar só o código de uma função (uso diário na AWS)

```bash
serverless deploy function --function coachGetMe --stage dev
```

Atualiza **apenas o código/config** da Lambda. **Não** mexe em rotas, integrações nem
authorizers. Seguro para o dia a dia e para migrar uma função Python → Node (basta
trocar o código).

### Deploy completo (só quando inevitável)

1. Gere o template **sem aplicar** e inspecione:

   ```bash
   serverless package --stage dev
   # revisar .serverless/cloudformation-template-update-stack.json
   ```

2. Prefira um **change set** do CloudFormation e revise Add/Modify/Remove antes de executar.
3. Só execute se não houver criação de rota/authorizer que já exista manualmente.

## Inspecionar o estado real (read-only)

```bash
# Rotas e para onde apontam
aws apigatewayv2 get-routes --api-id qht6965nv9 --region sa-east-1 --profile CoachMatch \
  --query 'Items[].{Route:RouteKey,Target:Target,Auth:AuthorizerId}' --output table

# Integrações → Lambda
aws apigatewayv2 get-integrations --api-id qht6965nv9 --region sa-east-1 --profile CoachMatch \
  --query 'Items[].{Id:IntegrationId,Uri:IntegrationUri}' --output table

# O que ESTE stack possui
aws cloudformation describe-stack-resources --stack-name coachmatch-dev \
  --region sa-east-1 --profile CoachMatch \
  --query 'StackResources[?contains(ResourceType,`ApiGatewayV2`)].{Type:ResourceType,Logical:LogicalResourceId,Physical:PhysicalResourceId}' \
  --output table
```

## Endgame — unificar a propriedade (migração planejada)

Como o local **exige** que o `serverless.yml` conheça as rotas/authorizers, e a AWS as
tem manuais, o único jeito de local e AWS saírem do **mesmo arquivo sem drift** é o
Serverless passar a ser dono de tudo. Migração sugerida (com janela de manutenção):

1. Inventariar todas as rotas/authorizers manuais (comandos acima).
2. Declarar tudo no `serverless.yml` (já está, para as funções Node; Python entra
   quando for migrada de runtime).
3. **Deletar** as rotas/authorizers manuais que vão passar a ser do stack
   (`aws apigatewayv2 delete-route` / `delete-authorizer`) — breve indisponibilidade
   nas rotas afetadas.
4. `serverless deploy --stage dev` recria tudo, agora dentro do CloudFormation.
5. Validar rota a rota (`get-routes`) e o login local.

Itens de limpeza identificados na inspeção (candidatos a remover na migração):

- Rota órfã `ANY /student/me` (sem integração).
- Rotas legadas sem authorizer: `GET /gyms`, `POST /gyms/suggest`.
- Integrações sem rota: `post-gyms-suggest`, `get-gyms`, `post-coach-availabilities`.

## Pendências conhecidas

- `POST /coach/me/submit-for-review` está declarada no `serverless.yml`.
- Rotas de **pagamento** (`/payments*`) estão no `serverless.yml` porém **não deployadas**
  — feature pendente.
- Lambdas **Python** (`schedule`, `specialties`, `upload-url`) vivem só na AWS; migração
  para Node é trabalho futuro.
