# CoachMatch — API de Lambdas (coachmatch)

Serviço serverless com as Lambdas Node do marketplace CoachMatch. Arquitetura em 3
camadas por função, implantada na AWS com Serverless Framework v4.

> **Como fazer deploy?** Os comandos e o passo a passo de credenciais ficam em
> [`DEPLOY.md`](DEPLOY.md). Este README descreve **o que** é o serviço, sua
> arquitetura e como rodá-lo localmente.

## Stack

- **Runtime**: Node.js 22 (ESM)
- **Framework**: Serverless Framework v4 (build via esbuild, `format: esm`)
- **Banco**: DynamoDB (via `@aws-sdk/lib-dynamodb`)
- **Validação**: Joi
- **Testes**: Vitest

## Estrutura de pastas

Cada Lambda HTTP tem sua própria pasta com 4 arquivos fixos:

```
src/
├── coaches/
│   ├── create-coach/          # Trigger PostConfirmation Cognito (CoachAccess)
│   │   ├── handler.js         # Entry-point AWS (parse do evento)
│   │   ├── index.js           # Lógica de negócio
│   │   ├── repository.js      # Acesso ao DynamoDB
│   │   └── schema.js          # Validação Joi
│   ├── get-coach/             # GET /coach/me
│   ├── update-coach/          # PUT /coach/me
│   └── submit-coach-for-review/  # POST /coach/me/submit-for-review (desativada)
│
├── students/
│   ├── create-student/        # Trigger PostConfirmation Cognito (StudentAccess)
│   ├── get-student/           # GET /student/me
│   ├── update-student-profile/ # POST /student/me/profile
│   ├── update-student-health/ # POST /student/me/health
│   └── get-coaches/           # GET /student/coaches (busca com parâmetro q)
│
├── gyms/
│   ├── list-gyms/             # GET /coach/gyms e /student/gyms
│   └── suggest-gym/           # POST /coach/gyms/suggest e /student/gyms/suggest
│
├── payments/
│   ├── create-payment/        # POST /payments
│   ├── get-payment/           # GET /payments/{transactionId}
│   ├── get-coach-payments/    # GET /payments/coach/{coachId}
│   ├── get-student-payments/  # GET /payments/student/{studentId}
│   ├── get-session-payments/  # GET /payments/session/{sessionId}
│   ├── refund-payment/        # POST /payments/{transactionId}/refund
│   └── shared/                # helpers específicos de pagamentos
│
├── api-chat/                  # Chat 1:1 aluno↔coach (Stream Chat)
│   ├── token.js               # POST /chat/token — emite token de acesso do Stream
│   ├── conversations.js       # handlers de conversas (create/list/update/remove)
│   ├── messages.js            # handlers de mensagens (send/list/update/remove)
│   ├── service/               # integração com o SDK do Stream (token/conversations/messages)
│   ├── lib/                   # http.js (auth + map de erros), membership.js, errors.js
│   └── validation/            # schemas Joi do chat
│
└── shared/
    ├── config.js              # createClient() — DynamoDBDocumentClient
    ├── streamClient.js        # getStreamClient() — SDK server-side do Stream Chat
    └── exceptions.js          # DatabaseConnectionException, ValidationException,
                               # NotFoundException, ConflictException
```

> **Chat é a exceção arquitetural.** Diferente das Lambdas de 3 camadas + DynamoDB,
> `api-chat` não persiste nada localmente: delega tudo ao **Stream Chat** via
> `shared/streamClient.js`. O handler é fino (`lib/http.handle` resolve o usuário das
> claims do Cognito e mapeia erros → status), a regra fica em `service/` e a posse de
> canal/mensagem é checada em `lib/membership.js`.

## Rotas implementadas

