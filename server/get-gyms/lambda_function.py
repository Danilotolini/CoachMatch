"""
Lambda: GET /gyms

Endpoints suportados (mesma função, query params opcionais):
    GET /gyms
    GET /gyms?limit=5&page=2
    GET /gyms?search=smart&city=São Paulo&limit=10
    GET /gyms?search=ipanema

Variáveis de ambiente:
    TABLE_NAME   - nome da tabela DynamoDB (default: "gyms")

IAM mínimo necessário (anexar à role da Lambda):
    {
      "Effect": "Allow",
      "Action": ["dynamodb:Scan"],
      "Resource": "arn:aws:dynamodb:<region>:<account>:table/gyms"
    }
"""

import json
import os
from decimal import Decimal
import boto3

TABLE_NAME = os.environ.get("TABLE_NAME", "gyms")

# Cliente fora do handler -> reaproveitado entre invocações (warm start).
_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(TABLE_NAME)

# Defaults / limites de paginação
DEFAULT_LIMIT = 100
MAX_LIMIT = 500


# ---------- helpers ----------

def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            # CORS é tratado pelo HTTP API Gateway, não aqui.
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def _to_json_safe(value):
    """
    Converte estruturas vindas do DynamoDB (com Decimal) para tipos JSON nativos.
    Necessário porque json.dumps não serializa Decimal, e as coordinates voltam
    do Dynamo nesse formato (ex: Decimal("-23.5614")).
    """
    if isinstance(value, list):
        return [_to_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {k: _to_json_safe(v) for k, v in value.items()}
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    return value


def _scan_all() -> list[dict]:
    """
    Scan completo da tabela, lidando com paginação interna (LastEvaluatedKey).
    Aceitável enquanto a tabela for pequena. Para escalar (milhares de itens),
    considere GSIs por city/state ou um índice de busca dedicado.
    """
    items, kwargs = [], {}
    while True:
        resp = _table.scan(**kwargs)
        items.extend(resp.get("Items", []))
        if "LastEvaluatedKey" not in resp:
            break
        kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
    return items


def _parse_int(value, default: int, minimum: int, maximum: int) -> int:
    if value is None or value == "":
        return default
    n = int(value)
    return max(minimum, min(maximum, n))


# ---------- handler ----------

def lambda_handler(event, context):
    try:
        params = event.get("queryStringParameters") or {}

        search = (params.get("search") or "").strip().lower()
        city = (params.get("city") or "").strip().lower()

        try:
            limit = _parse_int(params.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT)
            page = _parse_int(params.get("page"), 1, 1, 10_000)
        except ValueError:
            return _response(400, {"error": "Os parâmetros 'limit' e 'page' devem ser inteiros."})

        # 1) busca os itens
        items = _scan_all()

        # 2) filtra SOMENTE academias ativas (regra de negócio: endpoint público
        #    nunca expõe inativas, e 'active' não é controlável via query param).
        #    Case-insensitive pra tolerar "True" / "true" na base.
        items = [i for i in items if str(i.get("active", "")).lower() == "true"]

        # 3) filtro por cidade (exato, case-insensitive)
        if city:
            items = [i for i in items if str(i.get("city", "")).lower() == city]

        # 3) filtro de busca livre em name, address e neighborhood
        if search:
            items = [
                i for i in items
                if search in str(i.get("name", "")).lower()
                or search in str(i.get("address", "")).lower()
                or search in str(i.get("neighborhood", "")).lower()
            ]

        # 4) ordena por nome pra resposta estável
        items.sort(key=lambda i: str(i.get("name", "")))

        # 5) paginação em memória
        total = len(items)
        total_pages = max(1, (total + limit - 1) // limit)
        start = (page - 1) * limit
        page_items = items[start:start + limit]

        # 6) remove 'active' da resposta (detalhe interno — cliente não precisa ver)
        page_items = [
            {k: v for k, v in i.items() if k != "active"}
            for i in page_items
        ]

        # 7) converte Decimal -> float/int antes de serializar
        page_items = _to_json_safe(page_items)

        return _response(200, {
            "data": page_items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
                "hasNext": page < total_pages,
                "hasPrev": page > 1,
            },
        })

    except Exception as e:
        print(f"ERROR: {e}")
        return _response(500, {"error": "Erro interno ao listar gyms."})