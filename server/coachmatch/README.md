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
├── schedule/                  # Agenda: disponibilidades, solicitações e aulas
│   ├── get-own-schedule/      # GET /coach/schedule
│   ├── get-availability/      # GET /student/coach/schedules e /student/gyms/schedule
│   ├── get-schedule-requests/ # GET /coach/schedule/requests
│   ├── get-student-requests/  # GET /student/coach/schedules/request
│   ├── create-schedule/       # POST /coach/schedule
│   ├── create-schedule-request/ # POST /student/coach/schedules/request
│   ├── approve-schedule-request/ # POST /coach/schedule/approve
│   ├── cancel-schedule/       # POST /coach/schedule/cancel
│   ├── cancel-booked-schedule/ # POST /student/coach/schedules/cancel
│   ├── cancel-schedule-request/ # DELETE /student/coach/schedules/request
│   ├── update-class-status/   # POST /coach/schedule/class/status
│   ├── on-payment-succeeded/  # Consumidor SQS de `payment.succeeded` (não HTTP)
│   └── shared/                # auth, constants, exceptions, fields, format, notify
│                              # (SQS MailSender), repository e validation do domínio
│
├── specialties/
│   └── list-specialties/      # GET /coach/specialties e /student/specialties
│
├── uploads/
│   └── create-upload-url/     # POST /coach/upload-url e /student/upload-url
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
    ├── compare.js             # byStringKey() — comparador de ordenação por chave
    ├── logger.js              # withLogger() — log estruturado por requisição
    ├── events.js              # publicação de eventos de domínio na fila SQS
    ├── s3.js                  # URLs assinadas de leitura das mídias de perfil
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

| Método | Rota                               | Lambda                 | Auth                        |
| ------ | ---------------------------------- | ---------------------- | --------------------------- |
| `GET`  | `/coach/me`                        | `coachGetMe`           | Cognito JWT (CoachAccess)   |
| `PUT`  | `/coach/me`                        | `coachUpdateMe`        | Cognito JWT (CoachAccess)   |
| `GET`  | `/coach/gyms`                      | `gymGet`               | Cognito JWT (CoachAccess)   |
| `POST` | `/coach/gyms/suggest`              | `gymSuggest`           | Cognito JWT (CoachAccess)   |
| `GET`  | `/student/me`                      | `studentGetProfile`    | Cognito JWT (StudentAccess) |
| `POST` | `/student/me/profile`              | `studentUpdateProfile` | Cognito JWT (StudentAccess) |
| `POST` | `/student/me/health`               | `studentUpdateHealth`  | Cognito JWT (StudentAccess) |
| `GET`  | `/student/gyms`                    | `gymGet`               | Cognito JWT (StudentAccess) |
| `POST` | `/student/gyms/suggest`            | `gymSuggest`           | Cognito JWT (StudentAccess) |
| `GET`  | `/student/coaches`                 | `studentGetCoaches`    | Cognito JWT (StudentAccess) |
| `POST` | `/payments`                        | `paymentCreate`        | Cognito JWT (StudentAccess) |
| `GET`  | `/payments/{transactionId}`        | `paymentGet`           | Cognito JWT (StudentAccess) |
| `GET`  | `/payments/coach/{coachId}`        | `paymentGetByCoach`    | Cognito JWT (StudentAccess) |
| `GET`  | `/payments/student/{studentId}`    | `paymentGetByStudent`  | Cognito JWT (StudentAccess) |
| `GET`  | `/payments/session/{sessionId}`    | `paymentGetBySession`  | Cognito JWT (StudentAccess) |
| `POST` | `/payments/{transactionId}/refund` | `paymentRefund`        | Cognito JWT (StudentAccess) |

### Catálogo e uploads

| Método | Rota                   | Lambda            | Auth                        |
| ------ | ---------------------- | ----------------- | --------------------------- |
| `GET`  | `/coach/specialties`   | `specialtiesGet`  | Cognito JWT (CoachAccess)   |
| `GET`  | `/student/specialties` | `specialtiesGet`  | Cognito JWT (StudentAccess) |
| `POST` | `/coach/upload-url`    | `uploadCreateUrl` | Cognito JWT (CoachAccess)   |
| `POST` | `/student/upload-url`  | `uploadCreateUrl` | Cognito JWT (StudentAccess) |

