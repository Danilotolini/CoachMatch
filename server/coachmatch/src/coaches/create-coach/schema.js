import Joi from 'joi';

/**
 * Atributos do usuário recebidos no trigger PostConfirmation do Cognito.
 */
export const cognitoAttributesSchema = Joi.object({
  sub: Joi.string().uuid().required(),
  email: Joi.string().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).required(),
  email_verified: Joi.boolean().truthy('true').falsy('false'),
  name: Joi.string().required(),
}).unknown(true);
