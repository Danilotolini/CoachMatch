import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../service/gyms.service.js', () => ({
  suggestGym: vi.fn(),
}));

import { handler } from '../../handlers/suggest.handler.js';
import { suggestGym } from '../../service/gyms.service.js';

const validBody = {
  name: 'Academia XYZ',
  address: 'Rua A, 123',
  city: 'São Paulo',
  state: 'SP',
  neighborhood: 'Centro',
  coordinates: { lat: -23.5505, lng: -46.6333 },
};

describe('suggest.handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama suggestGym com body do evento (string)', async () => {
    await handler({ body: JSON.stringify(validBody) });
    expect(suggestGym).toHaveBeenCalledWith(validBody);
  });

  it('chama suggestGym com body do evento (objeto)', async () => {
    await handler({ body: validBody });
    expect(suggestGym).toHaveBeenCalledWith(validBody);
  });

  it('retorna 201 com mensagem de sucesso', async () => {
    const result = await handler({ body: validBody });
    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body).message).toBe('Academia sugerida com sucesso');
  });

  it('lança erro quando body está ausente', async () => {
    await expect(handler({})).rejects.toThrow('Evento inválido: body ausente');
  });

  it('lança erro quando body é null', async () => {
    await expect(handler({ body: null })).rejects.toThrow('Evento inválido: body ausente');
  });

  it('lança erro quando event é null', async () => {
    await expect(handler(null)).rejects.toThrow();
  });

  it('propaga erro do serviço', async () => {
    suggestGym.mockRejectedValue(new Error('Validação falhou'));
    await expect(handler({ body: validBody })).rejects.toThrow('Validação falhou');
  });
});
