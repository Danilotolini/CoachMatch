import Joi from "joi";

const alunoValidation = Joi.object(
    {
        sub:Joi.string().uuid().required(),
        email:Joi.string().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).required(),
        name:Joi.string().required()
    }
)

export default alunoValidation