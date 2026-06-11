import { cognitoAttributesSchema } from './schema.js';
import { insertCoach } from './repository.js';
import { ValidationException } from '../../shared/exceptions.js';

/**
 * Cria um novo coach a partir dos atributos do Cognito.
 * Chamado pelo trigger PostConfirmation do Cognito User Pool.
 *
 * @param {object} cognitoAttributes - Atributos do usuário recebidos do Cognito.
 */
export const createCoach = async (cognitoAttributes) => {
  const { error } = cognitoAttributesSchema.validate(cognitoAttributes);
  if (error) throw new ValidationException('Atributos do Cognito inválidos', error.details);

  await insertCoach({
    coachId: cognitoAttributes.sub,
    email: cognitoAttributes.email,
    status: 'PENDING_PROFILE',
    profile: { name: cognitoAttributes.name },
  });
};
