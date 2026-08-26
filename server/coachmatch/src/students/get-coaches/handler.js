import { withLogger } from '../../shared/logger.js';
import { listCoaches } from "./index.js";

// No payload 2.0 do HTTP API não existe multiValueQueryStringParameters: valores
// repetidos da mesma chave chegam unidos por vírgula em queryStringParameters.
// Mantemos o fallback para multiValue (payload 1.0 / serverless-offline).
function parseSpecialties(qs, multiQs) {
  if (Array.isArray(multiQs["specialties[]"])) return multiQs["specialties[]"];

  const raw = qs["specialties[]"] ?? qs.specialties;
  if (!raw) return [];

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const _handler = async (event) => {
  const qs      = event.queryStringParameters || {};
  const multiQs = event.multiValueQueryStringParameters || {};

  const lastKey = qs.lastKey ? JSON.parse(qs.lastKey) : null;

  const params = {
    q:           qs.q ?? null,
    specialties: parseSpecialties(qs, multiQs),
    limit:       parseInt(qs.limit ?? "12"),
    lastKey,
  };

  try {
    const result = await listCoaches(params);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("[handler] erro inesperado:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Erro interno" }),
    };
  }
};export const handler = withLogger(_handler);
