import Joi from 'joi';

/**
 * Schema de validação para sugestão de nova academia.
 */
export const gymSchema = Joi.object({
  name:         Joi.string().required(),
  address:      Joi.string().required(),
  city:         Joi.string().required(),
  state:        Joi.string().length(2).uppercase().required(),
  neighborhood: Joi.string().required(),
  coordinates:  Joi.valid(null).default(null),
});
