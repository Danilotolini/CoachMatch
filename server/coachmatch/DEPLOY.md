# Deploy — `coachmatch` (Serverless Framework)

> Runbook de **deploy** do serviço. Para rodar localmente (`pnpm dev`), a
> arquitetura do API Gateway e as rotas, veja [`README.md`](README.md).

## TL;DR

Rode tudo de dentro de `server/coachmatch/`:

| Objetivo                               | Comando                                     | Toca rotas/integrações? |
| -------------------------------------- | ------------------------------------------- | ----------------------- |
| Atualizar código de uma função (dev)   | `pnpm deploy:fn <fn>`                       | **Não**                 |
| Deploy completo em dev                 | `pnpm deploy:dev`                           | **Sim**                 |
| Deploy completo em prod                | `CONFIRM_PROD_DEPLOY=prod pnpm deploy:prod` | **Sim**                 |
| Recursos do stage dev                  | `pnpm deploy:dev-resources`                 | **Não**                 |

O push em `develop` publica o dev (backend e front) pela CI; prod continua manual.

## Stages

Os stages ficam na mesma conta AWS; cada um tem seu stack e aponta para os recursos
declarados no seu bloco do [`config.yml`](config.yml).

| Stage   | Stack do Serverless | Domínio da API              | Front                   | Recursos (tabelas, pools, bucket)          |
| ------- | ------------------- | --------------------------- | ----------------------- | ------------------------------------------ |
| `prod`  | `coachmatch-prod`   | `api.coachmatch.com.br`     | `coachmatch.com.br`     | os de produção, criados à mão              |
| `dev`   | `coachmatch-dev`    | `api.dev.coachmatch.com.br` | `dev.coachmatch.com.br` | stack `coachmatch-dev-resources`           |
| `local` | —                   | `localhost:3000`            | `localhost:5173`        | DynamoDB Local; pools e bucket do dev      |

Diferenças do dev em relação a prod:

- login só por e-mail e senha (sem Google) e app clients sem secret;
- sem fila de e-mail: as notificações de agendamento não saem;
- app próprio no Stream (chat), com as chaves no Parameter Store
  (`/coachmatch/dev/stream-api-key` e `/coachmatch/dev/stream-api-secret`). O deploy as
  lê na hora, então quem faz o deploy de dev precisa de `ssm:GetParameter` nesses
  parâmetros. No stage local, as chaves vêm do `.env` (ver [`.env.example`](.env.example)).

### Recursos do stage dev

Tabelas, pools e app clients do Cognito, bucket de mídia, o front em
`dev.coachmatch.com.br` e o domínio `api.dev.coachmatch.com.br` ficam em
[`infra/dev-resources.yml`](infra/dev-resources.yml), num stack CloudFormation próprio.
Assim, remover ou recriar o stack das Lambdas não apaga dados nem usuários de dev.

```bash
pnpm deploy:dev-resources
```

Os IDs que o `config.yml` (stages `dev` e `local`) e o `client/.env.dev` usam saem nos
outputs do stack:

```bash
aws cloudformation describe-stacks --stack-name coachmatch-dev-resources \
  --region sa-east-1 --query 'Stacks[0].Outputs' --output table
```

Academias e especialidades vêm de prod (o `seed/` do local tem só uma amostra). Para
copiar de novo, por exemplo depois de recriar as tabelas:

```bash
node scripts/copy-reference-data.js gyms:gyms-dev specialties:specialties-dev
```

O script só aceita destinos terminados em `-dev`.

## Instalação do CLI

Não há instalação separada: o **Serverless Framework v4** é um devDependency deste
pacote, então `pnpm install` (na raiz do monorepo) já deixa o CLI disponível. Os
scripts `pnpm deploy:*` o executam pelo `node_modules/.bin` local — **não** instale
`serverless` globalmente.

> Rodar `serverless ...` direto no shell falha (`command not found`) porque o
> `node_modules/.bin` não está no seu `PATH`. Use os scripts `pnpm deploy:*` acima,
> ou `pnpm exec serverless <comando> --stage dev` para comandos avulsos
> (ex.: `pnpm exec serverless print --stage dev` valida a config sem deployar).

## Credenciais AWS

O `serverless.yml` **não** fixa perfil — as credenciais vêm do ambiente.

**Local (SSO):** o Serverless v4 carrega `.env` automaticamente — copie [`.env.example`](.env.example) para `.env`, coloque seu perfil lá e não precisa exportar nada.

Antes de rodar qualquer comando, autentique o perfil na sessão atual:

```bash
aws sso login --profile <seu-perfil>
```

**Primeira vez (setup do perfil):** caso o perfil ainda não exista, crie-o com o guia interativo:

```bash
aws configure sso
```

O guia pergunta os valores abaixo (os de URL/conta/região são fixos da org; o
permission set é o que **você** recebeu — `AdministratorAccess` no caso do admin):

