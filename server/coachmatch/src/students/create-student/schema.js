import Joi from 'joi';

export const cognitoAttributesSchema = Joi.object({
  sub: Joi.string().uuid().required(),
  email: Joi.string().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).required(),
  name: Joi.string().required(),
});
