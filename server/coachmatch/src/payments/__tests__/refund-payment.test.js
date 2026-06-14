import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../refund-payment/repository.js', () => ({
  findPaymentById: vi.fn(),
  markAsRefunded:  vi.fn(),
}));

import { handler } from '../refund-payment/handler.js';
import { refundPayment } from '../refund-payment/index.js';
import { findPaymentById, markAsRefunded } from '../refund-payment/repository.js';
import {
  PaymentNotFoundException,
  PaymentAlreadyRefundedException,
  PaymentNotRefundableException,
  InvalidRefundAmountException,
} from '../shared/exceptions.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CALLER_ID     = '323e4567-e89b-12d3-a456-426614174000';
const TRANSACTION_ID = 'txn_abc123';

const approvedTransaction = {
  transactionId: TRANSACTION_ID,
  status: 'approved',
  amount: 50000,
};

const buildEvent = (body, transactionId = TRANSACTION_ID, callerId = CALLER_ID) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: callerId } } } },
  pathParameters: { transactionId },
  body: JSON.stringify(body),
});

// ─── Business Logic (index) ───────────────────────────────────────────────────

describe('refund-payment › index (refundPayment)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findPaymentById.mockResolvedValue(approvedTransaction);
    markAsRefunded.mockResolvedValue(undefined);
  });

  it('estorna transação aprovada com sucesso', async () => {
    const result = await refundPayment(TRANSACTION_ID, 50000, 'Pedido do cliente');
    expect(result.status).toBe('refunded');
    expect(result.amount).toBe(50000);
    expect(result.reason).toBe('Pedido do cliente');
    expect(result.refundId).toMatch(/^refund_/);
  });

  it('aceita estorno parcial', async () => {
    const result = await refundPayment(TRANSACTION_ID, 20000);
    expect(result.amount).toBe(20000);
  });

  it('aceita estorno sem reason', async () => {
    const result = await refundPayment(TRANSACTION_ID, 50000);
    expect(result.reason).toBeNull();
  });

  it('chama markAsRefunded com os dados corretos incluindo amount', async () => {
    await refundPayment(TRANSACTION_ID, 50000, 'Motivo');
    expect(markAsRefunded).toHaveBeenCalledWith(
      TRANSACTION_ID,
      expect.objectContaining({
        reason:     'Motivo',
        refundedAt: expect.any(String),
        refundId:   expect.any(String),
        amount:     50000,
      })
    );
  });

  it('lança PaymentNotFoundException quando transação não existe', async () => {
    findPaymentById.mockResolvedValue(null);
    await expect(refundPayment(TRANSACTION_ID, 50000)).rejects.toBeInstanceOf(PaymentNotFoundException);
  });

  it('lança PaymentAlreadyRefundedException quando já estornada', async () => {
    findPaymentById.mockResolvedValue({ ...approvedTransaction, status: 'refunded' });
    await expect(refundPayment(TRANSACTION_ID, 50000)).rejects.toBeInstanceOf(PaymentAlreadyRefundedException);
  });

  it('lança PaymentNotRefundableException para transação recusada', async () => {
    findPaymentById.mockResolvedValue({ ...approvedTransaction, status: 'refused' });
    await expect(refundPayment(TRANSACTION_ID, 50000)).rejects.toBeInstanceOf(PaymentNotRefundableException);
  });

  it('lança PaymentNotRefundableException para transação pendente', async () => {
    findPaymentById.mockResolvedValue({ ...approvedTransaction, status: 'pending' });
    await expect(refundPayment(TRANSACTION_ID, 50000)).rejects.toBeInstanceOf(PaymentNotRefundableException);
  });

  it('lança InvalidRefundAmountException quando valor supera o original', async () => {
    await expect(refundPayment(TRANSACTION_ID, 60000)).rejects.toBeInstanceOf(InvalidRefundAmountException);
  });

  it('lança ValidationException com amount inválido', async () => {
    await expect(refundPayment(TRANSACTION_ID, 0)).rejects.toThrow();
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────

describe('refund-payment › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findPaymentById.mockResolvedValue(approvedTransaction);
    markAsRefunded.mockResolvedValue(undefined);
  });

  it('retorna 200 com dados do estorno', async () => {
    const res = await handler(buildEvent({ amount: 50000, reason: 'Pedido do cliente' }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('refunded');
    expect(body.refundId).toMatch(/^refund_/);
  });

  it('retorna 401 quando sub está ausente', async () => {
    const res = await handler({
      requestContext: { authorizer: { jwt: { claims: {} } } },
      pathParameters: { transactionId: TRANSACTION_ID },
      body: JSON.stringify({ amount: 50000 }),
    });
    expect(res.statusCode).toBe(401);
    expect(markAsRefunded).not.toHaveBeenCalled();
  });

  it('retorna 400 com body inválido JSON', async () => {
    const res = await handler({
      requestContext: { authorizer: { jwt: { claims: { sub: CALLER_ID } } } },
      pathParameters: { transactionId: TRANSACTION_ID },
      body: 'not-json',
    });
    expect(res.statusCode).toBe(400);
  });

  it('retorna 404 quando transação não existe', async () => {
    findPaymentById.mockResolvedValue(null);
    const res = await handler(buildEvent({ amount: 50000 }));
    expect(res.statusCode).toBe(404);
  });

  it('retorna 409 quando já estornada', async () => {
    findPaymentById.mockResolvedValue({ ...approvedTransaction, status: 'refunded' });
    const res = await handler(buildEvent({ amount: 50000 }));
    expect(res.statusCode).toBe(409);
  });

  it('retorna 400 quando transação não é estornável', async () => {
    findPaymentById.mockResolvedValue({ ...approvedTransaction, status: 'refused' });
    const res = await handler(buildEvent({ amount: 50000 }));
    expect(res.statusCode).toBe(400);
  });

  it('retorna 422 quando valor supera o original', async () => {
    const res = await handler(buildEvent({ amount: 99999 }));
    expect(res.statusCode).toBe(422);
  });

  it('propaga erros inesperados', async () => {
    markAsRefunded.mockRejectedValue(new Error('DB error'));
    await expect(handler(buildEvent({ amount: 50000 }))).rejects.toThrow('DB error');
  });
});
