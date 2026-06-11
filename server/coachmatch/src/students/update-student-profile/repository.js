import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'student';

/**
 * Atualiza os dados de perfil e avança o status para ONBOARDING_HEALTH.
 * @param {string} studentId
 * @param {object} profileData - Dados validados do perfil.
 */
export const updateStudentProfile = async (studentId, profileData) => {
  const docClient = createClient();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { studentId },
      UpdateExpression: `SET
        #phone      = :phone,
        #birthDate  = :birthDate,
        #gender     = :gender,
        #cep        = :cep,
        #city       = :city,
        #state      = :state,
        #radius     = :radius,
        #goal       = :goal,
        #status     = :status`,
      ExpressionAttributeNames: {
        '#phone':     'phone',
        '#birthDate': 'birthDate',
        '#gender':    'gender',
        '#cep':       'cep',
        '#city':      'city',
        '#state':     'state',
        '#radius':    'radius',
        '#goal':      'goal',
        '#status':    'status',
      },
      ExpressionAttributeValues: {
        ':phone':     profileData.phone,
        ':birthDate': profileData.birthDate,
        ':gender':    profileData.gender,
        ':cep':       profileData.cep,
        ':city':      profileData.city,
        ':state':     profileData.state,
        ':radius':    profileData.radius,
        ':goal':      profileData.goal,
        ':status':    'ONBOARDING_HEALTH',
      },
    })
  );
};
