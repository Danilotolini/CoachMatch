import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import {
  getScheduleById, getStudentsProfile, getStudentsContact, getCoachName, setScheduleStatus,
} from '../shared/repository.js';
import { ScheduleConflictException, ScheduleNotFoundException } from '../shared/exceptions.js';

const conditionFailure = (Item) =>
  Object.assign(new Error('cond failed'), { name: 'ConditionalCheckFailedException', Item });

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

  it('setScheduleStatus amarra a escrita ao status lido', async () => {
    sendMock.mockResolvedValue({});
    await setScheduleStatus('avl_1', { status: 'CANCELLED', updatedAt: 'now', expectedStatus: 'BOOKED' });

    const [[command]] = sendMock.mock.calls;
    expect(command.input.ConditionExpression).toContain('#st = :expectedStatus');
    expect(command.input.ExpressionAttributeValues[':expectedStatus']).toBe('BOOKED');
  });

  // O `Item` anexado pelo ALL_OLD distingue "mudou debaixo de nós" (409) de
  // "não existe mais" (404) — a condição cobre os dois casos.
  it.each([
    ['409 quando o status mudou entre a leitura e a escrita', { status: 'CANCELLED' }, ScheduleConflictException],
    ['404 quando o schedule sumiu', undefined, ScheduleNotFoundException],
  ])('setScheduleStatus devolve %s', async (_label, oldItem, expected) => {
    sendMock.mockRejectedValue(conditionFailure(oldItem));
    await expect(setScheduleStatus('avl_1', { status: 'CANCELLED', updatedAt: 'now', expectedStatus: 'BOOKED' }))
      .rejects.toThrow(expected);
  });
});
