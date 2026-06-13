import { PLATFORM_FEE_RATE, TEST_CARDS } from './config.js';

/**
 * Calcula a divisão do valor entre plataforma e coach.
 * @param {number} amount - Valor em centavos.
 * @returns {{ platformFee: number, coachAmount: number }}
 */
export const calculateSplit = (amount) => {
  const platformFee = Math.round(amount * PLATFORM_FEE_RATE);
  const coachAmount = amount - platformFee;
  return { platformFee, coachAmount };
};

/**
 * Retorna os 4 últimos dígitos do número do cartão.
 * @param {string} cardNumber
 * @returns {string}
 */
export const maskCardNumber = (cardNumber) =>
  cardNumber.replace(/[\s-]/g, '').slice(-4);

/**
 * Resolve o cenário de pagamento com base no número do cartão.
 * Cartões não mapeados são aprovados por padrão.
 * @param {string} cardNumber
 * @returns {{ status: string, reason: string|null, requires3ds?: boolean }}
 */
export const resolveCardScenario = (cardNumber) => {
  const clean = cardNumber.replace(/[\s-]/g, '');
  return TEST_CARDS[clean] ?? { status: 'approved', reason: null };
};

/** Transação pode ser estornada apenas se aprovada. */
export const isRefundable = (transaction) => transaction.status === 'approved';

/** Transação já foi estornada. */
export const isRefunded = (transaction) => transaction.status === 'refunded';

/** Valor do estorno não pode superar o valor original. */
export const canRefundAmount = (transaction, amount) =>
  amount > 0 && amount <= transaction.amount;
