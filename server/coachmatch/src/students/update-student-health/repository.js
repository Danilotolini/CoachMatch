import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'student';

/**
 * Persiste os dados do questionário de saúde (PAR-Q) e avança o status para ACTIVE.
 *
 * @param {string} studentId
 * @param {object} healthData - Dados validados: { answers, notes, lgpdConsent, medicalDisclaimer }
 */
export const updateStudentHealth = async (studentId, healthData) => {
  const docClient = createClient();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { studentId },
      UpdateExpression: `SET #health = :health, #status = :next`,
      ConditionExpression: 'attribute_not_exists(#status) OR #status = :current',
      ExpressionAttributeNames: {
        '#health': 'health',
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':health': {
          answers:           healthData.answers,
          notes:             healthData.notes,
          lgpdConsent:       healthData.lgpdConsent,
          medicalDisclaimer: healthData.medicalDisclaimer,
        },
        ':next':    'ACTIVE',
        ':current': 'ONBOARDING_HEALTH',
      },
    })
  );
};
