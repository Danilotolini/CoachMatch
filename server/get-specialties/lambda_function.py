"""
Lambda: GET /specialties

Endpoints suportados (mesma função, query params opcionais):
    GET /specialties
    GET /specialties?limit=5&page=2
    GET /specialties?search=Taekwondo
    GET /specialties?search=box&limit=10&page=1   (combinável)

Variáveis de ambiente:
    TABLE_NAME   - nome da tabela DynamoDB (default: "Specialties")

IAM mínimo necessário (anexar à role da Lambda):
    {
      "Effect": "Allow",
      "Action": ["dynamodb:Scan"],
      "Resource": "arn:aws:dynamodb:<region>:<account>:table/Specialties"
    }
"""

import json
import os
import boto3

TABLE_NAME = os.environ.get("TABLE_NAME", "specialties")

# Cliente fora do handler -> reaproveitado entre invocações (warm start).
_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(TABLE_NAME)

# Defaults / limites de paginação
DEFAULT_LIMIT = 100
MAX_LIMIT = 100


# ---------- helpers ----------

def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=3600", # specialties mudam pouco, cache de 1 hora
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def _scan_all() -> list[dict]:
    """
    Scan completo da tabela, lidando com paginação interna do DynamoDB
    (LastEvaluatedKey). Aceitável aqui porque a tabela de specialties
    é pequena (dezenas de itens) e raramente muda. Para tabelas grandes,
    troque por Query em uma GSI ou use um índice de busca dedicado.
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
    n = int(value)  # ValueError sobe pro try/except do handler
    return max(minimum, min(maximum, n))


# ---------- handler ----------

def lambda_handler(event, context):
    try:
        params = event.get("queryStringParameters") or {}

        search = (params.get("search") or "").strip().lower()
        try:
            limit = _parse_int(params.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT)
            page = _parse_int(params.get("page"), 1, 1, 10_000)
        except ValueError:
            return _response(400, {"error": "Os parâmetros 'limit' e 'page' devem ser inteiros."})

        # 1) busca os itens
        items = _scan_all()

        # 2) filtra por busca (case-insensitive, em label e id)
        if search:
            items = [
                i for i in items
                if search in str(i.get("label", "")).lower()
                or search in str(i.get("id", "")).lower()
            ]

        # 3) ordena por label pra resposta estável
        items.sort(key=lambda i: str(i.get("label", "")))

        # 4) paginação em memória (ok pra esse volume)
        total = len(items)
        total_pages = max(1, (total + limit - 1) // limit)
        start = (page - 1) * limit
        page_items = items[start:start + limit]

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
        # Em produção, troque por logger e não exponha a mensagem crua.
        print(f"ERROR: {e}")
        return _response(500, {"error": "Erro interno ao listar specialties."})