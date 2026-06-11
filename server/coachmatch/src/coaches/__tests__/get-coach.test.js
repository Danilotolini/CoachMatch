import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../get-coach/repository.js', () => ({
  findCoachById: vi.fn(),
}));

import { handler } from '../get-coach/handler.js';
import { getCoachProfile } from '../get-coach/index.js';
import { findCoachById } from '../get-coach/repository.js';
import { NotFoundException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const COACH_ID = 'coach-uuid-123';

const buildAuthEvent = (coachId = COACH_ID) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: coachId } } } },
});

const buildCoachRecord = (overrides = {}) => ({
  coachId: COACH_ID,
  email: 'coach@mail.com',
  status: 'PENDING_PROFILE',
  profile: {
    name: 'João Silva',
    phone: '11999999999',
    instagram: '@joao',
    cref: 'CREF 123456-G/SP',
    specialties: ['Musculação'],
    profile_video: false,
  },
  work_location: [{ type: 'GYM', gymId: 'gym-1' }],
  ...overrides,
});

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('get-coach › index (getCoachProfile)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna CoachMe mapeado corretamente', async () => {
    findCoachById.mockResolvedValue(buildCoachRecord());
    const result = await getCoachProfile(COACH_ID);

    expect(result.email).toBe('coach@mail.com');
    expect(result.name).toBe('João Silva');
    expect(result.territory).toBe('GYMS');
    expect(result.gyms).toEqual(['gym-1']);
  });

  it('mapeia status PENDING_PROFILE → PROFILE_INCOMPLETE', async () => {
    findCoachById.mockResolvedValue(buildCoachRecord({ status: 'PENDING_PROFILE' }));
    const result = await getCoachProfile(COACH_ID);
    expect(result.status).toBe('PROFILE_INCOMPLETE');
  });

  it('não altera status APPROVED', async () => {
    findCoachById.mockResolvedValue(buildCoachRecord({ status: 'APPROVED' }));
    const result = await getCoachProfile(COACH_ID);
    expect(result.status).toBe('APPROVED');
  });

  it('mapeia HOME_SERVICE com serviceRadius', async () => {
    findCoachById.mockResolvedValue(
      buildCoachRecord({ work_location: [{ type: 'HOME_SERVICE', serviceRadius: 30 }] })
    );
    const result = await getCoachProfile(COACH_ID);
    expect(result.territory).toBe('HOME_SERVICE');
    expect(result.serviceRadius).toBe(30);
    expect(result.gyms).toEqual([]);
  });

  it('retorna null/[] para campos ausentes no perfil', async () => {
    findCoachById.mockResolvedValue({ coachId: COACH_ID, email: 'x@x.com', status: 'PENDING_PROFILE' });
    const result = await getCoachProfile(COACH_ID);
    expect(result.name).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.territory).toBeNull();
    expect(result.specialties).toEqual([]);
  });

  it('lança NotFoundException quando coach não existe', async () => {
    findCoachById.mockResolvedValue(null);
    await expect(getCoachProfile(COACH_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('get-coach › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com CoachMe mapeado', async () => {
    findCoachById.mockResolvedValue(buildCoachRecord());
    const response = await handler(buildAuthEvent());

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.email).toBe('coach@mail.com');
    expect(body.status).toBe('PROFILE_INCOMPLETE');
  });

  it('retorna 401 quando sub está ausente', async () => {
    const response = await handler({ requestContext: { authorizer: { jwt: { claims: {} } } } });
    expect(response.statusCode).toBe(401);
    expect(findCoachById).not.toHaveBeenCalled();
  });

  it('retorna 404 quando coach não existe', async () => {
    findCoachById.mockResolvedValue(null);
    const response = await handler(buildAuthEvent());
    expect(response.statusCode).toBe(404);
  });

  it('propaga erros inesperados', async () => {
    findCoachById.mockRejectedValue(new Error('DynamoDB down'));
    await expect(handler(buildAuthEvent())).rejects.toThrow('DynamoDB down');
  });
});
