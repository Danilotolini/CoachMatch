const paymentsService = require('../service/payments');

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function createPayment(req, res) {
  try {
    const { method, ...data } = req.body;

    const result = method === 'pix'
      ? await paymentsService.processPixPayment(data)
      : await paymentsService.processCardPayment(data);

    const statusCode = result.status === 'refused' ? 402 : 201;
    return res.status(statusCode).json(result);
  } catch (err) {
    return handleError(res, err, 'createPayment');
  }
}

async function getPayment(req, res) {
  try {
    const transaction = await paymentsService.getPayment(req.params.transactionId);

    if (!transaction) return res.status(404).json({ error: 'Transação não encontrada.' });

    return res.status(200).json(transaction);
  } catch (err) {
    return handleError(res, err, 'getPayment');
  }
}

async function getCoachPayments(req, res) {
  try {
    const transactions = await paymentsService.getCoachPayments(req.params.coachId);
    return res.status(200).json({ transactions, total: transactions.length });
  } catch (err) {
    return handleError(res, err, 'getCoachPayments');
  }
}

async function getStudentPayments(req, res) {
  try {
    const transactions = await paymentsService.getStudentPayments(req.params.studentId);
    return res.status(200).json({ transactions, total: transactions.length });
  } catch (err) {
    return handleError(res, err, 'getStudentPayments');
  }
}

async function getSessionPayments(req, res) {
  try {
    const transactions = await paymentsService.getSessionPayments(req.params.sessionId);
    return res.status(200).json({ transactions, total: transactions.length });
  } catch (err) {
    return handleError(res, err, 'getSessionPayments');
  }
}

async function refundPayment(req, res) {
  try {
    const result = await paymentsService.refundPayment(
      req.params.transactionId,
      req.body.amount,
      req.body.reason,
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return handleError(res, err, 'refundPayment');
  }
}

// ─── Util ──────────────────────────────────────────────────────────────────────

function handleError(res, err, context) {
  console.error(`[payments.controller] ${context}:`, err);
  return res.status(500).json({ error: 'Erro interno do servidor.' });
}

module.exports = {
  createPayment,
  getPayment,
  getCoachPayments,
  getStudentPayments,
  getSessionPayments,
  refundPayment,
};