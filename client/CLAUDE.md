# CoachMatch Client — Guia para IA (frontend)

> Carregado automaticamente em `client/`.
> Contexto do monorepo: [`../CLAUDE.md`](../CLAUDE.md).
> Este guia evita repetir versões, tokens e inventário técnico. Para valores concretos, consulte a fonte de verdade.

## Fontes de verdade

| Tema | Fonte |
| --- | --- |
| Versões, dependências, package manager e scripts | [`package.json`](package.json) |
| TypeScript, Vite, Tailwind e PWA | Arquivos de configuração no `client/` |
| UI, tokens, primitives, copy, glossário e layout | [`../.agents/skills/coachmatch-design/SKILL.md`](../.agents/skills/coachmatch-design/SKILL.md) |
| Contrato da API | [`../docs/openapi.yaml`](../docs/openapi.yaml) |
| Auth e sessão | [`src/stores/sessionStore.ts`](src/stores/sessionStore.ts), [`src/lib/auth.ts`](src/lib/auth.ts), [`src/lib/cognito.ts`](src/lib/cognito.ts) |

## Comandos

- Rode tudo dentro de `client/`.
- Sempre `pnpm`, nunca `npm`/`yarn`.
- Use os scripts declarados em [`package.json`](package.json); não replique a lista aqui.
- Após mudanças no frontend, rode `pnpm test`, depois `pnpm lint.
- Rode `pnpm type-check` e/ou `pnpm build` quando mexer em tipos globais, config, rotas, PWA ou integração entre módulos.

## Convenções

- **Componentes**: function components + hooks, PascalCase no nome e arquivo.
- **Estado remoto/cache**: use TanStack Query (`useQuery`, `useMutation`, invalidação via `queryClient`) para dados vindos da API.
- **Estado global/de fluxo**: use Zustand para sessão, onboarding e estado compartilhado entre telas.
- **Estado local**: use `useState`/`useReducer` só para estado efêmero de UI dentro do componente.
- **Props**: `interface`/`type`. Nunca `any`.
- **`useEffect`** só como exceção: componentes genéricos/reutilizáveis que precisam sincronizar com APIs externas do browser, timers, refs ou libs imperativas. Não use para buscar dados, derivar estado ou orquestrar fluxo de página; prefira TanStack Query, Zustand, handlers e `useMemo`.
- **Estilos**: Tailwind utilities no JSX. Evitar CSS modules/styled-components.
- **Path alias**: `@/` → `client/src/` (configurado em `tsconfig.app.json` e `vite.config.ts`).

## Roteamento

Use as APIs do router para rotas internas em vez de `window.location`:

- Navegação imperativa → `useNavigate()` + `navigate(path, { replace })` no lugar de `window.location.href`/`replace`.
- Redirect declarativo (ex.: guards) → `<Navigate to="..." replace />`.
- Links internos → `<Link to="...">` no lugar de `<a href="...">`.
- Ler path → `useLocation()` no lugar de `window.location.pathname`.
- Ler/atualizar query → `useSearchParams()` no lugar de `new URLSearchParams(window.location.search)`.

`window.location` continua válido para o que o router não cobre: URLs externas (Cognito hosted UI), `window.location.origin` para montar callbacks absolutos do OAuth, `window.location.reload()`, e código fora de componentes React (ex.: `lib/cognito.ts`, stores).

## Auth / Sessão

Sessão por papel (`coach` e `client`) é responsabilidade do store de sessão. Múltiplas sessões podem coexistir; apenas uma fica ativa.

### Regras

- Não crie helpers paralelos de token. Use o store e os helpers existentes.
- `logout(role)` limpa **só** a sessão daquele papel. Se o outro papel tem sessão guardada, ele continua autenticado — entrar em `/{role}/login` promove a sessão e redireciona pra dashboard.
- Toda página interna nova de papel deve entrar no router protegida pelo guard correspondente. Para aluno (`/client/...`), use `ClientRouteGuard`; para treinador (`/coach/...`), use `RouteGuard` com os status permitidos. Não exponha páginas internas apenas adicionando a rota crua no `main.tsx`.

### Testes

- `test/session.ts` expõe `loginAs(role, token?)` e `clearAllSessions()`.
- `test/setup.ts` reseta `useSessionStore` no `afterEach` automaticamente.

## API / HTTP

Contrato: [`../docs/openapi.yaml`](../docs/openapi.yaml). Base URL via `VITE_API_BASE_URL`.

- **Endpoints são prefixados por papel**, espelhando os dois pools Cognito:
  - Treinador → `/coach/*` (pool `CoachAccess`).
  - Aluno → `/student/*` (pool `StudentAccess`). **Atenção ao mapeamento:** o papel local é `client`, mas o prefixo da rota da API é `/student/*` (mesma audience `student` do Cognito).
- Passe `role` explícito em chamadas com papel conhecido para usar o token correto.
- Helpers HTTP vivem em `src/lib/http.ts`.
- Funções de API ficam em `src/api/*` (uma por recurso). Não chamar `fetch`/`apiGet` direto de componentes.
- **Mocks MSW** em `src/mocks/handlers.ts` devem espelhar exatamente os paths reais (`*/coach/...`, `*/student/...`). A suíte cobre cada endpoint via MSW.

## UI e design

- Para mudanças visuais, de layout, tokens, primitives ou copy, use a skill `../.agents/skills/coachmatch-design/SKILL.md`.

## Vocabulário técnico

- **Código e rotas locais:** use `client` para aluno e `coach` para treinador.
- Rotas locais seguem o padrão `/client/...` e `/coach/...` com segmentos em inglês, por exemplo `/client/onboarding`, `/client/health`, `/coach/login`.
- Páginas específicas de papel também carregam o prefixo no nome do arquivo/componente: `ClientHomePage`, `ClientOnboardingPage`, `CoachDashboardPage`, `CoachOnboardingPage`.
- Não trocar rotas externas, callbacks de OAuth/Cognito ou endpoints de API só para alinhar naming local.
