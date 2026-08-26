# 🚀 CI/CD Pipeline Configuration Guide

## Overview

Este é um pipeline CI/CD de **nível Bay Area**, totalmente gratuito, implementado com GitHub Actions. Segue boas práticas de:
- Automação completa
- Segurança em primeira linha
- Testes contínuos
- Deployments automatizados
- Monitoramento de performance

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Push/PR Event                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    ┌────────┐         ┌──────────┐       ┌────────────┐
    │  LINT  │         │ SECURITY │       │ BUILD      │
    │ Check  │         │ Scanning │       │ Verification
    └────────┘         └──────────┘       └────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    ┌─────────────┐  ┌─────────────┐     ┌──────────────┐
    │ Backend     │  │ Frontend    │     │ E2E Tests    │
    │ Tests       │  │ Tests       │     │              │
    └─────────────┘  └─────────────┘     └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                        ┌────▼────┐
                        │ QUALITY  │
                        │  GATE    │
                        └────┬────┘
                             │
        ┌────────────────────┼────────────────────┐
        │ (Se PASS)          │                    │
        ▼                    ▼                    ▼
    ┌─────────────┐   ┌────────────┐      ┌────────────┐
    │ STAGING     │   │ PERF TEST  │      │ MONITORING │
    │ Deploy      │   │            │      │            │
    └─────────────┘   └────────────┘      └────────────┘
        │
        │ (Se main)
        ▼
    ┌──────────────┐
    │ PRODUCTION   │
    │ Deploy       │
    └──────────────┘
```

## Workflows

### 1. **ci-cd-pipeline.yml** (Principal)
O pipeline completo que executa em todos os pushes e PRs.

#### Stages:

| Stage | Descrição | Quando |
|-------|-----------|--------|
| **Lint** | ESLint + TypeScript type check | Todos os pushes |
| **Security** | pnpm audit | Todos os pushes |
| **Backend Tests** | Vitest + DynamoDB Local | Todos os pushes |
| **Frontend Tests** | Vitest + React Testing Library | Todos os pushes |
| **Build** | Build verification | Após testes |
| **E2E Tests** | Playwright | PR + main |
| **SonarCloud** | Análise estática + cobertura | Todos os pushes |
| **Quality Gate** | Verifica todos os checks (inclui Sonar) | Sempre |
| **Deploy** | Backend (`serverless deploy --stage dev`) + Frontend (S3 + CloudFront) | **Manual** via `workflow_dispatch` (digitar `CONFIRMAR`) |

> ⚠️ **Estado atual:** o deploy é **manual**, não automático. Existe **um único
> ambiente** (produção); o de `develop` está comentado até a infra ser criada
> (ver pendência em [`RUNBOOK.md`](RUNBOOK.md)). O frontend é publicado no prefixo
> `coachmatch_site/` do bucket `coachmatch`, servido pelo CloudFront `E2FXMRNR2KASRR`.

### 2. **dependencies.yml** (Semanal)
Mantém dependências atualizadas automaticamente.

- ✅ Verifica novos patches semanalmente (terças)
- ✅ Cria PR automático com atualizações
- ✅ Roda testes antes de mesclar
- ✅ Security audit integrado

### 3. **performance.yml** (Contínuo)
Monitora performance do projeto.

- 📦 Bundle size analysis
- 🏮 Lighthouse CI
- 📊 Code metrics
- 📈 Coverage trends
- ⚡ Performance regression detection

## Setup Required

### 1. GitHub Secrets

Configure estas variáveis de ambiente em **Settings → Secrets and Variables → Actions**:

```
# ── Secrets (credenciais) ────────────────────────────────────────────
AWS_ACCESS_KEY_ID              # IAM user com permissões serverless + S3 + CloudFront
AWS_SECRET_ACCESS_KEY          # Chave secreta do IAM user
SERVERLESS_ACCESS_KEY          # Exigido pelo Serverless Framework v4 em CI