### Agendamento

| Método   | Rota                               | Lambda                         | Auth                        |
| -------- | ---------------------------------- | ------------------------------ | --------------------------- |
| `GET`    | `/coach/schedule`                  | `coachGetSchedule`             | Cognito JWT (CoachAccess)   |
| `POST`   | `/coach/schedule`                  | `coachCreateSchedule`          | Cognito JWT (CoachAccess)   |
| `GET`    | `/coach/schedule/requests`         | `coachGetScheduleRequests`     | Cognito JWT (CoachAccess)   |
| `POST`   | `/coach/schedule/approve`          | `coachApproveSchedule`         | Cognito JWT (CoachAccess)   |
| `POST`   | `/coach/schedule/cancel`           | `coachCancelSchedule`          | Cognito JWT (CoachAccess)   |
| `POST`   | `/coach/schedule/class/status`     | `coachUpdateClassStatus`       | Cognito JWT (CoachAccess)   |
| `GET`    | `/student/coach/schedules`         | `studentGetCoachSchedule`      | Cognito JWT (StudentAccess) |
| `GET`    | `/student/gyms/schedule`           | `studentGetGymSchedule`        | Cognito JWT (StudentAccess) |
| `GET`    | `/student/coach/schedules/request` | `studentGetScheduleRequests`   | Cognito JWT (StudentAccess) |
| `POST`   | `/student/coach/schedules/request` | `studentCreateScheduleRequest` | Cognito JWT (StudentAccess) |
| `DELETE` | `/student/coach/schedules/request` | `studentCancelScheduleRequest` | Cognito JWT (StudentAccess) |
| `POST`   | `/student/coach/schedules/cancel`  | `studentCancelSchedule`        | Cognito JWT (StudentAccess) |

As rotas de agendamento respondem erro no formato `{"errors": [...]}` — diferente do
`{message, details}` do Joi usado nos demais módulos. O cliente lê `errors[0]`
(`client/src/lib/http.ts`), então o formato é contrato.

Triggers e consumidores (não HTTP):

- `coachCreate` — PostConfirmation no pool **CoachAccess**
- `studentCreate` — PostConfirmation no pool **StudentAccess**
- `onPaymentSucceeded` — consome `payment.succeeded` da fila SQS e marca o schedule
  como pago (`paymentStatus = PAID`)

