import { refundPayment } from './index.js';
import { ValidationException } from '../../shared/exceptions.js';
import {
  PaymentNotFoundException,
  PaymentAlreadyRefundedException,
  PaymentNotRefundableException,
  InvalidRefundAmountException,
} from '../shared/exceptions.js';

/**
 * Handler HTTP: POST /payments/{transactionId}/refund
 * Estorna uma transação de pagamento aprovada.
 */
export const handler = async (event) => {
  const callerId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!callerId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  const transactionId = event?.pathParameters?.transactionId;
  if (!transactionId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'transactionId é obrigatório.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: 'Body inválido.' }) };
  }

  try {
    const result = await refundPayment(transactionId, body.amount, body.reason);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    if (err instanceof ValidationException) {
      return { statusCode: 400, body: JSON.stringify({ message: err.message, details: err.details }) };
    }
    if (err instanceof PaymentNotFoundException) {
      return { statusCode: 404, body: JSON.stringify({ message: err.message }) };
    }
    if (err instanceof PaymentAlreadyRefundedException) {
      return { statusCode: 409, body: JSON.stringify({ message: err.message }) };
    }
    if (err instanceof PaymentNotRefundableException) {
      return { statusCode: 400, body: JSON.stringify({ message: err.message }) };
    }
    if (err instanceof InvalidRefundAmountException) {
      return { statusCode: 422, body: JSON.stringify({ message: err.message }) };
    }
    throw err;
  }
};
