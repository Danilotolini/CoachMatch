const { validate } = require('../../middlewares/validation');
const { cardPaymentSchema } = require('../../schemas/payments');
const { createCardPayload } = require('../fixtures/transaction.fixtures');

describe('Middleware - Validation', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('deve chamar next quando dados são válidos', () => {
    const payload = createCardPayload();
    req.body = payload;
    const middleware = validate(cardPaymentSchema);

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve retornar 400 quando dados são inválidos', () => {
    req.body = { amount: 50 }; // amount < 100
    const middleware = validate(cardPaymentSchema);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Dados inválidos.',
        details: expect.any(Array),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve incluir mensagem de erro no details', () => {
    req.body = { amount: 50 };
    const middleware = validate(cardPaymentSchema);

    middleware(req, res, next);

    const call = res.json.mock.calls[0][0];
    expect(call.details.length).toBeGreaterThan(0);
    expect(call.details[0]).toEqual(expect.any(String));
  });

  it('deve retornar todos os erros quando abortEarly=false', () => {
    req.body = {}; // faltam múltiplos campos
    const middleware = validate(cardPaymentSchema);

    middleware(req, res, next);

    const call = res.json.mock.calls[0][0];
    expect(call.details.length).toBeGreaterThan(1);
  });

  it('deve fazer trim e normalizar dados válidos', () => {
    const payload = createCardPayload();
    payload.card.holder = '  John Doe  ';
    req.body = payload;
    const middleware = validate(cardPaymentSchema);

    middleware(req, res, next);

    expect(req.body.card.holder).toBe('John Doe');
    expect(next).toHaveBeenCalled();
  });

  it('deve atualizar req.body com dados validados', () => {
    const payload = createCardPayload();
    payload.card.number = '4111 1111 1111 1111';
    req.body = payload;
    const middleware = validate(cardPaymentSchema);

    middleware(req, res, next);

    expect(req.body.card.number).toBe('4111111111111111');
  });
});
