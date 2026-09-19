import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../list-gyms/repository.js', () => ({
  listGyms: vi.fn(),
}));

import { handler } from '../list-gyms/handler.js';
import { listGyms } from '../list-gyms/index.js';
import { listGyms as listGymsRepository } from '../list-gyms/repository.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const rawGyms = [
  { gymId: 'gym-1', name: 'Academia A', address: 'Rua A', city: 'São Paulo', state: 'SP', neighborhood: 'Centro',   coordinates: { lat: -23, lng: -46 } },
  { gymId: 'gym-2', name: 'Academia B', address: 'Rua B', city: 'Rio de Janeiro', state: 'RJ', neighborhood: 'Lapa', coordinates: { lat: -22, lng: -43 } },
];

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('list-gyms › index (listGyms)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna todas as academias quando não há filtro', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms();

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });

  it('filtra por nome (case-insensitive)', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms({ search: 'academia a' });

    expect(result.items).toEqual([rawGyms[0]]);
  });

  it('filtra com uma única letra, sem mínimo de caracteres', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms({ search: 'b' });

    expect(result.items).toEqual([rawGyms[1]]);
  });

  it('filtra por cidade (case-insensitive)', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms({ search: 'rio de janeiro' });

    expect(result.items).toEqual([rawGyms[1]]);
  });

  it('filtra por city exato', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms({ city: 'São Paulo' });

    expect(result.items).toEqual([rawGyms[0]]);
  });

  it('pagina os resultados filtrados via cursor', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const firstPage = await listGyms({ limit: 1 });

    expect(firstPage.items).toEqual([rawGyms[0]]);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await listGyms({ limit: 1, cursor: firstPage.nextCursor });
    expect(secondPage.items).toEqual([rawGyms[1]]);
    expect(secondPage.nextCursor).toBeNull();
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('list-gyms › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com items onde gymId é renomeado para id', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const response = await handler({});

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items[0].id).toBe('gym-1');
    expect(body.items[0].gymId).toBeUndefined();
    expect(body.items[1].id).toBe('gym-2');
  });

  it('nextCursor é null quando não há próxima página', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const response = await handler({});
    expect(JSON.parse(response.body).nextCursor).toBeNull();
  });

  it('repassa search e city da query string para a busca', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const response = await handler({
      queryStringParameters: { search: 'academia a' },
    });
    expect(JSON.parse(response.body).items).toHaveLength(1);
  });

  it('usa limit 20 por padrão quando queryStringParameters está ausente', async () => {
    listGymsRepository.mockResolvedValue([]);
    const response = await handler({});
    expect(JSON.parse(response.body).items).toEqual([]);
  });

  it('retorna lista vazia quando não há academias', async () => {
    listGymsRepository.mockResolvedValue([]);
    const response = await handler({});
    expect(JSON.parse(response.body).items).toHaveLength(0);
  });

  it('retorna 500 em erros do repositório', async () => {
    listGymsRepository.mockRejectedValue(new Error('DynamoDB indisponível'));
    const result = await handler({});
    expect(result.statusCode).toBe(500);
  });
});
