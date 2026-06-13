import Joi from 'joi';

export const refundSchema = Joi.object({
  amount: Joi.number().integer().min(1).required()
    .messages({ 'number.min': 'Valor do estorno deve ser pelo menos 1 centavo.' }),
  reason: Joi.string().max(255).optional(),
});
