import { createCoachSchema, updateCoachSchema } from '../validation/coaches.schema.js';
import { insertCoach, findCoachById, updateCoach } from '../repository/coaches.repository.js';
import { ValidationException } from '../../shared/exceptions.js';

export const createCoach = async (cognitoAttributes) => {
  const { error } = createCoachSchema.validate(cognitoAttributes);
  if (error) throw new ValidationException('Atributos inválidos', error.details);

  await insertCoach({
    coachId: cognitoAttributes.sub,
    email: cognitoAttributes.email,
    status: 'PENDING_PROFILE',
    profile: { name: cognitoAttributes.name },
  });
};

export const getCoach = async (coachId) => {
  return findCoachById(coachId);
};

export const updateCoachProfile = async (coachId, payload, newStatus) => {
  const { error } = updateCoachSchema.validate(payload);
  if (error) throw new ValidationException('Atributos inválidos', error.details);

  await updateCoach(coachId, { ...payload, status: newStatus });
};
