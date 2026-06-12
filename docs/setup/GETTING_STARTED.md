# CoachMatch — Setup do Zero

Guia para qualquer dev clonar o projeto e ter **frontend, backend e testes** rodando localmente.

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Clonar o repositório](#2-clonar-o-repositório)
3. [Instalar dependências](#3-instalar-dependências)
4. [Configurar o ambiente](#4-configurar-o-ambiente)
5. [Rodar o frontend](#5-rodar-o-frontend)
6. [Rodar o backend](#6-rodar-o-backend)
7. [Rodar os testes](#7-rodar-os-testes)
8. [Deploy manual](#8-deploy-manual)
9. [Estrutura resumida do projeto](#9-estrutura-resumida-do-projeto)
10. [Solução de problemas](#10-solução-de-problemas)

---

## 1. Pré-requisitos

Instale as ferramentas abaixo antes de continuar.

### Node.js >= 22

```bash
# Verificar versão instalada
node --version  # deve ser >= 22.12.0
```

Recomendamos usar o [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 22
nvm use 22
```

### pnpm >= 10

```bash
npm install -g pnpm
pnpm --version  # deve ser >= 10
```

### Serverless Framework v4 (para rodar o backend localmente)

```bash
npm install -g serverless
serverless --version  # deve ser >= 4.x
```

### Java 8+ (para o DynamoDB Local)

O `serverless-dynamodb` precisa de Java para subir o DynamoDB emulado localmente.

```bash
java -version  # deve ser >= 8
```

No macOS, instale via Homebrew se necessário:

```bash
brew install openjdk@21
```

---

## 2. Clonar o repositório

```bash
git clone https://github.com/KRUG3R/CoachMatch.git
cd CoachMatch
```

---

## 3. Instalar dependências

O projeto é um monorepo com duas workspaces independentes. É preciso rodar `pnpm install` em dois lugares.

### 3.1 — Raiz + frontend

```bash
# Da raiz do projeto
pnpm install
```

Isso instala as dependências do `client/` (frontend) e do `server/` (legado).

### 3.2 — Backend Lambdas (workspace separado)

O `server/coachmatch/` é uma workspace pnpm aninhada e **não é coberta** pelo `pnpm install` da raiz. Instale separadamente:

```bash
cd server/coachmatch
pnpm install
cd ../..
```

> **Por que separado?** O `server/coachmatch` usa Vitest + ESM enquanto o `server/` legado usa Jest/CommonJS. Manter workspaces isoladas evita conflitos de dependências.

---

## 4. Configurar o ambiente

### 4.1 — Frontend (`client/`)

O frontend já tem um arquivo `.env` rastreado no git com valores de desenvolvimento:

```
client/.env
```

Esse arquivo aponta para a API em produção com `VITE_API_MOCKING=enabled`, ou seja, **todas as chamadas de API são interceptadas pelo MSW** (mock service worker) e nenhuma requisição real é feita. É o modo padrão para desenvolvimento local.

Se quiser apontar para o backend local (serverless-offline na porta 3000), crie `client/.env.local`:

```bash
# client/.env.local (ignorado pelo git, sobrescreve .env)
VITE_API_BASE_URL=http://localhost:3000
VITE_API_MOCKING=disabled
VITE_COGNITO_CLIENT_ID=76hul7797npfkmpoju0mbghti7
VITE_COGNITO_CLIENT_SECRET=8jn87ckmp7cdime8ah1b0iqe501md0ivv9m9ndrtofs4kol9s3t
VITE_COGNITO_DOMAIN=https://login.coachmatch.com.br
VITE_COGNITO_STUDENT_CLIENT_ID=3rjn45koljliioocd5usijdv9s
VITE_COGNITO_STUDENT_DOMAIN=https://student.coachmatch.com.br
```

### 4.2 — Backend (`server/coachmatch/`)

O arquivo `config.yml` é ignorado pelo git (contém segredos locais). Crie-o a partir do exemplo:

```bash
# server/coachmatch/config.yml  ← criar este arquivo
stage: local
region: us-east-1
endpoint: http://localhost:8000
accessKeyId: fakeMyKeyId
secretAccessKey: fakeSecretAccessKey
```

> Os valores `fakeMyKeyId` / `fakeSecretAccessKey` são literais — o DynamoDB Local aceita qualquer string.

---

## 5. Rodar o frontend

```bash
cd client
pnpm dev
```

Acesse: **http://localhost:5173**

Por padrão (`VITE_API_MOCKING=enabled`) o MSW intercepta todas as chamadas de API — você consegue navegar pelo app sem precisar do backend rodando.

### Comandos úteis do frontend

```bash
pnpm dev             # servidor de desenvolvimento
pnpm build           # build de produção (dist/)
pnpm preview         # preview do build de produção
pnpm lint            # ESLint
pnpm type-check      # TypeScript sem emitir arquivos
pnpm test            # testes (Vitest, modo run)
pnpm test:watch      # testes em modo watch
pnpm test:coverage   # relatório de cobertura (abre coverage/index.html)
```

---

## 6. Rodar o backend

O backend é composto por funções Lambda rodando com `serverless-offline` + DynamoDB emulado localmente.

```bash
cd server/coachmatch
pnpm dev
```

Isso sobe:
- **serverless-offline** na porta **3000** (HTTP API)
- **DynamoDB Local** na porta **8000**
- As tabelas são criadas automaticamente na memória (`migrate: true`, `inMemory: true`)

### Endpoints disponíveis localmente

| Método | Rota | Função |
|--------|------|--------|
| `GET`  | `http://localhost:3000/coaches/me` | Buscar perfil do coach |
| `PUT`  | `http://localhost:3000/coaches/me` | Atualizar perfil do coach |
| `POST` | `http://localhost:3000/coaches/me/submit-for-review` | Submeter para revisão |
| `GET`  | `http://localhost:3000/clients/me` | Buscar perfil do aluno |
| `POST` | `http://localhost:3000/clients/me/profile` | Atualizar perfil do aluno |
| `POST` | `http://localhost:3000/clients/me/health` | Atualizar saúde do aluno |
| `GET`  | `http://localhost:3000/gyms` | Listar academias |
| `POST` | `http://localhost:3000/gyms/suggest` | Sugerir academia |

> **Auth local:** o `serverless-offline` está configurado com `ignoreJWTSignature: true`. Basta passar qualquer Bearer token no header `Authorization` — o `sub` do JWT será usado como ID do usuário.

### Comandos úteis do backend

```bash
pnpm dev             # sobe serverless-offline + DynamoDB Local
pnpm test            # testes (Vitest, modo run)
pnpm test:watch      # testes em modo watch
pnpm test:coverage   # relatório de cobertura
```

---

## 7. Rodar os testes

### Frontend

```bash
# Da pasta client/
cd client
pnpm test

# Ou da raiz do monorepo
pnpm test:frontend
```

### Backend (Lambdas)

```bash
# Da pasta server/coachmatch/
cd server/coachmatch
pnpm test

# Ou da raiz do monorepo
pnpm test:backend
```

> Os testes do backend rodam sem precisar do DynamoDB Local nem do `serverless-offline` — o DynamoDB é mockado com `vi.mock`.

### Todos os testes de uma vez (da raiz)

```bash
pnpm test:frontend && pnpm test:backend
```

---

## 8. Deploy manual

O deploy é feito via Serverless Framework. Você precisa ter as credenciais AWS configuradas localmente (perfil `JoaoAdm`).

```bash
cd server/coachmatch

# Deploy no ambiente de staging (branch develop → AWS dev)
serverless deploy --stage dev

# Deploy em produção (branch main → AWS prod)
serverless deploy --stage prod
```

> O CI/CD (GitHub Actions) faz deploy automático em push para `develop` (→ dev) e `main` (→ prod). O deploy manual é só para situações excepcionais.

**Não use `--stage local`** em deploys reais — esse stage é exclusivo para o `serverless-offline` local.

---

## 9. Estrutura resumida do projeto

```
CoachMatch/
├── client/                    # Frontend — React 19 + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/            # Zustand (sessão, autenticação)
│   │   ├── lib/               # auth.ts, cognito.ts, api.ts
│   │   ├── types/             # interfaces TypeScript (api.ts, etc.)
│   │   └── mocks/             # MSW handlers para dev local
│   ├── .env                   # variáveis de dev (rastreado no git)
│   └── package.json
│
├── server/
│   └── coachmatch/            # Backend — Serverless Framework v4 + Node.js 22
│       ├── src/
│       │   ├── coaches/       # create, get, update, submit-for-review
│       │   ├── students/      # create, get, update-profile, update-health
│       │   ├── gyms/          # list, suggest
│       │   └── shared/        # config.js (DynamoDB client), exceptions.js
│       ├── config.yml         # config local (NÃO rastreado no git — criar manualmente)
│       ├── serverless.yml     # definição de funções, rotas, recursos AWS
│       └── package.json
│
├── docs/
│   ├── openapi.yaml           # Contrato REST (OpenAPI 3.0.3)
│   ├── setup/                 # Guias de configuração (este arquivo)
│   ├── architecture/          # Diagramas arquiteturais
│   └── git-workflow.md        # Fluxo de branches e commits
│
├── .github/
│   └── workflows/
│       └── ci-cd-pipeline.yml # Pipeline CI/CD (testes, build, deploy)
│
├── pnpm-workspace.yaml        # Workspaces: client/ + server/
└── package.json               # Scripts de raiz do monorepo
```

---

## 10. Solução de problemas

### `config.yml not found` ao rodar `pnpm dev` no backend

Você esqueceu de criar o `config.yml`. Veja a [seção 4.2](#42--backend-servercoachmatch).

### DynamoDB Local não sobe / erro de Java

```bash
java -version
```

Se não tiver Java instalado, instale-o (veja [seção 1](#1-pré-requisitos)).

Na primeira execução, o `serverless-dynamodb` baixa o DynamoDB Local automaticamente. Se travar, tente:

```bash
cd server/coachmatch
npx serverless dynamodb install
pnpm dev
```

### Erro `Cannot find module` no backend

Você provavelmente esqueceu de instalar as dependências do `server/coachmatch`:

```bash
cd server/coachmatch
pnpm install
```

### Frontend não reflete chamadas ao backend local

Confirme que o arquivo `client/.env.local` existe com `VITE_API_MOCKING=disabled` e `VITE_API_BASE_URL=http://localhost:3000`. O arquivo `.env` padrão tem `VITE_API_MOCKING=enabled` (MSW ativo).

### Testes do backend falham com `import` / ESM errors

Certifique-se de estar rodando Node.js >= 22 e que as dependências do `server/coachmatch` foram instaladas com pnpm (não npm).

### `serverless deploy` falha com "profile not found"

O perfil AWS `JoaoAdm` precisa estar configurado localmente:

```bash
aws configure --profile JoaoAdm
```

Ou use variáveis de ambiente diretamente:

```bash
AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy serverless deploy --stage dev
```
