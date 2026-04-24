# CoachMatch — Design System

> Referência completa de tokens, tipografia, componentes e padrões de uso.
> Preview visual navegável: [`client/src/design/styleguide.html`](../client/src/design/styleguide.html).
> Resumo condensado pra IA: [`CLAUDE.md`](../CLAUDE.md).

## Princípios

1. **Performance-editorial** — estética de revista esportiva premium, não app genérico de academia.
2. **Profundidade cinética** — múltiplas camadas de superfície para hierarquia espacial.
3. **Tipografia como voz** — Lexend (headline) carrega energia; Inter (body) carrega clareza.
4. **Mobile-first sempre** — desenhar no viewport de 390px antes de escalar pra desktop.
5. **Transparência visual = transparência de marca** — interface direta, sem ruído.

---

## Color Tokens

Baseado em Material Design 3 (dark scheme). Todos os tokens estão configurados no Tailwind v4 via bloco `@theme` em [`client/src/index.css`](../client/src/index.css).

### Brand · Primária (Energia)

Amarelo-lima vibrante. Usar em CTAs, destaques de marca, badges de verificação.

| Token | Hex | Uso |
|---|---|---|
| `primary` | `#F4FFC6` | Brand principal, texto sobre superfícies escuras |
| `primary-dim` | `#C7EF00` | Estados ativos, saturação máxima |
| `primary-fixed` | `#D1FC00` | Versão fixa (não muda em light mode) |
| `primary-fixed-dim` | `#C4EC00` | Fixa saturada |
| `primary-container` | `#D1FC00` | Containers destacados |
| `on-primary` | `#546600` | Texto sobre `primary` / `primary-container` |
| `on-primary-fixed` | `#3C4A00` | Texto sobre `primary-fixed` |
| `on-primary-fixed-variant` | `#556800` | Texto variante sobre fixed |
| `on-primary-container` | `#4C5D00` | Texto sobre container |
| `inverse-primary` | `#546600` | Primária em light scheme |
| `surface-tint` | `#F4FFC6` | Tint de elevação |

### Secundária · Acento

Amarelo dourado. Usar com moderação — reservado pra categorias, estados informativos.

| Token | Hex |
|---|---|
| `secondary` | `#EFE754` |
| `secondary-dim` | `#E0D947` |
| `secondary-fixed` | `#EFE754` |
| `secondary-fixed-dim` | `#E0D947` |
| `secondary-container` | `#656100` |
| `on-secondary` | `#575400` |
| `on-secondary-fixed` | `#444100` |
| `on-secondary-fixed-variant` | `#625E00` |
| `on-secondary-container` | `#FFFAC3` |

### Terciária · Destaque

Amarelo quente. Reservado pra ornamento e elementos decorativos.

| Token | Hex |
|---|---|
| `tertiary` | `#FFEB9C` |
| `tertiary-dim` | `#EDCE35` |
| `tertiary-fixed` | `#FCDC43` |
| `tertiary-fixed-dim` | `#EDCE35` |
| `tertiary-container` | `#FCDC43` |
| `on-tertiary` | `#665600` |
| `on-tertiary-fixed` | `#473B00` |
| `on-tertiary-fixed-variant` | `#675700` |
| `on-tertiary-container` | `#5C4E00` |

### Feedback · Erro & Alerta

| Token | Hex | Uso |
|---|---|---|
| `error` | `#FF7351` | Texto/ícone de erro |
| `error-dim` | `#D53D18` | Saturado |
| `error-container` | `#B92902` | Fundo de erro |
| `on-error` | `#450900` | Texto sobre `error` |
| `on-error-container` | `#FFD2C8` | Texto sobre container |

### Escala de Superfícies · Profundidade

Ordem do mais escuro (mais baixo) ao mais claro (mais alto). Use pra criar hierarquia espacial.

| Token | Hex | Contexto |
|---|---|---|
| `surface-container-lowest` | `#000000` | Extremo — modais fullscreen, backdrops |
| `surface` / `background` / `surface-dim` | `#0E0E0E` | Fundo base da aplicação |
| `surface-container-low` | `#131313` | Cards padrão, seções |
| `surface-container` | `#1A1A1A` | Containers neutros |
| `surface-container-high` | `#20201F` | Cards elevados, dropdowns |
| `surface-container-highest` | `#262626` | Chips, inputs, toolbars |
| `surface-variant` | `#262626` | Alias de highest |
| `surface-bright` | `#2C2C2C` | Destaque sutil |
| `inverse-surface` | `#FCF9F8` | Tooltips, snackbars |

