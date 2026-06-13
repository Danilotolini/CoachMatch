import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../get-student-payments/repository.js', () => ({
  findPaymentsByStudent: vi.fn(),
}));

import { handler } from '../get-student-payments/handler.js';
import { findPaymentsByStudent } from '../get-student-payments/repository.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const STUDENT_ID = '323e4567-e89b-12d3-a456-426614174000';

const makeTransaction = (overrides = {}) => ({
  transactionId: 'txn_1',
  studentId: STUDENT_ID,
  amount: 50000,
  status: 'approved',
  ...overrides,
});

const buildEvent = (studentId = STUDENT_ID) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: studentId } } } },
  pathParameters: { studentId },
});

// ─── Handler ─────────────────────────────────────────────────────────────────

describe('get-student-payments › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 200 com array de transações e total', async () => {
    const transactions = [makeTransaction(), makeTransaction({ transactionId: 'txn_2' })];
    findPaymentsByStudent.mockResolvedValue(transactions);

    const res = await handler(buildEvent());
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.transactions).toEqual(transactions);
    expect(body.total).toBe(2);
  });

  it('retorna total 0 quando não há transações', async () => {
    findPaymentsByStudent.mockResolvedValue([]);

    const res = await handler(buildEvent());
    expect(JSON.parse(res.body)).toEqual({ transactions: [], total: 0 });
  });

  it('retorna 401 quando sub está ausente', async () => {
    const res = await handler({ requestContext: { authorizer: { jwt: { claims: {} } } }, pathParameters: { studentId: STUDENT_ID } });
    expect(res.statusCode).toBe(401);
    expect(findPaymentsByStudent).not.toHaveBeenCalled();
  });

  it('retorna 400 quando studentId está ausente', async () => {
    const res = await handler({
      requestContext: { authorizer: { jwt: { claims: { sub: STUDENT_ID } } } },
      pathParameters: {},
    });
    expect(res.statusCode).toBe(400);
  });
});