> `coachSubmitForReview` (`POST /coach/me/submit-for-review`) está **desativada**
> (bloco comentado no `serverless.yml`); o coach é cadastrado já ativo. Ver
> [Pendências conhecidas](#pendências-conhecidas).

### Chat (Stream)

Cada rota existe sob `/coach/chat/*` (authorizer CoachAccess) e `/student/chat/*`
(authorizer StudentAccess) — a mesma Lambda atende os dois papéis. `{id}` é o id do
canal (conversa) ou da mensagem, conforme a rota.

| Método   | Rota                                       | Lambda                   | Descrição                                             |
| -------- | ------------------------------------------ | ------------------------ | ----------------------------------------------------- |
| `POST`   | `/{role}/chat/token`                       | `chatToken`              | Emite token de acesso do Stream (TTL 24h)             |
| `POST`   | `/{role}/chat/conversations`               | `chatConversationCreate` | Cria/recupera a conversa direta com um par (`peerId`) |
| `GET`    | `/{role}/chat/conversations`               | `chatConversationList`   | Lista as conversas do usuário (`?limit`)              |
| `PATCH`  | `/{role}/chat/conversations/{id}`          | `chatConversationUpdate` | Edita nome/`frozen` da conversa                       |
| `DELETE` | `/{role}/chat/conversations/{id}`          | `chatConversationDelete` | Oculta a conversa para o usuário                      |
| `POST`   | `/{role}/chat/conversations/{id}/messages` | `chatMessageSend`        | Envia mensagem na conversa                            |
| `GET`    | `/{role}/chat/conversations/{id}/messages` | `chatMessageList`        | Lista mensagens (`?limit`, `?before`)                 |
| `PATCH`  | `/{role}/chat/messages/{id}`               | `chatMessageUpdate`      | Edita mensagem do próprio autor                       |
| `DELETE` | `/{role}/chat/messages/{id}`               | `chatMessageDelete`      | Apaga (soft delete) mensagem do próprio autor         |

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

- **Gerenciado por este stack** (`coachmatch-dev`): todas as rotas das tabelas acima,
  suas integrações Lambda e os triggers Cognito.
- **Manual, fora do stack**: apenas os **authorizers JWT**.

### Authorizers numa API externa (ponto-chave)

Como a API é externa (`httpApi.id` setado), o Serverless **não pode gerenciar
authorizers** nela — declarar `provider.httpApi.authorizers` gerenciado quebra com
`Cannot setup authorizers for externally configured HTTP API`. Por isso o
`serverless.yml` resolve `httpApi` por stage (`custom.httpApiByStage`):

- **dev** → só `{ id: qht6965nv9 }`. Cada rota referencia o authorizer **existente
  por id** (`custom.coachAuthorizer` = `bg0uj6`, `custom.studentAuthorizer` = `ahu157`).
- **local** → `{ id: "", authorizers: {…} }`. O serverless-offline sobe a própria API
  e valida o JWT por nome (`ignoreJWTSignature: true`).

Os authorizers continuam recursos **manuais** na AWS. O stack apenas os referencia;
não os cria nem deleta. Por isso eles precisam seguir declarados por nome no bloco
`local`, mesmo o `dev` referenciando por id.

| Authorizer | ID       | Pool Cognito                          | Rotas                       |
| ---------- | -------- | ------------------------------------- | --------------------------- |
| coach      | `bg0uj6` | `sa-east-1_2DDuPPtc0` (CoachAccess)   | `/coach/*`                  |
| student    | `ahu157` | `sa-east-1_2DSfT6kmB` (StudentAccess) | `/student/*`, `/payments/*` |

## Setup local

### Pré-requisitos

| Requisito                                                       | Por quê                                                                                                                                                                                |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js >= 22                                                   | Runtime do serviço                                                                                                                                                                     |
| pnpm >= 11                                                      | Package manager do monorepo                                                                                                                                                            |
| **Java (JRE/JDK 11+)**                                          | O plugin `serverless-dynamodb` sobe o **DynamoDB Local**, que roda na JVM. Sem `java` no PATH, `pnpm dev` falha com `Error: spawn java ENOENT`                                         |
| Conta no **Serverless Dashboard** com acesso à org `coachmatch` | O Serverless Framework v4 exige login para rodar qualquer comando — inclusive o `serverless offline`. Ver [Login no Serverless Framework](#login-no-serverless-framework-primeira-vez) |

### Login no Serverless Framework (primeira vez)

O `serverless.yml` declara `org: coachmatch` / `app: coachmatchapp`, então o CLI
precisa estar autenticado numa conta **com acesso a essa org** — senão ele falha ao
resolver o serviço (ou pede para criar org/app novos, o que está errado).

1. **Peça ao dono da org para convidar seu e-mail** no Serverless Dashboard
   ([app.serverless.com/coachmatch/services](https://app.serverless.com/coachmatch/services)
   → Settings → Members).
2. Aceite o convite e faça login pelo CLI (abre o navegador):

   ```bash
   pnpm exec serverless login
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

Na **primeira vez**, baixe o jar do DynamoDB Local (grava em `.dynamodb/`, não
versionado):

```bash
pnpm exec serverless dynamodb install --stage local
```

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

**Erros comuns:**

| Erro                                                 | Causa / solução                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Error: spawn java ENOENT`                           | **Raramente é versão do Java.** É o Node reportando de forma enganosa que a pasta `.dynamodb/` não existe (jar nunca baixado) — rode `pnpm exec serverless dynamodb install --stage local`. Só investigue o Java (`java -version`) se isso não resolver                                                       |
| `Unable to access jarfile DynamoDBLocal.jar`         | Mesma causa acima — jar não instalado; rode o `serverless dynamodb install`                                                                                                                                                                                                                                   |
| CLI pede login ou não encontra a org/app             | Conta sem acesso à org `coachmatch` — ver [Login no Serverless Framework](#login-no-serverless-framework-primeira-vez)                                                                                                                                                                                        |
| `BindException: Address already in use` (porta 8000) | Sobrou um processo Java do DynamoDB Local de uma sessão anterior que não foi encerrada com `Ctrl+C` (ex.: terminal fechado à força, `timeout`, crash). `Ctrl+C` no terminal do `pnpm dev` já para o Java automaticamente; se sobrou um órfão, mate com `pkill -f DynamoDBLocal.jar` e rode `pnpm dev` de novo |

### Executar testes

```bash
pnpm test               # run uma vez
pnpm test:watch         # watch mode
pnpm test:coverage      # com relatório de cobertura (coverage/)
```

## Variáveis de ambiente (runtime)

| Variável            | Descrição                                                     |
| ------------------- | ------------------------------------------------------------- |
| `STAGE`             | `local` habilita DynamoDB Local; qualquer outro valor usa AWS |
| `REGION`            | Região AWS (ex: `sa-east-1`)                                  |
| `ENDPOINT`          | URL do DynamoDB Local (somente em `STAGE=local`)              |
| `ACCESS_KEY_ID`     | Credencial AWS (somente em `STAGE=local`)                     |
| `SECRET_ACCESS_KEY` | Credencial AWS (somente em `STAGE=local`)                     |

> Para deploys, o `.env` carrega `AWS_PROFILE` (ver [`.env.example`](.env.example) e
> [`DEPLOY.md`](DEPLOY.md)).

## Tabelas DynamoDB

| Tabela        | Chave                      | Observação                                          |
| ------------- | -------------------------- | --------------------------------------------------- |
| `coaches`     | `coachId` (HASH)           |                                                     |
| `student`     | `studentId` (HASH)         |                                                     |
| `gyms`        | `gymId` (HASH)             |                                                     |
| `payments`    | `PK` (HASH) + `SK` (RANGE) | GSI1/GSI2/GSI3 (ProjectionType ALL)                 |
| `schedule`    | `scheduleId` (HASH)        | GSIs `Coach_Date`, `Gym_Date` e `Student_Date`      |
| `specialties` | `id` (HASH)                | Catálogo global, lido por Scan (`Cache-Control` 1h) |

Em `local` as tabelas são criadas pelo `serverless-dynamodb` (condição `IsLocal`); em
`dev` já existem na conta AWS.

## Histórico

### Agendamento, especialidades e upload em Node (2026-08)

As 15 Lambdas de `*/schedule*`, `*/specialties` e `*/upload-url` eram escritas em
Python e mantidas manualmente no API Gateway, fora do stack. Elas foram reescritas
em Node seguindo a arquitetura de 3 camadas do serviço e passaram a ser declaradas
no `serverless.yml`, junto com as tabelas `schedule` e `specialties` e a permissão
de `sqs:SendMessage` na fila externa `MailSender` (notificações por e-mail).

Os fontes Python originais seguem versionados em `server/python-lambdas/` como
referência histórica; não são mais implantados.

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
- Os **authorizers JWT** continuam recursos manuais. Trazê-los para o stack exigiria a
  API deixar de ser externa.
- **`GET /student/coach/schedules/request` lê uma página só.** O Scan em
  `src/schedule/get-student-requests/repository.js` não segue `LastEvaluatedKey`:
  passando de 1 MB varridos, solicitações do aluno podem ficar fora da resposta.
- **Status de pagamento é filtrado só no frontend.** O treinador não deve ver o
  `paymentStatus` da sessão, mas hoje a API (rotas `schedule`) devolve o campo
  igual para os dois papéis; o cliente apenas o omite na visão do coach
  (`SessionSummaryCard`/`SessionSummaryModal`). O correto seria não retornar
  `paymentStatus` na resposta do coach, mas isso exigiria endpoints/lambdas de schedule
  separados por papel. Enquanto não houver essa separação, manter o filtro no frontend.
