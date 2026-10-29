import Joi from 'joi';

export const cognitoAttributesSchema = Joi.object({
  sub: Joi.string().uuid().required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  email_verified: Joi.boolean().truthy('true').falsy('false'),
  name: Joi.string().required(),
}).unknown(true);
