"""
Lambda: POST /gyms/suggest

Recebe uma sugestão de academia do usuário final, gera um gymId novo,
força active=False (aguardando aprovação), e grava na tabela 'gyms'.

Payload esperado (application/json):
{
    "name": "Academia Unique",
    "address": "R. Felipe Schmidt, 390",
    "city": "Florianópolis",
    "state": "SC",
    "neighborhood": "Centro",
    "coordinates": {"lat": -27.5966, "lng": -48.5495}
}

Qualquer "gymId" ou "active" enviado no payload é ignorado —
o servidor é quem decide esses dois campos.

Respostas:
    201 Created  -> sugestão gravada
    400          -> payload inválido
    500          -> erro interno

Variáveis de ambiente:
    TABLE_NAME   - nome da tabela DynamoDB (default: "gyms")
"""

import json
import os
import uuid
from decimal import Decimal, InvalidOperation
import boto3
from botocore.exceptions import ClientError

TABLE_NAME = os.environ.get("TABLE_NAME", "gyms")

_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(TABLE_NAME)

REQUIRED_FIELDS = ["name", "address", "city", "state", "neighborhood", "coordinates"]
MAX_FIELD_LENGTH = 200


# ---------- helpers ----------

def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
            # CORS é tratado pelo HTTP API Gateway, não aqui.
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def _gen_gym_id() -> str:
    """Gera IDs tipo gym_a3f2c1b4 — curto, legível em log, colisão desprezível."""
    return f"gym_{uuid.uuid4().hex[:8]}"


def _validate_and_build(payload: dict):
    """
    Valida o payload e devolve o item pronto pra gravar (sem gymId/active ainda).
    Retorna (item, None) em sucesso ou (None, mensagem_erro).
    """
    if not isinstance(payload, dict):
        return None, "Body deve ser um objeto JSON."

    # 1) campos obrigatórios presentes e não-vazios
    missing = [f for f in REQUIRED_FIELDS if not payload.get(f)]
    if missing:
        return None, f"Campos obrigatórios ausentes ou vazios: {', '.join(missing)}."

    # 2) coordinates: formato e limites geográficos
    coords = payload.get("coordinates")
    if not isinstance(coords, dict) or "lat" not in coords or "lng" not in coords:
        return None, "'coordinates' deve ser um objeto com 'lat' e 'lng'."
    try:
        lat = Decimal(str(coords["lat"]))
        lng = Decimal(str(coords["lng"]))
    except (InvalidOperation, TypeError):
        return None, "'lat' e 'lng' devem ser números."
    if not (Decimal("-90") <= lat <= Decimal("90")):
        return None, "'lat' deve estar entre -90 e 90."
    if not (Decimal("-180") <= lng <= Decimal("180")):
        return None, "'lng' deve estar entre -180 e 180."

    # 3) state: sigla de 2 letras, padroniza em maiúsculo
    state = str(payload["state"]).strip().upper()
    if len(state) != 2 or not state.isalpha():
        return None, "'state' deve ser a sigla de 2 letras (ex: SP, RJ)."

    # 4) sanitiza strings (trim + limite de tamanho pra evitar abuso)
    def clean(field: str) -> str:
        return str(payload[field]).strip()[:MAX_FIELD_LENGTH]

    item = {
        "name":         clean("name"),
        "address":      clean("address"),
        "city":         clean("city"),
        "state":        state,
        "neighborhood": clean("neighborhood"),
        "coordinates":  {"lat": lat, "lng": lng},
    }

    # re-valida após trim (campos podiam ser só espaços)
    for f in ["name", "address", "city", "neighborhood"]:
        if not item[f]:
            return None, f"O campo '{f}' não pode ser vazio."

    return item, None


# ---------- handler ----------

def lambda_handler(event, context):
    try:
        # 1) parse do body
        raw = event.get("body") or "{}"
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            return _response(400, {"error": "Body inválido: não é JSON."})

        # 2) valida e sanitiza
        item, error = _validate_and_build(payload)
        if error:
            return _response(400, {"error": error})

        # 3) campos controlados pelo servidor (ignora o que veio no payload)
        item["gymId"] = _gen_gym_id()
        item["active"] = "False"   # sugestão entra sempre pendente de aprovação

        # 4) grava com proteção contra colisão de ID (retenta uma vez)
        try:
            _table.put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(gymId)",
            )
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                item["gymId"] = _gen_gym_id()
                _table.put_item(
                    Item=item,
                    ConditionExpression="attribute_not_exists(gymId)",
                )
            else:
                raise

        # 5) prepara resposta (Decimal -> float pras coordenadas)
        response_item = {
            **item,
            "coordinates": {
                "lat": float(item["coordinates"]["lat"]),
                "lng": float(item["coordinates"]["lng"]),
            },
        }

        return _response(201, {
            "data": response_item,
            "message": "Sugestão registrada com sucesso. Aguardando aprovação.",
        })

    except Exception as e:
        print(f"ERROR: {e}")
        return _response(500, {"error": "Erro interno ao processar sugestão."})