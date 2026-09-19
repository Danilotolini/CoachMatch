import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { listGyms } from '../list-gyms/repository.js';

const rawGyms = [
  { gymId: 'gym-1', name: 'Academia A', city: 'São Paulo', neighborhood: 'Centro' },
  { gymId: 'gym-2', name: 'Academia B', city: 'Rio de Janeiro', neighborhood: 'Lapa' },
];

describe('list-gyms › repository (Scan real)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('devolve todos os itens quando cabem numa página só', async () => {
    sendMock.mockResolvedValueOnce({ Items: rawGyms, LastEvaluatedKey: undefined });

    const items = await listGyms();

    expect(items).toEqual(rawGyms);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].input.TableName).toBe('gyms');
  });

  it('segue LastEvaluatedKey e agrega itens de todas as páginas', async () => {
    const lastKeyP1 = { gymId: 'gym-1' };

    sendMock.mockImplementationOnce(() =>
      Promise.resolve({ Items: [rawGyms[0]], LastEvaluatedKey: lastKeyP1 }),
    );
    sendMock.mockImplementationOnce(() =>
      Promise.resolve({ Items: [rawGyms[1]], LastEvaluatedKey: undefined }),
    );

    const items = await listGyms();

    expect(items).toEqual(rawGyms);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[1][0].input.ExclusiveStartKey).toEqual(lastKeyP1);
  });

  it('devolve array vazio quando a tabela não tem itens', async () => {
    sendMock.mockResolvedValueOnce({ Items: undefined, LastEvaluatedKey: undefined });

    const items = await listGyms();

    expect(items).toEqual([]);
  });
});
