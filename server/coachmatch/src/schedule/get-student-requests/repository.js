import { createClient } from '../../shared/config.js';
import { ScheduleInternalException } from '../shared/exceptions.js';
import { queryAll, scanAll } from '../../shared/paginate.js';

const TABLE = 'schedule';
const INDEX = 'Student_Date';

/** GSI Student_Date — cobre apenas schedules onde o aluno está BOOKED. */
export const queryBookedSchedules = async (studentId) => {
  const docClient = createClient();
  try {
    return await queryAll(docClient, {
      TableName: TABLE,
      IndexName: INDEX,
      KeyConditionExpression: 'studentId = :studentId',
      ExpressionAttributeValues: { ':studentId': studentId },
    });
  } catch (err) {
    throw new ScheduleInternalException(`Error querying schedules: ${err.message}`);
  }
};

/**
 * Scan filtrando schedules com `requests` — cobre REQUESTED/CANCELLED, que não
 * têm GSI (lista aninhada não é indexável).
 *
 * Custo conhecido: é um Scan da tabela inteira, paginado. Continua sendo O(tabela)
 * a cada chamada; o que resolveria de fato é modelar os requests numa tabela
 * própria, indexável por `studentId`.
 */
export const scanSchedulesWithRequests = async () => {
  const docClient = createClient();
  try {
    return await scanAll(docClient, {
      TableName: TABLE,
      FilterExpression: 'attribute_exists(requests)',
    });
  } catch (err) {
    throw new ScheduleInternalException(`Error scanning schedules: ${err.message}`);
  }
};
