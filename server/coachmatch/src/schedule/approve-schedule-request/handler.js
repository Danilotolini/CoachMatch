import { httpHandler, jsonResponse } from '../../shared/http.js';
import { parseJsonBody } from '../shared/params.js';
import { assertRequiredFields } from '../shared/validation.js';
import { getActorIdFromJwt } from '../shared/auth.js';
import { approveScheduleRequest } from './index.js';

const REQUIRED_FIELDS = ['scheduleId', 'studentId'];

export const handler = httpHandler(async (event) => {
  const body = parseJsonBody(event);
  assertRequiredFields(body, REQUIRED_FIELDS);

  const coachId = getActorIdFromJwt(event);
  return jsonResponse(200, await approveScheduleRequest(coachId, body.scheduleId, body.studentId));
});
