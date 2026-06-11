import Joi from 'joi'

const studentSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+\d{2}\d{2}\d{9}$/)
    .required(),
  birthDate: Joi.string()
    .isoDate()
    .required(),
  gender: Joi.string()
    .valid('M', 'F', 'O')
    .required(),
  cep: Joi.string()
    .pattern(/^\d{5}-\d{3}$/)
    .required(),
  city: Joi.string().required(),
  state: Joi.string().length(2).uppercase().required(),
  radius: Joi.number().integer().min(1).required(),
  goal: Joi.string().required(),
});

export default studentSchema;