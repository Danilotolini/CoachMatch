import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cliente S3 compartilhado por quem assina URLs (GET aqui, POST em
 * uploads/create-upload-url).
 *
 * Força o endpoint regional (s3.<region>.amazonaws.com). Sem isso, buckets fora
 * de us-east-1 podem receber endpoint global e responder com redirect 301/307 —
 * o navegador não segue redirect num POST CORS e o upload falha.
 *
 * Em `local` as credenciais vêm das variáveis nomeadas do projeto, como em
 * `shared/config.js`. Assinar é uma operação offline, então isso basta para o
 * serverless-offline responder — sem elas o SDK cai na cadeia padrão e estoura
 * `CredentialsProviderError`. Não há S3 local: o endpoint segue o real.
 */
let client;
export const createS3Client = () => {
  if (!client) {
    const region = process.env.REGION ?? process.env.AWS_REGION ?? 'sa-east-1';
    client = new S3Client({
      region,
      endpoint: `https://s3.${region}.amazonaws.com`,
      ...(process.env.STAGE === 'local' && {
        credentials: {
          accessKeyId: process.env.ACCESS_KEY_ID,
          secretAccessKey: process.env.SECRET_ACCESS_KEY,
        },
      }),
    });
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
  return getSignedUrl(createS3Client(), command, { expiresIn });
};
