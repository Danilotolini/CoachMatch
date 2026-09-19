import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { handler } from '../list-specialties/handler.js';
import { listSpecialties } from '../list-specialties/index.js';
import { HttpError } from '../../shared/http.js';
import { scanAllSpecialties } from '../list-specialties/repository.js';

const SPECIALTIES = [
  { id: 'musculacao', label: 'Musculação' },
  { id: 'yoga', label: 'Yoga' },
  { id: 'taekwondo', label: 'Taekwondo' },
  { id: 'boxe', label: 'Boxe' },
];

describe('list-specialties › repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('agrega itens de múltiplas páginas (LastEvaluatedKey)', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [SPECIALTIES[0]], LastEvaluatedKey: { id: 'musculacao' } })
      .mockResolvedValueOnce({ Items: [SPECIALTIES[1]] });

    const items = await scanAllSpecialties();
    expect(items).toEqual([SPECIALTIES[0], SPECIALTIES[1]]);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});

describe('list-specialties › index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ Items: SPECIALTIES });
  });

  it('ordena por label (comparação de code point)', async () => {
    const result = await listSpecialties({});
    expect(result.data.map((s) => s.label)).toEqual(['Boxe', 'Musculação', 'Taekwondo', 'Yoga']);
  });

  it('filtra por search em label (case-insensitive)', async () => {
    const result = await listSpecialties({ search: 'yog' });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('yoga');
  });

  it('filtra por search em id (case-insensitive)', async () => {
    const result = await listSpecialties({ search: 'TAEK' });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('taekwondo');
  });

  it('pagina com limit e page', async () => {
    const result = await listSpecialties({ limit: '2', page: '2' });
    expect(result.data.map((s) => s.id)).toEqual(['taekwondo', 'yoga']);
    expect(result.pagination).toEqual({
      page: 2, limit: 2, total: 4, totalPages: 2, hasNext: false, hasPrev: true,
    });
  });

  it('usa defaults quando limit/page ausentes', async () => {
    const result = await listSpecialties({});
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(100);
  });

  it('lança 400 para limit não inteiro', async () => {
    await expect(listSpecialties({ limit: 'abc' })).rejects.toThrow(HttpError);
  });

  it('lança 400 para page não inteiro', async () => {
    await expect(listSpecialties({ page: '1.5' })).rejects.toThrow(HttpError);
  });

  it('clampa limit acima do máximo (100)', async () => {
    const result = await listSpecialties({ limit: '500' });
    expect(result.pagination.limit).toBe(100);
  });
});

describe('list-specialties › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ Items: SPECIALTIES });
  });

  it('retorna 200 com data e pagination', async () => {
    const res = await handler({ queryStringParameters: null });
    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('public, max-age=3600');
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(4);
    expect(body.pagination.total).toBe(4);
  });

  it('retorna 400 quando limit não é inteiro', async () => {
    const res = await handler({ queryStringParameters: { limit: 'abc' } });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: "Os parâmetros 'limit' e 'page' devem ser inteiros." });
  });

  it('retorna 500 em erro inesperado do repository', async () => {
    sendMock.mockRejectedValue(new Error('ThrottlingException'));
    const res = await handler({ queryStringParameters: null });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ message: 'Erro interno.' });
  });
});
