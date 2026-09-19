import { httpHandler, jsonResponse } from '../../shared/http.js';
import { parseJsonBody } from '../shared/params.js';
import { assertValid, SCHEDULE_ID_BODY } from '../shared/validation.js';
import { getActorIdFromJwt } from '../shared/auth.js';
import { cancelSchedule } from './index.js';

export const handler = httpHandler(async (event) => {
  const body = parseJsonBody(event);
  assertValid(SCHEDULE_ID_BODY, body);

  const coachId = getActorIdFromJwt(event);
  return jsonResponse(200, await cancelSchedule(coachId, body.scheduleId));
});
