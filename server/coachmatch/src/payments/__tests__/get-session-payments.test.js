import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../get-session-payments/repository.js', () => ({
  findPaymentsBySession: vi.fn(),
}));

import { handler } from '../get-session-payments/handler.js';
import { findPaymentsBySession } from '../get-session-payments/repository.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const STUDENT_ID  = '323e4567-e89b-12d3-a456-426614174000';
const COACH_ID    = '223e4567-e89b-12d3-a456-426614174000';
const OUTSIDER_ID = '999e4567-e89b-12d3-a456-426614174000';
const SESSION_ID  = '123e4567-e89b-12d3-a456-426614174000';

const makeTransaction = (overrides = {}) => ({
  transactionId: 'txn_1',
  sessionId:     SESSION_ID,
  studentId:     STUDENT_ID,
  coachId:       COACH_ID,
  amount:        50000,
  status:        'approved',
  ...overrides,
});

const buildEvent = (sessionId = SESSION_ID, callerId = STUDENT_ID) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: callerId } } } },
  pathParameters: { sessionId },
});

// ─── Handler ─────────────────────────────────────────────────────────────────

describe('get-session-payments › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 200 para o estudante da sessão', async () => {
    findPaymentsBySession.mockResolvedValue([makeTransaction()]);

    const res = await handler(buildEvent(SESSION_ID, STUDENT_ID));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
  });

  it('retorna 200 para o coach da sessão', async () => {
    findPaymentsBySession.mockResolvedValue([makeTransaction()]);

    const res = await handler(buildEvent(SESSION_ID, COACH_ID));
    expect(res.statusCode).toBe(200);
  });

  it('retorna 200 com array vazio quando não há transações (sem verificar ownership)', async () => {
    findPaymentsBySession.mockResolvedValue([]);

    const res = await handler(buildEvent(SESSION_ID, OUTSIDER_ID));
    expect(JSON.parse(res.body)).toEqual({ transactions: [], total: 0 });
  });

  it('retorna 403 quando usuário não é participante da sessão', async () => {
    findPaymentsBySession.mockResolvedValue([makeTransaction()]);

    const res = await handler(buildEvent(SESSION_ID, OUTSIDER_ID));
    expect(res.statusCode).toBe(403);
  });

  it('retorna 401 quando sub está ausente', async () => {
    const res = await handler({ requestContext: { authorizer: { jwt: { claims: {} } } }, pathParameters: { sessionId: SESSION_ID } });
    expect(res.statusCode).toBe(401);
    expect(findPaymentsBySession).not.toHaveBeenCalled();
  });

  it('retorna 400 quando sessionId está ausente', async () => {
    const res = await handler({
      requestContext: { authorizer: { jwt: { claims: { sub: STUDENT_ID } } } },
      pathParameters: {},
    });
    expect(res.statusCode).toBe(400);
  });
});
