import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../update-coach/repository.js', () => ({
  findCoachById:      vi.fn(),
  persistCoachUpdate: vi.fn(),
}));

vi.mock('../get-coach/repository.js', () => ({
  findCoachById: vi.fn(),
}));

import { handler } from '../update-coach/handler.js';
import { updateCoachProfile } from '../update-coach/index.js';
import { updateCoachInputSchema } from '../update-coach/schema.js';
import { findCoachById, persistCoachUpdate } from '../update-coach/repository.js';
import { findCoachById as findCoachForGet } from '../get-coach/repository.js';
import { ValidationException, NotFoundException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const COACH_ID = 'coach-uuid-123';

const currentCoach = {
  coachId: COACH_ID,
  email: 'coach@mail.com',
  status: 'PENDING_PROFILE',
  profile: { name: 'João' },
  work_location: [],
};

/** Payload aninhado que o front-end envia via buildCoachUpdatePayload() */
const validBody = {
  profile: {
    name:        'João Silva',
    phone:       '11999999999',
    instagram:   '@joao',
    cref:        '123456-G/SP',
    specialties: ['Musculação'],
  },
  work_location: [{ type: 'GYM', gymId: 'gym-1' }],
};

const buildAuthEvent = (body = validBody) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
  body: JSON.stringify(body),
});

