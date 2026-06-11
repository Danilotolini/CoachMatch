import Joi from 'joi';

export const studentProfileSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+55\d{2}\d{9}$/)
    .required()
    .messages({ 'string.pattern.base': 'Telefone deve estar no formato +55DDD9XXXXXXXX' }),

  birthDate: Joi.string()
    .isoDate()
    .required()
    .messages({ 'string.isoDate': 'Data de nascimento deve ser uma data ISO válida (YYYY-MM-DD)' }),

  gender: Joi.string()
    .valid('M', 'F', 'O')
    .required()
    .messages({ 'any.only': 'Gênero deve ser M, F ou O' }),

  cep: Joi.string()
    .pattern(/^\d{5}-\d{3}$/)
    .required()
    .messages({ 'string.pattern.base': 'CEP deve estar no formato XXXXX-XXX' }),

  city: Joi.string().required(),

  state: Joi.string().length(2).uppercase().required(),

  radius: Joi.number().integer().min(1).max(100).required()
    .messages({ 'number.min': 'Raio mínimo é 1 km', 'number.max': 'Raio máximo é 100 km' }),

  goal: Joi.string().required(),
});
