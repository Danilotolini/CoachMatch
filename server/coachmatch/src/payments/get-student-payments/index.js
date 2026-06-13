import { findPaymentsByStudent } from './repository.js';

/**
 * Retorna todas as transações de um aluno.
 * @param {string} studentId
 * @returns {object[]}
 */
export const getStudentPayments = async (studentId) =>
  findPaymentsByStudent(studentId);
