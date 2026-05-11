# Git — Branches e Commits

Guia prático para o dia a dia no CoachMatch.

---

## Estrutura de branches

```
main
└── feat/<nome-da-feature>
    └── feat/task-<id-da-task>
```

**Exemplo real:**

```text
main
└── feat/busca-trainers
    └── feat/task-42
    └── feat/task-43
```

- `main` → código em produção.
- `feat/<nome-da-feature>` → branch de uma funcionalidade grande. Criada a partir de `main`.
- `feat/task-<id>` → branch de uma tarefa específica do GitHub. Criada a partir da branch de feature, não do `main`.

---

## Convenções de commit

Use um prefixo que descreve o tipo da mudança, seguido de uma descrição curta em minúsculas:

```
<tipo>: <descrição curta>
```

| Prefixo    | Quando usar |
|------------|-------------|
| `feat`     | Nova funcionalidade |
| `fix`      | Correção de bug |
| `chore`    | Configuração, scripts, dependências |
| `style`    | Ajustes visuais, formatação (sem lógica) |
| `refactor` | Reorganização de código sem mudar comportamento |
| `docs`     | Alterações em documentação |
| `test`     | Adição ou correção de testes |

**Exemplos:**

```text
feat: adiciona filtro de localização na busca
fix: corrige validação de CREF no cadastro
chore: atualiza dependências do projeto
docs: adiciona guia de git workflow
```

---

## Passo a passo

### 1. Criar sua branch de tarefa

Antes de começar, certifique-se de estar na branch de feature correta:

```bash
# Troca para a branch da feature
git checkout feat/busca-trainers

# Puxa as últimas atualizações dessa branch
git pull origin feat/busca-trainers

# Cria sua branch de tarefa a partir dela
git checkout -b feat/task-42
```

---

### 2. Fazer commits durante o desenvolvimento

Conforme for trabalhando, salve o progresso com commits:

```bash
# Veja o que mudou
git status

# Adicione os arquivos que quer commitar
git add src/components/Busca.tsx

# Ou adicione tudo de uma vez
git add .

# Crie o commit
git commit -m "feat: adiciona campo de filtro por localização"
```

---

### 3. Antes de subir o código — atualizar com a branch de feature

Antes de abrir um Pull Request, verifique se a branch de feature teve atualizações enquanto você trabalhava.

Usamos `git rebase` em vez de merge para manter o histórico limpo, sem commits de mesclagem desnecessários. Pense assim: o rebase "replanta" seus commits no topo das atualizações mais recentes, como se você tivesse começado a trabalhar a partir da versão mais nova.

**Se você não tem mudanças locais pendentes:**

```bash
# Volte para a branch de feature e puxe as atualizações
git checkout feat/busca-trainers
git pull origin feat/busca-trainers

# Volte para a sua branch
git checkout feat/task-42

# Replante seus commits em cima das atualizações da feature
git rebase feat/busca-trainers
```

**Se você tem mudanças que ainda não commitou (arquivos em aberto):**

Use o `stash` para guardar temporariamente o que está em andamento:

```bash
# Guarda as mudanças em "rascunho" temporário
git stash

# Atualize a branch de feature
git checkout feat/busca-trainers
git pull origin feat/busca-trainers

# Volte para a sua branch e replante os commits
git checkout feat/task-42
git rebase feat/busca-trainers

# Restaura suas mudanças guardadas
git stash pop
```

> **O que é o stash?** É como uma gaveta temporária. `git stash` guarda suas mudanças não salvas, `git stash pop` as traz de volta.
> **Se aparecer conflito durante o rebase:** o Git vai pausar e indicar os arquivos com conflito. Resolva os conflitos, salve os arquivos e rode `git rebase --continue`. Se quiser cancelar e voltar ao estado anterior, use `git rebase --abort`.

---

### 4. Subir a branch e abrir o Pull Request

```bash
# Se for o primeiro envio da branch:
git push origin feat/task-42

# Se a branch já foi enviada antes e você fez rebase:
git push --force-with-lease origin feat/task-42
```

> **Por que `--force-with-lease` depois do rebase?** O rebase reescreve o histórico local, então o GitHub vai rejeitar um `git push` normal porque enxerga os commits como "divergentes". O `--force-with-lease` força o envio, mas com segurança: ele cancela o push caso alguém tenha enviado algo na mesma branch desde sua última atualização.

Depois, no GitHub:

- Abra um Pull Request de `feat/task-42` **para** `feat/busca-trainers` (não para `main`).
- Descreva o que foi feito e linke a task correspondente.

---

## Resumo rápido

```text
1. git checkout feat/<feature>
2. git pull origin feat/<feature>
3. git checkout -b feat/task-<id>
4. [trabalhe e commite normalmente]
5. git stash              ← se tiver rascunhos não commitados
6. git checkout feat/<feature> && git pull origin feat/<feature>
7. git checkout feat/task-<id> && git rebase feat/<feature>
8. git stash pop          ← restaura os rascunhos (se usou stash)
9. git push origin feat/task-<id>             ← primeiro envio
   git push --force-with-lease origin feat/task-<id>  ← após rebase
10. Abrir PR no GitHub para feat/<feature>
```
