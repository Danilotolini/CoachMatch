import { findPaymentsByCoach } from './repository.js';

/**
 * Retorna todas as transações de um coach.
 * @param {string} coachId
 * @returns {object[]}
 */
export const getCoachPayments = async (coachId) =>
  findPaymentsByCoach(coachId);
