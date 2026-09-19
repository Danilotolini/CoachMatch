import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';
import { ScheduleInternalException } from '../shared/exceptions.js';
import { requestsUnchanged, conditionFailureToException } from '../shared/concurrency.js';

const SCHEDULE_TABLE = 'schedule';

/**
 * Além da guarda de `requests`, exige que o schedule ainda esteja em
 * `expectedStatus` (REQUESTED): impede que uma aprovação em voo ressuscite um
 * schedule que o coach cancelou no meio do caminho.
 */
export const persistApproval = async (
  scheduleId,
  { studentId, status, requests, updatedAt, expectedRequests, expectedStatus },
) => {
  const docClient = createClient();
  const guard = requestsUnchanged(expectedRequests);
  try {
    await docClient.send(new UpdateCommand({
      TableName: SCHEDULE_TABLE,
      Key: { scheduleId },
      UpdateExpression: 'SET studentId = :studentId, #st = :status, #req = :requests, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#st': 'status', '#req': 'requests' },
      ExpressionAttributeValues: {
        ':studentId': studentId,
        ':status': status,
        ':requests': requests,
        ':updatedAt': updatedAt,
        ':expectedStatus': expectedStatus,
        ...guard.values,
      },
      ConditionExpression: `attribute_exists(scheduleId) AND #st = :expectedStatus AND (${guard.condition})`,
      ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw conditionFailureToException(scheduleId, err);
    }
    throw new ScheduleInternalException(`Error updating schedule: ${err.message}`);
  }
};