const updatedCoachRecord = {
  ...currentCoach,
  status: 'APPROVED',
  profile: {
    name:        'João Silva',
    phone:       '11999999999',
    specialties: ['Musculação'],
    cref:        'CREF 123456-G/SP',
    instagram:   '@joao',
  },
  work_location: [{ type: 'GYM', gymId: 'gym-1' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

// ─── Schema ──────────────────────────────────────────────────────────────────
describe('update-coach › schema (payload aninhado do front-end)', () => {
  it('aceita payload nested válido com GYM', () => {
    const { error } = updateCoachInputSchema.validate(validBody);
    expect(error).toBeUndefined();
  });

  it('aceita work_location com HOME_SERVICE', () => {
    const homeBody = {
      ...validBody,
      work_location: [
        {
          type: 'HOME_SERVICE',
          coverage: { city: 'São Paulo', state: 'SP', neighborhoods: ['Pinheiros'] },
        },
      ],
    };
    const { error } = updateCoachInputSchema.validate(homeBody);
    expect(error).toBeUndefined();
  });

  it('aceita work_location vazio (padrão)', () => {
    const { error } = updateCoachInputSchema.validate({ ...validBody, work_location: [] });
    expect(error).toBeUndefined();
  });

  it('aceita photo_key e video_key (keys do S3)', () => {
    const body = {
      ...validBody,
      profile: { ...validBody.profile, photo_key: 'uploads/abc-foto.jpg', video_key: 'uploads/def-video.mp4' },
    };
    const { error, value } = updateCoachInputSchema.validate(body);
    expect(error).toBeUndefined();
    expect(value.profile.photo_key).toBe('uploads/abc-foto.jpg');
    expect(value.profile.video_key).toBe('uploads/def-video.mp4');
  });

  it('aceita photo_key/video_key nulos ou vazios (limpar mídia)', () => {
    const body = {
      ...validBody,
      profile: { ...validBody.profile, photo_key: null, video_key: '' },
    };
    const { error } = updateCoachInputSchema.validate(body);
    expect(error).toBeUndefined();
  });

  it('usa [] como padrão para work_location ausente', () => {
    const { value } = updateCoachInputSchema.validate({ profile: validBody.profile });
    expect(value.work_location).toEqual([]);
  });

  it('rejeita profile.specialties vazio', () => {
    const { error } = updateCoachInputSchema.validate({
      ...validBody,
      profile: { ...validBody.profile, specialties: [] },
    });
    expect(error?.details[0].path).toEqual(['profile', 'specialties']);
  });

  it('rejeita profile ausente', () => {
    const { error } = updateCoachInputSchema.validate({ work_location: [] });
    expect(error?.details[0].path).toEqual(['profile']);
  });

  it('rejeita profile.name ausente', () => {
    const { error } = updateCoachInputSchema.validate({
      profile: { ...validBody.profile, name: undefined },
    });
    expect(error?.details[0].path).toContain('name');
  });
});

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('update-coach › index (updateCoachProfile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCoachById.mockResolvedValue(currentCoach);
    persistCoachUpdate.mockResolvedValue(undefined);
  });

  it('adiciona prefixo "CREF " ao cref sem prefixo', async () => {
    await updateCoachProfile(COACH_ID, validBody);
    const { profile } = persistCoachUpdate.mock.calls[0][1];
    expect(profile.cref).toBe('CREF 123456-G/SP');
  });

  it('não duplica "CREF " quando já presente', async () => {
    const body = { ...validBody, profile: { ...validBody.profile, cref: 'CREF 123456-G/SP' } };
    await updateCoachProfile(COACH_ID, body);
    const { profile } = persistCoachUpdate.mock.calls[0][1];
    expect(profile.cref).toBe('CREF 123456-G/SP');
  });

  it('adiciona "@" ao instagram sem prefixo', async () => {
    const body = { ...validBody, profile: { ...validBody.profile, instagram: 'joao' } };
    await updateCoachProfile(COACH_ID, body);
    const { profile } = persistCoachUpdate.mock.calls[0][1];
    expect(profile.instagram).toBe('@joao');
  });

  it('não duplica "@" quando já presente', async () => {
    await updateCoachProfile(COACH_ID, validBody);
    const { profile } = persistCoachUpdate.mock.calls[0][1];
    expect(profile.instagram).toBe('@joao');
  });

  it('passa work_location diretamente ao repositório', async () => {
    await updateCoachProfile(COACH_ID, validBody);
    const { work_location } = persistCoachUpdate.mock.calls[0][1];
    expect(work_location).toEqual([{ type: 'GYM', gymId: 'gym-1' }]);
  });

  it('persiste photo_key/video_key quando enviados', async () => {
    const body = {
      ...validBody,
      profile: { ...validBody.profile, photo_key: 'uploads/foto.jpg', video_key: 'uploads/video.mp4' },
    };
    await updateCoachProfile(COACH_ID, body);
    const { profile } = persistCoachUpdate.mock.calls[0][1];
    expect(profile.photo_key).toBe('uploads/foto.jpg');
    expect(profile.video_key).toBe('uploads/video.mp4');
  });

  it('preserva keys atuais quando o payload não as reenvia', async () => {
    findCoachById.mockResolvedValue({
      ...currentCoach,
      profile: { ...currentCoach.profile, photo_key: 'uploads/atual.jpg', video_key: 'uploads/atual.mp4' },
    });
    await updateCoachProfile(COACH_ID, validBody);
    const { profile } = persistCoachUpdate.mock.calls[0][1];
    expect(profile.photo_key).toBe('uploads/atual.jpg');
    expect(profile.video_key).toBe('uploads/atual.mp4');
  });

  it('limpa a mídia quando a key vem vazia/null', async () => {
    findCoachById.mockResolvedValue({
      ...currentCoach,
      profile: { ...currentCoach.profile, photo_key: 'uploads/atual.jpg' },
    });
    const body = { ...validBody, profile: { ...validBody.profile, photo_key: '' } };
    await updateCoachProfile(COACH_ID, body);
    const { profile } = persistCoachUpdate.mock.calls[0][1];
    expect(profile.photo_key).toBeNull();
  });

  it('ativa o coach (status APPROVED) ao persistir o perfil', async () => {
    await updateCoachProfile(COACH_ID, validBody);
    expect(persistCoachUpdate).toHaveBeenCalledTimes(1);
    const [persistedId] = persistCoachUpdate.mock.calls[0];
    expect(persistedId).toBe(COACH_ID);
  });

  it('lança NotFoundException quando coach não existe', async () => {
    findCoachById.mockResolvedValue(null);
    await expect(updateCoachProfile(COACH_ID, validBody)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lança ValidationException com payload inválido', async () => {
    await expect(updateCoachProfile(COACH_ID, {})).rejects.toBeInstanceOf(ValidationException);
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('update-coach › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCoachById.mockResolvedValue(currentCoach);
    persistCoachUpdate.mockResolvedValue(undefined);
    findCoachForGet.mockResolvedValue(updatedCoachRecord);
  });

  it('retorna 200 com shape Coach aninhado atualizado', async () => {
    const response = await handler(buildAuthEvent());
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.coachId).toBe(COACH_ID);
    expect(body.profile).toMatchObject({ name: 'João Silva', cref: 'CREF 123456-G/SP' });
    expect(body.work_location).toEqual([{ type: 'GYM', gymId: 'gym-1' }]);
  });

  it('aceita body já como objeto (não string)', async () => {
    const event = { ...buildAuthEvent(), body: validBody };
    const response = await handler(event);
    expect(response.statusCode).toBe(200);
  });

  it('retorna 400 com body JSON malformado', async () => {
    const event = {
      requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
      body: 'not-json',
    };
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(persistCoachUpdate).not.toHaveBeenCalled();
  });

  it('retorna 401 quando sub está ausente', async () => {
    const response = await handler({ body: JSON.stringify(validBody) });
    expect(response.statusCode).toBe(401);
    expect(persistCoachUpdate).not.toHaveBeenCalled();
  });

  it('retorna 404 quando coach não existe', async () => {
    findCoachById.mockResolvedValue(null);
    const response = await handler(buildAuthEvent());
    expect(response.statusCode).toBe(404);
  });

  it('retorna 422 com payload inválido (profile ausente)', async () => {
    const response = await handler(buildAuthEvent({ work_location: [] }));
    expect(response.statusCode).toBe(422);
    const body = JSON.parse(response.body);
    expect(body.details).toBeDefined();
  });

  it('propaga erros inesperados', async () => {
    persistCoachUpdate.mockRejectedValue(new Error('Falha crítica'));
    await expect(handler(buildAuthEvent())).rejects.toThrow('Falha crítica');
  });
});
