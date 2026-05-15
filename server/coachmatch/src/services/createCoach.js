import insertCoach, { findCoachById } from "../repositories/coach-repository.js";
import coachValidation from "../validation/validation-coach.js";

export const createCoach = async (coachAttributes) => {
    isCoachFieldsValid(coachAttributes);
    const coach = fromCognitoAttributesToCoach(coachAttributes)
    await insertCoach(coach);
}

const isCoachFieldsValid = (coachAttributes) => {
    const { error } = coachValidation.validate(coachAttributes);
    console.log(coachAttributes);
    if(error){
      throw new Error(`Atributos Inválidos ${error.message}`,{cause:error});
    }
}

function fromCognitoAttributesToCoach(userAttributes) {
const coachAttributes = {
     TableName:"coaches",
      Item:{
        coachId:userAttributes.sub,
        email:userAttributes.email,
        status:"PENDING_PROFILE",
        profile:{
          name:userAttributes.name
        }
      }
    }
    return coachAttributes;
}
