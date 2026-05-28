const {
  PaymentNotFoundError,
  PaymentAlreadyRefundedError,
  PaymentNotRefundableError,
  InvalidRefundAmountError,
} = require('../../utils/errors');

describe('Payment Errors', () => {
  describe('PaymentNotFoundError', () => {
    it('deve ter statusCode 404', () => {
      const error = new PaymentNotFoundError('txn_123');
      expect(error.statusCode).toBe(404);
    });

    it('deve ter code PAYMENT_NOT_FOUND', () => {
      const error = new PaymentNotFoundError('txn_123');
      expect(error.code).toBe('PAYMENT_NOT_FOUND');
    });

    it('deve incluir o transactionId na mensagem', () => {
      const error = new PaymentNotFoundError('txn_abc');
      expect(error.message).toContain('txn_abc');
    });
  });

  describe('PaymentAlreadyRefundedError', () => {
    it('deve ter statusCode 409', () => {
      const error = new PaymentAlreadyRefundedError('txn_123');
      expect(error.statusCode).toBe(409);
    });

    it('deve ter code PAYMENT_ALREADY_REFUNDED', () => {
      const error = new PaymentAlreadyRefundedError('txn_123');
      expect(error.code).toBe('PAYMENT_ALREADY_REFUNDED');
    });
  });

  describe('PaymentNotRefundableError', () => {
    it('deve ter statusCode 400', () => {
      const error = new PaymentNotRefundableError('refused');
      expect(error.statusCode).toBe(400);
    });

    it('deve ter code PAYMENT_NOT_REFUNDABLE', () => {
      const error = new PaymentNotRefundableError('refused');
      expect(error.code).toBe('PAYMENT_NOT_REFUNDABLE');
    });

    it('deve incluir o status na mensagem', () => {
      const error = new PaymentNotRefundableError('pending');
      expect(error.message).toContain('pending');
    });
  });

  describe('InvalidRefundAmountError', () => {
    it('deve ter statusCode 422', () => {
      const error = new InvalidRefundAmountError(60000, 50000);
      expect(error.statusCode).toBe(422);
    });

    it('deve ter code INVALID_REFUND_AMOUNT', () => {
      const error = new InvalidRefundAmountError(60000, 50000);
      expect(error.code).toBe('INVALID_REFUND_AMOUNT');
    });

    it('deve incluir ambos os valores na mensagem', () => {
      const error = new InvalidRefundAmountError(60000, 50000);
      expect(error.message).toContain('60000');
      expect(error.message).toContain('50000');
    });
  });
});
