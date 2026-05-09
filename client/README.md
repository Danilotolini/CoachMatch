# CoachMatch — Client

Stack: React 19 + Vite 7 + TypeScript (strict) + Tailwind CSS v4 + PWA.

## Pré-requisitos

- **Node.js** `^20.19.0` ou `>=22.12.0`
- **pnpm** `>=10.0.0` (use sempre `pnpm`, nunca `npm`/`yarn`)
- **AWS CLI** configurado (apenas para deploy)

## Como rodar

```bash
# instalar dependências
pnpm install

# dev server (http://localhost:5173)
pnpm dev

# build de produção (gera ./dist)
pnpm build

# preview do build de produção
pnpm preview
```

## Qualidade de código

```bash
pnpm lint          # eslint .
pnpm format        # prettier --write src
pnpm format:check  # prettier --check src
```

## Deploy

O site é hospedado em S3 e servido via CloudFront.

```bash
# 1. gerar build de produção
pnpm build

# 2. enviar artefatos pro bucket S3
aws s3 sync ./dist s3://coachmatch/coachmatch_site/ --delete --profile <profile>

# 3. invalidar cache do CloudFront para servir a nova versão
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*" \
  --profile coachmatch
```

Substitua `<profile>` pelo profile AWS local e `<distribution-id>` pelo ID da distribuição CloudFront.
