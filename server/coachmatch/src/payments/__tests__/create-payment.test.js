import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../create-payment/repository.js', () => ({
  persistPayment: vi.fn(),
}));

vi.mock('../../shared/events.js', () => ({
  emitPaymentSucceeded: vi.fn(),
}));

import { handler } from '../create-payment/handler.js';
import { createCardPayment, createPixPayment } from '../create-payment/index.js';
import { persistPayment } from '../create-payment/repository.js';
import { emitPaymentSucceeded } from '../../shared/events.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const STUDENT_ID = '323e4567-e89b-12d3-a456-426614174000';
const COACH_ID   = '223e4567-e89b-12d3-a456-426614174000';
const SESSION_ID = 'avl_2c8f1e9b4a7d4f3a9b6c5d2e1f0a8b7c';

const buildAuthEvent = (body, studentId = STUDENT_ID) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: studentId } } } },
  body: JSON.stringify(body),
});

const cardBody = {
  method: 'credit_card',
  coachId: COACH_ID,
  sessionId: SESSION_ID,
  amount: 50000,
  card: { number: '4111111111111111', holder: 'João Silva', expiryMonth: '12', expiryYear: '2028', cvv: '123' },
};

const pixBody = {
  method: 'pix',
  coachId: COACH_ID,
  sessionId: SESSION_ID,
  amount: 50000,
};

// ─── Business Logic (index) ───────────────────────────────────────────────────

describe('create-payment › index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistPayment.mockResolvedValue(undefined);
  });

  describe('createCardPayment', () => {
    it('cria transação aprovada com cartão válido', async () => {
      const result = await createCardPayment({ studentId: STUDENT_ID, ...cardBody });
      expect(result.status).toBe('approved');
      expect(result.method).toBe('credit_card');
      expect(result.cardLastFour).toBe('1111');
      expect(result.split).toBeDefined();
      expect(result.split.platformFee).toBe(5000);  // 10% de 50000
      expect(result.split.coachAmount).toBe(45000);
    });

    it('cria transação recusada com cartão 4222222222222222', async () => {
      const result = await createCardPayment({
        studentId: STUDENT_ID,
        ...cardBody,
        card: { ...cardBody.card, number: '4222222222222222' },
      });
      expect(result.status).toBe('refused');
      expect(result.split).toBeNull();
      expect(result.refusalReason).toBe('Limite ou saldo insuficiente.');
    });

    it('cria transação pendente com cartão 4333333333333333', async () => {
      const result = await createCardPayment({
        studentId: STUDENT_ID,
        ...cardBody,
        card: { ...cardBody.card, number: '4333333333333333' },
      });
      expect(result.status).toBe('pending');
      expect(result.refusalReason).toBe('Pagamento em análise antifraude.');
    });

    it('inclui requires3ds para cartão 4444444444444441', async () => {
      const result = await createCardPayment({
        studentId: STUDENT_ID,
        ...cardBody,
        card: { ...cardBody.card, number: '4444444444444441' },
      });
      expect(result.requires3ds).toBe(true);
    });

    it('persiste a transação no repository', async () => {
      await createCardPayment({ studentId: STUDENT_ID, ...cardBody });
      expect(persistPayment).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: STUDENT_ID, coachId: COACH_ID, method: 'credit_card' })
      );
    });

    it('lança ValidationException com body inválido', async () => {
      await expect(
        createCardPayment({ studentId: STUDENT_ID, coachId: COACH_ID, sessionId: SESSION_ID, amount: 50 }) // amount < 100
      ).rejects.toThrow();
    });

    it('aceita sessionId opaco (formato avl_)', async () => {
      const result = await createCardPayment({ studentId: STUDENT_ID, ...cardBody });
      expect(result.sessionId).toBe(SESSION_ID);
    });

    it('emite payment.succeeded quando aprovado', async () => {
      await createCardPayment({ studentId: STUDENT_ID, ...cardBody });
      expect(emitPaymentSucceeded).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: SESSION_ID, status: 'approved' })
      );
    });

    it('NÃO emite payment.succeeded quando recusado', async () => {
      await createCardPayment({
        studentId: STUDENT_ID,
        ...cardBody,
        card: { ...cardBody.card, number: '4222222222222222' },
      });
      expect(emitPaymentSucceeded).not.toHaveBeenCalled();
    });

    it('não derruba o pagamento se a emissão falhar', async () => {
      emitPaymentSucceeded.mockRejectedValueOnce(new Error('SQS indisponível'));
      const result = await createCardPayment({ studentId: STUDENT_ID, ...cardBody });
      expect(result.status).toBe('approved');
    });
  });

  describe('createPixPayment', () => {
    it('cria transação PIX sempre aprovada', async () => {
      const result = await createPixPayment({ studentId: STUDENT_ID, ...pixBody });
      expect(result.status).toBe('approved');
      expect(result.method).toBe('pix');
    });

    it('gera código PIX com prefixo padrão', async () => {
      const result = await createPixPayment({ studentId: STUDENT_ID, ...pixBody });
      expect(result.pixCode).toContain('00020126580014br.gov.bcb.pix');
    });

    it('inclui expiração de 30 minutos', async () => {
      const before = Date.now();
      const result = await createPixPayment({ studentId: STUDENT_ID, ...pixBody });
      const expiry = new Date(result.expiresAt).getTime();
      expect(expiry - before).toBeGreaterThanOrEqual(29 * 60 * 1000);
      expect(expiry - before).toBeLessThanOrEqual(31 * 60 * 1000);
    });

    it('calcula split corretamente para PIX', async () => {
      const result = await createPixPayment({ studentId: STUDENT_ID, ...pixBody, amount: 100000 });
      expect(result.split.platformFee).toBe(10000);
      expect(result.split.coachAmount).toBe(90000);
    });

    it('persiste a transação no repository', async () => {
      await createPixPayment({ studentId: STUDENT_ID, ...pixBody });
      expect(persistPayment).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: STUDENT_ID, method: 'pix', status: 'approved' })
      );
    });

    it('emite payment.succeeded (PIX sempre aprovado)', async () => {
      await createPixPayment({ studentId: STUDENT_ID, ...pixBody });
      expect(emitPaymentSucceeded).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: SESSION_ID, status: 'approved' })
      );
    });
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────

