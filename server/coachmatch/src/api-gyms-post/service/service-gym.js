import { insertSuggestGym } from "../repository/gymRepository.js";
import { validateGym } from "../validation/validation.js";

export const registerSuggest = async (gym) => {
    if(isGymFieldsValid(gym)){
        await insertSuggestGym(gym);
    }else{
        const { error } = validateGym(gym);
        throw new Error(`Atributos Inválidos ${error.message}`);
    }
}

function isGymFieldsValid(gym) {
  console.log("body" + gym);
  const { error } = validateGym(gym);
  console.log(error);
  if (error) {
    return false
  } else {
    return true
  }
}

