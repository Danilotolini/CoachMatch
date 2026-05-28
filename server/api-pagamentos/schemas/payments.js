const Joi = require('joi');

// ─── Reutilizáveis ────────────────────────────────────────────────────────────

const sessionId  = Joi.string().uuid().required().messages({ 'string.guid': 'sessionId deve ser um UUID válido.' });
const coachId    = Joi.string().uuid().required().messages({ 'string.guid': 'coachId deve ser um UUID válido.' });
const studentId  = Joi.string().uuid().required().messages({ 'string.guid': 'studentId deve ser um UUID válido.' });
const amount     = Joi.number().integer().min(100).required().messages({
  'number.min': 'Valor mínimo é R$ 1,00 (100 centavos).',
  'number.base': 'amount deve ser um número inteiro em centavos.',
});

// ─── Schemas principais ───────────────────────────────────────────────────────

const cardPaymentSchema = Joi.object({
  sessionId,
  coachId,
  studentId,
  amount,
  method: Joi.string().valid('credit_card').required(),
  card: Joi.object({
    number:      Joi.string().replace(/[\s-]/g, '').length(16).required().messages({ 'string.length': 'Número do cartão deve ter 16 dígitos.' }),
    holder:      Joi.string().min(3).max(100).trim().required().messages({ 'string.min': 'Nome do titular deve ter ao menos 3 caracteres.' }),
    expiryMonth: Joi.string().pattern(/^(0[1-9]|1[0-2])$/).required().messages({ 'string.pattern.base': 'Mês de vencimento inválido (01–12).' }),
    expiryYear:  Joi.string().pattern(/^\d{4}$/).required().messages({ 'string.pattern.base': 'Ano de vencimento deve ter 4 dígitos.' }),
    cvv:         Joi.string().min(3).max(4).required(),
  }).required(),
});

const pixPaymentSchema = Joi.object({
  sessionId,
  coachId,
  studentId,
  amount,
  method: Joi.string().valid('pix').required(),
});

const refundSchema = Joi.object({
  amount: Joi.number().integer().min(1).required().messages({
    'number.min': 'Valor do estorno deve ser pelo menos 1 centavo.',
  }),
  reason: Joi.string().max(255).optional(),
});

module.exports = { cardPaymentSchema, pixPaymentSchema, refundSchema };