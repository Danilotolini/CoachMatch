import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../get-coach/repository.js', () => ({
  findCoachById: vi.fn(),
}));

vi.mock('../../shared/s3.js', () => ({
  signGetUrl: vi.fn(async (key) => (key ? `https://signed.example/${key}` : null)),
}));

import { handler } from '../get-coach/handler.js';
import { getCoachProfile } from '../get-coach/index.js';
import { findCoachById } from '../get-coach/repository.js';
import { NotFoundException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const COACH_ID = 'coach-uuid-123';

const buildAuthEvent = (coachId = COACH_ID) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: coachId } } } },
});

const buildCoachRecord = (overrides = {}) => ({
  coachId: COACH_ID,
  email: 'coach@mail.com',
  status: 'PENDING_PROFILE',
  visibility: 'VISIBLE',
  profile: {
    name: 'João Silva',
    phone: '11999999999',
    instagram: '@joao',
    cref: 'CREF 123456-G/SP',
    specialties: ['Musculação'],
    photo_key: 'uploads/foto.jpg',
    video_key: 'uploads/video.mp4',
  },
  work_location: [{ type: 'GYM', gymId: 'gym-1' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('get-coach › index (getCoachProfile)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna shape Coach aninhado com coachId e timestamps', async () => {
    findCoachById.mockResolvedValue(buildCoachRecord());
    const result = await getCoachProfile(COACH_ID);

    expect(result.coachId).toBe(COACH_ID);
    expect(result.email).toBe('coach@mail.com');
    expect(result.visibility).toBe('VISIBLE');
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('retorna profile como objeto aninhado', async () => {
    findCoachById.mockResolvedValue(buildCoachRecord());
    const result = await getCoachProfile(COACH_ID);

    expect(result.profile).toMatchObject({
      name:        'João Silva',
      phone:       '11999999999',
      instagram:   '@joao',
      cref:        'CREF 123456-G/SP',
      specialties: ['Musculação'],
    });
  });

  it('devolve photo_url/video_url assinadas e não expõe profile_video/keys', async () => {
    findCoachById.mockResolvedValue(buildCoachRecord());
    const result = await getCoachProfile(COACH_ID);

    expect(result.profile.photo_url).toBe('https://signed.example/uploads/foto.jpg');
    expect(result.profile.video_url).toBe('https://signed.example/uploads/video.mp4');
    expect(result.profile).not.toHaveProperty('profile_video');
    expect(result.profile).not.toHaveProperty('photo_key');
    expect(result.profile).not.toHaveProperty('video_key');
  });

  it('retorna work_location como array passado direto', async () => {
    findCoachById.mockResolvedValue(buildCoachRecord());
    const result = await getCoachProfile(COACH_ID);
    expect(result.work_location).toEqual([{ type: 'GYM', gymId: 'gym-1' }]);
  });

  it('mantém status PENDING_PROFILE', async () => {
    findCoachById.mockResolvedValue(buildCoachRecord({ status: 'PENDING_PROFILE' }));
    const result = await getCoachProfile(COACH_ID);
    expect(result.status).toBe('PENDING_PROFILE');
  });

  it('não altera status APPROVED', async () => {
    findCoachById.mockResolvedValue(buildCoachRecord({ status: 'APPROVED' }));
    const result = await getCoachProfile(COACH_ID);
    expect(result.status).toBe('APPROVED');
  });

  it('retorna valores padrão seguros para profile ausente', async () => {
    findCoachById.mockResolvedValue({ coachId: COACH_ID, email: 'x@x.com', status: 'PENDING_PROFILE' });
    const result = await getCoachProfile(COACH_ID);

    expect(result.profile.name).toBeNull();
    expect(result.profile.phone).toBeNull();
    expect(result.profile.specialties).toEqual([]);
    expect(result.profile.cref).toBe('');
    expect(result.profile.instagram).toBe('');
    expect(result.profile.photo_url).toBeNull();
    expect(result.profile.video_url).toBeNull();
    expect(result.work_location).toEqual([]);
    expect(result.visibility).toBe('VISIBLE');
  });

  it('lança NotFoundException quando coach não existe', async () => {
    findCoachById.mockResolvedValue(null);
    await expect(getCoachProfile(COACH_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('get-coach › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com shape Coach correto', async () => {
    findCoachById.mockResolvedValue(buildCoachRecord());
    const response = await handler(buildAuthEvent());

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.coachId).toBe(COACH_ID);
    expect(body.status).toBe('PENDING_PROFILE');
    expect(body.profile).toMatchObject({ name: 'João Silva' });
    expect(body.work_location).toBeDefined();
  });

  it('retorna 401 quando sub está ausente', async () => {
    const response = await handler({ requestContext: { authorizer: { jwt: { claims: {} } } } });
    expect(response.statusCode).toBe(401);
    expect(findCoachById).not.toHaveBeenCalled();
  });

  it('retorna 404 quando coach não existe', async () => {
    findCoachById.mockResolvedValue(null);
    const response = await handler(buildAuthEvent());
    expect(response.statusCode).toBe(404);
  });

  it('retorna 500 em erros inesperados', async () => {
    findCoachById.mockRejectedValue(new Error('DynamoDB down'));
    const result = await handler(buildAuthEvent());
    expect(result.statusCode).toBe(500);
  });
});
