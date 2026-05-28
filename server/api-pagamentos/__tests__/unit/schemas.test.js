const { validatePaymentSchema } = require('../../schemas/payments');
const { cardPaymentSchema, pixPaymentSchema, refundSchema } = require('../../schemas/payments');
const { createCardPayload, createPixPayload } = require('../fixtures/transaction.fixtures');

describe('Schemas - Payments', () => {
  describe('cardPaymentSchema', () => {
    it('deve validar cartão válido', () => {
      const payload = createCardPayload();
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('deve rejeitar cartão sem sessionId', () => {
      const payload = createCardPayload();
      delete payload.sessionId;
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('sessionId');
    });

    it('deve rejeitar cartão sem coachId', () => {
      const payload = createCardPayload();
      delete payload.coachId;
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve rejeitar cartão sem studentId', () => {
      const payload = createCardPayload();
      delete payload.studentId;
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve rejeitar cartão com amount < 100', () => {
      const payload = createCardPayload({ amount: 50 });
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('mínimo');
    });

    it('deve rejeitar cartão sem number', () => {
      const payload = createCardPayload();
      delete payload.card.number;
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve rejeitar cartão com number < 16 dígitos', () => {
      const payload = createCardPayload();
      payload.card.number = '4111111111111';
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve rejeitar cartão sem holder', () => {
      const payload = createCardPayload();
      delete payload.card.holder;
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve rejeitar cartão com holder < 3 caracteres', () => {
      const payload = createCardPayload();
      payload.card.holder = 'Jo';
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve rejeitar cartão com mês de vencimento inválido', () => {
      const payload = createCardPayload();
      payload.card.expiryMonth = '13';
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve aceitar todos os meses válidos (01-12)', () => {
      for (let month = 1; month <= 12; month++) {
        const payload = createCardPayload();
        payload.card.expiryMonth = String(month).padStart(2, '0');
        const { error } = cardPaymentSchema.validate(payload);
        expect(error).toBeUndefined();
      }
    });

    it('deve rejeitar ano com menos de 4 dígitos', () => {
      const payload = createCardPayload();
      payload.card.expiryYear = '25';
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve rejeitar CVV vazio', () => {
      const payload = createCardPayload();
      delete payload.card.cvv;
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve aceitar CVV com 3 dígitos', () => {
      const payload = createCardPayload();
      payload.card.cvv = '123';
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('deve aceitar CVV com 4 dígitos', () => {
      const payload = createCardPayload();
      payload.card.cvv = '1234';
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('deve rejeitar method diferente de credit_card', () => {
      const payload = createCardPayload();
      payload.method = 'pix';
      const { error } = cardPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve remover espaços de number', () => {
      const payload = createCardPayload();
      payload.card.number = '4111 1111 1111 1111';
      const { value } = cardPaymentSchema.validate(payload);
      expect(value.card.number).toBe('4111111111111111');
    });

    it('deve fazer trim em holder', () => {
      const payload = createCardPayload();
      payload.card.holder = '  John Doe  ';
      const { value } = cardPaymentSchema.validate(payload);
      expect(value.card.holder).toBe('John Doe');
    });
  });

  describe('pixPaymentSchema', () => {
    it('deve validar PIX válido', () => {
      const payload = createPixPayload();
      const { error } = pixPaymentSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('deve rejeitar PIX sem sessionId', () => {
      const payload = createPixPayload();
      delete payload.sessionId;
      const { error } = pixPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve rejeitar PIX com amount < 100', () => {
      const payload = createPixPayload({ amount: 50 });
      const { error } = pixPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve rejeitar method diferente de pix', () => {
      const payload = createPixPayload();
      payload.method = 'credit_card';
      const { error } = pixPaymentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve aceitar amount muito grande', () => {
      const payload = createPixPayload({ amount: 999999999 });
      const { error } = pixPaymentSchema.validate(payload);
      expect(error).toBeUndefined();
    });
  });

  describe('refundSchema', () => {
    it('deve validar estorno válido', () => {
      const payload = { amount: 50000, reason: 'Customer request' };
      const { error } = refundSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('deve validar estorno sem reason', () => {
      const payload = { amount: 50000 };
      const { error } = refundSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('deve rejeitar estorno com amount < 1', () => {
      const payload = { amount: 0 };
      const { error } = refundSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve rejeitar estorno com amount negativo', () => {
      const payload = { amount: -1000 };
      const { error } = refundSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve rejeitar estorno com reason > 255 caracteres', () => {
      const payload = { amount: 50000, reason: 'a'.repeat(256) };
      const { error } = refundSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('deve aceitar estorno com reason máximo (255)', () => {
      const payload = { amount: 50000, reason: 'a'.repeat(255) };
      const { error } = refundSchema.validate(payload);
      expect(error).toBeUndefined();
    });
  });
});
