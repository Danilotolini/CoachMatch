const { v4: uuidv4 } = require('uuid');
const repository = require('../repository/payments');
const {
  calculateSplit,
  maskCardNumber,
  resolveCardScenario,
  isRefundable,
  isRefunded,
  canRefundAmount,
} = require('../utils/payment-helpers');
const {
  PaymentNotFoundError,
  PaymentAlreadyRefundedError,
  PaymentNotRefundableError,
  InvalidRefundAmountError,
} = require('../utils/errors');

function generateTransactionId() {
  return `mock_${uuidv4()}`;
}

// ─── Serviços ─────────────────────────────────────────────────────────────────

async function processCardPayment({ amount, card, sessionId, coachId, studentId }) {
  const { status, reason, requires3ds } = resolveCardScenario(card.number);
  const transactionId = generateTransactionId();
  const now = new Date().toISOString();

  const transaction = {
    transactionId,
    sessionId,
    coachId,
    studentId,
    method:      'credit_card',
    amount,
    status,
    split:       status !== 'refused' ? calculateSplit(amount) : null,
    cardLastFour: maskCardNumber(card.number),
    ...(reason      && { refusalReason: reason }),
    ...(requires3ds && { requires3ds: true }),
    createdAt: now,
  };

  await repository.create(transaction);
  return transaction;
}

async function processPixPayment({ amount, sessionId, coachId, studentId }) {
  const transactionId = generateTransactionId();
  const now = new Date().toISOString();

  // PIX mock: sempre aprovado imediatamente (em produção chegaria via webhook)
  const transaction = {
    transactionId,
    sessionId,
    coachId,
    studentId,
    method:    'pix',
    amount,
    status:    'approved',
    split:     calculateSplit(amount),
    pixCode:   `00020126580014br.gov.bcb.pix0136${uuidv4()}5204000053039865406${amount}5802BR6009SAO PAULO62070503***6304MOCK`,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    createdAt: now,
  };

  await repository.create(transaction);
  return transaction;
}

async function getPayment(transactionId) {
  return repository.findById(transactionId);
}

async function getCoachPayments(coachId) {
  return repository.findByCoach(coachId);
}

async function getStudentPayments(studentId) {
  return repository.findByStudent(studentId);
}

async function getSessionPayments(sessionId) {
  return repository.findBySession(sessionId);
}

async function refundPayment(transactionId, amount, reason) {
  const transaction = await repository.findById(transactionId);

  if (!transaction) throw new PaymentNotFoundError(transactionId);
  if (isRefunded(transaction)) throw new PaymentAlreadyRefundedError(transactionId);
  if (!isRefundable(transaction)) throw new PaymentNotRefundableError(transaction.status);
  if (!canRefundAmount(transaction, amount)) throw new InvalidRefundAmountError(amount, transaction.amount);

  const refundId = `refund_${uuidv4()}`;
  const now = new Date().toISOString();

  await repository.updateStatus(transactionId, 'refunded', { refundId, refundedAt: now, reason });

  return {
    refundId,
    transactionId,
    status: 'refunded',
    amount,
    reason: reason || null,
    createdAt: now,
  };
}

module.exports = {
  processCardPayment,
  processPixPayment,
  getPayment,
  getCoachPayments,
  getStudentPayments,
  getSessionPayments,
  refundPayment,
};