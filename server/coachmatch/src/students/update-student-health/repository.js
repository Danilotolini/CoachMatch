import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'student';

/**
 * Persiste os dados de saúde e avança o status para ACTIVE.
 * @param {string} studentId
 * @param {object} healthData - Dados validados de saúde.
 */
export const updateStudentHealth = async (studentId, healthData) => {
  const docClient = await createClient();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { studentId },
      UpdateExpression: `SET
        #health   = :health,
        #status   = :status`,
      ExpressionAttributeNames: {
        '#health': 'health',
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':health': {
          weight:           healthData.weight,
          height:           healthData.height,
          fitnessLevel:     healthData.fitnessLevel,
          healthConditions: healthData.healthConditions,
        },
        ':status': 'ACTIVE',
      },
    })
  );
};
