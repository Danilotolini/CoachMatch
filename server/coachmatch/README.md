# CoachMatch — API de Lambdas (coachmatch)

Serviço serverless com as Lambdas do marketplace CoachMatch. Arquitetura 3 camadas por função Lambda, implantada na AWS com Serverless Framework.

## Stack

- **Runtime**: Node.js 22 (ESM)
- **Framework**: Serverless Framework v4
- **Banco**: DynamoDB (via `@aws-sdk/lib-dynamodb`)
- **Validação**: Joi
- **Testes**: Vitest

## Estrutura de pastas

Cada Lambda tem sua própria pasta com 4 arquivos fixos:

```
src/
├── coaches/
│   ├── create-coach/          # Trigger PostConfirmation Cognito
│   │   ├── handler.js         # Entry-point AWS (parse evento Cognito)
│   │   ├── index.js           # Lógica de negócio
│   │   ├── repository.js      # Acesso ao DynamoDB
│   │   └── schema.js          # Validação Joi
│   ├── get-coach/             # GET /coaches/me
│   ├── update-coach/          # PUT /coaches/me
│   └── submit-coach-for-review/  # POST /coaches/me/submit-for-review
│
├── students/
│   ├── create-student/        # Trigger PostConfirmation Cognito
│   ├── get-student/           # GET /clients/me
│   ├── update-student-profile/ # POST /clients/me/profile
│   └── update-student-health/ # POST /clients/me/health
│
├── gyms/
│   ├── list-gyms/             # GET /gyms
│   └── suggest-gym/           # POST /gyms/suggest
│
└── shared/
    ├── config.js              # createClient() — DynamoDBDocumentClient
    └── exceptions.js          # DatabaseConnectionException, ValidationException,
                               # NotFoundException, ConflictException
```

## Rotas implementadas

| Método | Rota | Lambda | Auth |
|--------|------|--------|------|
| `GET`  | `/coaches/me` | `coachGetMe` | Cognito JWT (CoachAccess) |
| `PUT`  | `/coaches/me` | `coachUpdateMe` | Cognito JWT (CoachAccess) |
| `POST` | `/coaches/me/submit-for-review` | `coachSubmitForReview` | Cognito JWT (CoachAccess) |
| `GET`  | `/clients/me` | `studentGetProfile` | Cognito JWT (StudentAccess) |
| `POST` | `/clients/me/profile` | `studentUpdateProfile` | Cognito JWT (StudentAccess) |
| `POST` | `/clients/me/health` | `studentUpdateHealth` | Cognito JWT (StudentAccess) |
| `GET`  | `/gyms` | `gymList` | Cognito JWT |
| `POST` | `/gyms/suggest` | `gymSuggest` | Cognito JWT |

Triggers Cognito (não HTTP):
- `coachCreate` — PostConfirmation no pool **CoachAccess**
- `studentCreate` — PostConfirmation no pool **StudentAccess**

## Status de coach (fluxo)

```
[Cognito confirm] → PENDING_PROFILE
       ↓ PUT /coaches/me (salva perfil, sem mudar status)
PENDING_PROFILE
       ↓ POST /coaches/me/submit-for-review
PENDING_REVIEW
       ↓ Aprovação manual (admin)
APPROVED   /   REJECTED
```

- `PENDING_REVIEW`, `APPROVED`, `REJECTED` → sem alteração

## Setup local

### Pré-requisitos

```bash
node >= 22
pnpm >= 10
```

### Instalar dependências

```bash
pnpm install
```

### Configuração

Crie `config.yml` a partir do exemplo:

```yaml
# config.yml
config:
  stage: local
  region: sa-east-1
  endpoint: http://localhost:8000
  accessKeyId: local
  secretAccessKey: local
```

### Iniciar servidor local

```bash
pnpm dev
# Sobe serverless-offline + DynamoDB Local na porta 8000
```

### Executar testes

```bash
pnpm test              # run uma vez
pnpm test:watch        # watch mode
pnpm test:coverage     # com relatório de cobertura (coverage/)
```

## Variáveis de ambiente (runtime)

| Variável | Descrição |
|----------|-----------|
| `STAGE` | `local` habilita DynamoDB Local; qualquer outro valor usa AWS |
| `REGION` | Região AWS (ex: `sa-east-1`) |
| `ENDPOINT` | URL do DynamoDB Local (somente em `STAGE=local`) |
| `ACCESS_KEY_ID` | Credencial AWS (somente em `STAGE=local`) |
| `SECRET_ACCESS_KEY` | Credencial AWS (somente em `STAGE=local`) |

## Deploy

```bash
# Staging (develop)
serverless deploy --stage dev

# Produção (main)
serverless deploy --stage prod
```

O deploy é disparado automaticamente pelo CI/CD quando há push na `main` ou `develop` (via GitHub Actions).
