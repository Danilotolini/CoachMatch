jest.mock('../../service/payments');

const controller = require('../../controllers/payments');
const service = require('../../service/payments');
const { createTransaction } = require('../fixtures/transaction.fixtures');

describe('Controller - Coverage Edge Cases', () => {
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

  describe('getStudentPayments - Empty Results', () => {
    it('deve retornar transações vazias com total 0', async () => {
      req.params.studentId = 'student_empty';
      service.getStudentPayments.mockResolvedValue([]);

      await controller.getStudentPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ transactions: [], total: 0 });
    });

    it('deve retornar erro 500 quando service falha', async () => {
      req.params.studentId = 'student_123';
      service.getStudentPayments.mockRejectedValue(new Error('DB error'));

      await controller.getStudentPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getSessionPayments - Multiple Transactions', () => {
    it('deve retornar múltiplas transações da sessão', async () => {
      const sessionId = 'session_multi';
      const transactions = [
        createTransaction({ sessionId }),
        createTransaction({ sessionId }),
        createTransaction({ sessionId }),
      ];
      req.params.sessionId = sessionId;
      service.getSessionPayments.mockResolvedValue(transactions);

      await controller.getSessionPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        transactions,
        total: 3,
      });
    });

    it('deve retornar total correto mesmo com 1 transação', async () => {
      req.params.sessionId = 'session_single';
      const transactions = [createTransaction()];
      service.getSessionPayments.mockResolvedValue(transactions);

      await controller.getSessionPayments(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 1 }),
      );
    });

    it('deve lidar com erro de sessão não encontrada', async () => {
      req.params.sessionId = 'nonexistent_session';
      service.getSessionPayments.mockRejectedValue(new Error('Session not found'));

      await controller.getSessionPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('refundPayment - Error Handling with statusCode', () => {
    it('deve retornar erro com statusCode customizado', async () => {
      const customError = new Error('Custom payment error');
      customError.statusCode = 400;
      req.params.transactionId = 'txn_error';
      req.body = { amount: 50000 };
      service.refundPayment.mockRejectedValue(customError);

      await controller.refundPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Custom payment error' });
    });

    it('deve retornar 500 para erro sem statusCode', async () => {
      const unknownError = new Error('Unknown error');
      req.params.transactionId = 'txn_unknown';
      req.body = { amount: 25000 };
      service.refundPayment.mockRejectedValue(unknownError);

      await controller.refundPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('deve incluir reason no refund call', async () => {
      const refundResult = {
        refundId: 'ref_123',
        status: 'refunded',
      };
      req.params.transactionId = 'txn_123';
      req.body = {
        amount: 50000,
        reason: 'Customer requested refund',
      };
      service.refundPayment.mockResolvedValue(refundResult);

      await controller.refundPayment(req, res);

      expect(service.refundPayment).toHaveBeenCalledWith(
        'txn_123',
        50000,
        'Customer requested refund',
      );
    });
  });

  describe('Error Handler - handleError Path', () => {
    it('deve logar erro com contexto', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      req.params.transactionId = 'txn_log';
      service.getPayment.mockRejectedValue(new Error('Log test error'));

      await controller.getPayment(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[payments.controller]'),
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
