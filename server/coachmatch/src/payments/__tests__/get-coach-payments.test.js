import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../get-coach-payments/repository.js', () => ({
  findPaymentsByCoach: vi.fn(),
}));

import { handler } from '../get-coach-payments/handler.js';
import { findPaymentsByCoach } from '../get-coach-payments/repository.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const COACH_ID     = '223e4567-e89b-12d3-a456-426614174000';
const OUTSIDER_ID  = '999e4567-e89b-12d3-a456-426614174000';

const makeTransaction = (overrides = {}) => ({
  transactionId: 'txn_1',
  coachId:       COACH_ID,
  amount:        50000,
  status:        'approved',
  ...overrides,
});

// callerId defaults to COACH_ID — ownership always passes for the happy path
const buildEvent = (coachId = COACH_ID, callerId = COACH_ID) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: callerId } } } },
  pathParameters: { coachId },
});

// ─── Handler ─────────────────────────────────────────────────────────────────

describe('get-coach-payments › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 200 com array de transações e total', async () => {
    const transactions = [makeTransaction(), makeTransaction({ transactionId: 'txn_2' })];
    findPaymentsByCoach.mockResolvedValue(transactions);

    const res = await handler(buildEvent());
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.transactions).toEqual(transactions);
    expect(body.total).toBe(2);
  });

  it('retorna total 0 quando não há transações', async () => {
    findPaymentsByCoach.mockResolvedValue([]);

    const res = await handler(buildEvent());
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ transactions: [], total: 0 });
  });

  it('retorna 403 quando usuário não é o coach do path', async () => {
    const res = await handler(buildEvent(COACH_ID, OUTSIDER_ID));
    expect(res.statusCode).toBe(403);
    expect(findPaymentsByCoach).not.toHaveBeenCalled();
  });

  it('retorna 401 quando sub está ausente', async () => {
    const res = await handler({ requestContext: { authorizer: { jwt: { claims: {} } } }, pathParameters: { coachId: COACH_ID } });
    expect(res.statusCode).toBe(401);
    expect(findPaymentsByCoach).not.toHaveBeenCalled();
  });

  it('retorna 400 quando coachId está ausente', async () => {
    const res = await handler({
      requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
      pathParameters: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('propaga erros inesperados', async () => {
    findPaymentsByCoach.mockRejectedValue(new Error('DB error'));
    await expect(handler(buildEvent())).rejects.toThrow('DB error');
  });
});
