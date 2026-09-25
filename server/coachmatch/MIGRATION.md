# Migração Python → Node das Lambdas de agenda

> Documento temporário. As rotas já foram migradas; apagar depois do período de
> observação e da limpeza final. Para deploy, ver [`DEPLOY.md`](DEPLOY.md); para arquitetura,
> [`README.md`](README.md).

Todo o código Node está implantado e testado (`pnpm test`, 497 testes). As Lambdas
Python continuam existindo apenas para rollback durante o período de observação.

## Estado em 19/09/2026

| Domínio | Rotas | Situação |
| ------- | ----- | -------- |
| coaches, students, gyms, payments, chat | 30 | Node, migradas antes desta frente |
| `specialtiesGet` | 2 | ✅ migrada |
| `uploadCreateUrl` | 2 | ✅ migrada |
| schedule — leitura | 5 | ✅ migradas |
| schedule — escrita | 7 | ✅ migradas |

Total atual: **46 rotas Node e nenhuma rota Python no API Gateway**. O marcador
`# MIGRAÇÃO EM ANDAMENTO` foi removido do `serverless.yml`.

### Cortes concluídos nesta rodada

`coachCreateSchedule` foi migrada em 19/09/2026:

- rota Node `w6s9xk3` → integração `hnkc1bl` →
  `coachmatch-dev-coachCreateSchedule`;
- integração Python preservada para rollback: `t9czfz6` →
  `post-coach-schedule`;
- contrato de sucesso e item persistido comparados com a Python; fixtures removidos;
- rota sem token respondeu 401;
- collector iniciou com a configuração padrão e `EXTENSION ... State: Ready`.

`studentCreateScheduleRequest` foi migrada na sequência:

- rota Node `sqcfilf` → integração `vfsw9k7` →
  `coachmatch-dev-studentCreateScheduleRequest`;
- integração Python preservada para rollback: `9myaz2m` →
  `post-schedule-request`;
- mutação e resposta comparadas com a Python usando coach inexistente, sem e-mail;
- rota sem token respondeu 401 e o collector ficou `Ready`.

`coachApproveSchedule` foi migrada depois:

- rota Node `few2mzd` → integração `4p5fc95` →
  `coachmatch-dev-coachApproveSchedule`;
- integração Python preservada para rollback: `63hq8xp` →
  `post-approve-schedule`;
- caminho 200 e persistência `BOOKED`/`APPROVED`/`REJECTED` equivalentes;
- rota sem token respondeu 401, fixtures removidos e collector `Ready`;
- o Node adiciona duas guardas de integridade que a Python não tinha: só aprova
  schedule `REQUESTED` e só aprova request ainda `REQUESTED`.

`coachCancelSchedule` foi migrada em seguida:

- rota Node `d9gdfqb` → integração `1nsmxl9` →
  `coachmatch-dev-coachCancelSchedule`;
- integração Python preservada para rollback: `iitgs1f` →
  `post-coach-cancel-schedule`;
- resposta e persistência `CANCELLED` comparadas com a Python;
- rota sem token respondeu 401, fixtures removidos e collector `Ready`.

`studentCancelSchedule` foi migrada depois:

- rota Node `cn3gtv9` → integração `fo6uxgt` →
  `coachmatch-dev-studentCancelSchedule`;
- integração Python preservada para rollback: `n46n9p4` →
  `post-student-cancel-schedule`;
- resposta e persistência `CANCELLED` comparadas com a Python;
- rota sem token respondeu 401, fixtures removidos e collector `Ready`.

`studentCancelScheduleRequest` foi migrada depois:

- rota Node `kcs0pw9` → integração `owt7c9t` →
  `coachmatch-dev-studentCancelScheduleRequest`;
- integração Python preservada para rollback: `gzamjpo` →
  `cancel-student-request`;
- com duas solicitações pendentes, Python e Node cancelaram apenas a do aluno e
  mantiveram o schedule e a outra solicitação como `REQUESTED`;
