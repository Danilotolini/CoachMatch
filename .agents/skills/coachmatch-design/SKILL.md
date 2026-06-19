---
name: coachmatch-design
description: Guia visual para criar ou alterar UI do CoachMatch (layout, componentes visuais, copy, tokens, responsividade e estados de interface). Use somente quando a tarefa envolver aparência, composição de tela, design system, experiência visual ou criação/alteração de componentes visuais. Não use para mudanças puramente funcionais, testes, estado, rotas, auth, APIs ou refactors sem impacto visual.
user-invocable: true
---

Use este skill apenas para decisões visuais e de UX no frontend: layout, tokens, primitives, responsividade, copy visível e composição de componentes. Para mudanças funcionais sem impacto visual, siga apenas [`client/CLAUDE.md`](../../../client/CLAUDE.md).

Você está produzindo **código de produção** para a PWA do CoachMatch. Objetivo: traduzir uma necessidade visual descrita pelo usuário em código que se encaixe no vocabulário visual já implementado em [`client/src/`](../../../client/src/).

O uso é **conversacional e incremental** — o usuário pode descrever uma tela inteira de uma vez ou ir pedindo pedaços. Você gera um ponto de partida razoável; ele itera o código manualmente. Não force pipeline rígido nem template de spec se a conversa não pediu.

## Como o usuário costuma acionar

Tipicamente o usuário diz:

- **Qual tela / fluxo** (ex: "tela de detalhes do aluno", "step do onboarding").
- **Perfil** (Aluno ou Treinador) — pode estar implícito.
- **Campos e comportamentos** — em qualquer nível de detalhe, de "form com nome, e-mail e senha" até spec completo com validação e estados.
- **Referência visual** (opcional) — "igual à OnboardingPage" / "no estilo do WelcomePage".

Pergunte só o que **realmente** trava a geração (ex: perfil quando muda fluxo, destino do CTA principal). Detalhes que dá pra inferir do padrão do app, infira — o usuário ajusta depois.

## Onde olhar primeiro

- **Tokens (cor, tipografia, raio, sombras)**: [`client/src/index.css`](../../../client/src/index.css) `@theme` é a única fonte. Não duplique valores; não use hex inline; não use `gray-*` do Tailwind.
- **Convenções de stack e código**: [`client/CLAUDE.md`](../../../client/CLAUDE.md).
- **Voz, glossário, princípios visuais**: [`README.md`](README.md) deste skill.
- **Primitives** (sempre reutilizar): [`client/src/components/ui/`](../../../client/src/components/ui/) — `Button`, `Card`, `Chip`, `Input`, `RadioOption`, `Icon`.
- **Layout**: [`client/src/components/layout/`](../../../client/src/components/layout/) — `ProgressHeader`, `GlassHeader`, `BottomNav`.
- **Brand**: [`client/src/components/brand/`](../../../client/src/components/brand/) — `Wordmark`, `Eyebrow`, `LabelMicro`.
- **Features de referência**:
  - [`client/src/components/welcome/`](../../../client/src/components/welcome/) — composição de hero + cards de perfil.
  - [`client/src/components/onboarding/`](../../../client/src/components/onboarding/) — pickers compostos do onboarding do treinador.
  - [`client/src/components/coach/`](../../../client/src/components/coach/) — `CoachCard`, `CrefBadge`, `RatingPill`.
- **Pages**: [`client/src/pages/`](../../../client/src/pages/) — `WelcomePage`, `OnboardingPage`, `LoginPage`, `DashboardPage`, `PendingReviewPage`, `RejectedPage`, `CognitoCallbackPage`, `RoutesTestPage`.

## Hard rules ao gerar código

1. **Stack e código**: siga [`client/CLAUDE.md`](../../../client/CLAUDE.md) para versões, scripts, imports, estado, efeitos, tipagem e padrões gerais de React/TypeScript.
2. **Tokens, nunca hex.** Use classes Tailwind mapeadas ao `@theme`. Se buscou um grey, errou.
3. **Um acento brilhante por tela** — lime no CTA primário ou em um único callout de dado.
4. **Hierarquia pela escada de superfície**, não por bordas. Bordas em opacidade baixa.
5. **Mobile-first, desktop completo.** Comece em 390×844; projete `md:` e `lg:` como deliverables de primeira classe — nunca uma versão mobile esticada. `pb-safe`/`pt-safe` perto de navegação fixa.
6. **Copy em pt-BR.** Glossário: Aluno, Treinador, Personal, Sessão, você. Botões em UPPERCASE com verbo no infinitivo (`AGENDAR`, `CONFIRMAR`). Não use `Profissional` como nome de perfil/persona.
7. **Iconografia**: Material Symbols Outlined apenas, via componente `Icon`. Sem emoji em UI de produto.
8. **Animação controlada** — press scale-down, hover sutil. Sem easing bouncy.

## Como abordar uma tela nova

Não é checklist obrigatório — é o caminho de menor atrito.

1. **Tela-âncora.** Identifique a página existente em [`client/src/pages/`](../../../client/src/pages/) mais próxima. Copie sua estrutura (header, container, breakpoints, footer) e adapte. `OnboardingPage` é boa âncora pra forms longos; `WelcomePage` pra hero + escolha; `DashboardPage` pra layout pós-login.
2. **Mapeie campos a primitives.** Veja a tabela de tradução em [`README.md`](README.md). Se nenhum primitive cobre, **estenda** o mais próximo antes de criar um novo; só crie primitive novo com caso de reuso real.
3. **Copy.** Siga voz e glossário do [`README.md`](README.md).
4. **Dois breakpoints.** Mobile (390 px) e `lg:`. Não entregue um sem o outro.
5. **Verificação rápida**: `pnpm lint` e `pnpm build` em `client/` antes de declarar pronto.

## Se ajudar estruturar o pedido

Esse formato é **opcional** — use só quando o usuário pediu algo grande e quer confirmar antes:

```
Tela: <nome / rota em inglês, ex: /client/onboarding ou /coach>
Perfil: Aluno | Treinador
Âncora visual: <página existente parecida, se houver>
Header: <ProgressHeader step X/Y | GlassHeader | nenhum>
Campos:
  - <nome>: <tipo> — <label> — <obrigatório?> — <validação>
CTA primário: <texto> → <ação / navegação>
Estados: <loading / erro / vazio / sucesso>
```

Para pedidos pequenos ou exploratórios, pule isso e gere direto.

## Quando o usuário pedir protótipo / mock estático

Só nesse caso, gere HTML estático usando os tokens do `@theme` (replique o `:root` se for arquivo isolado). Mantenha em local de scratch, **nunca** em `client/src/`.
