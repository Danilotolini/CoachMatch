import { findPaymentById } from './repository.js';

/**
 * Busca uma transação pelo ID.
 * @param {string} transactionId
 * @returns {object|null}
 */
export const getPayment = async (transactionId) =>
  findPaymentById(transactionId);
