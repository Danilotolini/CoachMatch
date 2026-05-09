# CoachMatch — Design System

> Fonte da verdade dos tokens: bloco `@theme` em [`client/src/index.css`](../client/src/index.css).
> Preview navegável: [`client/src/design/styleguide.html`](../client/src/design/styleguide.html).

## Princípios

1. **Performance-editorial** — estética de revista esportiva premium, não app genérico de academia.
2. **Profundidade cinética** — múltiplas camadas de superfície para hierarquia espacial.
3. **Tipografia como voz** — Lexend (headline) carrega energia; Inter (body) carrega clareza.
4. **Mobile-first** — desenhar em 390px antes de escalar pra desktop.

---

## Cores

Baseado em Material Design 3 (dark scheme), configurado no Tailwind v4. Os hex completos vivem em `index.css` — abaixo só o papel de cada família.

| Família | Token base | Quando usar |
|---|---|---|
| **Primária** | `primary` (`#F4FFC6`) | CTAs, marca, badges (ex.: CREF) |
| **Secundária** | `secondary` (`#EFE754`) | Categorias, estados informativos — moderação |
| **Terciária** | `tertiary` (`#FFEB9C`) | Ornamento, decorativo |
| **Erro** | `error` (`#FF7351`) | Feedback negativo |

Cada família tem variantes `-dim`, `-fixed`, `-container` e o par `on-*` para texto/ícones sobre o fundo correspondente.

### Superfícies (do mais escuro ao mais claro)

| Token | Contexto |
|---|---|
| `surface-container-lowest` (`#000`) | Modais fullscreen, backdrops |
| `surface` / `background` (`#0E0E0E`) | Fundo base |
| `surface-container-low` (`#131313`) | Cards padrão |
| `surface-container` (`#1A1A1A`) | Containers neutros |
| `surface-container-high` (`#20201F`) | Cards elevados, dropdowns |
| `surface-container-highest` (`#262626`) | Chips, inputs, toolbars |
| `surface-bright` (`#2C2C2C`) | Destaque sutil |
| `inverse-surface` (`#FCF9F8`) | Tooltips, snackbars |

---

## Tipografia

```css
--font-headline: 'Lexend', system-ui, sans-serif;   /* 400, 600, 700, 800 */
--font-body:     'Inter',  system-ui, sans-serif;   /* 400, 500, 600, 700 */
--font-label:    'Inter',  system-ui, sans-serif;
```

Utilities: `font-headline`, `font-body`, `font-label`. Pesos carregados via Google Fonts em `client/index.html`.

---

## Iconografia

**Material Symbols Outlined** via Google Fonts CDN.

```css
font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
```

Item ativo na nav: `'FILL' 1`.

Ícones canônicos: `explore`, `fitness_center`, `calendar_today`, `person`, `verified`, `star`, `payments`, `chat`, `notifications`, `location_on`.

---

## Voz & glossário

| Prefira | Evite |
|---|---|
| Aluno | Cliente, Usuário |
| Sessão | Aula, Encontro |

---

## Regras práticas

- Use escala de surface pra hierarquia: fundo escuro → cards mais claros.
- Bordas com opacidade (`/10`, `/20`) pra não competir com o conteúdo.
- Lexend (heading) + Inter (body) sempre juntos.
- Nunca use cinzas arbitrários (`#555`, `gray-400`) — sempre tokens.

---

## Manutenção

Ao adicionar/alterar tokens:

1. Atualizar `@theme` em [`client/src/index.css`](../client/src/index.css).
2. Atualizar este doc se mudar o papel/família.
3. Atualizar [`client/CLAUDE.md`](../client/CLAUDE.md) se for token crítico.

**Dívida aberta:** duplicação entre `index.css`, `styleguide.html` (CDN com config inline) e este doc. Avaliar gerar tabelas/styleguide a partir do CSS, ou migrar styleguide pra rota React consumindo o Tailwind local.
