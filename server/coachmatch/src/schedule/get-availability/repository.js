import { createClient } from '../../shared/config.js';
import { ScheduleInternalException } from '../shared/exceptions.js';
import { queryAll } from '../../shared/paginate.js';

const TABLE = 'schedule';

/**
 * Query num GSI `<chave>_Date`, filtrando status AVAILABLE/REQUESTED.
 *
 * Atenção ao `Gym_Date`: na AWS a key schema real do índice carrega um 3º
 * atributo (`coachId`) que a consulta nunca usa — ver a nota no GSI do
 * `serverless.yml`. A KeyConditionExpression reflete a forma efetivamente
 * consultada.
 */
export const queryAvailability = async ({ index, keyName, keyValue, startDateTime, endDateTime }) => {
  const docClient = createClient();
  try {
    return await queryAll(docClient, {
      TableName: TABLE,
      IndexName: index,
      KeyConditionExpression: `${keyName} = :${keyName} AND startDateTime BETWEEN :start AND :end`,
      FilterExpression: '#st IN (:available, :requested)',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        [`:${keyName}`]: keyValue,
        ':start': startDateTime,
        ':end': endDateTime,
        ':available': 'AVAILABLE',
        ':requested': 'REQUESTED',
      },
    });
  } catch (err) {
    throw new ScheduleInternalException(`Failed to query schedules: ${err.message}`);
  }
};
