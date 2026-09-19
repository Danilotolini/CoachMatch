import { randomUUID } from 'crypto';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { createS3Client } from '../../shared/s3.js';

/**
 * Gera uma URL pré-assinada (presigned POST) para upload de foto/vídeo de perfil.
 * Apesar do nome histórico ("video"), aceita qualquer tipo de arquivo — o
 * Content-Type vem da requisição e o tamanho é limitado por UPLOAD_MAX_BYTES.
 * O bucket é privado: a `key` retornada é persistida no perfil (photo_key/video_key).
 *
 * @param {{ filename?: string, contentType?: string }} params
 * @returns {Promise<{ upload: { url: string, fields: object }, key: string, expiresIn: number }>}
 */
export const createUploadUrl = async ({ filename, contentType } = {}) => {
  const bucket = process.env.BUCKET_NAME;
  const expiresIn = Number(process.env.UPLOAD_EXPIRES_IN ?? 300);
  const maxBytes = Number(process.env.UPLOAD_MAX_BYTES ?? 50 * 1024 * 1024);

  const resolvedFilename = filename || `${randomUUID()}.bin`;
  const resolvedContentType = contentType || 'application/octet-stream';
  const key = `uploads/${randomUUID()}-${resolvedFilename}`;

  const upload = await createPresignedPost(createS3Client(), {
    Bucket: bucket,
    Key: key,
    Fields: { 'Content-Type': resolvedContentType },
    Conditions: [
      ['content-length-range', 1, maxBytes],
      ['starts-with', '$key', 'uploads/'],
    ],
    Expires: expiresIn,
  });

  return { upload, key, expiresIn };
};
