import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repository/gyms.repository.js', () => ({
  insertGym: vi.fn(),
  listGyms: vi.fn(),
}));

import { suggestGym, getGyms } from '../../service/gyms.service.js';
import { insertGym, listGyms } from '../../repository/gyms.repository.js';
import { ValidationException } from '../../../shared/exceptions.js';

const validGym = {
  name: 'Academia XYZ',
  address: 'Rua A, 123',
  city: 'São Paulo',
  state: 'SP',
  neighborhood: 'Centro',
  coordinates: { lat: -23.5505, lng: -46.6333 },
};

describe('suggestGym', () => {
  beforeEach(() => vi.clearAllMocks());

  it('insere academia válida', async () => {
    await suggestGym(validGym);
    expect(insertGym).toHaveBeenCalledWith(expect.objectContaining({ name: validGym.name }));
  });

  it('lança ValidationException quando name está ausente', async () => {
    const { name: _, ...sem } = validGym;
    await expect(suggestGym(sem)).rejects.toThrow(ValidationException);
  });

  it('lança ValidationException quando coordinates é inválido', async () => {
    await expect(suggestGym({ ...validGym, coordinates: { lat: 999, lng: 0 } }))
      .rejects.toThrow(ValidationException);
  });

  it('lança ValidationException quando estado tem mais de 2 chars', async () => {
    await expect(suggestGym({ ...validGym, state: 'SAO' })).rejects.toThrow(ValidationException);
  });

  it('não chama insertGym quando validação falha', async () => {
    await expect(suggestGym({})).rejects.toThrow();
    expect(insertGym).not.toHaveBeenCalled();
  });

  it('propaga erro do repositório', async () => {
    insertGym.mockRejectedValue(new Error('DynamoDB erro'));
    await expect(suggestGym(validGym)).rejects.toThrow('DynamoDB erro');
  });
});

describe('getGyms', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama listGyms com defaults (limit 20, sem cursor)', async () => {
    listGyms.mockResolvedValue({ items: [], nextCursor: null });
    await getGyms();
    expect(listGyms).toHaveBeenCalledWith({ limit: 20, cursor: undefined });
  });

  it('passa limit e cursor quando fornecidos', async () => {
    listGyms.mockResolvedValue({ items: [], nextCursor: null });
    await getGyms({ limit: 5, cursor: 'abc' });
    expect(listGyms).toHaveBeenCalledWith({ limit: 5, cursor: 'abc' });
  });

  it('retorna items e nextCursor do repositório', async () => {
    const mockResult = { items: [validGym], nextCursor: 'token123' };
    listGyms.mockResolvedValue(mockResult);
    const result = await getGyms();
    expect(result).toEqual(mockResult);
  });

  it('propaga erro do repositório', async () => {
    listGyms.mockRejectedValue(new Error('Scan falhou'));
    await expect(getGyms()).rejects.toThrow('Scan falhou');
  });
});
