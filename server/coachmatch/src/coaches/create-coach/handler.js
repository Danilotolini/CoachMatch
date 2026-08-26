import { withCognitoLogger } from '../../shared/logger.js';
import { createCoach } from './index.js';

/**
 * Handler do trigger PostConfirmation do Cognito.
 * Cria o registro do coach no DynamoDB após confirmação de e-mail.
 */
const _handler = async (event) => {
  const cognitoAttributes = event?.request?.userAttributes;

  if (!cognitoAttributes) {
    throw new Error('Evento Cognito com formato inválido: userAttributes ausente');
  }

  await createCoach(cognitoAttributes);

  return event;
};
export const handler = withCognitoLogger(_handler);
