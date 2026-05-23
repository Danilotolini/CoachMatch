function calculateSplit(amount) {
  const { PLATFORM_FEE_RATE } = require('./config');
  const platformFee = Math.round(amount * PLATFORM_FEE_RATE);
  const coachAmount = amount - platformFee;
  return { platformFee, coachAmount };
}

function maskCardNumber(cardNumber) {
  return cardNumber.replace(/[\s-]/g, '').slice(-4);
}

function resolveCardScenario(cardNumber) {
  const { TEST_CARDS } = require('./config');
  const clean = cardNumber.replace(/[\s-]/g, '');
  return TEST_CARDS[clean] ?? { status: 'approved', reason: null };
}

function isRefundable(transaction) {
  return transaction.status === 'approved';
}

function isRefunded(transaction) {
  return transaction.status === 'refunded';
}

function canRefundAmount(transaction, amount) {
  return amount > 0 && amount <= transaction.amount;
}

module.exports = {
  calculateSplit,
  maskCardNumber,
  resolveCardScenario,
  isRefundable,
  isRefunded,
  canRefundAmount,
};
