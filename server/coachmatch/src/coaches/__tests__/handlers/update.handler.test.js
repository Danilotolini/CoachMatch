import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../service/coaches.service.js', () => ({
  getCoach: vi.fn(),
  updateCoachProfile: vi.fn(),
  createCoach: vi.fn(),
}));

import { handler } from '../../handlers/update.handler.js';
import { getCoach, updateCoachProfile } from '../../service/coaches.service.js';

const currentCoach = {
  coachId: 'coach-uuid-123',
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

const makeEvent = (body = validBody) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: 'coach-uuid-123' } } } },
  body: JSON.stringify(body),
});

describe('update.handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // getCoach: first call returns current, second call (after update) returns updated
    getCoach
      .mockResolvedValueOnce(currentCoach)
      .mockResolvedValueOnce({ ...currentCoach, status: 'PENDING_REVIEW', profile: { name: 'João Silva' } });
  });

  it('adiciona prefixo CREF ao chamar o serviço', async () => {
    await handler(makeEvent());
    const [, payload] = updateCoachProfile.mock.calls[0];
    expect(payload.profile.cref).toBe('CREF 123456-G/SP');
  });

  it('não duplica o prefixo CREF se já estiver presente', async () => {
    await handler(makeEvent({ ...validBody, cref: 'CREF 123456-G/SP' }));
    const [, payload] = updateCoachProfile.mock.calls[0];
    expect(payload.profile.cref).toBe('CREF 123456-G/SP');
  });

  it('constrói work_location corretamente para GYMS', async () => {
    await handler(makeEvent());
    const [, payload] = updateCoachProfile.mock.calls[0];
    expect(payload.work_location).toEqual([{ type: 'GYM', gymId: 'gym-1' }]);
  });

  it('constrói work_location corretamente para HOME_SERVICE', async () => {
    await handler(makeEvent({ ...validBody, territory: 'HOME_SERVICE', gyms: [], serviceRadius: 25 }));
    const [, payload] = updateCoachProfile.mock.calls[0];
    expect(payload.work_location).toEqual([{ type: 'HOME_SERVICE', serviceRadius: 25 }]);
  });

  it('transiciona status PENDING_PROFILE → PENDING_REVIEW', async () => {
    await handler(makeEvent());
    const [, , newStatus] = updateCoachProfile.mock.calls[0];
    expect(newStatus).toBe('PENDING_REVIEW');
  });

  it('não altera status de um coach já em APPROVED', async () => {
    getCoach.mockReset();
    getCoach
      .mockResolvedValueOnce({ ...currentCoach, status: 'APPROVED' })
      .mockResolvedValueOnce({ ...currentCoach, status: 'APPROVED' });

    await handler(makeEvent());
    const [, , newStatus] = updateCoachProfile.mock.calls[0];
    expect(newStatus).toBe('APPROVED');
  });

  it('retorna 200 com CoachMe atualizado', async () => {
    const result = await handler(makeEvent());
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('PENDING_REVIEW');
  });

  it('retorna 401 quando sub está ausente', async () => {
    const result = await handler({ body: '{}' });
    expect(result.statusCode).toBe(401);
    expect(updateCoachProfile).not.toHaveBeenCalled();
  });

  it('retorna 404 quando coach não existe', async () => {
    getCoach.mockReset();
    getCoach.mockResolvedValueOnce(null);
    const result = await handler(makeEvent());
    expect(result.statusCode).toBe(404);
  });

  it('aceita body já como objeto (não string)', async () => {
    await handler({ ...makeEvent(), body: validBody });
    expect(updateCoachProfile).toHaveBeenCalled();
  });
});
