import { GetCommand, UpdateCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';
import { ScheduleInternalException, ScheduleNotFoundException } from './exceptions.js';
import { requestsUnchanged, conditionFailureToException } from './concurrency.js';

const SCHEDULE_TABLE = 'schedule';
const COACHES_TABLE = 'coaches';
const STUDENTS_TABLE = 'student';

export const getScheduleById = async (scheduleId) => {
  const docClient = createClient();
  try {
    const result = await docClient.send(new GetCommand({ TableName: SCHEDULE_TABLE, Key: { scheduleId } }));
    return result.Item ?? null;
  } catch (err) {
    throw new ScheduleInternalException(`Error fetching schedule: ${err.message}`);
  }
};

/** Grava apenas `status` + `updatedAt`, exigindo que o schedule ainda exista. */
export const setScheduleStatus = async (scheduleId, { status, updatedAt }) => {
  const docClient = createClient();
  try {
    await docClient.send(new UpdateCommand({
      TableName: SCHEDULE_TABLE,
      Key: { scheduleId },
      UpdateExpression: 'SET #st = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':status': status, ':updatedAt': updatedAt },
      ConditionExpression: 'attribute_exists(scheduleId)',
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw new ScheduleNotFoundException(`Agendamento '${scheduleId}' não encontrado.`);
    }
    throw new ScheduleInternalException(`Error cancelling schedule: ${err.message}`);
  }
};

/** Regrava a lista de requests e o status derivado dela, sob a guarda de concorrência. */
export const updateScheduleRequests = async (scheduleId, { requests, status, updatedAt, expectedRequests }) => {
  const docClient = createClient();
  const guard = requestsUnchanged(expectedRequests);
  try {
    await docClient.send(new UpdateCommand({
      TableName: SCHEDULE_TABLE,
      Key: { scheduleId },
      UpdateExpression: 'SET #req = :requests, #st = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#req': 'requests', '#st': 'status' },
      ExpressionAttributeValues: { ':requests': requests, ':status': status, ':updatedAt': updatedAt, ...guard.values },
      ConditionExpression: `attribute_exists(scheduleId) AND (${guard.condition})`,
      ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw conditionFailureToException(scheduleId, err);
    }
    throw new ScheduleInternalException(`Error updating schedule: ${err.message}`);
  }
};

export const getCoachById = async (coachId) => {
  const docClient = createClient();
  try {
    const result = await docClient.send(new GetCommand({ TableName: COACHES_TABLE, Key: { coachId } }));
    return result.Item ?? null;
  } catch (err) {
    throw new ScheduleInternalException(`Error fetching coach: ${err.message}`);
  }
};

/**
 * Leitura best-effort do coach: devolve `{}` em vez de lançar.
 *
 * Usada só depois que a escrita principal já foi persistida — nesse ponto uma
 * falha de leitura não pode derrubar a resposta, apenas degradar a notificação.
 */
const tryGetCoach = async (coachId) => {
  try {
    return (await getCoachById(coachId)) ?? {};
  } catch (err) {
    console.warn(`[WARN] Could not fetch coach: ${err.message}`);
    return {};
  }
};

/** Nome do coach, com o próprio id como fallback quando não há nome ou a leitura falha. */
export const getCoachName = async (coachId) => (await tryGetCoach(coachId)).name ?? coachId;

export const getCoachEmailAndName = async (coachId) => {
  const coach = await tryGetCoach(coachId);
  return { email: coach.email ?? null, name: coach.name ?? coachId };
};

/** Best-effort como `getCoachName`: o próprio id é o fallback. */
export const getStudentName = async (studentId) => {
  const docClient = createClient();
  try {
    const result = await docClient.send(new GetCommand({ TableName: STUDENTS_TABLE, Key: { studentId } }));
    return result.Item?.name ?? studentId;
  } catch (err) {
    console.warn(`[WARN] Could not fetch student: ${err.message}`);
    return studentId;
  }
};

/**
 * Best-effort como `tryGetCoach`: devolve `{}` em vez de lançar, e sem os itens
 * que o BatchGet tenha deixado de fora.
 *
 * @returns {Promise<Record<string, object>>} itens indexados por `studentId`.
 */
const batchGetStudents = async (studentIds, projection) => {
  if (!studentIds.length) return {};
  const docClient = createClient();
  try {
    const result = await docClient.send(new BatchGetCommand({
      RequestItems: { [STUDENTS_TABLE]: { Keys: studentIds.map((studentId) => ({ studentId })), ...projection } },
    }));
    const items = result.Responses?.[STUDENTS_TABLE] ?? [];
    return Object.fromEntries(items.map((item) => [item.studentId, item]));
  } catch (err) {
    console.warn(`[WARN] Could not fetch students: ${err.message}`);
    return {};
  }
};

/** Dados de contato para as notificações por e-mail. */
export const getStudentsContact = (studentIds) => batchGetStudents(studentIds, {
  ProjectionExpression: 'studentId, email, #n',
  ExpressionAttributeNames: { '#n': 'name' },
});

export const getStudentsProfile = (studentIds) => batchGetStudents(studentIds, {
  ProjectionExpression: 'studentId, profile',
});
