import { validateGym } from "../validation/validation.js";
import { insertSuggestGym } from "../repository/gymRepository.js";

export const registerSuggest = async (gym) => {
    if(isGymFieldsValid(gym)){
        await insertSuggestGym(gym);
    }else{
        const { error } = validateGym(gym);
        throw new Error(`Atributos Inválidos ${error.message}`);
    }
}

function isGymFieldsValid(gym) {
  const { error } = validateGym(gym);
  if (error) {
    return false
  } else {
    return true
  }
}

