import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createPresignedPostMock } = vi.hoisted(() => ({ createPresignedPostMock: vi.fn() }));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({})),
}));

vi.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: createPresignedPostMock,
}));

import { handler } from '../create-upload-url/handler.js';
import { createUploadUrl } from '../create-upload-url/index.js';

const FAKE_PRESIGNED = { url: 'https://bucket.s3.sa-east-1.amazonaws.com/', fields: { key: 'uploads/x', Policy: 'p', 'x-amz-signature': 's' } };

describe('create-upload-url › index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BUCKET_NAME = 'coachmatch-profile-videos-138413505977-sa-east-1-an';
    process.env.UPLOAD_EXPIRES_IN = '300';
    process.env.UPLOAD_MAX_BYTES = '209715200';
    createPresignedPostMock.mockResolvedValue(FAKE_PRESIGNED);
  });

  it('gera key com prefixo uploads/ e filename fornecido', async () => {
    const result = await createUploadUrl({ filename: 'foto.jpg', contentType: 'image/jpeg' });
    expect(result.key).toMatch(/^uploads\/.+-foto\.jpg$/);
    expect(result.expiresIn).toBe(300);
    expect(result.upload).toEqual(FAKE_PRESIGNED);
  });

  it('usa contentType default application/octet-stream quando ausente', async () => {
    await createUploadUrl({ filename: 'arquivo.bin' });
    expect(createPresignedPostMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ Fields: { 'Content-Type': 'application/octet-stream' } })
    );
  });

  it('gera filename default (uuid.bin) quando ausente', async () => {
    const result = await createUploadUrl({});
    expect(result.key).toMatch(/^uploads\/.+-.+\.bin$/);
  });

  it('inclui condição content-length-range com UPLOAD_MAX_BYTES', async () => {
    await createUploadUrl({ filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(createPresignedPostMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        Conditions: expect.arrayContaining([['content-length-range', 1, 209715200]]),
      })
    );
  });

  it('inclui condição starts-with $key uploads/', async () => {
    await createUploadUrl({ filename: 'a.jpg' });
    expect(createPresignedPostMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        Conditions: expect.arrayContaining([['starts-with', '$key', 'uploads/']]),
      })
    );
  });
});

describe('create-upload-url › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BUCKET_NAME = 'coachmatch-profile-videos-138413505977-sa-east-1-an';
    process.env.UPLOAD_EXPIRES_IN = '300';
    process.env.UPLOAD_MAX_BYTES = '209715200';
    createPresignedPostMock.mockResolvedValue(FAKE_PRESIGNED);
  });

  it('retorna 200 com upload/key/expiresIn', async () => {
    const res = await handler({ body: JSON.stringify({ filename: 'foto.png', contentType: 'image/png' }) });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.upload).toEqual(FAKE_PRESIGNED);
    expect(body.key).toMatch(/^uploads\//);
    expect(body.expiresIn).toBe(300);
  });

  it('funciona sem body (usa defaults)', async () => {
    const res = await handler({});
    expect(res.statusCode).toBe(200);
  });

  it('retorna 400 com body JSON inválido', async () => {
    const res = await handler({ body: 'not-json' });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Invalid JSON body' });
    expect(createPresignedPostMock).not.toHaveBeenCalled();
  });

  it('retorna 500 genérico quando a assinatura falha', async () => {
    createPresignedPostMock.mockRejectedValueOnce(
      Object.assign(new Error('Could not load credentials'), { name: 'CredentialsProviderError' }),
    );

    const res = await handler({ body: JSON.stringify({ filename: 'foto.png' }) });

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ message: 'Erro interno.' });
  });
});
