import { httpHandler, jsonResponse } from '../../shared/http.js';
import { getActorIdFromJwt } from '../shared/auth.js';
import { getStudentRequests } from './index.js';

export const handler = httpHandler(async (event) =>
  jsonResponse(200, await getStudentRequests(getActorIdFromJwt(event))),
);
