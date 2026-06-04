import Joi from 'joi';

export const createCoachSchema = Joi.object({
  sub: Joi.string().uuid().required(),
  email: Joi.string().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).required(),
  name: Joi.string().required(),
});

const profileSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().required(),
  specialties: Joi.array().items(Joi.string()).min(1).required(),
  cref: Joi.string().pattern(/^CREF \d{6}-[A-Z]\/[A-Z]{2}$/).required(),
  instagram: Joi.string().pattern(/^@[\w.]+$/).required(),
  profile_video: Joi.boolean().default(false),
});

const gymLocationSchema = Joi.object({
  type: Joi.string().valid('GYM').required(),
  gymId: Joi.string().required(),
});

// HOME_SERVICE usa raio em km (modelo do front-end)
const homeServiceLocationSchema = Joi.object({
  type: Joi.string().valid('HOME_SERVICE').required(),
  serviceRadius: Joi.number().integer().min(10).max(50).required(),
});

export const updateCoachSchema = Joi.object({
  profile: profileSchema.required(),
  work_location: Joi.array()
    .items(Joi.alternatives().try(gymLocationSchema, homeServiceLocationSchema))
    .min(1)
    .required(),
});
