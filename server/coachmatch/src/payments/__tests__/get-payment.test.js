import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../get-payment/repository.js', () => ({
  findPaymentById: vi.fn(),
}));

import { handler } from '../get-payment/handler.js';
import { findPaymentById } from '../get-payment/repository.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CALLER_ID      = '323e4567-e89b-12d3-a456-426614174000';
const COACH_ID       = '223e4567-e89b-12d3-a456-426614174000';
const TRANSACTION_ID = 'txn_abc123';

const transaction = {
  PK: `TRANSACTION#${TRANSACTION_ID}`,
  SK: 'METADATA',
  transactionId: TRANSACTION_ID,
  studentId: CALLER_ID,
  coachId:   COACH_ID,
  status:    'approved',
  amount:    50000,
};

const buildEvent = (transactionId = TRANSACTION_ID, callerId = CALLER_ID) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: callerId } } } },
  pathParameters: { transactionId },
});

// ─── Handler ─────────────────────────────────────────────────────────────────

describe('get-payment › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findPaymentById.mockResolvedValue(transaction);
  });

  it('retorna 200 com a transação quando o estudante é o dono', async () => {
    const res = await handler(buildEvent(TRANSACTION_ID, CALLER_ID));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(transaction);
  });

  it('retorna 200 quando o coach é o dono', async () => {
    const res = await handler(buildEvent(TRANSACTION_ID, COACH_ID));
    expect(res.statusCode).toBe(200);
  });

  it('retorna 403 quando usuário não é dono da transação', async () => {
    const res = await handler(buildEvent(TRANSACTION_ID, 'outro-usuario-id'));
    expect(res.statusCode).toBe(403);
  });

  it('retorna 404 quando transação não existe', async () => {
    findPaymentById.mockResolvedValue(null);
    const res = await handler(buildEvent());
    expect(res.statusCode).toBe(404);
  });

  it('retorna 401 quando sub está ausente', async () => {
    const res = await handler({ requestContext: { authorizer: { jwt: { claims: {} } } }, pathParameters: { transactionId: TRANSACTION_ID } });
    expect(res.statusCode).toBe(401);
    expect(findPaymentById).not.toHaveBeenCalled();
  });

  it('retorna 400 quando transactionId está ausente', async () => {
    const res = await handler({
      requestContext: { authorizer: { jwt: { claims: { sub: CALLER_ID } } } },
      pathParameters: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('retorna 500 em erros inesperados', async () => {
    findPaymentById.mockRejectedValue(new Error('DB error'));
    const result = await handler(buildEvent());
    expect(result.statusCode).toBe(500);
  });
});
