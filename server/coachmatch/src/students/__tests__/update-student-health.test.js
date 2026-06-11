import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../update-student-health/repository.js', () => ({
  updateStudentHealth: vi.fn(),
}));

vi.mock('../get-student/repository.js', () => ({
  findStudentById: vi.fn(),
}));

import { handler } from '../update-student-health/handler.js';
import { updateHealth } from '../update-student-health/index.js';
import { studentHealthSchema } from '../update-student-health/schema.js';
import { updateStudentHealth } from '../update-student-health/repository.js';
import { findStudentById } from '../get-student/repository.js';
import { ValidationException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STUDENT_ID = 'student-health-123';

const validHealthData = {
  answers: {
    heart: 'NO',
    chest_pain: 'NO',
    dizziness: 'NO',
    bone_joint: 'NO',
    medication: 'NO',
  },
  notes: '',
  lgpdConsent: true,
  medicalDisclaimer: true,
};

const buildStudentRecord = () => ({
  studentId: STUDENT_ID,
  email: 'aluno@email.com',
  status: 'ACTIVE',
  profile: { name: 'Maria' },
  health: validHealthData,
});

const buildAuthEvent = (body = validHealthData, studentId = STUDENT_ID) => ({
  requestContext: {
    authorizer: { jwt: { claims: { sub: studentId } } },
  },
  body: JSON.stringify(body),
});

// ─── Schema ──────────────────────────────────────────────────────────────────
describe('update-student-health › schema (PAR-Q)', () => {
  it('aceita payload PAR-Q válido completo', () => {
    const { error } = studentHealthSchema.validate(validHealthData);
    expect(error).toBeUndefined();
  });

  it('aceita respostas YES nas perguntas', () => {
    const { error } = studentHealthSchema.validate({
      ...validHealthData,
      answers: { ...validHealthData.answers, heart: 'YES' },
    });
    expect(error).toBeUndefined();
  });

  it('rejeita quando lgpdConsent é false', () => {
    const { error } = studentHealthSchema.validate({ ...validHealthData, lgpdConsent: false });
    expect(error?.details[0].path).toContain('lgpdConsent');
  });

  it('rejeita quando medicalDisclaimer é false', () => {
    const { error } = studentHealthSchema.validate({ ...validHealthData, medicalDisclaimer: false });
    expect(error?.details[0].path).toContain('medicalDisclaimer');
  });

  it('rejeita quando answers está ausente', () => {
    const { error } = studentHealthSchema.validate({ lgpdConsent: true, medicalDisclaimer: true });
    expect(error?.details[0].path).toContain('answers');
  });

  it('usa string vazia como default para notes ausente', () => {
    const { error, value } = studentHealthSchema.validate({
      answers: validHealthData.answers,
      lgpdConsent: true,
      medicalDisclaimer: true,
    });
    expect(error).toBeUndefined();
    expect(value.notes).toBe('');
  });

  it('aceita notes com texto livre', () => {
    const { error } = studentHealthSchema.validate({
      ...validHealthData,
      notes: 'Cirurgia no joelho em 2023',
    });
    expect(error).toBeUndefined();
  });
});

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('update-student-health › index (updateHealth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateStudentHealth.mockResolvedValue(undefined);
  });

  it('chama updateStudentHealth com studentId e dados validados', async () => {
    await updateHealth(STUDENT_ID, validHealthData);

    expect(updateStudentHealth).toHaveBeenCalledOnce();
    expect(updateStudentHealth).toHaveBeenCalledWith(STUDENT_ID, expect.objectContaining({
      answers: validHealthData.answers,
      lgpdConsent: true,
      medicalDisclaimer: true,
    }));
  });

  it('lança ValidationException quando lgpdConsent é false', async () => {
    await expect(updateHealth(STUDENT_ID, { ...validHealthData, lgpdConsent: false }))
      .rejects
      .toBeInstanceOf(ValidationException);
  });

  it('lança ValidationException quando answers está ausente', async () => {
    await expect(updateHealth(STUDENT_ID, { lgpdConsent: true, medicalDisclaimer: true }))
      .rejects
      .toBeInstanceOf(ValidationException);
  });

  it('propaga erro do repositório', async () => {
    updateStudentHealth.mockRejectedValue(new Error('Conexão perdida'));
    await expect(updateHealth(STUDENT_ID, validHealthData)).rejects.toThrow('Conexão perdida');
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('update-student-health › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateStudentHealth.mockResolvedValue(undefined);
    findStudentById.mockResolvedValue(buildStudentRecord());
  });

  it('retorna 200 com o perfil atualizado do cliente', async () => {
    const response = await handler(buildAuthEvent());

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.clientId).toBe(STUDENT_ID);
    expect(body.status).toBe('ACTIVE');
  });

  it('aceita body como objeto JavaScript (não string)', async () => {
    const event = { ...buildAuthEvent(), body: validHealthData };
    const response = await handler(event);
    expect(response.statusCode).toBe(200);
  });

  it('retorna 401 quando não há sub no JWT', async () => {
    const response = await handler({ body: JSON.stringify(validHealthData) });
    expect(response.statusCode).toBe(401);
  });

  it('retorna 401 quando event é undefined', async () => {
    const response = await handler(undefined);
    expect(response.statusCode).toBe(401);
  });

  it('retorna 422 quando lgpdConsent não foi aceito', async () => {
    const event = buildAuthEvent({ ...validHealthData, lgpdConsent: false });
    const response = await handler(event);

    expect(response.statusCode).toBe(422);
    const body = JSON.parse(response.body);
    expect(body.details).toBeDefined();
  });

  it('propaga erros inesperados (não trata 500 silenciosamente)', async () => {
    updateStudentHealth.mockRejectedValue(new Error('Erro inesperado'));
    const event = buildAuthEvent();

    await expect(handler(event)).rejects.toThrow('Erro inesperado');
  });
});
