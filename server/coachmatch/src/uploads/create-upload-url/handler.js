import { httpHandler, jsonResponse, HttpError } from '../../shared/http.js';
import { createUploadUrl } from './index.js';

/**
 * POST /coach/upload-url, POST /student/upload-url
 * Gera URL pré-assinada para upload direto no S3 (foto/vídeo de perfil).
 */
export const handler = httpHandler(async (event) => {
  let body;
  try {
    body = JSON.parse(event?.body || '{}');
  } catch {
    throw new HttpError(400, { error: 'Invalid JSON body' });
  }

  return jsonResponse(200, await createUploadUrl({ filename: body.filename, contentType: body.contentType }));
});
