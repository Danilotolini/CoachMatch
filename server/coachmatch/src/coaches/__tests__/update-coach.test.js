import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../update-coach/repository.js', () => ({
  findCoachById:    vi.fn(),
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

const validBody = {
  name: 'João Silva',
  phone: '11999999999',
  instagram: '@joao',
  cref: '123456-G/SP',
  specialties: ['Musculação'],
  territory: 'GYMS',
  gyms: ['gym-1'],
  serviceRadius: null,
  profileVideo: false,
};

const buildAuthEvent = (body = validBody) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
  body: JSON.stringify(body),
});

const updatedCoachRecord = {
  ...currentCoach,
  status: 'PENDING_REVIEW',
  profile: {
    name: 'João Silva',
    phone: '11999999999',
    specialties: ['Musculação'],
    cref: 'CREF 123456-G/SP',
    instagram: '@joao',
    profile_video: false,
  },
  work_location: [{ type: 'GYM', gymId: 'gym-1' }],
};

// ─── Schema ──────────────────────────────────────────────────────────────────
describe('update-coach › schema (payload flat do front-end)', () => {
  it('aceita payload válido completo', () => {
    const { error } = updateCoachInputSchema.validate(validBody);
    expect(error).toBeUndefined();
  });

  it('aceita territory HOME_SERVICE com serviceRadius', () => {
    const { error } = updateCoachInputSchema.validate({
      ...validBody, territory: 'HOME_SERVICE', serviceRadius: 25,
    });
    expect(error).toBeUndefined();
  });

  it('rejeita territory inválida', () => {
    const { error } = updateCoachInputSchema.validate({ ...validBody, territory: 'OUTDOOR' });
    expect(error?.details[0].path).toContain('territory');
  });

  it('rejeita specialties vazio', () => {
    const { error } = updateCoachInputSchema.validate({ ...validBody, specialties: [] });
    expect(error?.details[0].path).toContain('specialties');
  });

  it('rejeita serviceRadius abaixo de 10', () => {
    const { error } = updateCoachInputSchema.validate({
      ...validBody, territory: 'HOME_SERVICE', serviceRadius: 5,
    });
    expect(error?.details[0].path).toContain('serviceRadius');
  });

  it('rejeita serviceRadius acima de 50', () => {
    const { error } = updateCoachInputSchema.validate({
      ...validBody, territory: 'HOME_SERVICE', serviceRadius: 55,
    });
    expect(error?.details[0].path).toContain('serviceRadius');
  });

  it('usa false como padrão para profileVideo ausente', () => {
    const { value } = updateCoachInputSchema.validate({ ...validBody, profileVideo: undefined });
    expect(value.profileVideo).toBe(false);
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

  it('não duplica prefixo "CREF " quando já presente', async () => {
    await updateCoachProfile(COACH_ID, { ...validBody, cref: 'CREF 123456-G/SP' });
    const { profile } = persistCoachUpdate.mock.calls[0][1];
    expect(profile.cref).toBe('CREF 123456-G/SP');
  });

  it('adiciona "@" ao instagram sem prefixo', async () => {
    await updateCoachProfile(COACH_ID, { ...validBody, instagram: 'joao' });
    const { profile } = persistCoachUpdate.mock.calls[0][1];
    expect(profile.instagram).toBe('@joao');
  });

  it('não duplica "@" quando já presente', async () => {
    await updateCoachProfile(COACH_ID, { ...validBody, instagram: '@joao' });
    const { profile } = persistCoachUpdate.mock.calls[0][1];
    expect(profile.instagram).toBe('@joao');
  });

  it('constrói work_location corretamente para GYMS', async () => {
    await updateCoachProfile(COACH_ID, validBody);
    const { work_location } = persistCoachUpdate.mock.calls[0][1];
    expect(work_location).toEqual([{ type: 'GYM', gymId: 'gym-1' }]);
  });

  it('constrói work_location corretamente para HOME_SERVICE', async () => {
    await updateCoachProfile(COACH_ID, {
      ...validBody, territory: 'HOME_SERVICE', gyms: [], serviceRadius: 25,
    });
    const { work_location } = persistCoachUpdate.mock.calls[0][1];
    expect(work_location).toEqual([{ type: 'HOME_SERVICE', serviceRadius: 25 }]);
  });

  it('transiciona status PENDING_PROFILE → PENDING_REVIEW', async () => {
    await updateCoachProfile(COACH_ID, validBody);
    const { status } = persistCoachUpdate.mock.calls[0][1];
    expect(status).toBe('PENDING_REVIEW');
  });

  it('não altera status APPROVED', async () => {
    findCoachById.mockResolvedValue({ ...currentCoach, status: 'APPROVED' });
    await updateCoachProfile(COACH_ID, validBody);
    const { status } = persistCoachUpdate.mock.calls[0][1];
    expect(status).toBe('APPROVED');
  });

  it('lança NotFoundException quando coach não existe', async () => {
    findCoachById.mockResolvedValue(null);
    await expect(updateCoachProfile(COACH_ID, validBody)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lança ValidationException com dados inválidos', async () => {
    await expect(updateCoachProfile(COACH_ID, { territory: 'INVALIDA' }))
      .rejects.toBeInstanceOf(ValidationException);
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

  it('retorna 200 com CoachMe atualizado', async () => {
    const response = await handler(buildAuthEvent());
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('PENDING_REVIEW');
    expect(body.gyms).toEqual(['gym-1']);
  });

  it('aceita body já como objeto (não string)', async () => {
    const event = { ...buildAuthEvent(), body: validBody };
    const response = await handler(event);
    expect(response.statusCode).toBe(200);
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

  it('retorna 422 com payload inválido', async () => {
    const response = await handler(buildAuthEvent({ territory: 'INVALIDA', specialties: [] }));
    expect(response.statusCode).toBe(422);
    const body = JSON.parse(response.body);
    expect(body.details).toBeDefined();
  });

  it('propaga erros inesperados', async () => {
    persistCoachUpdate.mockRejectedValue(new Error('Falha crítica'));
    await expect(handler(buildAuthEvent())).rejects.toThrow('Falha crítica');
  });
});