- rota sem token respondeu 401, fixtures removidos e collector `Ready`.

`coachUpdateClassStatus` encerrou a migração:

- rota Node `2m6p93k` → integração `a3wum8c` →
  `coachmatch-dev-coachUpdateClassStatus`;
- integração Python preservada para rollback: `zc62o39` → `post-class-status`;
- o caminho `BOOKED → COMPLETED`, com `paymentStatus=PENDING`, foi equivalente;
- o Node preserva `PAID` e impede sobrescrita concorrente de status, duas guardas
  de integridade ausentes na Python;
- rota sem token respondeu 401, fixtures removidos e collector `Ready`.

## Antes de tocar em qualquer coisa

Três fatos que custaram caro descobrir nesta frente. Nenhum é opcional.

### 1. O stage `dev` é o único backend, e ele é produção

O `.github/workflows/ci-cd-pipeline.yml` tem três ambientes (`develop`, `homol`,
`prod`) e os **três rodam `pnpm run deploy:dev`** — mesma stack `coachmatch-dev`,
mesma API Gateway `qht6965nv9`. Só o bucket do front muda. Não existe sandbox: um
`pnpm deploy:dev` na sua máquina altera o ambiente que os usuários acessam.

Deploy pelo pipeline é só por `workflow_dispatch` com `CONFIRMAR`, a partir de `main`.

### 2. A branch original estava na linha `develop`, atrás da `main`

Os cortes iniciais foram feitos numa branch derivada de `develop`, então cada
deploy também reinstalava versões antigas de arquivos já corrigidos em `main`.
Antes do deploy final, o trabalho foi reconstruído em
`feature/node-lambda-migration`, diretamente sobre `origin/main`. O checkpoint
local `backup/deployed-node-migration-20260919` preserva o estado anterior apenas
para recuperação; não deve virar PR.

### 3. A mina do layer Grafana

O layer do OTel collector é uma **Lambda Extension**. Extension que morre no INIT
derruba **toda invocação de toda função** do stack (`Extension.InitError`), não só
a telemetria. E o `provider.layers` vale para todas.

O que mata a extension: `OPENTELEMETRY_COLLECTOR_CONFIG_URI` **presente e vazia**.
Presente-e-vazia não é o mesmo que ausente — o collector aceita `""` como caminho,
resolve para `file:`, tenta ler `.` e morre. O `main` corrigiu isso removendo a
variável (commit `013cb9f`) e trocando a credencial por `GRAFANA_CLOUD_API_KEY_ARN`.

A seção OTel deste `serverless.yml` é **byte a byte a do `origin/main`**. Não
mexer. Se mexer, conferir depois no log da função:

```
"msg":"Using default config URI","uri":"/opt/collector-config/config.yaml"   ← bom
"msg":"Using config URI from environment variable","uri":""                  ← vai quebrar tudo
EXTENSION  Name: collector  State: Ready                                     ← bom
```

## Procedimento por função

Sempre de dentro de `server/coachmatch/`. Em toda chamada ao AWS CLI, passe
`--profile CoachMatch` (é o único perfil configurado; o `.env.example` menciona
`JoaoAdm`, que não existe).

### 1. Comparar contrato antes de mexer

Baixar a Lambda Python e ler:

```sh
url=$(aws lambda get-function --profile CoachMatch --function-name <fn-python> --region sa-east-1 \
  --query 'Code.Location' --output text)
curl -s "$url" -o fn.zip && mkdir fn && (cd fn && jar xf ../fn.zip)   # não há unzip na máquina
```

Depois rodar o comparador: ele invoca a Python na AWS e executa o handler Node
**em processo** contra o DynamoDB real, com o mesmo evento.

```sh
node scripts/migration/compare.mjs
```

