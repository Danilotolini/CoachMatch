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

  const names = {
    '#name':      'name',
    '#phone':     'phone',
    '#birthDate': 'birthDate',
    '#gender':    'gender',
    '#cep':       'cep',
    '#city':      'city',
    '#state':     'state',
    '#radius':    'radius',
    '#goal':      'goal',
  };
  const values = {
    ':name':      profileData.name,
    ':phone':     profileData.phone,
    ':birthDate': profileData.birthDate,
    ':gender':    profileData.gender,
    ':cep':       profileData.cep,
    ':city':      profileData.city,
    ':state':     profileData.state,
    ':radius':    profileData.radius,
    ':goal':      profileData.goal,
  };
  const sets = Object.keys(names).map((name) => `${name} = :${name.slice(1)}`);

  // photo_key só é tocado quando o campo vem no payload (string vazia/null limpa a foto).
  if (profileData.photo_key !== undefined) {
    names['#photo_key'] = 'photo_key';
    values[':photo_key'] = profileData.photo_key || null;
    sets.push('#photo_key = :photo_key');
  }

  // Sempre atualiza os campos de perfil
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { studentId },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
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
