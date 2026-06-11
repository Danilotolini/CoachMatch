import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../service/coaches.service.js', () => ({
  getCoach: vi.fn(),
  createCoach: vi.fn(),
  updateCoachProfile: vi.fn(),
}));

import { handler } from '../../handlers/get.handler.js';
import { getCoach } from '../../service/coaches.service.js';

const makeEvent = (sub = 'coach-uuid-123') => ({
  requestContext: { authorizer: { jwt: { claims: { sub } } } },
});

const storedCoach = {
  coachId: 'coach-uuid-123',
  email: 'coach@mail.com',
  status: 'PENDING_PROFILE',
  profile: {
    name: 'João',
    phone: '11999999999',
    instagram: '@joao',
    cref: 'CREF 123456-G/SP',
    specialties: ['Musculação'],
    profile_video: false,
  },
  work_location: [{ type: 'GYM', gymId: 'gym-1' }],
};

describe('get.handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com CoachMe mapeado', async () => {
    getCoach.mockResolvedValue(storedCoach);
    const result = await handler(makeEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.email).toBe('coach@mail.com');
    expect(body.name).toBe('João');
    expect(body.territory).toBe('GYMS');
    expect(body.gyms).toEqual(['gym-1']);
  });

  it('mapeia PENDING_PROFILE → PROFILE_INCOMPLETE', async () => {
    getCoach.mockResolvedValue(storedCoach);
    const result = await handler(makeEvent());
    expect(JSON.parse(result.body).status).toBe('PROFILE_INCOMPLETE');
  });

  it('mapeia HOME_SERVICE com serviceRadius', async () => {
    getCoach.mockResolvedValue({
      ...storedCoach,
      work_location: [{ type: 'HOME_SERVICE', serviceRadius: 30 }],
    });
    const result = await handler(makeEvent());
    const body = JSON.parse(result.body);
    expect(body.territory).toBe('HOME_SERVICE');
    expect(body.serviceRadius).toBe(30);
    expect(body.gyms).toEqual([]);
  });

  it('retorna null para campos de perfil ausentes', async () => {
    getCoach.mockResolvedValue({ coachId: 'x', email: 'x@x.com', status: 'PENDING_PROFILE' });
    const result = await handler(makeEvent());
    const body = JSON.parse(result.body);
    expect(body.name).toBeNull();
    expect(body.phone).toBeNull();
    expect(body.territory).toBeNull();
    expect(body.specialties).toEqual([]);
  });

  it('retorna 401 quando sub está ausente', async () => {
    const result = await handler({ requestContext: { authorizer: { jwt: { claims: {} } } } });
    expect(result.statusCode).toBe(401);
    expect(getCoach).not.toHaveBeenCalled();
  });

  it('retorna 404 quando coach não existe', async () => {
    getCoach.mockResolvedValue(null);
    const result = await handler(makeEvent());
    expect(result.statusCode).toBe(404);
  });

  it('propaga erro do serviço', async () => {
    getCoach.mockRejectedValue(new Error('DynamoDB down'));
    await expect(handler(makeEvent())).rejects.toThrow('DynamoDB down');
  });
});
