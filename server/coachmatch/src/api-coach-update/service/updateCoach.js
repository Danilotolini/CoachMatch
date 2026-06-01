import { update } from "../repository/update.repository.js";
import { validateCoach } from "../validation/validation.js";

export const updateCoach = async (coachId,coach) => {
    if(isCoachFieldsValid(coach)){
        await update(coachId,coach);
    }else{
        throw new Error(`Atributos Inválidos ${error.message}`);
    }
}

function isCoachFieldsValid(coach) {
  const { error } = validateCoach(coach);
  if (error) {
    return false
  } else {
    return true
  }
  return value;
}
