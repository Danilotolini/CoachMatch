import { describe, it, expect, vi, beforeEach } from 'vitest';

const send = vi.fn();

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send }),
}));

import { handler } from '../on-payment-succeeded/handler.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SCHEDULE_ID = 'avl_2c8f1e9b4a7d4f3a9b6c5d2e1f0a8b7c';
const STUDENT_ID = '323e4567-e89b-12d3-a456-426614174000';
const TXN_ID = 'txn_abc123';

const buildRecord = (overrides = {}, messageId = 'm1') => ({
  messageId,
  body: JSON.stringify({
    event: 'payment.succeeded',
    sessionId: SCHEDULE_ID,
    studentId: STUDENT_ID,
    transactionId: TXN_ID,
    status: 'approved',
    ...overrides,
  }),
});

const conditionalError = () => {
  const err = new Error('The conditional request failed');
  err.name = 'ConditionalCheckFailedException';
  return err;
};

describe('on-payment-succeeded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marca o schedule BOOKED como PAID', async () => {
    send.mockResolvedValueOnce({});
    const res = await handler({ Records: [buildRecord()] });

    expect(send).toHaveBeenCalledTimes(1);
    const cmd = send.mock.calls[0][0];
    expect(cmd.input.Key).toEqual({ scheduleId: SCHEDULE_ID });
    expect(cmd.input.ExpressionAttributeValues).toMatchObject({
      ':paid': 'PAID',
      ':txn': TXN_ID,
      ':booked': 'BOOKED',
      ':student': STUDENT_ID,
    });
    expect(res.batchItemFailures).toEqual([]);
  });

  it('descarta (não reprocessa) quando a condição falha', async () => {
    send.mockRejectedValueOnce(conditionalError());
    const res = await handler({ Records: [buildRecord()] });
    expect(res.batchItemFailures).toEqual([]);
  });

  it('descarta mensagem malformada sem chamar o banco', async () => {
    const res = await handler({ Records: [{ messageId: 'm1', body: 'not-json' }] });
    expect(send).not.toHaveBeenCalled();
    expect(res.batchItemFailures).toEqual([]);
  });

  it('devolve ao SQS em falha transitória', async () => {
    send.mockRejectedValueOnce(new Error('ThrottlingException'));
    const res = await handler({ Records: [buildRecord({}, 'm-throttle')] });
    expect(res.batchItemFailures).toEqual([{ itemIdentifier: 'm-throttle' }]);
  });

  it('processa lote misto (sucesso + falha transitória)', async () => {
    send
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('ThrottlingException'));
    const res = await handler({
      Records: [buildRecord({}, 'ok'), buildRecord({}, 'fail')],
    });
    expect(res.batchItemFailures).toEqual([{ itemIdentifier: 'fail' }]);
  });
});
