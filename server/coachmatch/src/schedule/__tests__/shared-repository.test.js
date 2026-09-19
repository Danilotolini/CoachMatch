import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { getScheduleById, getStudentsProfile, getStudentsContact, getCoachName } from '../shared/repository.js';

describe('shared/repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getScheduleById retorna null quando não encontrado', async () => {
    sendMock.mockResolvedValue({});
    expect(await getScheduleById('x')).toBeNull();
  });

  it('as leituras em lote não chamam o DynamoDB sem IDs', async () => {
    expect(await getStudentsProfile([])).toEqual({});
    expect(await getStudentsContact([])).toEqual({});
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('as leituras em lote não lançam em falha do DynamoDB (logam e retornam vazio)', async () => {
    sendMock.mockRejectedValue(new Error('ThrottlingException'));
    await expect(getStudentsProfile(['student-1'])).resolves.toEqual({});
    await expect(getStudentsContact(['student-1'])).resolves.toEqual({});
  });

  it('getCoachName cai no coachId quando a leitura falha', async () => {
    sendMock.mockRejectedValue(new Error('ThrottlingException'));
    expect(await getCoachName('coach-1')).toBe('coach-1');
  });
});
