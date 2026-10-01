# Deploy — `coachmatch` (Serverless Framework)

> Runbook de **deploy** do serviço. Para rodar localmente (`pnpm dev`), a
> arquitetura do API Gateway e as rotas, veja [`README.md`](README.md).

## TL;DR

Rode tudo de dentro de `server/coachmatch/`:

| Objetivo                       | Comando                       | Toca rotas/integrações? |
| ------------------------------ | ----------------------------- | ----------------------- |
| Atualizar código de uma função | `pnpm deploy:fn <fn>`         | **Não**                 |
| Deploy completo                | `pnpm deploy:dev`             | **Sim**                 |

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

### Deploy completo

```bash
pnpm deploy:dev
```

O stack é dono do HTTP API inteiro: rotas, integrações, authorizers, CORS e, no `dev`,
o API mapping de `api.coachmatch.com.br`. Ficam fora só o custom domain e o
certificado.

## Virada para a API gerenciada pelo stack (SCRUM-26)

Até a virada, o domínio serve a API externa `qht6965nv9` por um mapping manual
(`mmwcm1`), com authorizers manuais. O primeiro deploy desta versão cria a API nova e
o mapping para ela, e remove as rotas da API antiga no cleanup do CloudFormation.

O API Gateway aceita um único mapping com chave vazia por domínio, então o manual sai
**antes** do deploy. O domínio fica fora do ar (sem mapping) até o CloudFormation criar
o novo, no meio do deploy — de um a dois minutos. Faça em horário de pouco uso.

1. Conferir o mapping atual:

   ```bash
   aws apigatewayv2 get-api-mappings --domain-name api.coachmatch.com.br --region sa-east-1
   ```

2. Apagar o mapping manual e fazer o deploy, em sequência:

   ```bash
   aws apigatewayv2 delete-api-mapping --domain-name api.coachmatch.com.br \
     --region sa-east-1 --api-mapping-id mmwcm1 && pnpm deploy:dev
   ```

   Se o deploy for pelo pipeline (`workflow_dispatch` na `main`), apague o mapping
   logo antes de disparar o job.

3. Checar contra `https://api.coachmatch.com.br`, com um token de cada perfil:

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

Se o deploy falhar, o CloudFormation desfaz tudo: a API antiga mantém as rotas, mas o
domínio fica sem mapping. Restaure com `scripts/point-api-domain.sh qht6965nv9`.

A API antiga (`qht6965nv9`) e seus authorizers ficam intactos, sem rotas, durante a
observação. Apagá-los é da story de recursos órfãos.

### Rollback

Na maioria dos problemas, corrigir e rodar `pnpm deploy:dev` de novo é mais rápido. O
rollback serve para o que não dá para diagnosticar logo.

A versão anterior do stack recria as rotas na API antiga (authorizers por id) e apaga a
API nova e o mapping. O domínio fica sem mapping até o último passo:

```bash
git switch --detach <commit anterior à virada>
pnpm deploy:dev
scripts/point-api-domain.sh qht6965nv9
```

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
aws cloudformation describe-stack-resources --stack-name coachmatch-dev \
  --region sa-east-1 \
  --query 'StackResources[?contains(ResourceType,`ApiGatewayV2`)].{Type:ResourceType,Logical:LogicalResourceId}' \
  --output table
```
