import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';
import { ScheduleInternalException } from '../shared/exceptions.js';
import { queryAll } from '../../shared/paginate.js';

const SCHEDULE_TABLE = 'schedule';
const GYMS_TABLE = 'gyms';
const SPECIALTIES_TABLE = 'specialties';
const INDEX = 'Coach_Date';

/**
 * Schedules não cancelados do coach que podem colidir com a janela pedida.
 *
 * Todo schedule que se sobreponha a [start, end) começa antes de `end`, então o
 * limite superior na sort key do GSI não descarta nenhum conflito — só evita
 * varrer a agenda inteira do coach a cada criação. A comparação é lexicográfica
 * (mesma premissa de offset consistente já adotada em `get-own-schedule` e
 * `get-availability`).
 *
 * A projeção reduz cada item ao necessário para detectar sobreposição, o que
 * mantém as páginas de 1 MB densas — mesmo assim a leitura é paginada, já que o
 * `FilterExpression` de CANCELLED só é aplicado depois do corte.
 */
export const queryCoachSchedulesForConflict = async (coachId, endDateTime) => {
  const docClient = createClient();
  try {
    return await queryAll(docClient, {
      TableName: SCHEDULE_TABLE,
      IndexName: INDEX,
      KeyConditionExpression: 'coachId = :coachId AND startDateTime < :end',
      FilterExpression: '#st <> :cancelled',
      ProjectionExpression: 'startDateTime, endDateTime',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':coachId': coachId, ':end': endDateTime, ':cancelled': 'CANCELLED' },
    });
  } catch (err) {
    throw new ScheduleInternalException(`Error checking schedule conflicts: ${err.message}`);
  }
};

export const gymExists = async (gymId) => {
  const docClient = createClient();
  try {
    const result = await docClient.send(new GetCommand({ TableName: GYMS_TABLE, Key: { gymId } }));
    return Boolean(result.Item);
  } catch (err) {
    throw new ScheduleInternalException(`Error checking gym: ${err.message}`);
  }
};

export const specialtyExists = async (specialtyId) => {
  const docClient = createClient();
  try {
    const result = await docClient.send(new GetCommand({ TableName: SPECIALTIES_TABLE, Key: { id: specialtyId } }));
    return Boolean(result.Item);
  } catch (err) {
    throw new ScheduleInternalException(`Error checking specialty: ${err.message}`);
  }
};

/**
 * Grava o schedule omitindo os atributos `null`. Gravá-los criaria entradas
 * inúteis nos GSIs esparsos (`Student_Date` só deve indexar schedules que já
 * têm `studentId`), então eles ficam só no corpo da resposta 201.
 *
 * A condição garante que a gravação seja sempre uma criação — nunca sobrescreve
 * um schedule existente caso o `scheduleId` aleatório colida.
 *
 * Limitação conhecida: a checagem de conflito e este Put não são atômicos, e
 * cada criação gera um `scheduleId` novo, então nenhuma condição de item único
 * cobre o caso. Duas criações simultâneas de horários sobrepostos ainda passam
 * pelas duas checagens e persistem. Resolver exige transação sobre um item de
 * lock por coach/janela.
 */
export const putSchedule = async (item) => {
  const docClient = createClient();
  const itemForDb = Object.fromEntries(Object.entries(item).filter(([, v]) => v !== null));
  try {
    await docClient.send(new PutCommand({
      TableName: SCHEDULE_TABLE,
      Item: itemForDb,
      ConditionExpression: 'attribute_not_exists(scheduleId)',
    }));
  } catch (err) {
    throw new ScheduleInternalException(`Failed to create schedule: ${err.message}`);
  }
};