Editar a lista `CASOS` no topo do script para cada função. Ele já cuida das três
armadilhas: evento com as duas formas de identidade (a Python decodifica o Bearer
header, o Node lê a claim do authorizer), chaves canonicalizadas antes de comparar
(map do DynamoDB não tem ordem estável) e `MAIL_SENDER_QUEUE_URL` não setada, o que
faz `notifyByEmail` virar no-op.

Rodar de dentro de `server/coachmatch/` para o `node_modules` resolver.

**Escrita é diferente de leitura**: estas funções mutam estado, então **não rode
Python e Node contra o mesmo item** — o primeiro invalida o segundo. Crie dois
fixtures equivalentes e compare a forma da resposta e o efeito no item, não o
estado compartilhado.

Dados reais úteis (tabela `schedule`, 182 itens em 19/09):

```
coachId    e3fc9a9a-c0c1-706b-32e9-9bbc4b4a57e9
studentId  037c4a8a-6031-705c-e02f-8e45f93bd387
gymId      gym_sp004
intervalo  2026-06-01T00:00:00-03:00 → 2026-11-01T00:00:00-03:00
status     AVAILABLE, REQUESTED, BOOKED, COMPLETED, CANCELLED, NOSHOW
```

### 2. Declarar o bloco no `serverless.yml`

Durante a migração, cada bloco foi descomentado imediatamente antes do corte. Os
sete blocos agora estão ativos e não há mais marcador de migração. Validar:

```sh
pnpm exec serverless print --stage dev | sed -n '/^functions:/,/^resources:/p' | grep -E "^  [a-zA-Z]"
```

### 3. Guardar o rollback e deletar a rota manual

O CloudFormation **falha ao criar `RouteKey` duplicado** — por isso a rota Python
precisa sair antes. Guardar antes de deletar:

```sh
aws apigatewayv2 get-routes --profile CoachMatch --api-id qht6965nv9 --region sa-east-1 --max-results 200 \
  --query "Items[?RouteKey=='<ROUTE KEY>'].[RouteId,RouteKey,Target,AuthorizerId]" --output text
aws apigatewayv2 delete-route --profile CoachMatch --api-id qht6965nv9 --region sa-east-1 --route-id <id>
```

Deletar a rota **não** deleta a integração — é ela que torna o rollback trivial.

### 4. Deploy e verificação

```sh
pnpm deploy:dev
```

Conferir, nesta ordem:

1. rota aponta para a integração nova (`get-routes` + `get-integrations`);
2. `curl` sem token devolve **401** (rota viva e authorizer no lugar);
3. invocar a Lambda deployada com o mesmo evento do passo 1 e comparar com o
   resultado da Python — isto valida bundle e IAM da role, que o teste em processo
   não cobre;
4. `EXTENSION ... State: Ready` no log (ver a mina acima).

## Escritas de schedule

| Situação | Rota | Authorizer | Lambda Python | Função no `serverless.yml` | Handler |
| -------- | ---- | ---------- | ------------- | -------------------------- | ------- |
| ✅ Node | `POST /coach/schedule` | `bg0uj6` | `post-coach-schedule` | `coachCreateSchedule` | `src/schedule/create-schedule/` |
| ✅ Node | `POST /student/coach/schedules/request` | `ahu157` | `post-schedule-request` | `studentCreateScheduleRequest` | `src/schedule/create-schedule-request/` |
| ✅ Node | `POST /coach/schedule/approve` | `bg0uj6` | `post-approve-schedule` | `coachApproveSchedule` | `src/schedule/approve-schedule-request/` |
| ✅ Node | `POST /coach/schedule/cancel` | `bg0uj6` | `post-coach-cancel-schedule` | `coachCancelSchedule` | `src/schedule/cancel-schedule/` |
| ✅ Node | `POST /student/coach/schedules/cancel` | `ahu157` | `post-student-cancel-schedule` | `studentCancelSchedule` | `src/schedule/cancel-booked-schedule/` |
| ✅ Node | `DELETE /student/coach/schedules/request` | `ahu157` | `cancel-student-request` | `studentCancelScheduleRequest` | `src/schedule/cancel-schedule-request/` |
| ✅ Node | `POST /coach/schedule/class/status` | `bg0uj6` | `post-class-status` | `coachUpdateClassStatus` | `src/schedule/update-class-status/` |

