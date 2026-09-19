import { httpHandler, jsonResponse } from '../../shared/http.js';
import { listSpecialties } from './index.js';

const CACHE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': process.env.STAGE === 'local' ? 'no-store' : 'public, max-age=3600',
};

/**
 * GET /coach/specialties, GET /student/specialties
 * Catálogo global de especialidades — mesma Lambda para os dois papéis.
 */
export const handler = httpHandler(async (event) =>
  jsonResponse(200, await listSpecialties(event?.queryStringParameters ?? {}), CACHE_HEADERS),
);
