import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '../../shared/config.js';

const TABLE = 'gyms';

/**
 * Persiste uma nova academia sugerida no DynamoDB, gerando o gymId automaticamente.
 * @param {object} gym - Dados da academia validados.
 */
export const insertGym = async (gym) => {
  const docClient = createClient();
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        gymId:        uuidv4(),
        name:         gym.name,
        address:      gym.address,
        city:         gym.city,
        state:        gym.state,
        neighborhood: gym.neighborhood,
        coordinates:  null,
      },
    })
  );
};
