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

## Testes end-to-end (Cypress)

Os testes em [`cypress/e2e`](cypress/e2e) rodam contra o app em modo mock, sem backend nem Cognito. Eles exigem `VITE_API_MOCKING=enabled` no `.env.local` e o servidor de desenvolvimento no ar em `http://localhost:5173`.

```bash
pnpm dev       # terminal 1
pnpm cy:open   # terminal 2: modo interativo
pnpm cy:run    # terminal 2: headless, grava vídeo em cypress/videos
```

Para escolher o navegador no modo headless: `pnpm cy:run --browser chrome`.

Comandos de apoio em [`cypress/support/commands.ts`](cypress/support/commands.ts):

- `cy.loginAs('client' | 'coach')` entra com o perfil já completo. Sem ele, o perfil padrão dos mocks está pendente e o app redireciona para o onboarding.
- `cy.disableApiMocks()` desliga os mocks na página atual, para que `cy.intercept` controle as respostas da API.

Os horários dos mocks são fixos em junho de 2026. Testes que dependem da agenda congelam a data com `cy.clock`.

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
