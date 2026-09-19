import { createClient } from '../../shared/config.js';
import { ScheduleInternalException } from '../shared/exceptions.js';
import { queryAll } from '../../shared/paginate.js';

const TABLE = 'schedule';
const INDEX = 'Coach_Date';

/** Query GSI Coach_Date: coachId eq + startDateTime between. Retorna itens completos. */
export const queryCoachSchedule = async ({ coachId, startDateTime, endDateTime }) => {
  const docClient = createClient();
  try {
    return await queryAll(docClient, {
      TableName: TABLE,
      IndexName: INDEX,
      KeyConditionExpression: 'coachId = :coachId AND startDateTime BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':coachId': coachId,
        ':start': startDateTime,
        ':end': endDateTime,
      },
    });
  } catch (err) {
    throw new ScheduleInternalException(`Failed to query schedules: ${err.message}`);
  }
};
