import {
  ChatValidationError,
  ForbiddenError,
  NotFoundError,
} from "./errors.js";

/** Resposta no formato Lambda proxy (httpApi). */
export const ok = (payload, statusCode = 200) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});

export const fail = (statusCode, message) => ok({ error: message }, statusCode);

/** Extrai o usuário autenticado das claims do Cognito (cognitoAuthorizer). */
export const getUser = (event) => {
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    name: claims.name ?? claims.email ?? claims.sub,
    email: claims.email,
  };
};

/** Faz o parse seguro do corpo JSON da requisição. */
export const parseBody = (event) => {
  if (!event?.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw new ChatValidationError("JSON inválido no corpo da requisição");
  }
};

/**
 * Envolve um handler com autenticação e mapeamento de erros -> status HTTP.
 * O handler recebe (event, user) e retorna o payload (objeto) ou uma resposta pronta.
 */
export const handle = (fn) => async (event) => {
  try {
    const user = getUser(event);
    if (!user) return fail(401, "Não autenticado");

    const result = await fn(event, user);
    // Se o handler já devolveu uma resposta Lambda, repassa; senão envelopa.
    if (result && typeof result.statusCode === "number") return result;
    return ok(result);
  } catch (err) {
    if (err instanceof ChatValidationError) return fail(400, err.message);
    if (err instanceof ForbiddenError) return fail(403, err.message);
    if (err instanceof NotFoundError) return fail(404, err.message);
    console.error("Erro no módulo de chat:", err);
    return fail(500, "Erro interno no chat");
  }
};
