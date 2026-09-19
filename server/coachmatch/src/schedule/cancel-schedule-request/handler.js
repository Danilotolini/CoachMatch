import { httpHandler, jsonResponse } from '../../shared/http.js';
import { parseJsonBody } from '../shared/params.js';
import { assertValid, SCHEDULE_ID_BODY } from '../shared/validation.js';
import { getActorIdFromJwt } from '../shared/auth.js';
import { cancelScheduleRequest } from './index.js';

/**
 * DELETE /student/coach/schedules/request
 * O `scheduleId` vem no body, não em query string, mesmo sendo um DELETE — é o
 * formato que o cliente já envia.
 */
export const handler = httpHandler(async (event) => {
  const body = parseJsonBody(event);
  assertValid(SCHEDULE_ID_BODY, body);

  const studentId = getActorIdFromJwt(event);
  return jsonResponse(200, await cancelScheduleRequest(studentId, body.scheduleId));
});
