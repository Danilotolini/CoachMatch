# 🛠️ CI/CD Runbook & Troubleshooting

## Ambientes & Infraestrutura real

Conta AWS `138413505977`, região `sa-east-1`. Hoje existe **um único ambiente**
(produção). O frontend é servido a partir do prefixo `coachmatch_site/` dentro do
bucket — por isso o `s3 sync` aponta para `s3://<bucket>/coachmatch_site`.

| Recurso | Valor |
| --- | --- |
| Bucket do site | `coachmatch` |
| Prefixo do site | `coachmatch_site/` |
| Distribuição CloudFront | `E2FXMRNR2KASRR` (`OriginPath: /coachmatch_site`) |
| Domínio | `coachmatch.com.br` |

Secrets de deploy: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`SERVERLESS_ACCESS_KEY` (exigido pelo Serverless Framework v4),
`S3_BUCKET_PRODUCTION` (= `coachmatch`), `CLOUDFRONT_PRODUCTION_ID` (= `E2FXMRNR2KASRR`).
`apiKey`/`apiSecret`/`apiGatewayId`/região vêm de `server/coachmatch/config.yml`
(commitado) — não são secrets.

## ⚠️ Pendências

- [ ] **Criar o ambiente de `develop` na AWS antes de habilitar a esteira de develop.**
  Não existem bucket S3 nem distribuição CloudFront próprios de develop — só o de
  produção. Por isso o deploy de develop está **comentado** em
  `workflows/ci-cd-pipeline.yml` (job `deploy` e opção `develop` do
  `workflow_dispatch`). Ao criar a infra, reativar os blocos comentados e cadastrar
  os secrets `S3_BUCKET_DEVELOP` e `CLOUDFRONT_DEVELOP_ID`.

## Quick Commands

```bash
# Ver status dos workflows
gh workflow list

# Trigger manual run
gh workflow run ci-cd-pipeline.yml --ref main

# Ver último run
gh run list

# Ver logs de um run específico
gh run view <run-id> --log

# Cancelar um run
gh run cancel <run-id>

# Re-run um workflow
gh run rerun <run-id>
```

## Problemas Comuns & Soluções

### 1. ❌ "Workflow file not found"

**Sintoma:** 
```
Error: Could not resolve a workflow with the name 'ci-cd-pipeline'
```

**Causa:** Arquivo YAML não existe ou está em lugar errado

**Solução:**
```bash
# Verificar estrutura
ls -la .github/workflows/

# Deve ter:
# - ci-cd-pipeline.yml
# - dependencies.yml
# - performance.yml
```

### 2. ❌ "Workflow syntax error"

**Sintoma:**
```
Error: Parse error on line 45
```

**Causa:** YAML inválido (indentation, syntax)

**Solução:**
```bash
# Validar YAML online
# https://www.yamllint.com/

# Ou localmente:
python -m yaml < .github/workflows/ci-cd-pipeline.yml

# Erros comuns:
# - Tabs ao invés de spaces (use 2 spaces)
# - Indentation incorreta
# - Quotes faltando em strings
```

### 3. ❌ "No secrets found"

**Sintoma:**
```
Error: Unauthorized: Please provide credentials
```

**Causa:** Secrets não configurados no GitHub

**Solução:**
```bash
# 1. Ir em Settings → Secrets and Variables → Actions
# 2. Criar cada secret:
#    - AWS_ACCESS_KEY_ID
#    - AWS_SECRET_ACCESS_KEY
#    - CLOUDFRONT_STAGING_ID
#    - CLOUDFRONT_PROD_ID

# 3. Verificar se estão acessíveis
# No workflow, testar:
- name: Test secret
  run: echo "Secret set: ${{ secrets.AWS_ACCESS_KEY_ID != '' }}"
```

### 4. ❌ "Tests failing only in CI"

**Sintoma:**
```
PASS locally
FAIL in GitHub Actions
```

**Causa:** 
- Diferentes Node versions
- Versões de dependências diferentes
- Environment variables faltando
- Race conditions em testes

**Solução:**
```bash
# 1. Forçar versões iguais
pnpm install --frozen-lockfile

# 2. Verificar Node version
node --version
# Deve ser 18.x

# 3. Adicionar env vars ao workflow
env:
  CI: true
  NODE_ENV: test

# 4. Debugar localmente
npm test -- --verbose

# 5. Se race condition, adicionar
npm test -- --testTimeout=10000
```

### 5. ❌ "Build fails - 'vite not found'"

**Sintoma:**
```
Error: Cannot find module 'vite'
```

**Causa:** Dependências não instaladas

**Solução:**
```yaml
- name: Install dependencies
  run: |
    cd client
    npm ci  # Use ci, não install!
    # ou
    pnpm install --frozen-lockfile
```

### 6. ❌ "Deploy fails - AWS credentials invalid"

**Sintoma:**
```
An error occurred (InvalidUserID.Malformed) when calling the S3 operation
```

**Causa:**
- Credentials expiradas
- Wrong access key format
- Missing IAM permissions

