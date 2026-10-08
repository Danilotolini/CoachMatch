# Como contribuir

Guia para abrir o primeiro PR no CoachMatch.

## Fluxo de branches

```
main  ←  release/vX.Y.Z  ←  develop  ←  <tipo>/scrum-<n>-<slug>
```

- **`develop`** — integração contínua. Todo PR entra aqui.
- **`release/vX.Y.Z`** — criada automaticamente pelo CI quando `develop` recebe novos commits (ver [Fluxo de release](#fluxo-de-release)). PR para `main` também criado pelo CI.
- **`main`** — código em produção. Nunca recebe push direto.

### Nomear sua branch

| Situação | Padrão | Exemplo |
| --- | --- | --- |
| Card no Jira | `<tipo>/SCRUM-<N>-<slug>` | `feat/SCRUM-42-busca-coaches` |
| Trabalho avulso | `<tipo>/<slug>` | `docs/atualiza-readme` |

Tipos válidos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.

> **Por que maiúsculo?** O app [GitHub for Jira](https://marketplace.atlassian.com/apps/1219592/github-for-jira) detecta a chave da issue pelo padrão `[A-Z]+-[0-9]+` no nome da branch e no título do PR. Com `SCRUM-42` em maiúsculo, a branch, os commits, o PR e o status do CI aparecem automaticamente no painel **Development** da issue no Jira.

```bash
git checkout develop
git pull origin develop
git checkout -b feat/SCRUM-42-busca-coaches
```

## Convenções de commit

```
<tipo>(<escopo>): <descrição curta em minúsculas>
```

| Escopo | Quando usar |
| --- | --- |
| `server` | Código em `server/coachmatch/` |
| `client` | Código em `client/` |
| `infra` | CI/CD, Serverless Framework, AWS |
| `docs` | Documentação (pode omitir quando o tipo já é `docs`) |

**Exemplos dos últimos PRs:**

```text
feat(server): adiciona rota de busca de coaches com filtro de localização
fix(client): emite lcov na cobertura do frontend
chore(infra): gerencia HTTP API, authorizers e CORS no stack
docs: adiciona fluxos de domínio de pagamentos e chat
```

Regras de código: [CLAUDE.md](CLAUDE.md).

## Abrindo o PR

Faça push da branch e abra o PR **para `develop`**:

```bash
git push -u origin feat/SCRUM-42-busca-coaches
gh pr create --base develop --title "feat(server): SCRUM-42 — busca de coaches com filtro"
```

> **`feat/**` tem PR automático:** o CI (`auto-pr.yml`) abre um PR rascunho para `develop` quando você faz push de uma branch `feat/*`. Para os outros tipos (`fix/`, `docs/`, `chore/` etc.) o PR é manual.

Antes de pedir review:

- Testes passando: `pnpm test` (na raiz ou no pacote afetado)
- Lint limpo: `pnpm lint` (em `client/`)
- Documentação atualizada se mudou API, fluxo de domínio ou setup

## Sincronização `main ↔ develop`

Se `main` avançou (hotfix direto na release), sincronize:

```bash
git checkout develop
git pull origin develop
git merge origin/main
git push origin develop
```

Se `develop` ficou para trás de `main` (situação inversa), abra um PR `chore/sync-main-into-develop` como o [#167](https://github.com/Danilotolini/CoachMatch/pull/167).

## Fluxo de release

Todo push em `develop` dispara `.github/workflows/auto-pr.yml`, que:

1. Calcula a próxima versão patch incrementando o número mais alto entre as branches `release/vX.Y.Z` existentes.
2. Cria `release/vX.Y.Z` a partir do HEAD de `develop` (se ainda não existe).
3. Abre um PR rascunho `release/vX.Y.Z → main`.

Depois que o PR de release for aprovado e mesclado em `main`, o deploy de produção dispara automaticamente.

> **SCRUM-27 (pendente):** o cálculo de versão vai mudar de "maior branch `release/`" para "última tag git". O fluxo acima é o que vale até essa mudança ser entregue.