O que muda em relação às de leitura:

- **E-mail é real depois do deploy.** `MAIL_SENDER_QUEUE_URL` aponta para a fila
  `MailSender` de verdade (`config.yml:20`). Smoke test pós-deploy com fixture que
  tenha e-mail dispara mensagem. Usar fixture sem e-mail, ou aceitar o envio.
- **Concorrência.** Ver `src/schedule/shared/concurrency.js` e conferir que o
  `ConditionExpression` do Node cobre o mesmo que a Python — duas solicitações
  simultâneas no mesmo horário não podem ambas vencer.
- **Sujeira no banco.** Fixtures criados no teste ficam na tabela de produção.
  Anotar os `scheduleId` e limpar depois.

## Rollback

As trocas já feitas voltam com um comando (as integrações Python continuam
intactas, com os ids já gravados no script):

```sh
./scripts/migration/rollback.sh specialties     # 2 rotas
./scripts/migration/rollback.sh uploads         # 2 rotas
./scripts/migration/rollback.sh schedule-reads  # 5 rotas
./scripts/migration/rollback.sh coach-create-schedule
./scripts/migration/rollback.sh student-create-schedule-request
./scripts/migration/rollback.sh coach-approve-schedule
./scripts/migration/rollback.sh coach-cancel-schedule
./scripts/migration/rollback.sh student-cancel-schedule
./scripts/migration/rollback.sh student-cancel-schedule-request
./scripts/migration/rollback.sh coach-update-class-status
```

Depois do rollback, comentar de novo o bloco da função no `serverless.yml` e
deployar — senão o próximo `deploy` recria a rota e o conflito volta.

Os ids de todas as integrações Python estão gravados no script; não dependem de
scratchpad ou do histórico desta sessão.

## Limpeza no fim

1. ~~Remover o marcador `# MIGRAÇÃO EM ANDAMENTO` do `serverless.yml`.~~ Feito em
   19/09/2026.
2. **Apagar as Lambdas Python órfãs** (sem rota, mantidas como rollback). Hoje são
   17 — só apagar depois de alguns dias de uso estável das Node:

   ```
   get-specialties                    generate-profile-video-upload-url
   get-coach-schedule-from-jwt        get-coach-schedule-from-parm
   get-gym-schedule-from-parm         get-schedule-requests
   get-student-requests-by-JWT        get-gyms
   post-coach-schedule
   post-schedule-request
   post-approve-schedule
   post-coach-cancel-schedule
   post-student-cancel-schedule
   cancel-student-request
   post-class-status
   post-gyms-suggest                  cref-unload   (essa não é desta frente)
   ```

3. **Apagar este arquivo.**

## Pendências fora do escopo desta migração

- ~~**Rota pendurada**: `ANY /student/me` sem integração.~~ Não existe mais em
  25/09/2026: as 52 rotas do API Gateway batem exatamente (rota + authorizer) com
  as declaradas no `serverless.yml`, e nenhuma está sem integração.
- **Refactor de env vars adiado**: consolidar `STAGE`/`REGION`/`ENDPOINT`/
  `ACCESS_KEY_ID`/`SECRET_ACCESS_KEY` em `provider.environment` e remover o bloco
  `environment:` duplicado das 28 funções antigas. Era 87% do diff do
  `serverless.yml` e não tem nada a ver com schedule — foi deliberadamente deixado
  de fora. Vale um PR próprio.
- Não voltar a implantar a partir do checkpoint ou da branch antiga baseada em
  `develop`; o código reconciliado vive em `feature/node-lambda-migration`.
