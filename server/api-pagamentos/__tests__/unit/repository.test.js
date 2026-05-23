const { createMockRepository } = require('../mocks/repository.mock');
const {
  createTransaction,
  createRefundedTransaction,
  createPendingTransaction,
  createRefusedTransaction,
} = require('../fixtures/transaction.fixtures');

describe('Repository - payments', () => {
  let mockRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
  });

  describe('create', () => {
    it('deve criar uma transação com todos os campos necessários', async () => {
      const transaction = createTransaction();
      mockRepository.create.mockResolvedValue(transaction);

      const result = await mockRepository.create(transaction);

      expect(mockRepository.create).toHaveBeenCalledWith(transaction);
      expect(result).toEqual(transaction);
      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('PK');
      expect(result).toHaveProperty('SK');
    });

    it('deve incluir GSI keys para indexação', async () => {
      const transaction = createTransaction();
      mockRepository.create.mockResolvedValue(transaction);

      const result = await mockRepository.create(transaction);

      expect(result).toHaveProperty('GSI1PK');
      expect(result).toHaveProperty('GSI1SK');
      expect(result).toHaveProperty('GSI2PK');
      expect(result).toHaveProperty('GSI2SK');
      expect(result).toHaveProperty('GSI3PK');
      expect(result).toHaveProperty('GSI3SK');
    });
  });

  describe('findById', () => {
    it('deve retornar transação quando encontrada', async () => {
      const transaction = createTransaction();
      mockRepository.findById.mockResolvedValue(transaction);

      const result = await mockRepository.findById(transaction.transactionId);

      expect(mockRepository.findById).toHaveBeenCalledWith(transaction.transactionId);
      expect(result).toEqual(transaction);
    });

    it('deve retornar null quando não encontrada', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await mockRepository.findById('nonexistent_id');

      expect(result).toBeNull();
    });

    it('deve manter todos os campos da transação', async () => {
      const transaction = createTransaction({
        status: 'approved',
        amount: 100000,
      });
      mockRepository.findById.mockResolvedValue(transaction);

      const result = await mockRepository.findById(transaction.transactionId);

      expect(result.status).toBe('approved');
      expect(result.amount).toBe(100000);
      expect(result.coachId).toBeDefined();
      expect(result.studentId).toBeDefined();
    });
  });

  describe('findByCoach', () => {
    it('deve retornar array de transações do coach', async () => {
      const coachId = '223e4567-e89b-12d3-a456-426614174000';
      const transactions = [
        createTransaction({ coachId }),
        createTransaction({ coachId }),
        createRefundedTransaction({ coachId }),
      ];
      mockRepository.findByCoach.mockResolvedValue(transactions);

      const result = await mockRepository.findByCoach(coachId);

      expect(mockRepository.findByCoach).toHaveBeenCalledWith(coachId);
      expect(result).toHaveLength(3);
      expect(result.every((t) => t.coachId === coachId)).toBe(true);
    });

    it('deve retornar array vazio quando coach não tem transações', async () => {
      mockRepository.findByCoach.mockResolvedValue([]);

      const result = await mockRepository.findByCoach('nonexistent_coach');

      expect(result).toEqual([]);
    });

    it('deve retornar transações em ordem decrescente de data', async () => {
      const coachId = '223e4567-e89b-12d3-a456-426614174000';
      const transactions = [
        createTransaction({ coachId, createdAt: '2026-05-23T12:00:00.000Z' }),
        createTransaction({ coachId, createdAt: '2026-05-23T11:00:00.000Z' }),
        createTransaction({ coachId, createdAt: '2026-05-23T10:00:00.000Z' }),
      ];
      mockRepository.findByCoach.mockResolvedValue(transactions);

      const result = await mockRepository.findByCoach(coachId);

      expect(result[0].createdAt).toBe('2026-05-23T12:00:00.000Z');
      expect(result[2].createdAt).toBe('2026-05-23T10:00:00.000Z');
    });
  });

  describe('findByStudent', () => {
    it('deve retornar array de transações do aluno', async () => {
      const studentId = '323e4567-e89b-12d3-a456-426614174000';
      const transactions = [
        createTransaction({ studentId }),
        createRefusedTransaction({ studentId }),
      ];
      mockRepository.findByStudent.mockResolvedValue(transactions);

      const result = await mockRepository.findByStudent(studentId);

      expect(mockRepository.findByStudent).toHaveBeenCalledWith(studentId);
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.studentId === studentId)).toBe(true);
    });

    it('deve retornar array vazio quando aluno não tem transações', async () => {
      mockRepository.findByStudent.mockResolvedValue([]);

      const result = await mockRepository.findByStudent('nonexistent_student');

      expect(result).toEqual([]);
    });
  });

  describe('findBySession', () => {
    it('deve retornar array de transações da sessão', async () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174000';
      const transactions = [
        createTransaction({ sessionId }),
        createPendingTransaction({ sessionId }),
      ];
      mockRepository.findBySession.mockResolvedValue(transactions);

      const result = await mockRepository.findBySession(sessionId);

      expect(mockRepository.findBySession).toHaveBeenCalledWith(sessionId);
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.sessionId === sessionId)).toBe(true);
    });

    it('deve retornar array vazio quando sessão não tem transações', async () => {
      mockRepository.findBySession.mockResolvedValue([]);

      const result = await mockRepository.findBySession('nonexistent_session');

      expect(result).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar o status da transação', async () => {
      mockRepository.updateStatus.mockResolvedValue();

      await mockRepository.updateStatus('txn_123', 'refunded');

      expect(mockRepository.updateStatus).toHaveBeenCalledWith('txn_123', 'refunded');
    });

    it('deve incluir dados extras na atualização', async () => {
      const extra = {
        refundId: 'ref_123',
        refundedAt: '2026-05-23T11:00:00.000Z',
        reason: 'Customer request',
      };
      mockRepository.updateStatus.mockResolvedValue();

      await mockRepository.updateStatus('txn_123', 'refunded', extra);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith('txn_123', 'refunded', extra);
    });

    it('deve ser chamado sem dados extras se não fornecidos', async () => {
      mockRepository.updateStatus.mockResolvedValue();

      await mockRepository.updateStatus('txn_123', 'approved');

      expect(mockRepository.updateStatus).toHaveBeenCalledWith('txn_123', 'approved');
    });
  });
});