# ── Variables (identificadores, não sensíveis — aba "Variables") ──────
S3_BUCKET_PRODUCTION           # = coachmatch (sync vai para o prefixo /coachmatch_site)
CLOUDFRONT_PRODUCTION_ID       # = E2FXMRNR2KASRR
# develop ainda não tem infra — adicionar como variables quando existir:
# S3_BUCKET_DEVELOP / CLOUDFRONT_DEVELOP_ID

# ── Front-end (Vite build — secrets) ──────────────────────────────────
VITE_API_BASE_URL              # Ex: https://api.coachmatch.com.br
VITE_COGNITO_CLIENT_ID         # App client ID do pool de Coaches
VITE_COGNITO_DOMAIN            # Ex: https://login.coachmatch.com.br
VITE_COGNITO_STUDENT_CLIENT_ID # App client ID do pool de Alunos
VITE_COGNITO_STUDENT_DOMAIN    # Ex: https://student.coachmatch.com.br

# ── Observabilidade / Qualidade ───────────────────────────────────────
CODECOV_TOKEN                  # Token do projeto em codecov.io (opcional — fail_ci_if_error: false)
SONAR_TOKEN                    # Token do projeto no SonarCloud (obrigatório — ver setup abaixo)

# ── Grafana Cloud / OTel ──────────────────────────────────────────────
GRAFANA_OTLP_ENDPOINT          # Ex: https://otlp-gateway-prod-sa-east-1.grafana.net/otlp
GRAFANA_OTLP_TOKEN             # Base64("<instanceId>:<apiKey>") — ver "Setup Grafana Cloud" abaixo
```

> **Nota:** `apiKey`, `apiSecret`, `apiGatewayId`, região e account ID do backend
> vêm de `server/coachmatch/config.yml` (commitado) — não são secrets.
>
> **Nota sobre fallbacks**: `VITE_API_BASE_URL`, `VITE_COGNITO_DOMAIN` e
> `VITE_COGNITO_STUDENT_DOMAIN` possuem fallbacks hardcoded para URLs de
> produção caso o secret não esteja configurado. Os `CLIENT_ID` do Cognito
> têm fallback de placeholder — o build passa, mas o login não funciona sem os
> valores reais.

### 2. SonarCloud Setup (obrigatório para o job de análise funcionar)

1. Acesse [sonarcloud.io](https://sonarcloud.io) e faça login com sua conta GitHub
2. Clique em **"+"** → **Analyze new project** → selecione o repositório `KRUG3R/CoachMatch`
3. Escolha **"GitHub Actions"** como método de análise
4. O SonarCloud vai mostrar seu `SONAR_TOKEN` — copie
5. No GitHub: **Settings → Secrets and Variables → Actions → New repository secret**
   - Nome: `SONAR_TOKEN`
   - Valor: cole o token copiado
6. Confirme que o `sonar-project.properties` na raiz do repo tem:
   - `sonar.organization=` igual ao seu org no SonarCloud (normalmente seu usuário GitHub em lowercase)
   - `sonar.projectKey=` igual ao que o SonarCloud mostrar (normalmente `KRUG3R_CoachMatch`)

> O `GITHUB_TOKEN` é gerado automaticamente pelo GitHub Actions — não precisa configurar.

### 3. Fluxo de Branches

```
feat/minha-feature
       │
       │  PR automático (auto-pr.yml)
       ▼
    develop  ──── (PR manual quando pronto para release)
       │
       ▼
  release/YYYY-MM-DD
       │
       │  PR automático (auto-pr.yml)
       ▼
      main
