# CoachMatch — Design System (skill)

## Para que serve este skill

Servir de **guia de tradução marca → código** quando você (ou a IA) for criar uma tela ou componente novo no CoachMatch. Não é um pipeline rígido nem exige spec estruturado: o uso real é conversacional e incremental — descreve mais ou menos o que precisa, gera um ponto de partida, e itera o código manualmente.

O que o skill entrega bem:

- Lembrar a voz, o glossário e as regras visuais que **não vivem no código** (são decisões de marca).
- Apontar para os primitives e telas-âncora certas em [`client/src/`](../../client/src/) em vez de reinventar.
- Evitar drift (greys do Tailwind, hex inline, emoji, copy fora do tom).

O que **não** é responsabilidade deste skill:

- Declarar valores de token (cor, raio, tipografia, sombras). Vivem em [`client/src/index.css`](../../client/src/index.css) `@theme`.
- Replicar regras de stack/código. Vivem em [`client/CLAUDE.md`](../../client/CLAUDE.md) e [`SKILL.md`](SKILL.md).

Detalhes operacionais (como acionar, hard rules de código, workflow): [`SKILL.md`](SKILL.md).

---

## Fonte única de verdade

| O que | Onde |
| --- | --- |
| Tokens (cor, tipografia, raio, sombras assinatura) | `@theme` em [`client/src/index.css`](../../client/src/index.css) |
| Convenções de stack, comandos, padrões de código | [`client/CLAUDE.md`](../../client/CLAUDE.md) |
| Implementações de referência (primitives, pages) | [`client/src/`](../../client/src/) |
| Voz, glossário, princípios visuais qualitativos | este `README.md` |

Regra prática: **se for um valor concreto (hex, número de px, classe Tailwind exata), provavelmente não pertence aqui**. Se um token não existe e você precisa, peça antes de criar.

---

## Voz e conteúdo

**Idioma.** Tudo em **pt-BR**. Telefones e CREF em formato BR (`(11) 99999-9999`, `000000-G/SP`).

**Tom.** Performance-editorial — meio revista esportiva, meio copy de produto de luxo. Frases curtas, declarativas, às vezes uma palavra. A marca vende **status e domínio de si**, não conveniência.

**Exemplos de voz (extraídos do código):**

- "Seu personal, sem adivinhação." (value prop)
- "Bem-vindo." → "Como você deseja utilizar o CoachMatch hoje?"
- "Entre para a Elite." (hero do onboarding do treinador)
- "Apresente seu arsenal técnico. Construa sua autoridade. Domine seu território."
- Seções com vocabulário marcial: **Identidade, Autoridade, Domínio, Território**.

**Casing.**

- Sentence case para corpo e maioria dos títulos.
- **UPPERCASE com tracking largo** para labels, botões, chips, navegação, eyebrows.
- Wordmark "**COACHMATCH**" sempre uppercase.

**Pronome.** Sempre **você** (informal-respeitoso). Nunca "tu". Nunca plural-formal.

**Conteúdo vs. código.** Em textos visíveis, mantenha o vocabulário de produto em pt-BR: `Aluno`, `Treinador`, `Personal`, `Sessão`. Em código, nomes técnicos e rotas locais, use inglês de domínio: `client` para aluno e `coach` para treinador. Ex.: rota `/client/onboarding`, componente `CoachCard`, copy "Aluno". Não use `Profissional` como nome de perfil/persona.

**Glossário (termos fixos):**

| Use | Evite |
|---|---|
| Aluno | Cliente, Usuário |
| Treinador | Profissional, Coach |
| Sessão | Aula, Encontro |
| CREF | Certificação |
| Personal | Coach |

**Emoji.** **Não usar em UI de produto.** Use Material Symbols via [`Icon`](../../client/src/components/ui/Icon.tsx).

**Números & dados.** Sem stat-soup. Callouts de número único (raio, nota, preço) renderizados em lime quando carregam significado.

---

## Princípios visuais

> Princípios qualitativos. Os valores concretos vivem em [`client/src/index.css`](../../client/src/index.css) e nos componentes-exemplo.

### Cor

