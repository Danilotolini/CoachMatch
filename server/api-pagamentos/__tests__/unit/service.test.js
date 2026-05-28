jest.mock('../../repository/payments');
jest.mock('uuid');

const { v4: uuidv4 } = require('uuid');
const service = require('../../service/payments');
const repository = require('../../repository/payments');
const {
  PaymentNotFoundError,
  PaymentAlreadyRefundedError,
  PaymentNotRefundableError,
  InvalidRefundAmountError,
} = require('../../utils/errors');
const {
  createCardPayload,
  createPixPayload,
  createTransaction,
  createRefundedTransaction,
  createRefusedTransaction,
  createPendingTransaction,
} = require('../fixtures/transaction.fixtures');

describe('Service - payments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    uuidv4.mockReturnValue('mock-uuid-1234');
  });

  describe('processCardPayment', () => {
    it('deve criar transação aprovada com cartão válido', async () => {
      const payload = createCardPayload();
      const expectedTransaction = createTransaction({
        sessionId: payload.sessionId,
        coachId: payload.coachId,
        studentId: payload.studentId,
        amount: payload.amount,
        cardLastFour: '1111',
        status: 'approved',
      });

      repository.create.mockResolvedValue(expectedTransaction);

      const result = await service.processCardPayment(payload);

      expect(repository.create).toHaveBeenCalled();
      expect(result.status).toBe('approved');
      expect(result.cardLastFour).toBe('1111');
      expect(result.split).toBeDefined();
      expect(result.split.platformFee).toBe(Math.round(payload.amount * 0.1));
    });

    it('deve criar transação recusada com cartão 4222222222222222', async () => {
      const payload = createCardPayload({
        card: {
          number: '4222222222222222',
          holder: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
        },
      });

      const expectedTransaction = createRefusedTransaction({
        sessionId: payload.sessionId,
        coachId: payload.coachId,
        studentId: payload.studentId,
        amount: payload.amount,
        cardLastFour: '2222',
        status: 'refused',
        refusalReason: 'Limite ou saldo insuficiente.',
      });

      repository.create.mockResolvedValue(expectedTransaction);

      const result = await service.processCardPayment(payload);

      expect(result.status).toBe('refused');
      expect(result.refusalReason).toBe('Limite ou saldo insuficiente.');
      expect(result.split).toBeNull();
    });

    it('deve criar transação pendente com cartão 4333333333333333', async () => {
      const payload = createCardPayload({
        card: {
          number: '4333333333333333',
          holder: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
        },
      });

      const expectedTransaction = createPendingTransaction({
        sessionId: payload.sessionId,
        coachId: payload.coachId,
        studentId: payload.studentId,
        amount: payload.amount,
        cardLastFour: '3333',
        refusalReason: 'Pagamento em análise antifraude.',
      });

      repository.create.mockResolvedValue(expectedTransaction);

      const result = await service.processCardPayment(payload);

      expect(result.status).toBe('pending');
      expect(result.refusalReason).toBe('Pagamento em análise antifraude.');
    });

    it('deve incluir requires3ds para cartão 4444444444444441', async () => {
      const payload = createCardPayload({
        card: {
          number: '4444444444444441',
          holder: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
        },
      });

      const expectedTransaction = createTransaction({
        sessionId: payload.sessionId,
        coachId: payload.coachId,
        studentId: payload.studentId,
        amount: payload.amount,
        cardLastFour: '4441',
        requires3ds: true,
      });

      repository.create.mockResolvedValue(expectedTransaction);

      const result = await service.processCardPayment(payload);

      expect(result.requires3ds).toBe(true);
    });

    it('deve remover espaços e hífens do número do cartão', async () => {
      const payload = createCardPayload({
        card: {
          number: '4111 1111 1111 1111',
          holder: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
        },
      });

      const expectedTransaction = createTransaction({
        sessionId: payload.sessionId,
        coachId: payload.coachId,
        studentId: payload.studentId,
        amount: payload.amount,
        cardLastFour: '1111',
      });

      repository.create.mockResolvedValue(expectedTransaction);

      const result = await service.processCardPayment(payload);

      expect(result.cardLastFour).toBe('1111');
    });

    it('deve incluir campos obrigatórios na transação', async () => {
      const payload = createCardPayload();
      const expectedTransaction = createTransaction({
        sessionId: payload.sessionId,
        coachId: payload.coachId,
        studentId: payload.studentId,
        amount: payload.amount,
      });

      repository.create.mockResolvedValue(expectedTransaction);

      const result = await service.processCardPayment(payload);

      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('method', 'credit_card');
      expect(result).toHaveProperty('amount');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('createdAt');
    });

    it('deve persistir a transação no repository', async () => {
      const payload = createCardPayload();
      const expectedTransaction = createTransaction(payload);

      repository.create.mockResolvedValue(expectedTransaction);

      await service.processCardPayment(payload);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: payload.sessionId,
        coachId: payload.coachId,
        studentId: payload.studentId,
        amount: payload.amount,
        method: 'credit_card',
      }));
    });
  });

  describe('processPixPayment', () => {
    it('deve criar transação PIX sempre aprovada', async () => {
      const payload = createPixPayload();
      const expectedTransaction = createTransaction({
        sessionId: payload.sessionId,
        coachId: payload.coachId,
        studentId: payload.studentId,
        amount: payload.amount,
        method: 'pix',
        status: 'approved',
      });

      repository.create.mockResolvedValue(expectedTransaction);

      const result = await service.processPixPayment(payload);

      expect(result.status).toBe('approved');
      expect(result.method).toBe('pix');
    });

    it('deve gerar código PIX válido', async () => {
      const payload = createPixPayload();
      const expectedTransaction = createTransaction({
        sessionId: payload.sessionId,
        coachId: payload.coachId,
        studentId: payload.studentId,
        amount: payload.amount,
        method: 'pix',
        pixCode: expect.stringContaining('00020126580014br.gov.bcb.pix'),
      });

      repository.create.mockResolvedValue(expectedTransaction);

      const result = await service.processPixPayment(payload);

      expect(result.pixCode).toBeDefined();
      expect(result.pixCode).toContain('00020126580014br.gov.bcb.pix');
    });

    it('deve incluir expiração de 30 minutos no PIX', async () => {
      const payload = createPixPayload();
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 30 * 60 * 1000);

      const expectedTransaction = createTransaction({
        sessionId: payload.sessionId,
        coachId: payload.coachId,
        studentId: payload.studentId,
        amount: payload.amount,
        method: 'pix',
        expiresAt: expectedExpiry.toISOString(),
      });

      repository.create.mockResolvedValue(expectedTransaction);

      const result = await service.processPixPayment(payload);

      expect(result.expiresAt).toBeDefined();
    });

    it('deve calcular split corretamente para PIX', async () => {
      const payload = createPixPayload({ amount: 100000 });
      const expectedTransaction = createTransaction({
        sessionId: payload.sessionId,
        coachId: payload.coachId,
        studentId: payload.studentId,
        amount: payload.amount,
        method: 'pix',
        split: { platformFee: 10000, coachAmount: 90000 },
      });

      repository.create.mockResolvedValue(expectedTransaction);

      const result = await service.processPixPayment(payload);

      expect(result.split.platformFee).toBe(10000);
      expect(result.split.coachAmount).toBe(90000);
    });

    it('deve persistir transação PIX no repository', async () => {
      const payload = createPixPayload();
      const expectedTransaction = createTransaction(payload);

      repository.create.mockResolvedValue(expectedTransaction);

      await service.processPixPayment(payload);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: payload.sessionId,
        coachId: payload.coachId,
        studentId: payload.studentId,
        amount: payload.amount,
        method: 'pix',
        status: 'approved',
      }));
    });
  });

  describe('getPayment', () => {
    it('deve retornar transação quando encontrada', async () => {
      const transaction = createTransaction();
      repository.findById.mockResolvedValue(transaction);

      const result = await service.getPayment(transaction.transactionId);

      expect(repository.findById).toHaveBeenCalledWith(transaction.transactionId);
      expect(result).toEqual(transaction);
    });

    it('deve retornar null quando transação não existe', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getPayment('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getCoachPayments', () => {
    it('deve retornar array de transações do coach', async () => {
      const coachId = '223e4567-e89b-12d3-a456-426614174000';
      const transactions = [
        createTransaction({ coachId }),
        createTransaction({ coachId }),
      ];
      repository.findByCoach.mockResolvedValue(transactions);

      const result = await service.getCoachPayments(coachId);

      expect(repository.findByCoach).toHaveBeenCalledWith(coachId);
      expect(result).toEqual(transactions);
    });

    it('deve retornar array vazio quando coach não tem transações', async () => {
      repository.findByCoach.mockResolvedValue([]);

      const result = await service.getCoachPayments('nonexistent_coach');

      expect(result).toEqual([]);
    });
  });

  describe('getStudentPayments', () => {
    it('deve retornar array de transações do aluno', async () => {
      const studentId = '323e4567-e89b-12d3-a456-426614174000';
      const transactions = [createTransaction({ studentId })];
      repository.findByStudent.mockResolvedValue(transactions);

      const result = await service.getStudentPayments(studentId);

      expect(repository.findByStudent).toHaveBeenCalledWith(studentId);
      expect(result).toEqual(transactions);
    });
  });

  describe('getSessionPayments', () => {
    it('deve retornar array de transações da sessão', async () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174000';
      const transactions = [createTransaction({ sessionId })];
      repository.findBySession.mockResolvedValue(transactions);

      const result = await service.getSessionPayments(sessionId);

      expect(repository.findBySession).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual(transactions);
    });
  });

  describe('refundPayment', () => {
    it('deve estornar transação aprovada com sucesso', async () => {
      const transaction = createTransaction({ status: 'approved' });
      repository.findById.mockResolvedValue(transaction);
      repository.updateStatus.mockResolvedValue();

      const result = await service.refundPayment(transaction.transactionId, 50000, 'Customer request');

      expect(repository.findById).toHaveBeenCalledWith(transaction.transactionId);
      expect(repository.updateStatus).toHaveBeenCalledWith(
        transaction.transactionId,
        'refunded',
        expect.objectContaining({
          reason: 'Customer request',
        }),
      );
      expect(result.status).toBe('refunded');
      expect(result.amount).toBe(50000);
    });

    it('deve estornar o valor completo quando não especificado', async () => {
      const transaction = createTransaction({ amount: 100000, status: 'approved' });
      repository.findById.mockResolvedValue(transaction);
      repository.updateStatus.mockResolvedValue();

      await service.refundPayment(transaction.transactionId, 100000);

      expect(repository.updateStatus).toHaveBeenCalled();
    });

    it('deve lançar erro quando transação não existe', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.refundPayment('nonexistent', 50000))
        .rejects
        .toThrow(PaymentNotFoundError);
    });

    it('deve lançar erro quando transação já foi estornada', async () => {
      const transaction = createRefundedTransaction();
      repository.findById.mockResolvedValue(transaction);

      await expect(service.refundPayment(transaction.transactionId, 50000))
        .rejects
        .toThrow(PaymentAlreadyRefundedError);
    });

    it('deve lançar erro quando transação está recusada', async () => {
      const transaction = createRefusedTransaction();
      repository.findById.mockResolvedValue(transaction);

      await expect(service.refundPayment(transaction.transactionId, 50000))
        .rejects
        .toThrow(PaymentNotRefundableError);
    });

    it('deve lançar erro quando transação está pendente', async () => {
      const transaction = createPendingTransaction();
      repository.findById.mockResolvedValue(transaction);

      await expect(service.refundPayment(transaction.transactionId, 50000))
        .rejects
        .toThrow(PaymentNotRefundableError);
    });

    it('deve lançar erro quando valor de estorno é maior que o valor original', async () => {
      const transaction = createTransaction({ amount: 50000, status: 'approved' });
      repository.findById.mockResolvedValue(transaction);

      await expect(service.refundPayment(transaction.transactionId, 60000))
        .rejects
        .toThrow(InvalidRefundAmountError);
    });

    it('deve aceitar estorno parcial', async () => {
      const transaction = createTransaction({ amount: 100000, status: 'approved' });
      repository.findById.mockResolvedValue(transaction);
      repository.updateStatus.mockResolvedValue();

      const result = await service.refundPayment(transaction.transactionId, 50000, 'Partial refund');

      expect(result.amount).toBe(50000);
      expect(repository.updateStatus).toHaveBeenCalled();
    });

    it('deve incluir refundId gerado automaticamente', async () => {
      const transaction = createTransaction({ status: 'approved' });
      repository.findById.mockResolvedValue(transaction);
      repository.updateStatus.mockResolvedValue();

      const result = await service.refundPayment(transaction.transactionId, 50000);

      expect(result.refundId).toBeDefined();
      expect(result.refundId).toContain('refund_');
    });

    it('deve incluir timestamp de criação do estorno', async () => {
      const transaction = createTransaction({ status: 'approved' });
      repository.findById.mockResolvedValue(transaction);
      repository.updateStatus.mockResolvedValue();

      const result = await service.refundPayment(transaction.transactionId, 50000);

      expect(result.createdAt).toBeDefined();
    });

    it('deve aceitar estorno sem razão', async () => {
      const transaction = createTransaction({ status: 'approved' });
      repository.findById.mockResolvedValue(transaction);
      repository.updateStatus.mockResolvedValue();

      const result = await service.refundPayment(transaction.transactionId, 50000);

      expect(result.reason).toBeNull();
    });

    it('deve persistir o estorno no repository', async () => {
      const transaction = createTransaction({ status: 'approved' });
      repository.findById.mockResolvedValue(transaction);
      repository.updateStatus.mockResolvedValue();

      await service.refundPayment(transaction.transactionId, 50000, 'Test reason');

      expect(repository.updateStatus).toHaveBeenCalledWith(
        transaction.transactionId,
        'refunded',
        expect.objectContaining({
          reason: 'Test reason',
          refundedAt: expect.any(String),
          refundId: expect.any(String),
        }),
      );
    });
  });
});
