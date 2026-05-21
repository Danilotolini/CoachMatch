const express = require('express');
const {
  createPayment,
  getPayment,
  getCoachPayments,
  getStudentPayments,
  getSessionPayments,
  refundPayment,
} = require('../controllers/payments');
const { validate } = require('../middlewares/validation');
const { cardPaymentSchema, pixPaymentSchema, refundSchema } = require('../schemas/payments');

const router = express.Router();

// Escolhe o schema conforme o método de pagamento informado no body
function paymentValidation(req, res, next) {
  const schema = req.body?.method === 'pix' ? pixPaymentSchema : cardPaymentSchema;
  return validate(schema)(req, res, next);
}

// ─── Rotas ────────────────────────────────────────────────────────────────────

router.post('/',                              paymentValidation,       createPayment);

// Consultas por entidade
router.get('/coach/:coachId',                                          getCoachPayments);
router.get('/student/:studentId',                                      getStudentPayments);
router.get('/session/:sessionId',                                      getSessionPayments);

// Transação individual
router.get('/:transactionId',                                          getPayment);
router.post('/:transactionId/refund',         validate(refundSchema),  refundPayment);

module.exports = router;