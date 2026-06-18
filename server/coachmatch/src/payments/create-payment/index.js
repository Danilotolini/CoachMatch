import { v4 as uuidv4 } from 'uuid';
import { persistPayment } from './repository.js';
import { cardPaymentSchema, pixPaymentSchema } from './schema.js';
import { calculateSplit, maskCardNumber, resolveCardScenario } from '../shared/helpers.js';
import { ValidationException } from '../../shared/exceptions.js';
import { emitPaymentSucceeded } from '../../shared/events.js';

/**
 * Emite o evento de pagamento aprovado sem derrubar o fluxo.
 *
 * A transação já foi persistida; uma falha aqui é o problema clássico de
 * dual-write (gravamos em `payments` mas o evento não saiu). Na fase inicial
 * apenas logamos — o `paymentStatus` do schedule é corrigido manualmente.
 */
const tryEmitPaymentSucceeded = async (transaction) => {
  if (transaction.status !== 'approved') return;
  try {
    await emitPaymentSucceeded(transaction);
  } catch (err) {
    console.error(`[ERROR] Falha ao emitir payment.succeeded para ${transaction.transactionId}:`, err);
  }
};

/**
 * Processa um pagamento com cartão de crédito.
 * studentId vem do JWT (não do body) para maior segurança.
 *
 * @param {{ studentId, coachId, sessionId, amount, card }} params
 * @returns {object} Transação criada.
 */
export const createCardPayment = async ({ studentId, coachId, sessionId, amount, card }) => {
  const { error, value } = cardPaymentSchema.validate({ coachId, sessionId, amount, card });
  if (error) throw new ValidationException(error.message, error.details);

  const { status, reason, requires3ds } = resolveCardScenario(value.card.number);
  const transactionId = `txn_${uuidv4()}`;
  const now = new Date().toISOString();

  const transaction = {
    transactionId,
    sessionId:    value.sessionId,
    coachId:      value.coachId,
    studentId,
    method:       'credit_card',
    amount:       value.amount,
    status,
    split:        status !== 'refused' ? calculateSplit(value.amount) : null,
    cardLastFour: maskCardNumber(value.card.number),
    ...(reason      && { refusalReason: reason }),
    ...(requires3ds && { requires3ds: true }),
    createdAt: now,
  };

  await persistPayment(transaction);
  await tryEmitPaymentSucceeded(transaction);
  return transaction;
};

/**
 * Processa um pagamento via PIX.
 * studentId vem do JWT (não do body) para maior segurança.
 *
 * @param {{ studentId, coachId, sessionId, amount }} params
 * @returns {object} Transação criada.
 */
export const createPixPayment = async ({ studentId, coachId, sessionId, amount }) => {
  const { error, value } = pixPaymentSchema.validate({ coachId, sessionId, amount });
  if (error) throw new ValidationException(error.message, error.details);

  const transactionId = `txn_${uuidv4()}`;
  const now = new Date().toISOString();

  const transaction = {
    transactionId,
    sessionId:    value.sessionId,
    coachId:      value.coachId,
    studentId,
    method:       'pix',
    amount:       value.amount,
    status:       'approved',
    split:        calculateSplit(value.amount),
    pixCode:      `00020126580014br.gov.bcb.pix0136${uuidv4()}5204000053039865406${value.amount}5802BR6009SAO PAULO62070503***6304MOCK`,
    expiresAt:    new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    createdAt:    now,
  };

  await persistPayment(transaction);
  await tryEmitPaymentSucceeded(transaction);
  return transaction;
};
