import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const SCHEDULE_TABLE = process.env.SCHEDULE_TABLE ?? 'schedule';
const STUDENTS_TABLE = process.env.STUDENTS_TABLE ?? 'student';
const STUDENT_DATE_INDEX = 'Student_Date';

/**
 * Verifica se o coach tem ao menos uma sessão com o aluno (vínculo de treino).
 * Usa o GSI Student_Date (PK studentId) e filtra por coachId: a query lê apenas
 * as sessões daquele aluno — conjunto menor que o de um coach — sem varrer a tabela.
 *
 * O DynamoDB aplica o Limit antes do FilterExpression, então paginamos até achar
 * o vínculo ou esgotar as páginas, em vez de usar Limit.
 *
 * @param {string} coachId
 * @param {string} studentId
 * @returns {Promise<boolean>} true se houver vínculo.
 */
export async function coachHasSessionWithStudent(coachId, studentId) {
  const docClient = createClient();
  let lastKey;
  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: SCHEDULE_TABLE,
        IndexName: STUDENT_DATE_INDEX,
        KeyConditionExpression: 'studentId = :studentId',
        FilterExpression: 'coachId = :coachId',
        ExpressionAttributeValues: {
          ':studentId': studentId,
          ':coachId': coachId,
        },
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      })
    );
    if ((result.Items?.length ?? 0) > 0) return true;
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return false;
}

/**
 * Busca um estudante pelo ID.
 * @param {string} studentId
 * @returns {Promise<object|null>} Registro do estudante ou null.
 */
export async function findStudentById(studentId) {
  const docClient = createClient();
  const result = await docClient.send(
    new GetCommand({ TableName: STUDENTS_TABLE, Key: { studentId } })
  );
  return result.Item ?? null;
}
