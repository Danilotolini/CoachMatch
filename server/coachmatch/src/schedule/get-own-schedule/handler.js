import { httpHandler, jsonResponse } from '../../shared/http.js';
import { readParams } from '../shared/params.js';
import { getActorIdFromJwt } from '../shared/auth.js';
import { getOwnSchedule } from './index.js';

export const handler = httpHandler(async (event) =>
  jsonResponse(200, await getOwnSchedule(getActorIdFromJwt(event), readParams(event))),
);
