import Joi from 'joi';

export const studentHealthSchema = Joi.object({
  weight: Joi.number().positive().max(300).required()
    .messages({ 'number.max': 'Peso máximo é 300 kg' }),

  height: Joi.number().integer().min(100).max(250).required()
    .messages({ 'number.min': 'Altura mínima é 100 cm', 'number.max': 'Altura máxima é 250 cm' }),

  fitnessLevel: Joi.string()
    .valid('SEDENTARIO', 'INICIANTE', 'INTERMEDIARIO', 'AVANCADO')
    .required()
    .messages({ 'any.only': 'Nível de condicionamento inválido' }),

  healthConditions: Joi.array().items(Joi.string()).default([]),
});
