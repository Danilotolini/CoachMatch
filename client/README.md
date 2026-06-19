# CoachMatch — Client

Frontend PWA do CoachMatch. Versões, dependências, engines, package manager e scripts vivem em [`package.json`](package.json).

## Pré-requisitos

- Consulte `engines` e `packageManager` em [`package.json`](package.json).
- Use sempre `pnpm`, nunca `npm`/`yarn`.
- **AWS CLI** configurado (apenas para deploy)

## Como rodar

```bash
pnpm install
pnpm dev
```

## Qualidade de código

```bash
pnpm lint          # eslint .
pnpm test          # vitest run
pnpm format        # prettier --write src
pnpm format:check  # prettier --check src
```

Para a lista completa de scripts, consulte [`package.json`](package.json).

## Autenticação e sessão

A aplicação suporta dois papéis — **treinador** (`coach`) e **aluno** (`client`) — cada um com seu próprio user pool na Amazon Cognito. As duas sessões podem coexistir no mesmo navegador, mas só uma fica ativa por vez.

### Como funciona

- Cada papel tem suas rotas (`/coach/...`, `/client/...`) e sua tela de login (`/coach/login`, `/client/login`).
- O login segue o fluxo OAuth + PKCE do Cognito. Ao voltar do callback, o token vai pro store de sessão (`stores/sessionStore.ts`) marcado pelo papel.
- O `getToken()` da aplicação retorna o token do papel **ativo**. Quando você entra em `/coach/login` ou `/client/login`, esse papel passa a ser o ativo.

### Logout e alternância de papel

`logout(role)` limpa **somente** a sessão daquele papel — a sessão do outro papel, se houver, permanece guardada. Na prática isso significa que o ciclo abaixo funciona sem precisar relogar:

1. Você está logado como `coach`, clica em "Sair" → sessão do coach é apagada, navegador volta para `/coach/login`.
2. Acessa `/client/login` → o app reconhece a sessão de aluno persistida e te leva direto pra `/client`.

Isso facilita testar interações coach ↔ aluno: faça login uma vez em cada papel e alterne pela URL.

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
