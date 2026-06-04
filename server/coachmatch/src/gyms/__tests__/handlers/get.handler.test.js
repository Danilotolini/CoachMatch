import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../service/gyms.service.js', () => ({
  getGyms: vi.fn(),
  suggestGym: vi.fn(),
}));

import { handler } from '../../handlers/get.handler.js';
import { getGyms } from '../../service/gyms.service.js';

const mockGyms = [
  { gymId: '1', name: 'Academia A', city: 'SP' },
  { gymId: '2', name: 'Academia B', city: 'RJ' },
];

describe('get.handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com lista de academias', async () => {
    getGyms.mockResolvedValue({ items: mockGyms, nextCursor: null });
    const result = await handler({});

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ items: mockGyms, nextCursor: null });
  });

  it('usa limit 20 por padrão quando queryStringParameters está ausente', async () => {
    getGyms.mockResolvedValue({ items: [], nextCursor: null });
    await handler({});
    expect(getGyms).toHaveBeenCalledWith({ limit: 20, cursor: undefined });
  });

  it('usa limit 20 por padrão quando queryStringParameters é null', async () => {
    getGyms.mockResolvedValue({ items: [], nextCursor: null });
    await handler({ queryStringParameters: null });
    expect(getGyms).toHaveBeenCalledWith({ limit: 20, cursor: undefined });
  });

  it('passa limit e cursor do queryStringParameters', async () => {
    getGyms.mockResolvedValue({ items: [], nextCursor: null });
    await handler({ queryStringParameters: { limit: '10', cursor: 'token-abc' } });
    expect(getGyms).toHaveBeenCalledWith({ limit: 10, cursor: 'token-abc' });
  });

  it('retorna nextCursor quando há mais páginas', async () => {
    getGyms.mockResolvedValue({ items: mockGyms, nextCursor: 'next-token' });
    const result = await handler({});
    expect(JSON.parse(result.body).nextCursor).toBe('next-token');
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
