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
└── shared/
    ├── config.js              # createClient() — DynamoDBDocumentClient
    └── exceptions.js          # DatabaseConnectionException, ValidationException,
                               # NotFoundException, ConflictException
```

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
