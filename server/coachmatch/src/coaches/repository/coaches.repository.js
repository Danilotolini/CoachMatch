import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'coaches';

export const insertCoach = async (item) => {
  const docClient = createClient();
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
};

export const findCoachById = async (coachId) => {
  const docClient = createClient();
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { coachId } })
  );
  return result.Item ?? null;
};

export const updateCoach = async (coachId, { profile, work_location, status }) => {
  const docClient = createClient();
  const hasStatus = status !== undefined;

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { coachId },
      UpdateExpression: `SET #profile = :profile, #work_location = :work_location${hasStatus ? ', #status = :status' : ''}`,
      ExpressionAttributeNames: {
        '#profile': 'profile',
        '#work_location': 'work_location',
        ...(hasStatus && { '#status': 'status' }),
      },
      ExpressionAttributeValues: {
        ':profile': profile,
        ':work_location': work_location,
        ...(hasStatus && { ':status': status }),
      },
    })
  );
};
