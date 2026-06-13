import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'coaches';

/**
 * Lê o coach do DynamoDB para verificação de pré-condições.
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
 * Transiciona o status do coach para PENDING_REVIEW e atualiza o timestamp.
 * @param {string} coachId
 */
export const transitionToReview = async (coachId) => {
  const docClient = createClient();
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { coachId },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status':    'status',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':status':    'PENDING_REVIEW',
        ':updatedAt': now,
      },
    })
  );
};
