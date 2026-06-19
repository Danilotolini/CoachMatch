import Joi from 'joi';

export const studentProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).required(),

  // Aceita tanto o formato do front-end "(11) 99999-9999" quanto "+5511999999999"
  phone: Joi.string()
    .pattern(/^(\(\d{2}\)\s?\d{4,5}-?\d{4}|\+55\d{11})$/)
    .required()
    .messages({ 'string.pattern.base': 'Telefone inválido. Use (11) 99999-9999 ou +5511999999999' }),

  birthDate: Joi.string()
    .isoDate()
    .required()
    .messages({ 'string.isoDate': 'Data de nascimento deve ser uma data ISO válida (YYYY-MM-DD)' }),

  // Front-end usa: 'F' | 'M' | 'NB' (não-binário) | 'NA' (prefiro não dizer)
  gender: Joi.string()
    .valid('M', 'F', 'NB', 'NA')
    .required()
    .messages({ 'any.only': 'Gênero deve ser M, F, NB ou NA' }),

  cep: Joi.string()
    .pattern(/^\d{5}-\d{3}$/)
    .required()
    .messages({ 'string.pattern.base': 'CEP deve estar no formato XXXXX-XXX' }),

  city: Joi.string().required(),

  state: Joi.string().length(2).uppercase().required(),

  radius: Joi.number().integer().min(1).max(100).required()
    .messages({ 'number.min': 'Raio mínimo é 1 km', 'number.max': 'Raio máximo é 100 km' }),

  // Front-end envia enum: WEIGHT_LOSS | HYPERTROPHY | CONDITIONING | REHAB | PERFORMANCE
  goal: Joi.string().required(),
});