describe('create-payment › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistPayment.mockResolvedValue(undefined);
  });

  it('retorna 201 para pagamento de cartão aprovado', async () => {
    const res = await handler(buildAuthEvent(cardBody));
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('approved');
    expect(body.method).toBe('credit_card');
  });

  it('retorna 402 para pagamento recusado', async () => {
    const res = await handler(buildAuthEvent({ ...cardBody, card: { ...cardBody.card, number: '4222222222222222' } }));
    expect(res.statusCode).toBe(402);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('refused');
  });

  it('retorna 201 para pagamento PIX', async () => {
    const res = await handler(buildAuthEvent(pixBody));
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.method).toBe('pix');
  });

  it('retorna 401 quando sub está ausente', async () => {
    const res = await handler({ requestContext: { authorizer: { jwt: { claims: {} } } }, body: JSON.stringify(cardBody) });
    expect(res.statusCode).toBe(401);
    expect(persistPayment).not.toHaveBeenCalled();
  });

  it('retorna 400 com body inválido JSON', async () => {
    const res = await handler({
      requestContext: { authorizer: { jwt: { claims: { sub: STUDENT_ID } } } },
      body: 'not-json',
    });
    expect(res.statusCode).toBe(400);
  });

  it('retorna 400 com dados inválidos (amount muito baixo)', async () => {
    const res = await handler(buildAuthEvent({ ...cardBody, amount: 1 }));
    expect(res.statusCode).toBe(400);
  });

  it('passa studentId do JWT, não do body', async () => {
    await handler(buildAuthEvent(cardBody, STUDENT_ID));
    expect(persistPayment).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: STUDENT_ID })
    );
  });

  it('retorna 400 para método de pagamento inválido', async () => {
    const res = await handler(buildAuthEvent({ ...cardBody, method: 'boleto' }));
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message).toContain('boleto');
    expect(persistPayment).not.toHaveBeenCalled();
  });

  it('retorna 400 quando method está ausente', async () => {
    const { method: _, ...bodyWithoutMethod } = cardBody;
    const res = await handler(buildAuthEvent(bodyWithoutMethod));
    expect(res.statusCode).toBe(400);
    expect(persistPayment).not.toHaveBeenCalled();
  });
});
