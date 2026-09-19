# CoachMatch

## Regras rápidas

- Monorepo pnpm workspaces: `client` e `server/coachmatch`. Sempre `pnpm`, nunca `npm`/`yarn`
- Rode comandos dentro do pacote: frontend em `client/`, backend em `server/coachmatch/`
- Use os scripts declarados nos `package.json`

## Código

- Uma responsabilidade por função
- Mensagem de exceção diz o valor **recebido** e o **esperado**, não só que falhou: `startDateTime inválido: recebido '25/05/2026', esperado ISO 8601 (ex.: 2026-05-25T07:00:00-03:00)`

## Comentários

- Escreva o **porquê**, não o **quê**. Se o comentário só repete o que o nome já diz (`/** Headers padrão. */` acima de `DEFAULT_HEADERS`), não escreva.
- Módulo compartilhado não cita módulo específico que o consome. Isso cria uma dependência de documentação: o consumidor muda de formato e o comentário do compartilhado fica desatualizado. Descreva o comportamento genérico.

## Testes

- I/O externo sempre mockado
- Testes independentes e determinísticos: sem ordem entre eles

## Formatação e lint

- Frontend: `pnpm lint` (ESLint) e `pnpm format` (Prettier). Não discuta estilo além do que a ferramenta decide.
