const {
  calculateSplit,
  maskCardNumber,
  resolveCardScenario,
  isRefundable,
  isRefunded,
  canRefundAmount,
} = require('../../utils/payment-helpers');

describe('payment-helpers', () => {
  describe('calculateSplit', () => {
    it('deve calcular corretamente o split com taxa de plataforma de 10%', () => {
      const result = calculateSplit(100000);
      expect(result.platformFee).toBe(10000);
      expect(result.coachAmount).toBe(90000);
    });

    it('deve retornar 0 para valor 0', () => {
      const result = calculateSplit(0);
      expect(result.platformFee).toBe(0);
      expect(result.coachAmount).toBe(0);
    });

    it('deve arredondar corretamente para centavos', () => {
      const result = calculateSplit(333);
      expect(result.platformFee + result.coachAmount).toBe(333);
    });

    it('deve lidar com valores grandes', () => {
      const result = calculateSplit(10000000);
      expect(result.platformFee).toBe(1000000);
      expect(result.coachAmount).toBe(9000000);
    });
  });

  describe('maskCardNumber', () => {
    it('deve retornar os últimos 4 dígitos', () => {
      const result = maskCardNumber('4111111111111111');
      expect(result).toBe('1111');
    });

    it('deve remover espaços e hífens antes de mascarar', () => {
      const result = maskCardNumber('4111 1111 1111 1111');
      expect(result).toBe('1111');
    });

    it('deve remover hífens', () => {
      const result = maskCardNumber('4111-1111-1111-1111');
      expect(result).toBe('1111');
    });
  });

  describe('resolveCardScenario', () => {
    it('deve retornar "approved" para cartão 4111111111111111', () => {
      const result = resolveCardScenario('4111111111111111');
      expect(result.status).toBe('approved');
      expect(result.reason).toBeNull();
    });

    it('deve retornar "refused" para cartão 4222222222222222', () => {
      const result = resolveCardScenario('4222222222222222');
      expect(result.status).toBe('refused');
      expect(result.reason).toBe('Limite ou saldo insuficiente.');
    });

    it('deve retornar "pending" para cartão 4333333333333333', () => {
      const result = resolveCardScenario('4333333333333333');
      expect(result.status).toBe('pending');
      expect(result.reason).toBe('Pagamento em análise antifraude.');
    });

    it('deve retornar requires3ds para cartão 4444444444444441', () => {
      const result = resolveCardScenario('4444444444444441');
      expect(result.status).toBe('approved');
      expect(result.requires3ds).toBe(true);
    });

    it('deve retornar "approved" por padrão para cartão desconhecido', () => {
      const result = resolveCardScenario('5555555555555555');
      expect(result.status).toBe('approved');
      expect(result.reason).toBeNull();
    });

    it('deve remover espaços antes de validar', () => {
      const result = resolveCardScenario('4111 1111 1111 1111');
      expect(result.status).toBe('approved');
    });
  });

  describe('isRefundable', () => {
    it('deve retornar true para transação com status "approved"', () => {
      const transaction = { status: 'approved' };
      expect(isRefundable(transaction)).toBe(true);
    });

    it('deve retornar false para transação com status "pending"', () => {
      const transaction = { status: 'pending' };
      expect(isRefundable(transaction)).toBe(false);
    });

    it('deve retornar false para transação com status "refused"', () => {
      const transaction = { status: 'refused' };
      expect(isRefundable(transaction)).toBe(false);
    });

    it('deve retornar false para transação com status "refunded"', () => {
      const transaction = { status: 'refunded' };
      expect(isRefundable(transaction)).toBe(false);
    });
  });

  describe('isRefunded', () => {
    it('deve retornar true para transação com status "refunded"', () => {
      const transaction = { status: 'refunded' };
      expect(isRefunded(transaction)).toBe(true);
    });

    it('deve retornar false para transação com outros status', () => {
      expect(isRefunded({ status: 'approved' })).toBe(false);
      expect(isRefunded({ status: 'pending' })).toBe(false);
      expect(isRefunded({ status: 'refused' })).toBe(false);
    });
  });

  describe('canRefundAmount', () => {
    const transaction = { amount: 50000 };

    it('deve retornar true para valor válido (1 até amount)', () => {
      expect(canRefundAmount(transaction, 1)).toBe(true);
      expect(canRefundAmount(transaction, 25000)).toBe(true);
      expect(canRefundAmount(transaction, 50000)).toBe(true);
    });

    it('deve retornar false para valor zero', () => {
      expect(canRefundAmount(transaction, 0)).toBe(false);
    });

    it('deve retornar false para valor negativo', () => {
      expect(canRefundAmount(transaction, -1000)).toBe(false);
    });

    it('deve retornar false para valor maior que amount', () => {
      expect(canRefundAmount(transaction, 50001)).toBe(false);
      expect(canRefundAmount(transaction, 100000)).toBe(false);
    });
  });
});
