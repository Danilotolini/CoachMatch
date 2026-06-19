import { listCoaches } from "./index.js";

export const handler = async (event) => {
  const qs      = event.queryStringParameters || {};
  const multiQs = event.multiValueQueryStringParameters || {};

  const lastKey = qs.lastKey ? JSON.parse(qs.lastKey) : null;

  const params = {
    q:           qs.q ?? null,
    specialties: multiQs["specialties[]"] ?? [],
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
};