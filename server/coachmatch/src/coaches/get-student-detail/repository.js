import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const SCHEDULE_TABLE = process.env.SCHEDULE_TABLE ?? 'schedule';
const STUDENTS_TABLE = process.env.STUDENTS_TABLE ?? 'student';
const STUDENT_DATE_INDEX = 'Student_Date';
const COACH_DATE_INDEX = 'Coach_Date';

// Espelha REQUEST_STATUS.REQUESTED do módulo de schedule, que é quem escreve o
// atributo. Duplicado de propósito: um import cruzado entre os módulos seria a
// primeira dependência desse tipo no projeto, por uma única string.
const PENDING_REQUEST_STATUS = 'REQUESTED';

/**
 * Sessão agendada com o aluno. Usa o GSI Student_Date (PK studentId) e filtra por
 * coachId: a query lê apenas as sessões daquele aluno — conjunto menor que o de
 * um coach — sem varrer a tabela.
 *
 * O DynamoDB aplica o Limit antes do FilterExpression, então paginamos até achar
 * o vínculo ou esgotar as páginas, em vez de usar Limit.
 */
async function hasBookedSession(coachId, studentId) {
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
 * Solicitação pendente do aluno em algum horário do coach.
 *
 * Enquanto a solicitação não é aprovada, o aluno existe apenas dentro de
 * `requests` — o `studentId` do topo do item, que é a PK do GSI Student_Date, só
 * é gravado na aprovação. Nenhum índice alcança `requests`, e `FilterExpression`
 * não ajuda (`contains` não opera sobre lista de mapas), então a checagem varre
 * os horários do coach e procura em memória.
 *
 * Só solicitação com status pendente cria vínculo: uma cancelada pelo aluno
 * continua no array e não deve dar acesso aos dados de saúde dele.
 *
 * ponytail: a varredura lê a partição do coach inteira no Coach_Date, e roda só
 * quando não há sessão agendada. Se pesar, materializar os solicitantes num
 * atributo `requestedBy` (set de studentId) no schedule e filtrar com `contains`.
 */
async function hasPendingRequest(coachId, studentId) {
  const docClient = createClient();
  let lastKey;
  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: SCHEDULE_TABLE,
        IndexName: COACH_DATE_INDEX,
        KeyConditionExpression: 'coachId = :coachId',
        FilterExpression: 'attribute_exists(#requests)',
        ExpressionAttributeNames: { '#requests': 'requests' },
        ExpressionAttributeValues: { ':coachId': coachId },
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      })
    );
    const found = (result.Items ?? []).some((item) =>
      (item.requests ?? []).some(
        (request) =>
          request.studentId === studentId && request.status === PENDING_REQUEST_STATUS
      )
    );
    if (found) return true;
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return false;
}

/**
 * Verifica se o coach tem vínculo com o aluno: uma sessão agendada OU uma
 * solicitação pendente. A solicitação conta porque é o coach que decide sobre
 * ela, e os dados de treino do aluno (incluindo o PAR-Q) são justamente o que
 * embasa a decisão.
 *
 * @param {string} coachId
 * @param {string} studentId
 * @returns {Promise<boolean>} true se houver vínculo.
 */
export async function coachIsLinkedToStudent(coachId, studentId) {
  return (
    (await hasBookedSession(coachId, studentId)) ||
    (await hasPendingRequest(coachId, studentId))
  );
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
