# CoachMatch Client — Guia para IA (frontend)

> Carregado automaticamente quando trabalhar em `client/`.
> Contexto transversal do monorepo: [`../CLAUDE.md`](../CLAUDE.md).
> Design system completo: [`../docs/design-system.md`](../docs/design-system.md).

## Stack

- **React 19** (function components + hooks, sem class components)
- **Vite 7** (dev server + build)
- **TypeScript** em modo `strict`
- **PWA** via `vite-plugin-pwa` + Workbox
- **Tailwind CSS v4** — setup local via `@tailwindcss/vite`. Tokens em `src/index.css` (`@theme { ... }`). Plugin `@tailwindcss/forms` habilitado via `@plugin`.

## Comandos

```bash
pnpm dev           # dev server
pnpm build         # tsc -b && vite build
pnpm preview       # preview do build de produção
pnpm lint          # eslint .
pnpm format        # prettier --write src
pnpm format:check  # prettier --check src
```

Sempre use `pnpm`, nunca `npm`/`yarn`.

## Estrutura

```
client/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── assets/
│   ├── design/styleguide.html     ← preview visual do design system (standalone, não é rota)
│   └── vite-env.d.ts
├── public/
├── index.html
├── tsconfig.json           ← root config
├── tsconfig.app.json       ← config da app (com path aliases)
├── tsconfig.node.json      ← config de tooling
├── vite.config.ts
├── pwa-assets.config.ts
└── eslint.config.js
```

### Path aliases

Alias `@/` mapeia pra `client/src/`. Configurado em `tsconfig.app.json` e `vite.config.ts`.
Use em imports pra evitar `../../../` encadeado.

```ts
import { Button } from '@/components/Button'
```

## Convenções de frontend

- **Componentes**: function components + hooks. PascalCase pro nome e arquivo.
- **Estado**: priorizar `useState`/`useReducer` antes de libs externas. Avaliar bem antes de adicionar state manager.
- **Props**: tipadas com `interface` ou `type`. Nunca `any`.
- **Side effects**: `useEffect` apenas pra sincronização com sistemas externos, não pra lógica derivada (use `useMemo`).
- **Estilos**: Tailwind utilities direto no JSX. Evitar CSS modules/styled-components.
- **Imagens/ícones**: Material Symbols Outlined via Google Fonts; imagens em `src/assets/`.

## Design System (resumo operacional)

Referência completa: [`../docs/design-system.md`](../docs/design-system.md).
Preview visual: [`src/design/styleguide.html`](src/design/styleguide.html).

### Tokens críticos (consulta rápida)

| Token | Hex | Uso |
|---|---|---|
| `primary` | `#F4FFC6` | Brand, CTAs, destaques |
| `primary-dim` | `#C7EF00` | Estados ativos |
| `on-primary` | `#546600` | Texto sobre `primary` |
| `on-primary-fixed` | `#3C4A00` | Texto sobre `primary-fixed` |
| `surface` | `#0E0E0E` | Fundo base da app |
| `surface-container-low` | `#131313` | Cards padrão |
| `surface-container-high` | `#20201F` | Cards elevados |
| `surface-container-highest` | `#262626` | Chips, inputs |
| `on-surface` | `#FFFFFF` | Texto primário |
| `on-surface-variant` | `#ADAAAA` | Texto secundário |
| `outline` / `outline-variant` | `#767575` / `#484847` | Bordas |
| `error` | `#FF7351` | Feedback de erro |

Escala completa (primary, secondary, tertiary, error, 8 níveis de surface): ver doc completo.

### Tipografia

- **Lexend** (headline): 400, 600, 700, 800 — títulos, botões, labels de marca
- **Inter** (body/label): 400, 500, 600, 700 — texto, formulários, UI

Nunca Lexend em body. Nunca Inter em títulos principais.

### Padrões rápidos

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

// Chip ativo
<span className="bg-primary text-on-primary px-6 py-2 rounded-full font-label
                 text-xs uppercase font-bold tracking-widest">Musculação</span>
```

### Regras

- Sempre tokens — nunca cinzas arbitrários (`#555`, `gray-400`).
- Bordas com opacidade (`/10`, `/20`) pra suavizar.
- Mobile-first: desenhar em 390px antes de escalar.
- Botões em UPPERCASE, Lexend Bold, sempre com `active:scale-95`.
- Não empilhar mais que 3 níveis de surface na mesma tela.

## Mobile-first & PWA

- Viewport alvo: 390×844 (iPhone 14/15). Testar primeiro, escalar pra desktop com `md:`/`lg:`.
- `min-height: max(884px, 100dvh)` pra evitar colapso em viewports curtos.
- PWA: manifest e service worker gerados por `vite-plugin-pwa`. Assets em `pwa-assets.config.ts`.
- Safe areas: usar `pb-safe`/`pt-safe` quando tiver nav fixa.

## Copy

Português pt-BR, direto e confiante. Ver glossário de domínio em [`../CLAUDE.md`](../CLAUDE.md).

- Botões começam com verbo no infinitivo, UPPERCASE: `AGENDAR`, `CONFIRMAR`, `VER PERFIL`.
- Labels curtas: `Explorar`, `Treinos`, `Agenda`, `Perfil`.
- Tagline: _"Seu personal, sem adivinhação."_ — não traduzir, não parafrasear.

## Dívidas técnicas abertas

- `src/design/styleguide.html` ainda usa Tailwind via CDN (é um preview standalone fora da SPA). Migrar pra rota React que consuma o Tailwind local.
- Tokens duplicados: `src/index.css` (`@theme`) + `styleguide.html` + `docs/design-system.md`. Considerar gerar os dois últimos a partir do CSS.
- Estrutura de pastas de componentes ainda não definida (sugerir antes de criar).
