import { v4 as uuidv4 } from 'uuid';
import { findPaymentById, markAsRefunded } from './repository.js';
import { refundSchema } from './schema.js';
import { isRefundable, isRefunded, canRefundAmount } from '../shared/helpers.js';
import {
  PaymentNotFoundException,
  PaymentAlreadyRefundedException,
  PaymentNotRefundableException,
  InvalidRefundAmountException,
} from '../shared/exceptions.js';
import { ValidationException } from '../../shared/exceptions.js';

/**
 * Estorna uma transação aprovada.
 *
 * @param {string} transactionId
 * @param {number} amount - Valor a estornar (em centavos). Pode ser parcial.
 * @param {string} [reason] - Motivo do estorno (opcional).
 * @returns {object} Dados do estorno.
 */
export const refundPayment = async (transactionId, amount, reason) => {
  const { error } = refundSchema.validate({ amount, reason });
  if (error) throw new ValidationException(error.message, error.details);

  const transaction = await findPaymentById(transactionId);

  if (!transaction)             throw new PaymentNotFoundException(transactionId);
  if (isRefunded(transaction))  throw new PaymentAlreadyRefundedException(transactionId);
  if (!isRefundable(transaction)) throw new PaymentNotRefundableException(transaction.status);
  if (!canRefundAmount(transaction, amount)) throw new InvalidRefundAmountException(amount, transaction.amount);

  const refundId = `refund_${uuidv4()}`;
  const now = new Date().toISOString();

  await markAsRefunded(transactionId, { refundId, refundedAt: now, reason: reason ?? null });

  return {
    refundId,
    transactionId,
    status:    'refunded',
    amount,
    reason:    reason ?? null,
    createdAt: now,
  };
};
