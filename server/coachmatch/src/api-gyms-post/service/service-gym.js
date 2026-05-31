import { validateGym } from "../validation/validation";

export const registerSuggest = async (gym) => {
    if(isGymFieldsValid(gym)){
        await insertSuggestGym(gym);
    }else{
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
  return value;
}

