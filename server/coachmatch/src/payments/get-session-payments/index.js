import { findPaymentsBySession } from './repository.js';

/**
 * Retorna todas as transações de uma sessão.
 * @param {string} sessionId
 * @returns {object[]}
 */
export const getSessionPayments = async (sessionId) =>
  findPaymentsBySession(sessionId);