| Campo                 | Valor                                                          |
| --------------------- | -------------------------------------------------------------- |
| SSO start URL         | `https://identitycenter.amazonaws.com/ssoins-7085dfbb31476c76` |
| SSO region            | `sa-east-1`                                                    |
| Account ID            | `138413505977`                                                 |
| Role (permission set) | seu permission set, ex.: `AdministratorAccess` ou `CoachMatch` |
| CLI default region    | `sa-east-1`                                                    |

Para ver profiles já configurados:

```bash
aws configure list-profiles
```

**CI/CD:** usa `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (sem profile).

Com `AWS_PROFILE` no ambiente, os comandos abaixo rodam sem prefixo.

## Fluxos

### Atualizar só o código de uma função (uso diário)

```bash
pnpm deploy:fn coachGetMe
```

Atualiza apenas o código/config da Lambda. Não mexe em rotas, integrações nem
authorizers. **Só funciona para funções que já existem** no stack.

Em prod, use o deploy completo.

### Deploy completo em dev

O caminho normal é o push em `develop`: o job `deploy-dev` da CI publica o backend e o
front (`pnpm build:dev` em `client/`). Para publicar só o backend da sua máquina:

```bash
pnpm deploy:dev
```

O stack é dono do HTTP API inteiro: rotas, integrações, authorizers, CORS e, no stage
que declara `apiDomainName` no `config.yml`, o API mapping do domínio. Ficam fora só o
custom domain e o certificado.

### Deploy em prod

O caminho normal é a CI: **Actions → CI/CD Pipeline → Run workflow**, a partir da
`main`, com `environment: prod` e `confirm: CONFIRMAR`. O job publica o backend e o
front.

Para publicar o backend da sua máquina:

```bash
CONFIRM_PROD_DEPLOY=prod pnpm deploy:prod
```

Sem a variável, o script para antes de chamar o Serverless: `deploy:prod` difere de
`deploy:dev` por uma palavra, e um deploy em prod publica para os usuários.

### Mover o domínio para outro stage

O API Gateway aceita um único mapping de chave vazia por domínio, então o stage que
recebe o domínio não consegue criar o seu enquanto o outro não liberar:

1. Tire `apiDomainName` do stage atual no `config.yml` e faça o deploy dele. A partir
   daqui o domínio não responde.
2. Ponha `apiDomainName` no stage novo e faça o deploy dele.

A API fica fora do ar entre o fim do passo 1 e o fim do passo 2 (alguns minutos). Faça
os dois deploys em sequência, em horário de pouco uso.

### Verificar depois do deploy

Contra `https://api.coachmatch.com.br`, com um token de cada perfil:

- rota de coach com token de coach → 2xx; com token de aluno → 401;
- rota de aluno com token de aluno → 2xx; com token de coach → 401;
- sem token → 401;
- preflight de `https://coachmatch.com.br` devolve `access-control-allow-origin`;
  de uma origem qualquer, não.

```bash
curl -si -X OPTIONS https://api.coachmatch.com.br/coach/me \
  -H 'Origin: https://coachmatch.com.br' -H 'Access-Control-Request-Method: GET' \
  | grep -i access-control-allow-origin
```

### Rollback

Na maioria dos problemas, corrigir e fazer o deploy de novo é mais rápido. O rollback
serve para o que não dá para diagnosticar logo: redeploy de um commit anterior. O
mapping do domínio pertence ao stack, então não há passo manual.

```bash
git switch --detach <commit anterior>
CONFIRM_PROD_DEPLOY=prod pnpm deploy:prod
```

O commit precisa ser posterior à criação do stage `prod` (SCRUM-44, 10/2026). Nos
anteriores o stage não existe e o domínio pertence ao `dev`.

## Inspecionar o estado real (read-only)

```bash
# API servida pelo domínio
API_ID=$(aws apigatewayv2 get-api-mappings --domain-name api.coachmatch.com.br \
  --region sa-east-1 --query "Items[?ApiMappingKey==''].ApiId | [0]" --output text)

# Rotas e para onde apontam
aws apigatewayv2 get-routes --api-id "$API_ID" --region sa-east-1 \
  --query 'Items[].{Route:RouteKey,Target:Target,Auth:AuthorizerId}' --output table

# Integrações → Lambda
aws apigatewayv2 get-integrations --api-id "$API_ID" --region sa-east-1 \
  --query 'Items[].{Id:IntegrationId,Uri:IntegrationUri}' --output table

# O que ESTE stack possui
aws cloudformation describe-stack-resources --stack-name coachmatch-prod \
  --region sa-east-1 \
  --query 'StackResources[?contains(ResourceType,`ApiGatewayV2`)].{Type:ResourceType,Logical:LogicalResourceId}' \
  --output table
```
