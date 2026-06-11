import Joi from 'joi';

/**
 * Atributos do usuário recebidos no trigger PostConfirmation do Cognito.
 */
export const cognitoAttributesSchema = Joi.object({
  sub: Joi.string().uuid().required(),
  email: Joi.string().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).required(),
  name: Joi.string().required(),
});
