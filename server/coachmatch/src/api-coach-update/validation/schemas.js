import Joi from 'joi'

const profileSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().required(),
  specialties: Joi.array().items(Joi.string()).required(),
  cref: Joi.string()
    .pattern(/^CREF \d{6}-[A-Z]\/[A-Z]{2}$/)
    .required(),
  instagram: Joi.string()
    .pattern(/^@[\w.]+$/)
    .required(),
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

const workLocationSchema = Joi.array()
  .items(
    Joi.alternatives().try(gymLocationSchema, homeServiceLocationSchema)
  )
  .min(1)
  .required();

const coachSchema = Joi.object({
  profile: profileSchema.required(),
  work_location: workLocationSchema.required(),
});

export default coachSchema;