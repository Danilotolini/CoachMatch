import { BadRequestException } from './exceptions.js';

/**
 * Faz o parse do body JSON de uma requisição. Devolve `{}` quando o body está
 * ausente e lança 400 quando ele existe mas não é JSON válido.
 *
 * @param {object} event - evento do API Gateway.
 * @returns {object}
 * @throws {BadRequestException}
 */
export const parseJsonBody = (event) => {
  try {
    return JSON.parse(event?.body || '{}');
  } catch {
    throw new BadRequestException('Corpo da requisição não é um JSON válido.');
  }
};

/**
 * Lê os parâmetros de uma rota GET.
 *
 * Em GET o navegador manda os dados pela query string; o body JSON fica como
 * fallback para clientes que suportam corpo em GET, como o Postman — paridade
 * com as lambdas Python originais, que faziam exatamente isso (ver
 * `get-coach-schedule-from-jwt.py`, `get-schedule-requests.py`,
 * `get-coach-schedule-from-parm.py` e `get-gym-schedule-from-parm.py`).
 *
 * @param {object} event - evento do API Gateway.
 * @returns {object} parâmetros lidos da query string ou do body.
 * @throws {BadRequestException} 400 quando o body existe mas não é JSON válido.
 */
export const readParams = (event) => {
  const qs = event?.queryStringParameters;
  if (qs && Object.keys(qs).length > 0) return qs;

  return parseJsonBody(event);
};
