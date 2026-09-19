import { withLogger } from './logger.js';

/**
 * Erro que já carrega a resposta HTTP: status + corpo. `httpHandler` traduz
 * qualquer `HttpError` lançado em resposta; cada módulo define o formato do
 * corpo estendendo esta classe.
 */
export class HttpError extends Error {
  constructor(statusCode, body) {
    super(typeof body === 'string' ? body : JSON.stringify(body));
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

export const DEFAULT_JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Monta a resposta do API Gateway. `headers` é mesclado sobre DEFAULT_JSON_HEADERS. */
export const jsonResponse = (statusCode, payload, headers = {}) => ({
  statusCode,
  headers: { ...DEFAULT_JSON_HEADERS, ...headers },
  body: JSON.stringify(payload),
});

/**
 * Envelopa a lógica de uma rota HTTP. `HttpError` lançado (por validação, auth
 * ou pela função de domínio) vira resposta; qualquer outro erro é logado com
 * stack e vira 500.
 *
 */
export const httpHandler = (run) =>
  withLogger(async (event, context) => {
    try {
      return await run(event, context);
    } catch (err) {
      if (err instanceof HttpError) return jsonResponse(err.statusCode, err.body);
      // Mensagem genérica: o que aconteceu fica no log com stack, não na resposta.
      console.error('[ERROR]', err);
      return jsonResponse(500, { message: 'Erro interno.' });
    }
  });
