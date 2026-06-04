import { gymSchema } from '../validation/gyms.schema.js';
import { insertGym, listGyms } from '../repository/gyms.repository.js';
import { ValidationException } from '../../shared/exceptions.js';

export const suggestGym = async (gym) => {
  const { error } = gymSchema.validate(gym);
  if (error) throw new ValidationException('Atributos inválidos', error.details);

  await insertGym(gym);
};

export const getGyms = async ({ limit = 20, cursor } = {}) => {
  return listGyms({ limit, cursor });
};