- **Um único acento brilhante por tela** — lime. CTA primário, estado ativo, callout de dado único. Nunca tingido, nunca em gradient com outras matizes. Lime em tudo = lime em nada.
- **Yellow secondary + gold tertiary** reservados para badges de categoria e ornamento. ≤1 por tela.
- **Hierarquia vem da escada de superfícies** quase-pretas, não de borda. Cards padrão em superfície baixa; elevados sobem um degrau.
- **Bordas em opacidade baixa** — recuam atrás do conteúdo. Nunca cinza sólido.
- **Erro é laranja queimado**, não vermelho.
- **Nunca** invente greys nem use `gray-*` do Tailwind.

### Tipografia

- **Lexend** (display/headline) — carrega energia. Tracking apertado nos tamanhos grandes.
- **Inter** (corpo + label) — carrega clareza.
- Display em `clamp()` para reduzir bem em mobile.
- Labels uppercase + bold + tracking largo. Assinatura editorial.

### Iconografia

- **Material Symbols Outlined** apenas, sempre via [`Icon`](../../client/src/components/ui/Icon.tsx). Item ativo do bottom nav vira preenchido.
- Ícones canônicos já usados no produto: `explore`, `fitness_center`, `calendar_today`, `person`, `verified`, `star`, `payments`, `chat`, `notifications`, `location_on`.

### Backgrounds

- Base quase-preta. Modais full-screen no preto puro.
- **Kinetic grid** — radial dot sutil em lime, em hero/long-scroll.
- **Foto editorial** — atleta em alto contraste, dessaturada, sempre com gradiente de proteção pro texto respirar.
- Sem ilustração desenhada à mão, sem gradiente abstrato.

### Animação

- Press scale-down. Hover = brilho ou degrau de superfície. Sem easing bouncy. Performance-editorial = controlado, nunca fofo.
- Imagens: zoom lento.

### Layout

- **Mobile-first** em 390 px. Bottom nav fixo + glass header no topo.
- Desktop é deliverable de primeira classe — não uma versão mobile esticada. Heroes/forms viram 2 colunas em `md:`/`lg:`.
- Cards: cantos arredondados generosos, borda em opacidade baixa, surface da escada (com hover subindo um degrau).
- Glass header + bottom nav usam `rgba` + `backdrop-blur`.

---

## Mapa de primitives → tipos de campo

Tabela de tradução quando alguém descrever campos:

| Spec | Primitive |
|---|---|
| texto, e-mail, senha, número, telefone | [`Input`](../../client/src/components/ui/Input.tsx) |
| escolha única (lista curta) | [`RadioOption`](../../client/src/components/ui/RadioOption.tsx) |
| escolha única/múltipla por tag | [`Chip`](../../client/src/components/ui/Chip.tsx) |
| CTA primário / secundário | [`Button`](../../client/src/components/ui/Button.tsx) |
| container de seção / card de conteúdo | [`Card`](../../client/src/components/ui/Card.tsx) |
| ícone | [`Icon`](../../client/src/components/ui/Icon.tsx) |
| header de fluxo multi-step | [`ProgressHeader`](../../client/src/components/layout/ProgressHeader.tsx) |
| header padrão (top bar) | [`GlassHeader`](../../client/src/components/layout/GlassHeader.tsx) |
| nav inferior | [`BottomNav`](../../client/src/components/layout/BottomNav.tsx) |
| eyebrow / micro-label | [`Eyebrow`](../../client/src/components/brand/Eyebrow.tsx), [`LabelMicro`](../../client/src/components/brand/LabelMicro.tsx) |
| wordmark da marca | [`Wordmark`](../../client/src/components/brand/Wordmark.tsx) |

Se o spec não casar com nenhum: **estenda** o primitive mais próximo antes de criar um novo. Crie primitive novo só com caso de reuso real.

---

## Quick rules

1. **Tokens, nunca hex.** Se buscou um grey, errou.
2. **Um acento brilhante por tela.**
3. **Hierarquia por superfície, não por borda.**
4. **Lexend para energia, Inter para clareza. Sempre em par.**
5. **Mobile-first.** 390 px primeiro, depois desktop.
6. **Pt-BR na UI.** "Aluno", "Treinador", "Sessão", "você". `client`/`coach` só em código e rotas locais. Sem emoji.
7. **Press scale-down. Hover sutil. Sem bounce.**