**Solução:**
```bash
# 1. Verificar credenciais
aws configure
# AWS Access Key ID: [paste from GitHub Secret]
# AWS Secret Access Key: [paste from GitHub Secret]

# 2. Testar acesso
aws s3 ls

# 3. Verificar IAM permissions
aws iam get-user

# 4. Se falhar, regenerar credenciais
# - AWS Console → IAM → Users → Your User → Access Keys
# - Delete old keys
# - Create new keys
# - Update GitHub Secrets
```

### 7. ❌ "CloudFront invalidation fails"

**Sintoma:**
```
User is not authorized to perform: cloudfront:CreateInvalidation
```

**Causa:** IAM policy missing CloudFront permissions

**Solução:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::coachmatch-staging",
        "arn:aws:s3:::coachmatch-staging/*",
        "arn:aws:s3:::coachmatch-prod",
        "arn:aws:s3:::coachmatch-prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "*"
    }
  ]
}
```

### 8. ⚠️ "Slow build times"

**Sintoma:**
```
Build took 15 minutes (normal é ~5)
```

**Causa:**
- npm install sem cache
- Muitos testes rodando sequencial
- Large artifacts

**Solução:**
```yaml
# 1. Usar cache
- uses: actions/setup-node@v4
  with:
    cache: 'pnpm'  # ou 'npm'

# 2. Parallelizar
strategy:
  matrix:
    node-version: [22]
    test-suite: [unit, integration, e2e]

# 3. Limpar artifacts antigos
retention-days: 5

# 4. Usar Docker layer caching (se Docker build)
docker build --cache-from type=gha .
```

### 9. ⚠️ "Too much storage used"

**Sintoma:**
```
GitHub Actions artifact storage: 450MB / 500MB
```

**Causa:** Artifacts old não limpam

**Solução:**
```yaml
# Adicionar retention-days ao upload
- uses: actions/upload-artifact@v3
  with:
    name: build
    path: dist
    retention-days: 5  # Auto-delete após 5 dias
```

### 10. 🔴 "Slack notifications not working"

**Sintoma:**
```
No message no Slack
```

**Causa:**
- Webhook URL inválida
- Channel não existe
- Bot não tem permissão

**Solução:**
```bash
# 1. Verificar webhook
curl -X POST -H 'Content-type: application/json' \
  -d '{"text":"Test"}' \
  $SLACK_WEBHOOK_URL

# 2. Se falhar, regenerar webhook
# Slack → Your Apps → Incoming Webhooks → Add New → Copy URL

# 3. Atualizar secret
gh secret set SLACK_WEBHOOK_URL

# 4. Testar no workflow
- name: Test Slack
  run: curl -X POST -d "Test" ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Monitoring & Health Checks

### Verificar status do pipeline

```bash
# CLI
gh workflow list
gh run list --limit 10

# Web UI
# https://github.com/your-org/CoachMatch/actions
```

### Alertas importantes

Monitor estes sinais:
- ❌ Workflow failures
- ⚠️ Build time > 10 min
- ⚠️ Bundle size > 2MB
- ⚠️ Test coverage < 80%
- ⚠️ Lighthouse score < 0.8
- 🔐 Security vulnerabilities

## Rollback Procedures

### Se deployment quebrar em produção

```bash
# 1. Identifique última release boa
gh release list

# 2. Revert ao commit anterior
git revert <bad-commit>
git push origin main

# Isso acionará novo deployment

# 3. Ou, redeploye release anterior
gh release download v1.0.0
# Copie assets para S3 manualmente

# 4. Invalide CloudFront
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

### Restore từ backup

```bash
# Se S3 corruptou
aws s3 cp s3://backup-bucket/ s3://coachmatch-prod/ --recursive

# Invalidar cache
aws cloudfront create-invalidation \
  --distribution-id $PROD_DIST_ID \
  --paths "/*"
```

## Performance Tuning

### Otimizar build speed

```yaml
# Usar Node cache
- uses: actions/setup-node@v4
  with:
    cache: 'pnpm'

# Parallelizar testes
- run: npm test -- --parallel --maxWorkers=4

# Usar npm ci (mais rápido que install)
- run: npm ci --prefer-offline
```

### Otimizar storage

```yaml
# Cleanup antes de upload
- run: |
    rm -rf node_modules
    rm -rf .next
    rm -rf coverage

- uses: actions/upload-artifact@v3
  with:
    retention-days: 3
```

## Maintenance Tasks

### Semanal
- [ ] Verificar dependabot PRs
- [ ] Review security alerts
- [ ] Check workflow failures

### Mensal
- [ ] Update Node version
- [ ] Audit all dependencies
- [ ] Review action versions
- [ ] Check storage usage

### Trimestral
- [ ] Full security audit
- [ ] Performance benchmark
- [ ] Cost analysis
- [ ] Documentation review

## Emergency Contacts

Se precisa help:

1. **GitHub Support**: https://support.github.com
2. **GitHub Docs**: https://docs.github.com/en/actions
3. **Community**: https://github.community
4. **Issues**: Create issue em seu repo com `[CI/CD]` tag

---

**Last Updated:** May 2026
**Status:** Production Ready ✅
