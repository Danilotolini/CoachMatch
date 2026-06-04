import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '../../shared/config.js';

const TABLE = 'gyms';

export const insertGym = async (gym) => {
  const docClient = createClient();
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        gymId: uuidv4(),
        name: gym.name,
        address: gym.address,
        city: gym.city,
        state: gym.state,
        neighborhood: gym.neighborhood,
        coordinates: { lat: gym.coordinates.lat, lng: gym.coordinates.lng },
      },
    })
  );
};

export const listGyms = async ({ limit = 20, cursor } = {}) => {
  const docClient = createClient();
  const params = {
    TableName: TABLE,
    Limit: limit,
    ...(cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) }),
  };

  const result = await docClient.send(new ScanCommand(params));

  return {
    items: result.Items ?? [],
    nextCursor: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null,
  };
};
