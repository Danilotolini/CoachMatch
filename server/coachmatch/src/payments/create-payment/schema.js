import Joi from 'joi';

// sessionId é uma referência opaca ao recurso pago (ex.: scheduleId). O payment
// é genérico e não conhece o formato de ids de outros contextos — por isso
// validamos apenas como string limitada, não como UUID.
const sessionId = Joi.string().min(1).max(128).required()
  .messages({ 'string.base': 'sessionId deve ser uma referência válida.' });

const coachId = Joi.string().uuid().required()
  .messages({ 'string.guid': 'coachId deve ser um UUID válido.' });

const amount = Joi.number().integer().min(100).required()
  .messages({
    'number.min':  'Valor mínimo é R$ 1,00 (100 centavos).',
    'number.base': 'amount deve ser um número inteiro em centavos.',
  });

export const cardPaymentSchema = Joi.object({
  sessionId,
  coachId,
  amount,
  card: Joi.object({
    number:      Joi.string().replace(/[\s-]/g, '').length(16).required()
                   .messages({ 'string.length': 'Número do cartão deve ter 16 dígitos.' }),
    holder:      Joi.string().min(3).max(100).trim().required()
                   .messages({ 'string.min': 'Nome do titular deve ter ao menos 3 caracteres.' }),
    expiryMonth: Joi.string().pattern(/^(0[1-9]|1[0-2])$/).required()
                   .messages({ 'string.pattern.base': 'Mês de vencimento inválido (01–12).' }),
    expiryYear:  Joi.string().pattern(/^\d{4}$/).required()
                   .messages({ 'string.pattern.base': 'Ano de vencimento deve ter 4 dígitos.' }),
    cvv:         Joi.string().min(3).max(4).required(),
  }).required(),
});

export const pixPaymentSchema = Joi.object({
  sessionId,
  coachId,
  amount,
});
