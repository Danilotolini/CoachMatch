import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'student';

/**
 * Atualiza os dados de perfil e, condicionalmente, avança o status para
 * ONBOARDING_HEALTH apenas quando o aluno ainda está em PENDING_PROFILE.
 * Se o aluno já progrediu além desse estágio, os campos de perfil são
 * atualizados normalmente sem regredir o status.
 * @param {string} studentId
 * @param {object} profileData - Dados validados do perfil.
 */
export const updateStudentProfile = async (studentId, profileData) => {
  const docClient = createClient();

  // Sempre atualiza os campos de perfil
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { studentId },
      UpdateExpression: `SET
        #name       = :name,
        #phone      = :phone,
        #birthDate  = :birthDate,
        #gender     = :gender,
        #cep        = :cep,
        #city       = :city,
        #state      = :state,
        #radius     = :radius,
        #goal       = :goal`,
      ExpressionAttributeNames: {
        '#name':      'name',
        '#phone':     'phone',
        '#birthDate': 'birthDate',
        '#gender':    'gender',
        '#cep':       'cep',
        '#city':      'city',
        '#state':     'state',
        '#radius':    'radius',
        '#goal':      'goal',
      },
      ExpressionAttributeValues: {
        ':name':      profileData.name,
        ':phone':     profileData.phone,
        ':birthDate': profileData.birthDate,
        ':gender':    profileData.gender,
        ':cep':       profileData.cep,
        ':city':      profileData.city,
        ':state':     profileData.state,
        ':radius':    profileData.radius,
        ':goal':      profileData.goal,
      },
    })
  );

  // Avança o status para ONBOARDING_HEALTH somente se ainda estiver em PENDING_PROFILE
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { studentId },
        UpdateExpression: 'SET #status = :next',
        ConditionExpression: '#status = :current',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':next':    'ONBOARDING_HEALTH',
          ':current': 'PENDING_PROFILE',
        },
      })
    );
  } catch (err) {
    if (err.name !== 'ConditionalCheckFailedException') throw err;
    // Aluno já progrediu além de PENDING_PROFILE — status não regride
  }
};
