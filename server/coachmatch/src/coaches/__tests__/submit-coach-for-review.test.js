import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../submit-coach-for-review/repository.js', () => ({
  findCoachById:      vi.fn(),
  transitionToReview: vi.fn(),
}));

vi.mock('../get-coach/repository.js', () => ({
  findCoachById: vi.fn(),
}));

import { handler } from '../submit-coach-for-review/handler.js';
import { submitForReview } from '../submit-coach-for-review/index.js';
import { findCoachById, transitionToReview } from '../submit-coach-for-review/repository.js';
import { findCoachById as findCoachForGet } from '../get-coach/repository.js';
import { NotFoundException, ConflictException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const COACH_ID = 'coach-uuid-123';

const buildAuthEvent = (coachId = COACH_ID) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: coachId } } } },
});

const pendingProfileCoach = {
  coachId: COACH_ID,
  email: 'coach@mail.com',
  status: 'PENDING_PROFILE',
  profile: { name: 'João Silva', specialties: ['Musculação'], cref: 'CREF 1', instagram: '@j', profile_video: false },
  work_location: [{ type: 'GYM', gymId: 'gym-1' }],
};

const reviewedCoachRecord = {
  ...pendingProfileCoach,
  status: 'PENDING_REVIEW',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('submit-coach-for-review › index (submitForReview)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCoachById.mockResolvedValue(pendingProfileCoach);
    transitionToReview.mockResolvedValue(undefined);
  });

  it('chama transitionToReview quando status é PENDING_PROFILE', async () => {
    await submitForReview(COACH_ID);
    expect(transitionToReview).toHaveBeenCalledWith(COACH_ID);
  });

  it('permite submissão quando status é REJECTED', async () => {
    findCoachById.mockResolvedValue({ ...pendingProfileCoach, status: 'REJECTED' });
    await submitForReview(COACH_ID);
    expect(transitionToReview).toHaveBeenCalledWith(COACH_ID);
  });

  it('lança ConflictException quando status é PENDING_REVIEW', async () => {
    findCoachById.mockResolvedValue({ ...pendingProfileCoach, status: 'PENDING_REVIEW' });
    await expect(submitForReview(COACH_ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it('lança ConflictException quando status é APPROVED', async () => {
    findCoachById.mockResolvedValue({ ...pendingProfileCoach, status: 'APPROVED' });
    await expect(submitForReview(COACH_ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it('lança NotFoundException quando coach não existe', async () => {
    findCoachById.mockResolvedValue(null);
    await expect(submitForReview(COACH_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('converte ConditionalCheckFailedException em ConflictException (race condition)', async () => {
    const raceErr = Object.assign(new Error('ConditionalCheckFailedException'), {
      name: 'ConditionalCheckFailedException',
    });
    transitionToReview.mockRejectedValue(raceErr);
    await expect(submitForReview(COACH_ID)).rejects.toBeInstanceOf(ConflictException);
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('submit-coach-for-review › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCoachById.mockResolvedValue(pendingProfileCoach);
    transitionToReview.mockResolvedValue(undefined);
    findCoachForGet.mockResolvedValue(reviewedCoachRecord);
  });

  it('retorna 200 com Coach atualizado (status PENDING_REVIEW)', async () => {
    const response = await handler(buildAuthEvent());
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.coachId).toBe(COACH_ID);
    expect(body.status).toBe('PENDING_REVIEW');
  });

  it('retorna 401 quando sub está ausente', async () => {
    const response = await handler({ requestContext: { authorizer: { jwt: { claims: {} } } } });
    expect(response.statusCode).toBe(401);
    expect(transitionToReview).not.toHaveBeenCalled();
  });

  it('retorna 404 quando coach não existe', async () => {
    findCoachById.mockResolvedValue(null);
    const response = await handler(buildAuthEvent());
    expect(response.statusCode).toBe(404);
  });

  it('retorna 409 quando estado não permite submissão', async () => {
    findCoachById.mockResolvedValue({ ...pendingProfileCoach, status: 'APPROVED' });
    const response = await handler(buildAuthEvent());
    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/APPROVED/);
  });

  it('retorna 409 em race condition (ConditionalCheckFailedException)', async () => {
    const raceErr = Object.assign(new Error('ConditionalCheckFailedException'), {
      name: 'ConditionalCheckFailedException',
    });
    transitionToReview.mockRejectedValue(raceErr);
    const response = await handler(buildAuthEvent());
    expect(response.statusCode).toBe(409);
  });

  it('retorna 500 em erros inesperados', async () => {
    transitionToReview.mockRejectedValue(new Error('Falha no banco'));
    const result = await handler(buildAuthEvent());
    expect(result.statusCode).toBe(500);
  });
});
