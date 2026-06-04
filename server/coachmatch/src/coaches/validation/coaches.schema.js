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
  profile_video: Joi.boolean().required(),
});

const gymLocationSchema = Joi.object({
  type: Joi.string().valid('GYM').required(),
  gymId: Joi.string().required(),
});

const homeServiceLocationSchema = Joi.object({
  type: Joi.string().valid('HOME_SERVICE').required(),
  coverage: Joi.object({
    city: Joi.string().required(),
    state: Joi.string().length(2).uppercase().required(),
    neighborhoods: Joi.array().items(Joi.string()).min(1).required(),
  }).required(),
});

export const updateCoachSchema = Joi.object({
  profile: profileSchema.required(),
  work_location: Joi.array()
    .items(Joi.alternatives().try(gymLocationSchema, homeServiceLocationSchema))
    .min(1)
    .required(),
});
