# CoachMatch — Guia para IA

## Produto e escopo

**CoachMatch** é um marketplace que conecta alunos a treinadores qualificados no Brasil.

Público: alunos buscando profissionais de educação física.

O trabalho ativo de frontend fica em `client/`. Para tarefas de UI, use esse caminho como referência e evite mexer em backend, scripts globais ou workflows não relacionados.

## Fontes de verdade

| Tema | Fonte |
| --- | --- |
| Produto, proposta de valor e contexto de negócio | [`README.md`](README.md) |
| Frontend: comandos, padrões e workflow | [`client/CLAUDE.md`](client/CLAUDE.md) |
| Versões, dependências, package manager e scripts | [`client/package.json`](client/package.json) |
| Tokens visuais concretos (cores, fontes, raios, sombras) | [`client/src/index.css`](client/src/index.css) |
| Voz, glossário e regras visuais qualitativas | [`.agents/skills/coachmatch-design/README.md`](.agents/skills/coachmatch-design/README.md) |

## Regras rápidas

- Sempre rode comandos do frontend dentro de `client/`.
- Use sempre `pnpm`, respeitando o `packageManager` em [`client/package.json`](client/package.json).
- Após mudanças no frontend: rode `pnpm test`, depois `pnpm lint` e, se ambos passarem, rode `pnpm format`.