Mesma Lambda atende coach e aluno quando o caminho difere só pelo papel; o authorizer
é escolhido por rota (ver [Arquitetura do API Gateway](#arquitetura-do-api-gateway-compartilhado)).

| Método | Rota | Lambda | Auth |
|--------|------|--------|------|
| `GET`  | `/coach/me` | `coachGetMe` | Cognito JWT (CoachAccess) |
| `PUT`  | `/coach/me` | `coachUpdateMe` | Cognito JWT (CoachAccess) |
| `GET`  | `/coach/gyms` | `gymGet` | Cognito JWT (CoachAccess) |
| `POST` | `/coach/gyms/suggest` | `gymSuggest` | Cognito JWT (CoachAccess) |
| `GET`  | `/student/me` | `studentGetProfile` | Cognito JWT (StudentAccess) |
| `POST` | `/student/me/profile` | `studentUpdateProfile` | Cognito JWT (StudentAccess) |
| `POST` | `/student/me/health` | `studentUpdateHealth` | Cognito JWT (StudentAccess) |
| `GET`  | `/student/gyms` | `gymGet` | Cognito JWT (StudentAccess) |
| `POST` | `/student/gyms/suggest` | `gymSuggest` | Cognito JWT (StudentAccess) |
| `GET`  | `/student/coaches` | `studentGetCoaches` | Cognito JWT (StudentAccess) |
| `POST` | `/payments` | `paymentCreate` | Cognito JWT (StudentAccess) |
| `GET`  | `/payments/{transactionId}` | `paymentGet` | Cognito JWT (StudentAccess) |
| `GET`  | `/payments/coach/{coachId}` | `paymentGetByCoach` | Cognito JWT (StudentAccess) |
| `GET`  | `/payments/student/{studentId}` | `paymentGetByStudent` | Cognito JWT (StudentAccess) |
| `GET`  | `/payments/session/{sessionId}` | `paymentGetBySession` | Cognito JWT (StudentAccess) |
| `POST` | `/payments/{transactionId}/refund` | `paymentRefund` | Cognito JWT (StudentAccess) |

Triggers Cognito (não HTTP):

- `coachCreate` — PostConfirmation no pool **CoachAccess**
- `studentCreate` — PostConfirmation no pool **StudentAccess**

> `coachSubmitForReview` (`POST /coach/me/submit-for-review`) está **desativada**
> (bloco comentado no `serverless.yml`); o coach é cadastrado já ativo. Ver
> [Pendências conhecidas](#pendências-conhecidas).

### Chat (Stream)

Cada rota existe sob `/coach/chat/*` (authorizer CoachAccess) e `/student/chat/*`
(authorizer StudentAccess) — a mesma Lambda atende os dois papéis. `{id}` é o id do
canal (conversa) ou da mensagem, conforme a rota.

| Método | Rota | Lambda | Descrição |
|--------|------|--------|-----------|
| `POST`   | `/{role}/chat/token` | `chatToken` | Emite token de acesso do Stream (TTL 24h) |
| `POST`   | `/{role}/chat/conversations` | `chatConversationCreate` | Cria/recupera a conversa direta com um par (`peerId`) |
| `GET`    | `/{role}/chat/conversations` | `chatConversationList` | Lista as conversas do usuário (`?limit`) |
| `PATCH`  | `/{role}/chat/conversations/{id}` | `chatConversationUpdate` | Edita nome/`frozen` da conversa |
| `DELETE` | `/{role}/chat/conversations/{id}` | `chatConversationDelete` | Oculta a conversa para o usuário |
| `POST`   | `/{role}/chat/conversations/{id}/messages` | `chatMessageSend` | Envia mensagem na conversa |
| `GET`    | `/{role}/chat/conversations/{id}/messages` | `chatMessageList` | Lista mensagens (`?limit`, `?before`) |
| `PATCH`  | `/{role}/chat/messages/{id}` | `chatMessageUpdate` | Edita mensagem do próprio autor |
| `DELETE` | `/{role}/chat/messages/{id}` | `chatMessageDelete` | Apaga (soft delete) mensagem do próprio autor |

## Status de coach (fluxo)

```
[Cognito confirm] → PENDING_PROFILE
       ↓ PUT /coach/me (salva perfil, sem mudar status)
PENDING_PROFILE
       ↓ POST /coach/me/submit-for-review  (rota desativada hoje)
PENDING_REVIEW
       ↓ Aprovação manual (admin)
APPROVED   /   REJECTED
```

## Arquitetura do API Gateway compartilhado

O serviço usa um **HTTP API externo** ao stack (`qht6965nv9`, `sa-east-1`, domínio
`api.coachmatch.com.br`). A propriedade dos recursos é dividida:

- **Gerenciado por este stack** (`coachmatch-dev`): todas as rotas Node da tabela acima,
  suas integrações Lambda e os triggers Cognito.
- **Manual, fora do stack**: as rotas **Python** (`*/schedule*`, `*/specialties`,
  `*/upload-url`) e os **authorizers JWT**.

### Authorizers numa API externa (ponto-chave)

Como a API é externa (`httpApi.id` setado), o Serverless **não pode gerenciar
authorizers** nela — declarar `provider.httpApi.authorizers` gerenciado quebra com
`Cannot setup authorizers for externally configured HTTP API`. Por isso o
`serverless.yml` resolve `httpApi` por stage (`custom.httpApiByStage`):

- **dev** → só `{ id: qht6965nv9 }`. Cada rota referencia o authorizer **existente
  por id** (`custom.coachAuthorizer` = `bg0uj6`, `custom.studentAuthorizer` = `ahu157`).
- **local** → `{ id: "", authorizers: {…} }`. O serverless-offline sobe a própria API
  e valida o JWT por nome (`ignoreJWTSignature: true`).

Os authorizers continuam recursos **manuais** na AWS (compartilhados com as rotas
Python). O stack apenas os referencia; não os cria nem deleta. Por isso eles precisam
seguir declarados por nome no bloco `local`, mesmo o `dev` referenciando por id.

| Authorizer | ID       | Pool Cognito                          | Rotas                       |
|------------|----------|---------------------------------------|-----------------------------|
| coach      | `bg0uj6` | `sa-east-1_2DDuPPtc0` (CoachAccess)   | `/coach/*`                  |
| student    | `ahu157` | `sa-east-1_2DSfT6kmB` (StudentAccess) | `/student/*`, `/payments/*` |

## Setup local

### Pré-requisitos

```bash
node >= 22
```

### Instalar dependências

`coachmatch` é uma workspace pnpm (declarada no `pnpm-workspace.yaml` da raiz do
monorepo); instale a partir da raiz:

```bash
cd ../.. && pnpm install
```

### Configuração

Os parâmetros do stage `local` vêm de `config.yml`:

```yaml
# config.yml — chaves no topo são lidas como custom.config.<stage> no serverless.yml
local:
  stage: local
  region: us-east-1
  endpoint: http://localhost:8000
  accessKeyId: fakeMyKeyId
  secretAccessKey: fakeSecretAccessKey

dev:
  stage: dev
  region: sa-east-1
  apiGatewayId: qht6965nv9
```

### Iniciar servidor local

```bash
pnpm dev
# serverless offline start — sobe serverless-offline + DynamoDB Local na porta 8000
```

### Dados de teste

O `serverless-dynamodb` sobe a tabela `gyms` já populada a partir de
[`seed/gyms.json`](seed/gyms.json), configurado em `custom.dynamodb.seed` no
`serverless.yml`. Para incluir outras academias, basta editar o arquivo.

> **Limitação conhecida:** o trigger `PostConfirmation` do Cognito não dispara contra o
> ambiente local, então um usuário que existe no pool não ganha registro nas tabelas
> `student`/`coaches` — e o front-end fica preso na tela de onboarding, mesmo com as
> chamadas respondendo `200`. A criação automática desse registro está em andamento.

### Executar testes

```bash
pnpm test               # run uma vez
pnpm test:watch         # watch mode
pnpm test:coverage      # com relatório de cobertura (coverage/)
```

## Variáveis de ambiente (runtime)

| Variável | Descrição |
|----------|-----------|
| `STAGE` | `local` habilita DynamoDB Local; qualquer outro valor usa AWS |
| `REGION` | Região AWS (ex: `sa-east-1`) |
| `ENDPOINT` | URL do DynamoDB Local (somente em `STAGE=local`) |
| `ACCESS_KEY_ID` | Credencial AWS (somente em `STAGE=local`) |
| `SECRET_ACCESS_KEY` | Credencial AWS (somente em `STAGE=local`) |

> Para deploys, o `.env` carrega `AWS_PROFILE` (ver [`.env.example`](.env.example) e
> [`DEPLOY.md`](DEPLOY.md)).

## Tabelas DynamoDB

| Tabela | Chave | Observação |
|--------|-------|------------|
| `coaches` | `coachId` (HASH) | |
| `student` | `studentId` (HASH) | |
| `gyms` | `gymId` (HASH) | |
| `payments` | `PK` (HASH) + `SK` (RANGE) | GSI1/GSI2/GSI3 (ProjectionType ALL) |

Em `local` as tabelas são criadas pelo `serverless-dynamodb` (condição `IsLocal`); em
`dev` já existem na conta AWS.

## Histórico

### Migração 2026-06-16

O API Gateway tinha **propriedade misturada**: rotas de gyms (`/coach/gyms`, etc.)
existiam manualmente e colidiam com as declaradas no `serverless.yml`. A migração:

1. Authorizers passaram a ser referenciados por `id` no evento (em vez de gerenciados).
2. Deletadas as 4 rotas manuais de gyms (`/coach/gyms`, `/student/gyms`,
   `/coach/gyms/suggest`, `/student/gyms/suggest`).
3. `serverless deploy --stage dev` recriou as 4 por papel + criou `GET /student/coaches`
   e as 6 rotas `/payments/*`, todas dentro do stack. As legadas `/gyms` e
   `/gyms/suggest` foram removidas.

Backup pré-deploy em `server/coachmatch/apigw-backup-20260616/`.

## Pendências conhecidas

- `POST /coach/me/submit-for-review` (`coachSubmitForReview`) está **comentada** no
  `serverless.yml` e não existe no API Gateway.
- Lambdas **Python** (`schedule`, `specialties`, `upload-url`) e os **authorizers**
  continuam manuais. Migrá-los para o stack é trabalho futuro (exigiria a API deixar de
  ser externa ou recriar as rotas Python no stack).
- **Status de pagamento é filtrado só no frontend.** O treinador não deve ver o
  `paymentStatus` da sessão, mas hoje a API (rotas `schedule`, Python) devolve o campo
  igual para os dois papéis; o cliente apenas o omite na visão do coach
  (`SessionSummaryCard`/`SessionSummaryModal`). O correto seria não retornar
  `paymentStatus` na resposta do coach, mas isso exigiria endpoints/lambdas de schedule
  separados por papel. Enquanto não houver essa separação, manter o filtro no frontend.
