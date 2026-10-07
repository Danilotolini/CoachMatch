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

**Documentação de domínio:**
- [Fluxo de pagamentos](../../docs/architecture/payments-workflow.md) — atores, estados, modelo da tabela, evento SQS, cartões de teste
- [Fluxo de chat](../../docs/architecture/chat-workflow.md) — emissão de token, criação de canal, checagem de membro, integração frontend

## Rotas implementadas

Mesma Lambda atende coach e aluno quando o caminho difere só pelo papel; o authorizer
é escolhido por rota (ver [Arquitetura do API Gateway](#arquitetura-do-api-gateway)).

| Método | Rota | Lambda | Auth |
| -------- | ------ | -------- | ------ |
| `GET` | `/coach/me` | `coachGetMe` | Cognito JWT (CoachAccess) |
| `PUT` | `/coach/me` | `coachUpdateMe` | Cognito JWT (CoachAccess) |
| `GET` | `/coach/gyms` | `gymGet` | Cognito JWT (CoachAccess) |
| `POST` | `/coach/gyms/suggest` | `gymSuggest` | Cognito JWT (CoachAccess) |
| `GET` | `/student/me` | `studentGetProfile` | Cognito JWT (StudentAccess) |
| `POST` | `/student/me/profile` | `studentUpdateProfile` | Cognito JWT (StudentAccess) |
| `POST` | `/student/me/health` | `studentUpdateHealth` | Cognito JWT (StudentAccess) |
| `GET` | `/student/gyms` | `gymGet` | Cognito JWT (StudentAccess) |
| `POST` | `/student/gyms/suggest` | `gymSuggest` | Cognito JWT (StudentAccess) |
| `GET` | `/student/coaches` | `studentGetCoaches` | Cognito JWT (StudentAccess) |
| `GET` | `/coach/specialties` | `specialtiesGet` | Cognito JWT (CoachAccess) |
| `GET` | `/student/specialties` | `specialtiesGet` | Cognito JWT (StudentAccess) |
| `POST` | `/coach/upload-url` | `uploadCreateUrl` | Cognito JWT (CoachAccess) |
| `POST` | `/student/upload-url` | `uploadCreateUrl` | Cognito JWT (StudentAccess) |
| `GET` | `/coach/schedule` | `coachGetSchedule` | Cognito JWT (CoachAccess) |
| `GET` | `/coach/schedule/requests` | `coachGetScheduleRequests` | Cognito JWT (CoachAccess) |
| `POST` | `/coach/schedule` | `coachCreateSchedule` | Cognito JWT (CoachAccess) |
| `POST` | `/coach/schedule/approve` | `coachApproveSchedule` | Cognito JWT (CoachAccess) |
| `POST` | `/coach/schedule/cancel` | `coachCancelSchedule` | Cognito JWT (CoachAccess) |
| `POST` | `/coach/schedule/class/status` | `coachUpdateClassStatus` | Cognito JWT (CoachAccess) |
| `GET` | `/student/coach/schedules` | `studentGetCoachSchedule` | Cognito JWT (StudentAccess) |
| `GET` | `/student/gyms/schedule` | `studentGetGymSchedule` | Cognito JWT (StudentAccess) |
| `GET` | `/student/coach/schedules/request` | `studentGetScheduleRequests` | Cognito JWT (StudentAccess) |
| `POST` | `/student/coach/schedules/request` | `studentCreateScheduleRequest` | Cognito JWT (StudentAccess) |
| `DELETE` | `/student/coach/schedules/request` | `studentCancelScheduleRequest` | Cognito JWT (StudentAccess) |
| `POST` | `/student/coach/schedules/cancel` | `studentCancelSchedule` | Cognito JWT (StudentAccess) |
| `POST` | `/payments` | `paymentCreate` | Cognito JWT (StudentAccess) |
| `GET` | `/payments/{transactionId}` | `paymentGet` | Cognito JWT (StudentAccess) |
| `GET` | `/payments/coach/{coachId}` | `paymentGetByCoach` | Cognito JWT (StudentAccess) |
| `GET` | `/payments/student/{studentId}` | `paymentGetByStudent` | Cognito JWT (StudentAccess) |
| `GET` | `/payments/session/{sessionId}` | `paymentGetBySession` | Cognito JWT (StudentAccess) |
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
| -------- | ------ | -------- | ----------- |
| `POST` | `/{role}/chat/token` | `chatToken` | Emite token de acesso do Stream (TTL 24h) |
| `POST` | `/{role}/chat/conversations` | `chatConversationCreate` | Cria/recupera a conversa direta com um par (`peerId`) |
| `GET` | `/{role}/chat/conversations` | `chatConversationList` | Lista as conversas do usuário (`?limit`) |
| `PATCH` | `/{role}/chat/conversations/{id}` | `chatConversationUpdate` | Edita nome/`frozen` da conversa |
| `DELETE` | `/{role}/chat/conversations/{id}` | `chatConversationDelete` | Oculta a conversa para o usuário |
| `POST` | `/{role}/chat/conversations/{id}/messages` | `chatMessageSend` | Envia mensagem na conversa |
| `GET` | `/{role}/chat/conversations/{id}/messages` | `chatMessageList` | Lista mensagens (`?limit`, `?before`) |
| `PATCH` | `/{role}/chat/messages/{id}` | `chatMessageUpdate` | Edita mensagem do próprio autor |
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

## Arquitetura do API Gateway

O HTTP API é **criado por este stack** (`coachmatch-<stage>`, `sa-east-1`), junto com
as rotas, as integrações Lambda, os authorizers JWT e o CORS. Nada disso depende do
console.

No `dev`, o stack também cria o **API mapping** (`$default`) de
`api.coachmatch.com.br` para a sua API. Ficam **fora do stack**, como recursos
manuais, só o custom domain e o certificado ACM. O DNS aponta para o endpoint regional
do custom domain, que não muda ao trocar de API (ver [`DEPLOY.md`](DEPLOY.md)).

Clientes (front, Postman, OpenAPI) usam sempre `https://api.coachmatch.com.br`, nunca a
URL `execute-api`.

### Authorizers e CORS

Declarados em `provider.httpApi`, iguais em todos os stages. Cada rota referencia o
authorizer por nome; `src/__tests__/route-authorizers.test.js` garante o perfil de cada
rota. No `local`, o serverless-offline valida o JWT pelos mesmos nomes
(`ignoreJWTSignature: true`).

| Authorizer          | Pool Cognito                          | Rotas                       |
|---------------------|---------------------------------------|-----------------------------|
| `coachAuthorizer`   | `sa-east-1_2DDuPPtc0` (CoachAccess)   | `/coach/*`                  |
| `studentAuthorizer` | `sa-east-1_2DSfT6kmB` (StudentAccess) | `/student/*`, `/payments/*` |

O CORS libera só `https://coachmatch.com.br`, `https://www.coachmatch.com.br` e
`http://localhost:5173` (o front local chama a API real quando o MSW está desligado).

### Stages

| Stage     | API                   | Observação                                                   |
|-----------|-----------------------|--------------------------------------------------------------|
| `local`   | serverless-offline    | DynamoDB Local                                               |
| `dev`     | mapeada no domínio    | É produção                                                   |

## Setup local

### Pré-requisitos

```bash
node >= 22
java         # qualquer JDK/JRE no PATH; ver "DynamoDB Local" abaixo
```

### Instalar dependências

`coachmatch` é uma workspace pnpm (declarada no `pnpm-workspace.yaml` da raiz do
monorepo); instale a partir da raiz:

```bash
cd ../.. && pnpm install
```

### DynamoDB Local

`pnpm dev` sobe dois processos:

- **serverless-offline** (porta 3000): serve as rotas HTTP e valida o JWT pelos mesmos
  authorizers do stack;
- **DynamoDB Local** (porta 8000): banco em memória, criado a cada start a partir dos
  `resources` com `Condition: IsLocal` e populado com os seeds de `seed/`.

O DynamoDB Local é um **programa Java** (`DynamoDBLocal.jar`), não um container: o
plugin `serverless-dynamodb` roda `java` direto, com o diretório de trabalho em
`.dynamodb/`. Por isso é preciso Java no `PATH` e o jar baixado nessa pasta.

O jar não vem com o `pnpm install`. Baixe uma vez por clone (a pasta é ignorada pelo
git):

```bash
pnpm exec serverless dynamodb install --stage local
```

Sem esse passo, `pnpm dev` falha com:

```
Error: spawn java ENOENT
```

A mensagem engana: o Java pode estar instalado. O Node dá esse mesmo erro quando o
diretório de trabalho do processo não existe — aqui, o `.dynamodb/`. Confira as duas
causas:

```bash
java -version      # Java no PATH?
ls .dynamodb       # jar baixado?
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

Os registros de aluno e treinador **não** precisam de seed: entre com a sua própria conta
do Cognito e o registro correspondente é criado no primeiro acesso a `/student/me` ou
`/coaches/me`, a partir das claims do seu ID token. Nada a configurar, nenhum `sub` a
descobrir.

O motivo: o trigger `PostConfirmation` do Cognito roda na AWS, não contra o
`serverless-offline`, então quem autentica localmente nunca ganharia registro em
`student`/`coaches` — e o front-end ficaria preso na tela de onboarding, mesmo com as
chamadas respondendo `200`. Quem cobre essa lacuna é
[`shared/local-autoseed.js`](src/shared/local-autoseed.js), que só age quando
`STAGE=local` e nunca sobrescreve um registro existente.

> **Atenção:** isso faz o ambiente local divergir de produção, onde um registro ausente
> resulta em `404`. Se o auto-seed falhar (claims incompletas, por exemplo), o request
> segue para o `404` normal e o motivo aparece como `local_autoseed_failed` no log do
> `pnpm dev`.

### Executar testes

```bash
pnpm test               # run uma vez
pnpm test:watch         # watch mode
pnpm test:coverage      # com relatório de cobertura (coverage/)
```

## Variáveis de ambiente (runtime)

| Variável | Descrição |
| ---------- | ----------- |
| `STAGE` | `local` habilita DynamoDB Local; qualquer outro valor usa AWS |
| `REGION` | Região AWS (ex: `sa-east-1`) |
| `ENDPOINT` | URL do DynamoDB Local (somente em `STAGE=local`) |
| `ACCESS_KEY_ID` | Credencial AWS (somente em `STAGE=local`) |
| `SECRET_ACCESS_KEY` | Credencial AWS (somente em `STAGE=local`) |

> Para deploys, o `.env` carrega `AWS_PROFILE` (ver [`.env.example`](.env.example) e
> [`DEPLOY.md`](DEPLOY.md)).

## Tabelas DynamoDB

| Tabela | Chave | Observação |
| -------- | ------- | ------------ |
| `coaches` | `coachId` (HASH) | |
| `student` | `studentId` (HASH) | |
| `gyms` | `gymId` (HASH) | |
| `payments` | `PK` (HASH) + `SK` (RANGE) | GSI1/GSI2/GSI3 (ProjectionType ALL) |
| `schedule` | `scheduleId` (HASH) | GSIs `Coach_Date`, `Gym_Date` e `Student_Date` |
| `specialties` | `id` (HASH) | Catálogo global |

Em `local` as tabelas são criadas pelo `serverless-dynamodb` (condição `IsLocal`); em
`dev` já existem na conta AWS.

## Histórico

### Agendamento, especialidades e upload em Node (2026-09)

As rotas de `*/schedule*`, `*/specialties` e `*/upload-url`, antes servidas por
Lambdas Python manuais, foram reescritas em Node e passaram a ser gerenciadas por
este stack. As Lambdas Python permanecem temporariamente disponíveis apenas para
rollback durante o período de observação.

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
- Os **authorizers JWT** continuam manuais. Trazê-los para o stack exigiria a API
  deixar de ser externa.
- **Status de pagamento é filtrado só no frontend.** O treinador não deve ver o
  `paymentStatus` da sessão, mas hoje a API de `schedule` devolve o campo
  igual para os dois papéis; o cliente apenas o omite na visão do coach
  (`SessionSummaryCard`/`SessionSummaryModal`). O correto seria não retornar
  `paymentStatus` na resposta do coach, mas isso exigiria endpoints/lambdas de schedule
  separados por papel. Enquanto não houver essa separação, manter o filtro no frontend.
