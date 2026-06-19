import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Força o endpoint regional (s3.<region>.amazonaws.com). Sem isso, buckets fora de
// us-east-1 podem receber endpoint global e responder com redirect 301/307 — mesmo
// cuidado adotado na lambda Python generate-profile-video-upload-url.
let client;
const getClient = () => {
  if (!client) {
    const region = process.env.REGION ?? process.env.AWS_REGION ?? 'sa-east-1';
    client = new S3Client({ region, endpoint: `https://s3.${region}.amazonaws.com` });
  }
  return client;
};

/**
 * Gera uma URL pré-assinada de leitura (GET) para um objeto no bucket privado.
 * Retorna null quando não há key ou quando o bucket não está configurado
 * (ex.: ambiente local sem S3), permitindo que os mapeadores sigam sem mídia.
 *
 * @param {string|null|undefined} key - Key do objeto no S3 (ex.: "uploads/uuid-foto.jpg").
 * @returns {Promise<string|null>} URL assinada de GET ou null.
 */
export const signGetUrl = async (key) => {
  const bucket = process.env.BUCKET_NAME;
  if (!key || !bucket) return null;

  const expiresIn = Number(process.env.SIGNED_URL_EXPIRES ?? 3600);
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn });
};
