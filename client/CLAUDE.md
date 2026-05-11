# CoachMatch Client — Guia para IA (frontend)

> Carregado automaticamente em `client/`.
> Contexto do monorepo: [`../CLAUDE.md`](../CLAUDE.md).
> Tokens: [`src/index.css`](src/index.css). Voz, glossário e regras visuais: [`../.agents/skills/coachmatch-design/README.md`](../.agents/skills/coachmatch-design/README.md).

## Stack

- **React 19** (function components + hooks)
- **Vite 7** + **TypeScript** strict
- **Tailwind CSS v4** local via `@tailwindcss/vite`. Tokens em `src/index.css` (`@theme`). Plugin `@tailwindcss/forms` via `@plugin`.
- **PWA** via `vite-plugin-pwa` + Workbox.

## Comandos

```bash
pnpm dev           # dev server
pnpm build         # tsc -b && vite build
pnpm preview
pnpm lint
pnpm format        # prettier --write src
pnpm test          # vitest run
pnpm test:watch    # vitest (watch mode)
pnpm test:coverage # vitest run --coverage (relatório em coverage/, abrir coverage/index.html)
```

Sempre `pnpm`, nunca `npm`/`yarn`.

## Convenções

- **Componentes**: function components + hooks, PascalCase no nome e arquivo.
- **Estado**: `useState`/`useReducer` antes de libs externas; avaliar bem antes de adicionar state manager.
- **Props**: `interface`/`type`. Nunca `any`.
- **`useEffect`** só pra sincronização externa — não pra lógica derivada (use `useMemo`).
- **Estilos**: Tailwind utilities no JSX. Evitar CSS modules/styled-components.
- **Path alias**: `@/` → `client/src/` (configurado em `tsconfig.app.json` e `vite.config.ts`).

## Mobile-first & PWA

- Viewport alvo: 390×844 (iPhone 14/15). Testar antes de escalar com `md:`/`lg:`.
- `min-height: max(884px, 100dvh)` pra evitar colapso em viewports curtos.
- Safe areas: `pb-safe`/`pt-safe` quando houver nav fixa.
- Manifest e SW gerados por `vite-plugin-pwa`; assets em `pwa-assets.config.ts`.

## Copy

Português pt-BR, direto e confiante. Glossário de domínio em [`../.agents/skills/coachmatch-design/README.md`](../.agents/skills/coachmatch-design/README.md).

- Botões: verbo no infinitivo, UPPERCASE — `AGENDAR`, `CONFIRMAR`, `VER PERFIL`. Lexend Bold + `active:scale-95`.
- Labels curtas: `Explorar`, `Treinos`, `Agenda`, `Perfil`.
- Tagline: _"Seu personal, sem adivinhação."_ — não traduzir, não parafrasear.

## Vocabulário técnico

- **Conteúdo visível em pt-BR:** use `Aluno`, `Treinador` e `Sessão`.
- **Código e rotas locais:** use `client` para aluno e `coach` para treinador.
- Rotas locais seguem o padrão `/client/...` e `/coach/...` com segmentos em inglês, por exemplo `/client/onboarding`, `/client/health`, `/coach/login`, `/coach/pending-review`.
- Não trocar rotas externas, callbacks de OAuth/Cognito ou endpoints de API só para alinhar naming local.

## Padrões rápidos

```tsx
// CTA primário
<button className="bg-primary text-on-primary-fixed font-headline font-bold py-4 rounded
                   transition-all hover:brightness-110 active:scale-95">
  AGENDAR SESSÃO
</button>

// Card padrão
<div className="bg-surface-container-low rounded-xl border border-outline-variant/10 p-8">
  ...
</div>
```

Não empilhar mais que 3 níveis de surface na mesma tela.

## Dívidas técnicas abertas

- `src/design/styleguide.html` usa Tailwind via CDN (preview standalone fora da SPA). Migrar pra rota React.
- Tokens duplicados em `src/index.css` e `styleguide.html` — considerar gerar o styleguide a partir do CSS.
- Estrutura de pastas de componentes não definida (sugerir antes de criar).
