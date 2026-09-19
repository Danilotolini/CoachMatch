import Joi from 'joi';
import { BadRequestException } from './exceptions.js';

// Hora, segundos e offset são opcionais — mesma abrangência do
// `datetime.fromisoformat` das lambdas Python originais, que aceitava
// `2026-05-25`, `2026-05-25T07:00` e `2026-05-25T07:00:00-03:00`. Joi não
// reproduz essa tolerância (seu `.isoDate()` exige separador `T` e offset
// completo), por isso o formato de data continua validado à mão aqui.
const ISO_8601 = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const isValidIsoDateTime = (value) => {
  if (typeof value !== 'string' || !ISO_8601.test(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
};

/**
 * Valida um par (startDateTime, endDateTime) ISO 8601. Compartilhado por
 * `get-own-schedule`, `get-availability` e `create-schedule`, que devolvem as
 * mesmas mensagens de erro.
 *
 * @returns {string[]} lista de erros — vazia quando o par é válido.
 */
export const validateDateTimeRange = (startDateTime, endDateTime) => {
  const errors = [];

  const startValid = isValidIsoDateTime(startDateTime);
  if (!startValid) {
    errors.push(`'startDateTime' inválido: recebido '${startDateTime}', esperado ISO 8601 (ex.: 2026-05-25T07:00:00-03:00)`);
  }

  const endValid = isValidIsoDateTime(endDateTime);
  if (!endValid) {
    errors.push(`'endDateTime' inválido: recebido '${endDateTime}', esperado ISO 8601 (ex.: 2026-05-25T08:00:00-03:00)`);
  }

  if (startValid && endValid && new Date(startDateTime).getTime() >= new Date(endDateTime).getTime()) {
    errors.push("'startDateTime' deve ser anterior a 'endDateTime'.");
  }

  return errors;
};

/**
 * Roda um schema Joi contra `source` e devolve as mensagens de erro (vazia
 * quando válido). Sempre `abortEarly: false` — os handlers do módulo acumulam
 * todos os erros de campo num único 400, não param no primeiro.
 *
 * @returns {string[]}
 */
const validationErrors = (schema, source) => {
  const { error } = schema.validate(source ?? {}, { abortEarly: false });
  return error ? error.details.map((detail) => detail.message) : [];
};

/**
 * Roda `validationErrors` e lança 400 com todas as mensagens acumuladas quando
 * há erro. Uso nos handlers: valida e segue, sem `if (errors.length) return`.
 *
 * @throws {BadRequestException}
 */
export const assertValid = (schema, source) => {
  const errors = validationErrors(schema, source);
  if (errors.length) throw new BadRequestException(errors);
};

/**
 * Campo Joi obrigatório e não-vazio, com mensagem `Campo obrigatório ausente: '<name>'.`
 * tanto para ausência quanto para string vazia — equivalente ao antigo
 * `!body[name]` usado nos handlers de cancelamento.
 */
export const requiredStringField = (name, extraMessages = {}) =>
  Joi.string().required().messages({
    'any.required': `Campo obrigatório ausente: '${name}'.`,
    'string.empty': `Campo obrigatório ausente: '${name}'.`,
    ...extraMessages,
  });

/** Body das rotas que operam sobre um schedule já existente: só `scheduleId` importa. */
export const SCHEDULE_ID_BODY = Joi.object({ scheduleId: requiredStringField('scheduleId') }).unknown(true);

/**
 * Verifica presença das chaves obrigatórias em `source`. Checa a chave, não a
 * truthiness: uma chave ausente é "missing", uma string vazia não é — quem
 * decide o que fazer com valor vazio é a validação de formato seguinte.
 * Por isso usa `Joi.any().required()` (falha só em `undefined`), não
 * `Joi.string()` (que rejeitaria também a string vazia).
 *
 * @returns {string[]} mensagens `Campo obrigatório ausente: '<nome>'.`, na ordem de `fields`.
 */
export const missingFieldErrors = (source, fields) => validationErrors(
  Joi.object(fields.reduce((acc, field) => {
    acc[field] = Joi.any().required().messages({ 'any.required': `Campo obrigatório ausente: '${field}'.` });
    return acc;
  }, {})).unknown(true),
  source,
);

/**
 * Roda `missingFieldErrors` e lança 400 quando falta qualquer chave de `fields`
 * em `source`.
 *
 * @throws {BadRequestException}
 */
export const assertRequiredFields = (source, fields) => {
  const errors = missingFieldErrors(source, fields);
  if (errors.length) throw new BadRequestException(errors);
};
