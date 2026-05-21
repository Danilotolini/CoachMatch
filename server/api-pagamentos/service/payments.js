const { v4: uuidv4 } = require('uuid');
const repository = require('../repository/payments');

// ─── Configuração ─────────────────────────────────────────────────────────────

const PLATFORM_FEE_RATE = 0.10; // 10% plataforma, 90% coach

/**
 * Cartões de teste.
 * Qualquer número fora da lista → aprovado por padrão.
 *
 * Número              Resultado    Cenário simulado
 * 4111111111111111    approved     Pagamento normal aprovado
 * 4222222222222222    refused      Saldo/limite insuficiente
 * 4333333333333333    pending      Análise antifraude / processando
 * 4444444444444441    approved     Aprovado mas com 3D Secure simulado
 * 4555555555555557    refused      Cartão expirado
 * 4666666666666669    refused      CVV inválido
 * 4777777777777770    refused      Cartão bloqueado / roubado
 */
const TEST_CARDS = {
  '4111111111111111': { status: 'approved',  reason: null },
  '4222222222222222': { status: 'refused',   reason: 'Limite ou saldo insuficiente.' },
  '4333333333333333': { status: 'pending',   reason: 'Pagamento em análise antifraude.' },
  '4444444444444441': { status: 'approved',  reason: null,              requires3ds: true },
  '4555555555555557': { status: 'refused',   reason: 'Cartão expirado.' },
  '4666666666666669': { status: 'refused',   reason: 'CVV inválido.' },
  '4777777777777770': { status: 'refused',   reason: 'Cartão bloqueado ou cancelado.' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTransactionId() {
  return `mock_${uuidv4()}`;
}

function calculateSplit(amount) {
  const platformFee = Math.round(amount * PLATFORM_FEE_RATE);
  const coachAmount = amount - platformFee;
  return { platformFee, coachAmount };
}

function resolveCardScenario(cardNumber) {
  const clean = cardNumber.replace(/[\s-]/g, '');
  return TEST_CARDS[clean] ?? { status: 'approved', reason: null };
}

function maskCardNumber(cardNumber) {
  return cardNumber.replace(/[\s-]/g, '').slice(-4);
}

function isRefundable(transaction) {
  return transaction.status === 'approved';
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

  if (!transaction)                  throw { statusCode: 404, message: 'Transação não encontrada.' };
  if (transaction.status === 'refunded') throw { statusCode: 409, message: 'Transação já foi estornada.' };
  if (!isRefundable(transaction))    throw { statusCode: 400, message: 'Só é possível estornar transações aprovadas.' };
  if (amount > transaction.amount)   throw { statusCode: 422, message: 'Valor do estorno não pode ser maior que o valor original.' };

  const refundId = `refund_${uuidv4()}`;
  const now = new Date().toISOString();

  await repository.updateStatus(transactionId, 'refunded', { refundId, refundedAt: now, reason });

  return {
    refundId,
    transactionId,
    status:    'refunded',
    amount,
    reason:    reason || null,
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