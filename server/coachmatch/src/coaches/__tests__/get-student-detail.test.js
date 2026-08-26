import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../get-student-detail/repository.js', () => ({
  coachHasSessionWithStudent: vi.fn(),
  findStudentById: vi.fn(),
}));

import { handler } from '../get-student-detail/handler.js';
import { getStudentDetailForCoach } from '../get-student-detail/index.js';
import {
  coachHasSessionWithStudent,
  findStudentById,
} from '../get-student-detail/repository.js';
import { ForbiddenException, NotFoundException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const COACH_ID = 'coach-123';
const STUDENT_ID = 'student-456';

const buildEvent = ({ coachId = COACH_ID, studentId = STUDENT_ID } = {}) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: coachId } } } },
  pathParameters: { studentId },
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
  goal: 'WEIGHT_LOSS',
  health: {
    answers: { heart: 'NO', chest_pain: 'NO', dizziness: 'YES', bone_joint: 'NO', medication: 'NO' },
    notes: 'testes observacoes',
    lgpdConsent: true,
    medicalDisclaimer: true,
  },
  ...overrides,
});

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('get-student-detail › index (getStudentDetailForCoach)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna apenas campos de treino, sem dados de contato', async () => {
    coachHasSessionWithStudent.mockResolvedValue(true);
    findStudentById.mockResolvedValue(buildStudentRecord());

    const result = await getStudentDetailForCoach({ coachId: COACH_ID, studentId: STUDENT_ID });

    expect(result).toEqual({
      studentId: STUDENT_ID,
      name: 'Maria Santos',
      gender: 'F',
      birthDate: '1995-06-15',
      goal: 'WEIGHT_LOSS',
      health: {
        answers: { heart: 'NO', chest_pain: 'NO', dizziness: 'YES', bone_joint: 'NO', medication: 'NO' },
        notes: 'testes observacoes',
        lgpdConsent: true,
        medicalDisclaimer: true,
      },
    });
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('phone');
    expect(result).not.toHaveProperty('cep');
    expect(result).not.toHaveProperty('city');
  });

  it('mapeia campos ausentes para null', async () => {
    coachHasSessionWithStudent.mockResolvedValue(true);
    findStudentById.mockResolvedValue({ studentId: STUDENT_ID, profile: {} });

    const result = await getStudentDetailForCoach({ coachId: COACH_ID, studentId: STUDENT_ID });

    expect(result.name).toBeNull();
    expect(result.gender).toBeNull();
    expect(result.birthDate).toBeNull();
    expect(result.goal).toBeNull();
    expect(result.health).toBeNull();
  });

  it('lança ForbiddenException quando não há vínculo de sessão', async () => {
    coachHasSessionWithStudent.mockResolvedValue(false);

    await expect(
      getStudentDetailForCoach({ coachId: COACH_ID, studentId: STUDENT_ID }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findStudentById).not.toHaveBeenCalled();
  });

  it('lança NotFoundException quando o aluno não existe', async () => {
    coachHasSessionWithStudent.mockResolvedValue(true);
    findStudentById.mockResolvedValue(null);

    await expect(
      getStudentDetailForCoach({ coachId: COACH_ID, studentId: STUDENT_ID }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checa o vínculo com coachId e studentId corretos', async () => {
    coachHasSessionWithStudent.mockResolvedValue(true);
    findStudentById.mockResolvedValue(buildStudentRecord());

    await getStudentDetailForCoach({ coachId: COACH_ID, studentId: STUDENT_ID });

    expect(coachHasSessionWithStudent).toHaveBeenCalledWith(COACH_ID, STUDENT_ID);
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('get-student-detail › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com o detalhe do aluno', async () => {
    coachHasSessionWithStudent.mockResolvedValue(true);
    findStudentById.mockResolvedValue(buildStudentRecord());

    const response = await handler(buildEvent());

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.studentId).toBe(STUDENT_ID);
    expect(body.name).toBe('Maria Santos');
    expect(body.health.notes).toBe('testes observacoes');
  });

  it('retorna 401 quando não há coach autenticado', async () => {
    const response = await handler({ requestContext: {}, pathParameters: { studentId: STUDENT_ID } });
    expect(response.statusCode).toBe(401);
  });

  it('retorna 400 quando falta studentId', async () => {
    const response = await handler({
      requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
    });
    expect(response.statusCode).toBe(400);
  });

  it('retorna 403 quando não há vínculo', async () => {
    coachHasSessionWithStudent.mockResolvedValue(false);

    const response = await handler(buildEvent());

    expect(response.statusCode).toBe(403);
  });

  it('retorna 404 quando o aluno não existe', async () => {
    coachHasSessionWithStudent.mockResolvedValue(true);
    findStudentById.mockResolvedValue(null);

    const response = await handler(buildEvent());

    expect(response.statusCode).toBe(404);
  });

  it('retorna 500 em erros inesperados', async () => {
    coachHasSessionWithStudent.mockRejectedValue(new Error('Falha de rede'));
    const result = await handler(buildEvent());
    expect(result.statusCode).toBe(500);
  });
});
