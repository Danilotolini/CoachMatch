import { gymSchema } from './schema.js';
import { insertGym } from './repository.js';
import { ValidationException } from '../../shared/exceptions.js';

/**
 * Valida e persiste a sugestão de uma nova academia.
 *
 * @param {object} gym - Dados da academia enviados pelo usuário.
 * @throws {ValidationException} Se os dados forem inválidos.
 */
export const suggestGym = async (gym) => {
  const { error, value } = gymSchema.validate(gym, { abortEarly: false });
  if (error) throw new ValidationException('Dados da academia inválidos', error.details);

  await insertGym(value);
};
