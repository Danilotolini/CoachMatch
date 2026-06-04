import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../service/coaches.service.js', () => ({
  updateCoachProfile: vi.fn(),
}));

import { handler } from '../../handlers/update.handler.js';
import { updateCoachProfile } from '../../service/coaches.service.js';

const makeEvent = (overrides = {}) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: 'coach-uuid-123' } } } },
  body: JSON.stringify({
    profile: {
      name: 'João',
      phone: '11999999999',
      specialties: ['Musculação'],
      cref: 'CREF 123456-G/SP',
      instagram: '@joao',
      profile_video: false,
    },
    work_location: [{ type: 'GYM', gymId: 'gym-1' }],
  }),
  ...overrides,
});

describe('update.handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama updateCoachProfile com coachId e body', async () => {
    const event = makeEvent();
    await handler(event);

    expect(updateCoachProfile).toHaveBeenCalledWith('coach-uuid-123', JSON.parse(event.body));
  });

  it('retorna 200 com mensagem de sucesso', async () => {
    const result = await handler(makeEvent());
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Perfil atualizado');
  });

  it('retorna 401 quando sub não está no token', async () => {
    const event = makeEvent({ requestContext: { authorizer: { jwt: { claims: {} } } } });
    const result = await handler(event);
    expect(result.statusCode).toBe(401);
  });

  it('retorna 401 quando requestContext está ausente', async () => {
    const result = await handler({ body: '{}' });
    expect(result.statusCode).toBe(401);
    expect(updateCoachProfile).not.toHaveBeenCalled();
  });

  it('aceita body já como objeto (não string)', async () => {
    const body = { profile: { name: 'x' }, work_location: [] };
    await handler(makeEvent({ body }));
    expect(updateCoachProfile).toHaveBeenCalledWith('coach-uuid-123', body);
  });

  it('propaga erro do serviço', async () => {
    updateCoachProfile.mockRejectedValue(new Error('Erro interno'));
    await expect(handler(makeEvent())).rejects.toThrow('Erro interno');
  });
});