### Texto & Contornos

| Token | Hex | Uso |
|---|---|---|
| `on-surface` / `on-background` | `#FFFFFF` | Texto primário |
| `on-surface-variant` | `#ADAAAA` | Texto secundário, labels |
| `outline` | `#767575` | Bordas, separadores |
| `outline-variant` | `#484847` | Bordas sutis |
| `inverse-on-surface` | `#565555` | Texto sobre inverse |

---

## Tipografia

### Famílias

Definidas em `@theme` (`client/src/index.css`) e usadas via utilities `font-headline` / `font-body` / `font-label`.

```css
--font-headline: 'Lexend', system-ui, sans-serif;   /* 400, 600, 700, 800 */
--font-body:     'Inter',  system-ui, sans-serif;   /* 400, 500, 600, 700 */
--font-label:    'Inter',  system-ui, sans-serif;
```

Pesos carregados via Google Fonts em `client/index.html`.

### Escala

| Nível | Família | Peso | Tamanho | Uso |
|---|---|---|---|---|
| Display LG | Lexend | Bold (700) | `text-5xl md:text-6xl` (3rem → 3.75rem) | Hero, abertura de seção |
| Display XL | Lexend | Extrabold (800) | `text-7xl md:text-9xl` | Marca, "CoachMatch" em splash |
| Headline MD | Lexend | SemiBold (600) | `text-3xl` (1.875rem) | Títulos de seção |
| Title LG | Inter | Medium (500) | `text-xl` (1.25rem) | Títulos de card |
| Body LG | Inter | Regular (400) | `text-base` (1rem) | Parágrafos |
| Label | Inter | Regular (400) | `text-xs` (0.75rem) | Tags, metadados |
| Micro | Inter | Regular (400) | `text-[10px]` | Legendas, eyebrows |

### Regras

- **Tracking** (letter-spacing):
  - Headlines grandes: `tracking-tighter` (-0.05em)
  - Headlines médias: `tracking-tight` (-0.025em)
  - Labels uppercase: `tracking-widest` ou `tracking-[0.2em]`
- **Leading** (line-height):
  - Headlines: `leading-none` ou `leading-tight`
  - Body: `leading-relaxed`
- **Case**:
  - Labels, botões, chips: `uppercase`
  - Títulos e parágrafos: case natural
- **Combinações vetadas**: nunca use Lexend em body text. Nunca use Inter pra títulos principais.

---

## Border Radius

Definidos em `@theme` (`client/src/index.css`).

```css
--radius:      0.5rem;   /* 8px  — botões, inputs, chips pequenos (rounded) */
--radius-lg:   0.5rem;   /* 8px  — alias */
--radius-xl:   0.75rem;  /* 12px — cards */
--radius-full: 9999px;   /* pill — chips de filtro, badges, avatares */
```

Cards maiores (heros, bottom sheets) usam `rounded-3xl` (24px, built-in do Tailwind) ou `rounded-t-3xl`.

---

## Componentes

### Botões

**Primário** — ação principal (Agendar, Confirmar):
```html
<button class="bg-primary text-on-primary-fixed font-headline font-bold py-4 rounded
               transition-all hover:brightness-110 active:scale-95">
  AGENDAR SESSÃO
</button>
```

**Secundário** — ação alternativa (Ver Perfil, Voltar):
```html
<button class="bg-surface-container-highest text-primary font-headline font-bold py-4 rounded
               transition-all hover:bg-surface-bright active:scale-95">
  VER PERFIL
</button>
```

**Regras**:
- Copy em UPPERCASE, Lexend Bold.
- Padding vertical `py-4` (16px) mínimo em mobile.
- Sempre `active:scale-95` pra feedback tátil.
- Nunca usar mais de um botão primário visível ao mesmo tempo.

### Chips / Filtros

**Ativo**:
```html
<span class="bg-primary text-on-primary px-6 py-2 rounded-full font-label
             text-xs uppercase font-bold tracking-widest">Musculação</span>
```

**Inativo**:
```html
<span class="bg-surface-container-low text-on-surface-variant px-6 py-2 rounded-full font-label
             text-xs uppercase font-bold tracking-widest
             border border-outline-variant/20">Funcional</span>
```

### Cards de coach

- Imagem no topo com gradiente pra preto no rodapé (`bg-gradient-to-t from-surface-container-lowest`)
- Badge CREF no canto superior esquerdo (chip `primary`)
- Hover: `group-hover:scale-110` na imagem (`transition-transform duration-500`)
- Corpo: headline (Lexend) + metadados em micro-label (Inter uppercase)

