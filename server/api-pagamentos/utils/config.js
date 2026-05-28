const PLATFORM_FEE_RATE = 0.10;

const TEST_CARDS = {
  '4111111111111111': { status: 'approved', reason: null },
  '4222222222222222': { status: 'refused', reason: 'Limite ou saldo insuficiente.' },
  '4333333333333333': { status: 'pending', reason: 'Pagamento em análise antifraude.' },
  '4444444444444441': { status: 'approved', reason: null, requires3ds: true },
  '4555555555555557': { status: 'refused', reason: 'Cartão expirado.' },
  '4666666666666669': { status: 'refused', reason: 'CVV inválido.' },
  '4777777777777770': { status: 'refused', reason: 'Cartão bloqueado ou cancelado.' },
};

module.exports = { PLATFORM_FEE_RATE, TEST_CARDS };
