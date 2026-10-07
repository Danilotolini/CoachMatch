# CoachMatch

Marketplace que conecta alunos a treinadores esportivos qualificados no Brasil — busca, agendamento, pagamento e chat em um único lugar. Acesse em [coachmatch.com.br](https://coachmatch.com.br).

## Quickstart

Pré-requisitos: Node.js ≥ 22, pnpm ≥ 10.

```bash
git clone https://github.com/Danilotolini/CoachMatch.git
cd CoachMatch
pnpm install
```

### Frontend com MSW (sem backend rodando)

```bash
cp client/.env.example client/.env
# Abra client/.env e defina:
#   VITE_API_MOCKING=enabled
cd client
pnpm dev
# → http://localhost:5173
```

Com `VITE_API_MOCKING=enabled` todas as chamadas de API são interceptadas pelo MSW — não é necessário ter credenciais AWS nem o backend rodando.

### Backend local

```bash
cp server/coachmatch/.env.example server/coachmatch/.env
# Preencha STREAM_API_KEY e AWS_PROFILE (ver server/coachmatch/DEPLOY.md)
cd server/coachmatch
pnpm dev
# → http://localhost:3000
```

Para o setup completo (DynamoDB local, seed, variáveis de ambiente) veja [docs/setup/GETTING_STARTED.md](docs/setup/GETTING_STARTED.md).

## Arquitetura

O sistema é serverless na AWS: frontend PWA servido pelo CloudFront + S3, API via API Gateway + Lambda, DynamoDB como banco de dados, Cognito para autenticação e SQS para comunicação assíncrona entre domínios. Chat é delegado ao Stream Chat.

A arquitetura está documentada em [C4 model](https://c4model.com/) com Structurizr DSL em [`docs/c4/workspace.dsl`](docs/c4/workspace.dsl).

**Visualizar localmente:**

```bash
docker run --rm -it -p 8080:8080 \
  -v "$(pwd)/docs/c4:/usr/local/structurizr" \
  structurizr/structurizr local
# → http://localhost:8080
```

**Visualizar online:** cole o conteúdo de `docs/c4/workspace.dsl` no [playground do Structurizr](https://playground.structurizr.com/).

## Mapa da documentação

### Desenvolvimento

| Documento | Conteúdo |
| --- | --- |
| [client/CLAUDE.md](client/CLAUDE.md) | Convenções do frontend (React, Vite, MSW, React Query, testes) |
| [server/coachmatch/README.md](server/coachmatch/README.md) | Estrutura do backend, rotas, tabelas DynamoDB, desenvolvimento local |
| [docs/setup/GETTING_STARTED.md](docs/setup/GETTING_STARTED.md) | Setup completo do zero (frontend + backend + testes) |
| [docs/git-workflow.md](docs/git-workflow.md) | Fluxo de branches, commits e PRs |

### Deploy e operação

| Documento | Conteúdo |
| --- | --- |
| [server/coachmatch/DEPLOY.md](server/coachmatch/DEPLOY.md) | Deploy manual para AWS (Serverless Framework) |
| [.github/RUNBOOK.md](.github/RUNBOOK.md) | CI/CD, secrets, ambientes, troubleshooting |

### Contratos de API

| Documento | Conteúdo |
| --- | --- |
| [docs/openapi.yaml](docs/openapi.yaml) | Especificação OpenAPI |
| [docs/postman_collection/](docs/postman_collection/) | Coleção Postman + ambientes local e produção |

### Fluxos de domínio

| Documento | Conteúdo |
| --- | --- |
| [docs/architecture/schedule-workflow.md](docs/architecture/schedule-workflow.md) | Agendamento: atores, estados, cancelamentos, concorrência |
| [docs/architecture/payments-workflow.md](docs/architecture/payments-workflow.md) | Pagamentos: estados, modelo da tabela, evento SQS, cartões de teste |
| [docs/architecture/chat-workflow.md](docs/architecture/chat-workflow.md) | Chat: token Stream, criação de canal, realtime vs polling |

### Decisões de arquitetura (ADRs)

| Documento | Decisão |
| --- | --- |
| [docs/ADRs/0001-adocao-de-arquitetura-serverless-na-aws.md](docs/ADRs/0001-adocao-de-arquitetura-serverless-na-aws.md) | Adoção de arquitetura serverless na AWS |

### Produto

| Documento | Conteúdo |
| --- | --- |
| [docs/Apresentacao CoachMatch.pdf](docs/Apresentacao%20CoachMatch.pdf) | Apresentação do projeto (MBA PUC-SP) |
| [docs/ERS_CoachMatch.pdf](docs/ERS_CoachMatch.pdf) | Especificação de requisitos |
| [docs/BMC - CoatchMatch.pdf](docs/BMC%20-%20CoatchMatch.pdf) | Business Model Canvas |
| [docs/CASOS DE USO - COACHMATCH.pdf](docs/CASOS%20DE%20USO%20-%20COACHMATCH.pdf) | Casos de uso |
| [docs/CoachMatchMockups.pdf](docs/CoachMatchMockups.pdf) | Mockups de interface |