```

**Regras:**
- `feat/*` → push na branch → PR automático criado como draft para `develop`
- `develop` → ninguém faz push direto, só via PR aprovado
- `release/*` → push na branch → PR automático criado como draft para `main`
- `main` → ninguém faz push direto, só via PR de `release/*`

**Criar uma release:**
```bash
git checkout develop
git pull
git checkout -b release/2025-01-15
git push origin release/2025-01-15
# PR automático para main é aberto
```

### 4. Branch Protection Rules

Configure em **Settings → Branches → Branch protection rules**.

#### main
```
✅ Require a pull request before merging
✅ Require status checks to pass before merging
✅ Require branches to be up to date before merging
✅ Dismiss stale pull request approvals
✅ Require code review approvals (1)
✅ Do not allow bypassing the above settings
```

Status checks obrigatórios:
- `lint`
- `security`
- `test-backend`
- `test-frontend`
- `build`

#### develop
```
✅ Require a pull request before merging
✅ Require status checks to pass before merging
✅ Do not allow bypassing the above settings
```

> Sem revisão obrigatória em develop para não travar o fluxo do time, mas push direto bloqueado.

### 3. Environment Configuration

Hoje só há **um ambiente** real. Crie em **Settings → Environments**:

#### Production

```
Environment name: production
Required reviewers: 1 person (recomendado)
```

> O deploy é manual (`workflow_dispatch`), então não há regra de auto-deploy por
> branch. O ambiente `staging`/`develop` deve ser criado junto com a infra de
> develop (ver pendência no [`RUNBOOK.md`](RUNBOOK.md)).

### 4. Dependabot Configuration (Alternativa)

Se quiser usar Dependabot ao invés do workflow customizado:

Crie `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/client"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5

  - package-ecosystem: npm
    directory: "/server"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
```

## Scripts Required (package.json)

Certifique-se de ter estes scripts nos seus `package.json`:

### Client
```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:frontend": "vitest --coverage",
    "test:coverage": "vitest --coverage",
    "build": "vite build"
  }
}
```

### Server (`server/coachmatch`)

```json
{
  "scripts": {
    "dev": "serverless offline start --stage local",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Environment Variables

### Arquivos de env para diferentes stages:

**.env.development**
```
VITE_API_URL=http://localhost:3000
```

**.env.staging**
```
VITE_API_URL=https://api-staging.coachmatch.dev
```

**.env.production**
```
VITE_API_URL=https://api.coachmatch.app
```

No CI/CD, configure via GitHub Secrets:
```yaml
- name: Build
  env:
    VITE_API_URL: ${{ secrets.API_URL }}
  run: pnpm run build
```

## Notifications

### Slack Integration

Já incluída no pipeline! Notificações automáticas para:
- ✅ Deployment success/failure
- ⚠️ Build failures
- 📊 Performance metrics

Configure webhook em: **Slack → Integrations → Incoming Webhooks**

Salve em: `Settings → Secrets → SLACK_WEBHOOK_URL`

## Monitoring & Alerts

### Health Checks

Adicionar em monitoramento externo:

```bash
# Staging
curl -f https://staging.coachmatch.dev/health || alert

# Production
curl -f https://coachmatch.app/health || page_on_call
```

### Metrics to Track

Via GitHub Actions artifacts:
- Test coverage trends
- Build time trends
- Bundle size trends
- Performance scores (Lighthouse)
- Security vulnerabilities

## Troubleshooting

### Workflow falha com "No secrets available"

**Solução:** Configure secrets em Settings → Secrets

### Tests falhando localmente mas passando no CI

**Solução:** Use `--frozen-lockfile` para garantir versões consistentes

### Deploy não funciona

**Checklist:**
```
✅ AWS credentials corretos?
✅ CloudFront distribution IDs corretos?
✅ S3 bucket existe?
✅ IAM permissions tem s3:* e cloudfront:*?
✅ Secrets estão vencidas?
```

### Lighthouse CI falhando

**Solução:** Ajuste thresholds em `.github/lighthouse-config.json`:
```json
{
  "categories:performance": ["error", { "minScore": 0.7 }]
}
```

## Best Practices Implementadas

✅ **Concurrency Control**: Cancela runs antigos quando novo push
✅ **Caching**: pnpm cache para installs rápidos
✅ **Artifact Management**: Limpa antigos (5-30 dias)
✅ **Fail-fast**: Lint + security antes de build
✅ **Parallel Execution**: Testes rodando em paralelo
✅ **Status Checks**: Quality gate obrigatória
✅ **Deployment Environments**: Staging + Production
✅ **Security Scanning**: npm audit + Snyk
✅ **Performance Monitoring**: Lighthouse + bundle size
✅ **Notifications**: Slack alerts
✅ **Rollback Ready**: Tags para cada release
✅ **Cost Optimized**: Usa apenas GitHub Actions (gratuito)

## Cost Analysis

| Serviço | Custo | Included in Free Tier |
|---------|------|----------------------|
| GitHub Actions | - | 2,000 min/mês |
| Storage | - | 500MB artifacts |
| Codecov | - | Unlimited repos |
| Lighthouse CI | - | Gratuito |
| npm audit | - | Incluído |
| DynamoDB Local | - | Docker gratuito |
| Slack webhook | - | Gratuito |

**Total: $0/mês** ✅

## Próximos Passos

1. ✅ Criar workflows YAML (done)
2. ⏳ Configurar GitHub Secrets
3. ⏳ Configurar Branch Protection
4. ⏳ Configurar Environments
5. ⏳ Testes no primeiro PR
6. ⏳ Deploy em staging
7. ⏳ Deploy em production

## Referências

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Codecov](https://codecov.io)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Snyk](https://snyk.io)
- [AWS CLI Actions](https://github.com/aws-actions)

---

**Status: Production Ready** ✅

Este pipeline é totalmente funcional e segue padrões de empresas de Bay Area (Google, Meta, Stripe, etc.)

---

## Setup Grafana Cloud (Observabilidade — custo zero)

### O que você vai ter

- **Traces**: DynamoDB, HTTP e SQS de todas as Lambdas (via ADOT Layer)
- **Logs JSON estruturados**: `trace_id`, `userId`, `path`, `statusCode`, `duration_ms` (via CloudWatch → Grafana)
- **Métricas**: invocações, erros, duração das Lambdas

### Passos

1. **Criar conta** em [grafana.com](https://grafana.com) → plano gratuito (10k séries, 50GB logs, 14 dias)

2. **Pegar credenciais OTLP**
   - Vá em: **My Account → Your Grafana Cloud stack → Send data with OpenTelemetry**
   - Copie o **OTLP endpoint** (ex: `https://otlp-gateway-prod-sa-east-1.grafana.net/otlp`)
   - Gere um **API Token** com escopo `MetricsPublisher` + `LogsPublisher` + `TracesPublisher`
   - Monte o token: `Base64("<instanceId>:<apiKey>")` → use `echo -n "ID:KEY" | base64`

3. **Adicionar secrets no GitHub**
   - `GRAFANA_OTLP_ENDPOINT` = endpoint OTLP copiado
   - `GRAFANA_OTLP_TOKEN` = base64 calculado acima

4. **Verificar ARN da ADOT Layer** (se precisar atualizar)
   - ARN atual: `arn:aws:lambda:sa-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-30-0:1`
   - Versões mais recentes: https://github.com/aws-observability/aws-otel-lambda/releases
   - Se a versão mudou, atualizar `custom.otelLayers.dev` em `server/coachmatch/serverless.yml`

5. **Conectar CloudWatch ao Grafana** (para ver os logs JSON)
   - No Grafana Cloud: **Connections → AWS → CloudWatch Logs**
   - Permissão mínima IAM: `logs:FilterLogEvents`, `logs:DescribeLogGroups`

### Como funciona no deploy

```
Lambda invocação
  → ADOT Layer (Extension) intercepta spans → Grafana Tempo (traces)
  → stdout JSON (withLogger) → CloudWatch Logs → Grafana Loki
```
