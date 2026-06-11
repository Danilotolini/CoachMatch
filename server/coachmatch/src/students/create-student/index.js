import { cognitoAttributesSchema } from './schema.js';
import { insertStudent } from './repository.js';
import { ValidationException } from '../../shared/exceptions.js';

/**
 * Cria um novo estudante a partir dos atributos do Cognito.
 * Chamado pelo trigger PostConfirmation do Cognito User Pool.
 *
 * @param {object} cognitoAttributes - Atributos do usuário recebidos do Cognito.
 */
export const createStudent = async (cognitoAttributes) => {
  const { error } = cognitoAttributesSchema.validate(cognitoAttributes);
  if (error) throw new ValidationException('Atributos do Cognito inválidos', error.details);

  await insertStudent({
    studentId: cognitoAttributes.sub,
    email: cognitoAttributes.email,
    status: 'ONBOARDING_PROFILE',
    profile: { name: cognitoAttributes.name },
  });
};