### Navegação

**Top bar** — glassmorphism:
```css
background: rgba(14, 14, 14, 0.6);
backdrop-filter: blur(20px);
```

**Bottom nav** — 4 itens, estado ativo com `bg-primary/10 + scale-110`.

### Sombras

```css
.editorial-shadow {
  box-shadow: 0px 20px 40px rgba(0, 0, 0, 0.4);
}
```

Usar em cards elevados e modais. Em superfícies escuras, preferir elevação por cor (usar tier mais alto da escala) antes de sombra.

### Textura: Kinetic Grid

Grid sutil pra conteúdo editorial. Aplicar em `main` ou seções hero:
```css
.kinetic-grid {
  background-image: radial-gradient(circle at 2px 2px, rgba(244,255,198,0.05) 1px, transparent 0);
  background-size: 32px 32px;
}
```

---

## Iconografia

**Material Symbols Outlined** via Google Fonts CDN.

Configuração padrão:
```css
font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
```

Estado ativo (item selecionado na nav): `'FILL' 1`.

**Ícones canônicos do produto**:

| Ícone | Semântica |
|---|---|
| `explore` | Explorar / Descobrir |
| `fitness_center` | Treinos / Personais |
| `calendar_today` | Agenda / Sessões |
| `person` | Perfil |
| `verified` | CREF validado |
| `star` | Avaliação |
| `payments` | Pagamento |
| `chat` | Mensagens |
| `notifications` | Alertas |
| `location_on` | Localização |

---

## Voz & Tom

### Copy

- **Direto**: "Agendar sessão", não "Clique aqui para agendar uma sessão".
- **Confiante**: "Encontre seu personal", não "Talvez encontre".
- **Sem jargão**: evitar "matchmaking", "curadoria de elite". Preferir "encontrar", "escolher".
- **Orientado a ação**: botões começam com verbo no infinitivo em caixa alta (AGENDAR, CONFIRMAR, VER).

### Tagline oficial

> **Seu personal, sem adivinhação.**

Use em heros, onboarding, material de marketing. Não traduzir, não parafrasear sem aprovação.

### Termos do produto (glossário)

| Prefira | Evite |
|---|---|
| Personal trainer / Personal | Coach (só em contextos de marca "CoachMatch"), Professor |
| Aluno / Cliente | Usuário (técnico demais) |
| Sessão | Aula, Encontro |
| Agenda | Calendário (reservar pra calendário nativo) |
| CREF | Registro, Certificação genérica |
| Avaliação | Review, Rating |

---

## Do / Don't

### ✅ Faça

- Use escala de surface pra hierarquia: fundo mais escuro → cards mais claros.
- Aplique opacidade em bordas (`/10`, `/20`) pra não competir com o conteúdo.
- Combine Lexend (heading) + Inter (body) sempre.
- Teste em viewport 390px antes de desktop.
- Use badges `primary` pra sinalizar verificação/credencial (CREF).

### ❌ Não faça

- Não use cinzas arbitrários (`#555`, `gray-400`). Sempre tokens.
- Não coloque texto `on-surface` sobre `primary` — use `on-primary` (verde escuro).
- Não empilhe mais de 3 níveis de surface na mesma tela — vira ruído.
- Não use `primary` em áreas grandes de fundo — é amarelo saturado, cansa.
- Não misture Lexend e Inter no mesmo elemento.
- Não crie novos tokens de cor sem atualizar o `@theme` em `client/src/index.css` + este documento + `client/CLAUDE.md`.

---

## Manutenção

**Fonte da verdade:** `client/src/index.css` (bloco `@theme { ... }`). O Tailwind v4 lê os tokens direto do CSS.

Quando adicionar ou alterar tokens:

1. Atualizar o `@theme` em [`client/src/index.css`](../client/src/index.css).
2. Refletir o token em [`client/src/design/styleguide.html`](../client/src/design/styleguide.html) (preview standalone via CDN — tem seu próprio `tailwind.config` inline, precisa ser atualizado manualmente até ser migrado).
3. Atualizar este arquivo (`docs/design-system.md`).
4. Atualizar o resumo em [`client/CLAUDE.md`](../client/CLAUDE.md) se for token crítico.

**Dívida técnica aberta:** duplicação entre `index.css` (fonte da verdade), `styleguide.html` (CDN, `tailwind.config` inline) e as tabelas deste doc. Considerar gerar tabelas e styleguide a partir do CSS no futuro, ou migrar o styleguide pra uma rota React que consuma o Tailwind local.
