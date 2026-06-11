import Joi from 'joi';

/**
 * Schema que valida o payload flat enviado pelo front-end no PUT /coaches/me.
 * Corresponde ao tipo CoachUpdatePayload usado em client/src/api/coaches.ts.
 */
export const updateCoachInputSchema = Joi.object({
  name:         Joi.string().required(),
  phone:        Joi.string().required(),

  // Aceita com ou sem "@"; o handler adiciona o prefixo se ausente
  instagram:    Joi.string().required(),

  // Aceita com ou sem "CREF "; o handler adiciona o prefixo se ausente
  cref:         Joi.string().required(),

  specialties:  Joi.array().items(Joi.string()).min(1).required(),

  territory:    Joi.string().valid('GYMS', 'HOME_SERVICE').required(),

  gyms:         Joi.array().items(Joi.string()).default([]),

  // serviceRadius é obrigatório quando territory === HOME_SERVICE (verificado no index)
  serviceRadius: Joi.number().integer().min(10).max(50).allow(null).default(null),

  profileVideo: Joi.boolean().default(false),
});
