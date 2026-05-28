jest.mock('../../service/payments');

const controller = require('../../controllers/payments');
const service = require('../../service/payments');
const {
  createCardPayload,
  createPixPayload,
  createTransaction,
  createRefundedTransaction,
} = require('../fixtures/transaction.fixtures');
const {
  PaymentNotFoundError,
  PaymentAlreadyRefundedError,
  PaymentNotRefundableError,
  InvalidRefundAmountError,
} = require('../../utils/errors');

describe('Controller - payments', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('createPayment', () => {
    it('deve retornar 201 para pagamento de cartão aprovado', async () => {
      const payload = createCardPayload();
      const transaction = createTransaction();
      req.body = { method: 'credit_card', ...payload };
      service.processCardPayment.mockResolvedValue(transaction);

      await controller.createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(transaction);
    });

    it('deve retornar 402 para pagamento recusado', async () => {
      const payload = createCardPayload();
      const transaction = createTransaction({ status: 'refused' });
      req.body = { method: 'credit_card', ...payload };
      service.processCardPayment.mockResolvedValue(transaction);

      await controller.createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith(transaction);
    });

    it('deve aceitar método PIX', async () => {
      const payload = createPixPayload();
      const transaction = createTransaction({ method: 'pix', status: 'approved' });
      req.body = { method: 'pix', ...payload };
      service.processPixPayment.mockResolvedValue(transaction);

      await controller.createPayment(req, res);

      expect(service.processPixPayment).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('deve chamar processCardPayment para cartão', async () => {
      const payload = createCardPayload();
      req.body = { method: 'credit_card', ...payload };
      const cardPayload = { ...payload };
      service.processCardPayment.mockResolvedValue(createTransaction());

      await controller.createPayment(req, res);

      expect(service.processCardPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: payload.amount,
          sessionId: payload.sessionId,
          coachId: payload.coachId,
          studentId: payload.studentId,
          card: payload.card,
        }),
      );
    });

    it('deve chamar processPixPayment para PIX', async () => {
      const payload = createPixPayload();
      req.body = { method: 'pix', ...payload };
      service.processPixPayment.mockResolvedValue(createTransaction({ method: 'pix' }));

      await controller.createPayment(req, res);

      expect(service.processPixPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: payload.amount,
          sessionId: payload.sessionId,
          coachId: payload.coachId,
          studentId: payload.studentId,
        }),
      );
    });

    it('deve retornar 500 em caso de erro inesperado', async () => {
      req.body = { method: 'credit_card' };
      service.processCardPayment.mockRejectedValue(new Error('Unexpected error'));

      await controller.createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Erro interno do servidor.' }),
      );
    });

    it('deve remover method antes de chamar service', async () => {
      const payload = createCardPayload();
      req.body = { method: 'credit_card', ...payload };
      service.processCardPayment.mockResolvedValue(createTransaction());

      await controller.createPayment(req, res);

      expect(service.processCardPayment).toHaveBeenCalledWith(
        expect.not.objectContaining({ method: 'credit_card' }),
      );
    });
  });

  describe('getPayment', () => {
    it('deve retornar 200 com transação quando encontrada', async () => {
      const transaction = createTransaction();
      req.params.transactionId = transaction.transactionId;
      service.getPayment.mockResolvedValue(transaction);

      await controller.getPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(transaction);
    });

    it('deve retornar 404 quando transação não existe', async () => {
      req.params.transactionId = 'nonexistent';
      service.getPayment.mockResolvedValue(null);

      await controller.getPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transação não encontrada.' });
    });

    it('deve retornar 500 em caso de erro inesperado', async () => {
      req.params.transactionId = 'txn_123';
      service.getPayment.mockRejectedValue(new Error('Database error'));

      await controller.getPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getCoachPayments', () => {
    it('deve retornar 200 com array de transações', async () => {
      const transactions = [createTransaction(), createTransaction()];
      req.params.coachId = '223e4567-e89b-12d3-a456-426614174000';
      service.getCoachPayments.mockResolvedValue(transactions);

      await controller.getCoachPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        transactions,
        total: 2,
      });
    });

    it('deve retornar total correto', async () => {
      const transactions = [
        createTransaction(),
        createTransaction(),
        createTransaction(),
      ];
      req.params.coachId = '223e4567-e89b-12d3-a456-426614174000';
      service.getCoachPayments.mockResolvedValue(transactions);

      await controller.getCoachPayments(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 3 }),
      );
    });

    it('deve retornar array vazio com total 0', async () => {
      req.params.coachId = 'nonexistent';
      service.getCoachPayments.mockResolvedValue([]);

      await controller.getCoachPayments(req, res);

      expect(res.json).toHaveBeenCalledWith({
        transactions: [],
        total: 0,
      });
    });
  });

  describe('getStudentPayments', () => {
    it('deve retornar 200 com array de transações do aluno', async () => {
      const transactions = [createTransaction()];
      req.params.studentId = '323e4567-e89b-12d3-a456-426614174000';
      service.getStudentPayments.mockResolvedValue(transactions);

      await controller.getStudentPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        transactions,
        total: 1,
      });
    });
  });

  describe('getSessionPayments', () => {
    it('deve retornar 200 com array de transações da sessão', async () => {
      const transactions = [createTransaction()];
      req.params.sessionId = '123e4567-e89b-12d3-a456-426614174000';
      service.getSessionPayments.mockResolvedValue(transactions);

      await controller.getSessionPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        transactions,
        total: 1,
      });
    });
  });

  describe('refundPayment', () => {
    it('deve retornar 200 com dados do estorno bem-sucedido', async () => {
      req.params.transactionId = 'txn_123';
      req.body = { amount: 50000, reason: 'Customer request' };
      const refundResult = {
        refundId: 'refund_123',
        status: 'refunded',
        amount: 50000,
        reason: 'Customer request',
      };
      service.refundPayment.mockResolvedValue(refundResult);

      await controller.refundPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(refundResult);
    });

    it('deve passar transactionId, amount e reason para service', async () => {
      req.params.transactionId = 'txn_123';
      req.body = { amount: 50000, reason: 'Customer request' };
      service.refundPayment.mockResolvedValue({});

      await controller.refundPayment(req, res);

      expect(service.refundPayment).toHaveBeenCalledWith('txn_123', 50000, 'Customer request');
    });

    it('deve retornar 404 quando transação não encontrada', async () => {
      req.params.transactionId = 'nonexistent';
      req.body = { amount: 50000 };
      service.refundPayment.mockRejectedValue(new PaymentNotFoundError('nonexistent'));

      await controller.refundPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });
    });

    it('deve retornar 409 quando transação já foi estornada', async () => {
      req.params.transactionId = 'txn_123';
      req.body = { amount: 50000 };
      service.refundPayment.mockRejectedValue(new PaymentAlreadyRefundedError('txn_123'));

      await controller.refundPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('deve retornar 400 quando transação não é refundável', async () => {
      req.params.transactionId = 'txn_123';
      req.body = { amount: 50000 };
      service.refundPayment.mockRejectedValue(new PaymentNotRefundableError('refused'));

      await controller.refundPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('deve retornar 422 quando valor de estorno é inválido', async () => {
      req.params.transactionId = 'txn_123';
      req.body = { amount: 100000 };
      service.refundPayment.mockRejectedValue(new InvalidRefundAmountError(100000, 50000));

      await controller.refundPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(422);
    });

    it('deve retornar 500 para erro inesperado', async () => {
      req.params.transactionId = 'txn_123';
      req.body = { amount: 50000 };
      service.refundPayment.mockRejectedValue(new Error('Unexpected error'));

      await controller.refundPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
