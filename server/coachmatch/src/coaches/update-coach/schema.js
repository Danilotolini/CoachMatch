import Joi from 'joi';

/**
 * Shape de work_location que o front-end (CoachOnboardingPage) envia:
 *   GYM:          { type: 'GYM', gymId: string }
 *   HOME_SERVICE: { type: 'HOME_SERVICE', coverage: { city, state, neighborhoods } }
 */
const workLocationGymSchema = Joi.object({
  type:  Joi.string().valid('GYM').required(),
  gymId: Joi.string().required(),
});

const workLocationHomeServiceSchema = Joi.object({
  type: Joi.string().valid('HOME_SERVICE').required(),
  coverage: Joi.object({
    city:          Joi.string().required(),
    state:         Joi.string().length(2).uppercase().required(),
    neighborhoods: Joi.array().items(Joi.string()).default([]),
  }).required(),
});

/**
 * Valida o payload enviado pelo front-end em PUT /coaches/me.
 * Corresponde ao tipo `CoachUpdatePayload` em client/src/types/api.ts:
 *   { profile?: Partial<CoachProfile>, work_location?: WorkLocation[] }
 */
export const updateCoachInputSchema = Joi.object({
  profile: Joi.object({
    // name vem do usuário autenticado no Cognito (passado pelo front)
    name:          Joi.string().required(),

    // front-end envia apenas dígitos: onlyDigits(form.phone) → "11999999999"
    phone:         Joi.string().required(),

    // front-end já adiciona "@"; o handler normaliza caso esteja ausente
    instagram:     Joi.string().allow('').default(''),

    // front-end pode ou não incluir o prefixo "CREF "; normalizado no index
    cref:          Joi.string().required(),

    specialties:   Joi.array().items(Joi.string()).min(1).required(),

    // Keys do S3 retornadas pelo upload (foto de perfil e vídeo de apresentação).
    // O GET assina e devolve photo_url/video_url; aqui só persistimos a key.
    photo_key:     Joi.string().allow(null, '').optional(),
    video_key:     Joi.string().allow(null, '').optional(),
  }).required(),

  work_location: Joi.array()
    .items(Joi.alternatives().try(workLocationGymSchema, workLocationHomeServiceSchema))
    .default([]),
});
