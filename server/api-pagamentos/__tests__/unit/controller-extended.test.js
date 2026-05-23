jest.mock('../../service/payments');

const controller = require('../../controllers/payments');
const service = require('../../service/payments');
const {
  createCardPayload,
  createPixPayload,
  createTransaction,
  createRefundedTransaction,
  createRefusedTransaction,
  createPendingTransaction,
} = require('../fixtures/transaction.fixtures');

describe('Controller - Payments (Extended)', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('createPayment - Extended Scenarios', () => {
    it('deve lidar com PIX recusado', async () => {
      const payload = createPixPayload();
      req.body = { method: 'pix', ...payload };
      const refusedTxn = createRefusedTransaction({ method: 'pix' });
      service.processPixPayment.mockResolvedValue(refusedTxn);

      await controller.createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(402);
    });

    it('deve chamar handleError em caso de exceção', async () => {
      req.body = { method: 'credit_card' };
      service.processCardPayment.mockRejectedValue(new Error('DB Error'));

      await controller.createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Erro interno do servidor.' }),
      );
    });

    it('deve retornar 201 para PIX aprovado', async () => {
      const payload = createPixPayload();
      req.body = { method: 'pix', ...payload };
      const txn = createTransaction({ method: 'pix' });
      service.processPixPayment.mockResolvedValue(txn);

      await controller.createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getPayment - Extended', () => {
    it('deve logar erro quando service falha', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      req.params.transactionId = 'txn_123';
      service.getPayment.mockRejectedValue(new Error('Database connection failed'));

      await controller.getPayment(req, res);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('deve retornar transação completa quando encontrada', async () => {
      const transaction = createTransaction({
        amount: 150000,
        status: 'approved',
        method: 'pix',
      });
      req.params.transactionId = transaction.transactionId;
      service.getPayment.mockResolvedValue(transaction);

      await controller.getPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(transaction);
      expect(res.json.mock.calls[0][0].amount).toBe(150000);
    });
  });

  describe('getCoachPayments - Extended', () => {
    it('deve retornar múltiplas transações com paginação', async () => {
      const transactions = Array.from({ length: 5 }, () => createTransaction());
      req.params.coachId = 'coach_123';
      service.getCoachPayments.mockResolvedValue(transactions);

      await controller.getCoachPayments(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 5 }),
      );
    });

    it('deve retornar transações de um único coach', async () => {
      const coachId = 'coach_unique_123';
      const transactions = [
        createTransaction({ coachId }),
        createTransaction({ coachId }),
      ];
      req.params.coachId = coachId;
      service.getCoachPayments.mockResolvedValue(transactions);

      await controller.getCoachPayments(req, res);

      expect(service.getCoachPayments).toHaveBeenCalledWith(coachId);
    });

    it('deve retornar erro quando service falha', async () => {
      req.params.coachId = 'coach_123';
      service.getCoachPayments.mockRejectedValue(new Error('DB error'));

      await controller.getCoachPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getStudentPayments - Extended', () => {
    it('deve retornar transações do aluno', async () => {
      const studentId = 'student_123';
      const transactions = [createTransaction({ studentId })];
      req.params.studentId = studentId;
      service.getStudentPayments.mockResolvedValue(transactions);

      await controller.getStudentPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 1 }),
      );
    });

    it('deve passar studentId correto para service', async () => {
      const studentId = 'student_unique_456';
      req.params.studentId = studentId;
      service.getStudentPayments.mockResolvedValue([]);

      await controller.getStudentPayments(req, res);

      expect(service.getStudentPayments).toHaveBeenCalledWith(studentId);
    });
  });

  describe('getSessionPayments - Extended', () => {
    it('deve retornar transações da sessão', async () => {
      const sessionId = 'session_123';
      const transactions = [
        createTransaction({ sessionId }),
        createRefundedTransaction({ sessionId }),
      ];
      req.params.sessionId = sessionId;
      service.getSessionPayments.mockResolvedValue(transactions);

      await controller.getSessionPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 2 }),
      );
    });
  });

  describe('refundPayment - Extended Scenarios', () => {
    it('deve retornar dados completos do estorno', async () => {
      req.params.transactionId = 'txn_123';
      req.body = { amount: 50000, reason: 'Changed my mind' };
      const refundData = {
        refundId: 'ref_456',
        transactionId: 'txn_123',
        status: 'refunded',
        amount: 50000,
        reason: 'Changed my mind',
        createdAt: '2026-05-23T11:00:00.000Z',
      };
      service.refundPayment.mockResolvedValue(refundData);

      await controller.refundPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          refundId: 'ref_456',
          status: 'refunded',
        }),
      );
    });

    it('deve incluir reason no refund', async () => {
      req.params.transactionId = 'txn_123';
      req.body = { amount: 25000, reason: 'Quality issue' };
      service.refundPayment.mockResolvedValue({
        refundId: 'ref_789',
        reason: 'Quality issue',
      });

      await controller.refundPayment(req, res);

      expect(service.refundPayment).toHaveBeenCalledWith(
        'txn_123',
        25000,
        'Quality issue',
      );
    });

    it('deve logar erro quando refund falha', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      req.params.transactionId = 'txn_123';
      req.body = { amount: 50000 };
      service.refundPayment.mockRejectedValue(new Error('Unexpected error'));

      await controller.refundPayment(req, res);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
