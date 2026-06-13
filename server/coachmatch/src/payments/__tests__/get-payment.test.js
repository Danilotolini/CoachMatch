import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../get-payment/repository.js', () => ({
  findPaymentById: vi.fn(),
}));

import { handler } from '../get-payment/handler.js';
import { findPaymentById } from '../get-payment/repository.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CALLER_ID     = '323e4567-e89b-12d3-a456-426614174000';
const TRANSACTION_ID = 'txn_abc123';

const transaction = {
  PK: `TRANSACTION#${TRANSACTION_ID}`,
  SK: 'METADATA',
  transactionId: TRANSACTION_ID,
  status: 'approved',
  amount: 50000,
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

  it('retorna 200 com a transação quando encontrada', async () => {
    const res = await handler(buildEvent());
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(transaction);
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

  it('propaga erros inesperados', async () => {
    findPaymentById.mockRejectedValue(new Error('DB error'));
    await expect(handler(buildEvent())).rejects.toThrow('DB error');
  });
});
