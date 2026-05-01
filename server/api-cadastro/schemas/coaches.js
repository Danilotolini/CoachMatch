import Joi from "joi";

const coachSchema = Joi.object(
    {
        coachId:Joi.string().uuid().required(),
        email:Joi.string().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        status:Joi.string().valid('PENDING_PROFILE',"APPROVED")
    }
)

export default coachSchema