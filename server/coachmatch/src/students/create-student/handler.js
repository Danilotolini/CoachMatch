import { createStudent } from './index.js';

/**
 * Handler do trigger PostConfirmation do Cognito.
 * Cria o registro do estudante no DynamoDB após confirmação de e-mail.
 */
export const handler = async (event) => {
  const cognitoAttributes = event?.request?.userAttributes;

  if (!cognitoAttributes) {
    throw new Error('Evento Cognito com formato inválido: userAttributes ausente');
  }

  await createStudent(cognitoAttributes);

  return event;
};
