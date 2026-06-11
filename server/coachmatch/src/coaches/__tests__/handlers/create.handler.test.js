import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../service/coaches.service.js', () => ({
  createCoach: vi.fn(),
}));

import { handler } from '../../handlers/create.handler.js';
import { createCoach } from '../../service/coaches.service.js';

const validEvent = {
  request: {
    userAttributes: {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      email: 'coach@mail.com',
      name: 'João',
    },
  },
};

describe('create.handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama createCoach com os atributos do usuário', async () => {
    await handler(validEvent);
    expect(createCoach).toHaveBeenCalledWith(validEvent.request.userAttributes);
  });

  it('retorna o evento após sucesso', async () => {
    const result = await handler(validEvent);
    expect(result).toBe(validEvent);
  });

  it('lança erro quando userAttributes está ausente', async () => {
    await expect(handler({ request: {} })).rejects.toThrow('Evento com formato inválido');
  });

  it('lança erro quando event.request está ausente', async () => {
    await expect(handler({})).rejects.toThrow('Evento com formato inválido');
  });

  it('lança erro quando event é null', async () => {
    await expect(handler(null)).rejects.toThrow();
  });

  it('propaga erro do serviço', async () => {
    createCoach.mockRejectedValue(new Error('Validação falhou'));
    await expect(handler(validEvent)).rejects.toThrow('Validação falhou');
  });
});
