import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../list-gyms/repository.js', () => ({
  listGyms: vi.fn(),
}));

import { handler } from '../list-gyms/handler.js';
import { listGyms } from '../list-gyms/index.js';
import { listGyms as listGymsRepository } from '../list-gyms/repository.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const rawGyms = [
  { gymId: 'gym-1', name: 'Academia A', address: 'Rua A', city: 'SP', state: 'SP', neighborhood: 'Centro',   coordinates: { lat: -23, lng: -46 } },
  { gymId: 'gym-2', name: 'Academia B', address: 'Rua B', city: 'RJ', state: 'RJ', neighborhood: 'Lapa',     coordinates: { lat: -22, lng: -43 } },
];

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('list-gyms › index (listGyms)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delega para o repositório com os parâmetros corretos', async () => {
    listGymsRepository.mockResolvedValue({ items: rawGyms, nextCursor: null });
    const result = await listGyms({ limit: 10, cursor: 'tok' });

    expect(listGymsRepository).toHaveBeenCalledWith({ limit: 10, cursor: 'tok' });
    expect(result.items).toHaveLength(2);
  });

  it('usa valores padrão quando parâmetros não são fornecidos', async () => {
    listGymsRepository.mockResolvedValue({ items: [], nextCursor: null });
    await listGyms();
    expect(listGymsRepository).toHaveBeenCalledWith({ limit: 20, cursor: undefined });
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('list-gyms › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com items onde gymId é renomeado para id', async () => {
    listGymsRepository.mockResolvedValue({ items: rawGyms, nextCursor: null });
    const response = await handler({});

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items[0].id).toBe('gym-1');
    expect(body.items[0].gymId).toBeUndefined();
    expect(body.items[1].id).toBe('gym-2');
  });

  it('inclui nextCursor na resposta', async () => {
    listGymsRepository.mockResolvedValue({ items: rawGyms, nextCursor: 'next-token' });
    const response = await handler({});
    expect(JSON.parse(response.body).nextCursor).toBe('next-token');
  });

  it('nextCursor é null quando não há próxima página', async () => {
    listGymsRepository.mockResolvedValue({ items: rawGyms, nextCursor: null });
    const response = await handler({});
    expect(JSON.parse(response.body).nextCursor).toBeNull();
  });

  it('usa limit 20 por padrão quando queryStringParameters está ausente', async () => {
    listGymsRepository.mockResolvedValue({ items: [], nextCursor: null });
    await handler({});
    expect(listGymsRepository).toHaveBeenCalledWith({ limit: 20, cursor: undefined });
  });

  it('passa limit e cursor do queryStringParameters', async () => {
    listGymsRepository.mockResolvedValue({ items: [], nextCursor: null });
    await handler({ queryStringParameters: { limit: '10', cursor: 'token-abc' } });
    expect(listGymsRepository).toHaveBeenCalledWith({ limit: 10, cursor: 'token-abc' });
  });

  it('retorna lista vazia quando não há academias', async () => {
    listGymsRepository.mockResolvedValue({ items: [], nextCursor: null });
    const response = await handler({});
    expect(JSON.parse(response.body).items).toHaveLength(0);
  });

  it('retorna 500 em erros do repositório', async () => {
    listGymsRepository.mockRejectedValue(new Error('DynamoDB indisponível'));
    const result = await handler({});
    expect(result.statusCode).toBe(500);
  });
});
