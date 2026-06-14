import { createCardPayment, createPixPayment } from './index.js';
import { ValidationException } from '../../shared/exceptions.js';

const VALID_METHODS = ['pix', 'credit_card'];

export const handler = async (event) => {
  const studentId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!studentId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: 'Body inválido.' }) };
  }

  const { method, ...data } = body;

  if (!VALID_METHODS.includes(method)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Método de pagamento inválido: "${method}". Use "pix" ou "credit_card".` }),
    };
  }

  try {
    const result = method === 'pix'
      ? await createPixPayment({ ...data, studentId })
      : await createCardPayment({ ...data, studentId });

    const statusCode = result.status === 'refused' ? 402 : 201;
    return { statusCode, body: JSON.stringify(result) };
  } catch (err) {
    if (err instanceof ValidationException) {
      return { statusCode: 400, body: JSON.stringify({ message: err.message, details: err.details }) };
    }
    throw err;
  }
};
