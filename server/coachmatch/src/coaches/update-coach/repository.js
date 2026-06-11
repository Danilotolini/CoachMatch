import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'coaches';

/**
 * Lê o coach do DynamoDB para validação de pré-condições antes da atualização.
 * @param {string} coachId
 * @returns {object|null}
 */
export const findCoachById = async (coachId) => {
  const docClient = createClient();
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { coachId } })
  );
  return result.Item ?? null;
};

/**
 * Persiste o perfil atualizado do coach no DynamoDB.
 * @param {string} coachId
 * @param {object} payload - { profile, work_location, status }
 */
export const persistCoachUpdate = async (coachId, { profile, work_location, status }) => {
  const docClient = createClient();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { coachId },
      UpdateExpression:
        'SET #profile = :profile, #work_location = :work_location, #status = :status',
      ExpressionAttributeNames: {
        '#profile':       'profile',
        '#work_location': 'work_location',
        '#status':        'status',
      },
      ExpressionAttributeValues: {
        ':profile':       profile,
        ':work_location': work_location,
        ':status':        status,
      },
    })
  );
};
