import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../service/gyms.service.js', () => ({
  getGyms: vi.fn(),
  suggestGym: vi.fn(),
}));

import { handler } from '../../handlers/get.handler.js';
import { getGyms } from '../../service/gyms.service.js';

const rawGyms = [
  { gymId: 'gym-1', name: 'Academia A', city: 'SP', address: 'Rua A', state: 'SP', neighborhood: 'Centro', coordinates: { lat: -23, lng: -46 } },
  { gymId: 'gym-2', name: 'Academia B', city: 'RJ', address: 'Rua B', state: 'RJ', neighborhood: 'Lapa',   coordinates: { lat: -22, lng: -43 } },
];

describe('get.handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com items mapeados (gymId → id)', async () => {
    getGyms.mockResolvedValue({ items: rawGyms, nextCursor: null });
    const result = await handler({});

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.items[0].id).toBe('gym-1');
    expect(body.items[0].gymId).toBeUndefined();
    expect(body.items[1].id).toBe('gym-2');
  });

  it('inclui nextCursor na resposta', async () => {
    getGyms.mockResolvedValue({ items: rawGyms, nextCursor: 'next-token' });
    const result = await handler({});
    expect(JSON.parse(result.body).nextCursor).toBe('next-token');
  });

  it('usa limit 20 por padrão quando queryStringParameters está ausente', async () => {
    getGyms.mockResolvedValue({ items: [], nextCursor: null });
    await handler({});
    expect(getGyms).toHaveBeenCalledWith({ limit: 20, cursor: undefined });
  });

  it('passa limit e cursor do queryStringParameters', async () => {
    getGyms.mockResolvedValue({ items: [], nextCursor: null });
    await handler({ queryStringParameters: { limit: '10', cursor: 'token-abc' } });
    expect(getGyms).toHaveBeenCalledWith({ limit: 10, cursor: 'token-abc' });
  });

  it('retorna lista vazia quando não há academias', async () => {
    getGyms.mockResolvedValue({ items: [], nextCursor: null });
    const result = await handler({});
    expect(JSON.parse(result.body).items).toHaveLength(0);
  });

  it('propaga erro do serviço', async () => {
    getGyms.mockRejectedValue(new Error('DynamoDB indisponível'));
    await expect(handler({})).rejects.toThrow('DynamoDB indisponível');
  });
});
