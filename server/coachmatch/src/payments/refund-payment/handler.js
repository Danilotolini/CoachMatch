import { refundPayment } from './index.js';
import { ValidationException } from '../../shared/exceptions.js';
import {
  PaymentNotFoundException,
  PaymentAlreadyRefundedException,
  PaymentNotRefundableException,
  InvalidRefundAmountException,
  PaymentForbiddenException,
} from '../shared/exceptions.js';

const PAYMENT_EXCEPTIONS = [
  PaymentNotFoundException,
  PaymentAlreadyRefundedException,
  PaymentNotRefundableException,
  InvalidRefundAmountException,
  PaymentForbiddenException,
];

export const handler = async (event) => {
  const callerId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!callerId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado.' }) };
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
    const result = await refundPayment(transactionId, callerId, body.amount, body.reason);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    if (err instanceof ValidationException) {
      return { statusCode: 400, body: JSON.stringify({ message: err.message, details: err.details }) };
    }
    if (PAYMENT_EXCEPTIONS.some(E => err instanceof E)) {
      return { statusCode: err.statusCode, body: JSON.stringify({ message: err.message }) };
    }
    throw err;
  }
};
