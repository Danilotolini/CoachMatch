const { v4: uuidv4 } = require('uuid');

const createTransactionPayload = (overrides = {}) => ({
  sessionId: '123e4567-e89b-12d3-a456-426614174000',
  coachId: '223e4567-e89b-12d3-a456-426614174000',
  studentId: '323e4567-e89b-12d3-a456-426614174000',
  amount: 50000,
  ...overrides,
});

const createCardPayload = (overrides = {}) => ({
  method: 'credit_card',
  card: {
    number: '4111111111111111',
    holder: 'John Doe',
    expiryMonth: '12',
    expiryYear: '2025',
    cvv: '123',
  },
  ...createTransactionPayload(overrides),
});

const createPixPayload = (overrides = {}) => ({
  method: 'pix',
  ...createTransactionPayload(overrides),
});

const createTransaction = (overrides = {}) => ({
  transactionId: `txn_${uuidv4()}`,
  sessionId: '123e4567-e89b-12d3-a456-426614174000',
  coachId: '223e4567-e89b-12d3-a456-426614174000',
  studentId: '323e4567-e89b-12d3-a456-426614174000',
  amount: 50000,
  method: 'credit_card',
  status: 'approved',
  cardLastFour: '1111',
  split: { platformFee: 5000, coachAmount: 45000 },
  createdAt: '2026-05-23T10:00:00.000Z',
  updatedAt: '2026-05-23T10:00:00.000Z',
  PK: 'TRANSACTION#txn_123',
  SK: 'METADATA',
  GSI1PK: 'COACH#223e4567-e89b-12d3-a456-426614174000',
  GSI1SK: 'TRANSACTION#2026-05-23T10:00:00.000Z',
  GSI2PK: 'STUDENT#323e4567-e89b-12d3-a456-426614174000',
  GSI2SK: 'TRANSACTION#2026-05-23T10:00:00.000Z',
  GSI3PK: 'SESSION#123e4567-e89b-12d3-a456-426614174000',
  GSI3SK: 'TRANSACTION#txn_123',
  ...overrides,
});

const createRefundedTransaction = (overrides = {}) =>
  createTransaction({
    status: 'refunded',
    extra: {
      refundId: `refund_${uuidv4()}`,
      refundedAt: '2026-05-23T11:00:00.000Z',
      reason: 'Customer request',
    },
    ...overrides,
  });

const createPendingTransaction = (overrides = {}) =>
  createTransaction({ status: 'pending', ...overrides });

const createRefusedTransaction = (overrides = {}) =>
  createTransaction({
    status: 'refused',
    split: null,
    refusalReason: 'Insufficient funds',
    ...overrides,
  });

module.exports = {
  createCardPayload,
  createPixPayload,
  createTransaction,
  createRefundedTransaction,
  createPendingTransaction,
  createRefusedTransaction,
  createTransactionPayload,
};
