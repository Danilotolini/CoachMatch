#!/bin/sh
# Aponta o mapping `$default` de api.coachmatch.com.br para outro HTTP API, criando-o
# se não existir. O DNS aponta para o custom domain, não para a API, então isto troca a
# API servida sem mexer em DNS. No dev o mapping pertence ao stack: alterá-lo por aqui
# cria drift que o CloudFormation não desfaz. Use no rollback, depois que o redeploy da
# versão anterior removeu o mapping do stack (ver DEPLOY.md).
#
# Uso: scripts/point-api-domain.sh <api-id>
set -e
DOMAIN=api.coachmatch.com.br
REGION=sa-east-1
API_ID=$1

if [ -z "$API_ID" ]; then
  echo "api-id ausente: recebido '', esperado o id de um HTTP API (ex.: qht6965nv9)" >&2
  exit 1
fi

MAPPING_ID=$(aws apigatewayv2 get-api-mappings --domain-name "$DOMAIN" --region "$REGION" \
  --query "Items[?ApiMappingKey==''].ApiMappingId | [0]" --output text)

if [ -z "$MAPPING_ID" ] || [ "$MAPPING_ID" = "None" ]; then
  aws apigatewayv2 create-api-mapping --domain-name "$DOMAIN" --region "$REGION" \
    --api-id "$API_ID" --stage '$default' \
    --query '{ApiId:ApiId,Stage:Stage}' --output table
else
  aws apigatewayv2 update-api-mapping --domain-name "$DOMAIN" --region "$REGION" \
    --api-mapping-id "$MAPPING_ID" --api-id "$API_ID" --stage '$default' \
    --query '{ApiId:ApiId,Stage:Stage}' --output table
fi
