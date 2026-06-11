import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../get-student/repository.js', () => ({
  findStudentById: vi.fn(),
}));

import { handler } from '../get-student/handler.js';
import { getStudentProfile } from '../get-student/index.js';
import { findStudentById } from '../get-student/repository.js';
import { NotFoundException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STUDENT_ID = 'student-123';

const buildAuthEvent = (studentId = STUDENT_ID) => ({
  requestContext: {
    authorizer: { jwt: { claims: { sub: studentId } } },
  },
});

const buildStudentRecord = (overrides = {}) => ({
  studentId: STUDENT_ID,
  email: 'aluno@email.com',
  status: 'ACTIVE',
  profile: { name: 'Maria Santos' },
  phone: '+5511987654321',
  birthDate: '1995-06-15',
  gender: 'F',
  cep: '01310-100',
  city: 'São Paulo',
  state: 'SP',
  radius: 10,
  goal: 'Emagrecer',
  health: {
    weight: 65,
    height: 165,
    fitnessLevel: 'INICIANTE',
    healthConditions: [],
  },
  ...overrides,
});

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('get-student › index (getStudentProfile)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna perfil mapeado corretamente', async () => {
    const record = buildStudentRecord();
    findStudentById.mockResolvedValue(record);

    const result = await getStudentProfile(STUDENT_ID);

    expect(result.studentId).toBe(STUDENT_ID);
    expect(result.email).toBe('aluno@email.com');
    expect(result.status).toBe('ACTIVE');
    expect(result.name).toBe('Maria Santos');
    expect(result.phone).toBe('+5511987654321');
    expect(result.health.fitnessLevel).toBe('INICIANTE');
  });

  it('mapeia campos ausentes para null sem lançar erro', async () => {
    findStudentById.mockResolvedValue({
      studentId: STUDENT_ID,
      email: 'aluno@email.com',
      status: 'ONBOARDING_PROFILE',
      profile: { name: 'Novo' },
    });

    const result = await getStudentProfile(STUDENT_ID);

    expect(result.phone).toBeNull();
    expect(result.birthDate).toBeNull();
    expect(result.health).toBeNull();
  });

  it('lança NotFoundException quando estudante não existe', async () => {
    findStudentById.mockResolvedValue(null);

    await expect(getStudentProfile(STUDENT_ID))
      .rejects
      .toBeInstanceOf(NotFoundException);
  });

  it('chama findStudentById com o studentId correto', async () => {
    findStudentById.mockResolvedValue(buildStudentRecord());
    await getStudentProfile(STUDENT_ID);
    expect(findStudentById).toHaveBeenCalledWith(STUDENT_ID);
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('get-student › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com perfil do estudante', async () => {
    findStudentById.mockResolvedValue(buildStudentRecord());
    const event = buildAuthEvent();

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.studentId).toBe(STUDENT_ID);
    expect(body.email).toBe('aluno@email.com');
  });

  it('retorna 401 quando não há token de autorização', async () => {
    const response = await handler({ requestContext: {} });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/autorizado/i);
  });

  it('retorna 401 quando event é undefined', async () => {
    const response = await handler(undefined);
    expect(response.statusCode).toBe(401);
  });

  it('retorna 404 quando estudante não existe', async () => {
    findStudentById.mockResolvedValue(null);
    const event = buildAuthEvent();

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBeDefined();
  });

  it('propaga erros inesperados (não os trata com 5xx silencioso)', async () => {
    findStudentById.mockRejectedValue(new Error('Falha de rede'));
    const event = buildAuthEvent();

    await expect(handler(event)).rejects.toThrow('Falha de rede');
  });
});
