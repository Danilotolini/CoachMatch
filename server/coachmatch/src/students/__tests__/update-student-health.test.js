import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../update-student-health/repository.js', () => ({
  updateStudentHealth: vi.fn(),
}));

import { handler } from '../update-student-health/handler.js';
import { updateHealth } from '../update-student-health/index.js';
import { studentHealthSchema } from '../update-student-health/schema.js';
import { updateStudentHealth } from '../update-student-health/repository.js';
import { ValidationException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STUDENT_ID = 'student-health-123';

const validHealthData = {
  weight: 75.5,
  height: 178,
  fitnessLevel: 'INTERMEDIARIO',
  healthConditions: ['Hipertensão leve'],
};

const buildAuthEvent = (body = validHealthData, studentId = STUDENT_ID) => ({
  requestContext: {
    authorizer: { jwt: { claims: { sub: studentId } } },
  },
  body: JSON.stringify(body),
});

// ─── Schema ──────────────────────────────────────────────────────────────────
describe('update-student-health › schema', () => {
  it('aceita payload válido completo', () => {
    const { error } = studentHealthSchema.validate(validHealthData);
    expect(error).toBeUndefined();
  });

  it('aceita todos os níveis de condicionamento válidos', () => {
    const levels = ['SEDENTARIO', 'INICIANTE', 'INTERMEDIARIO', 'AVANCADO'];
    for (const fitnessLevel of levels) {
      const { error } = studentHealthSchema.validate({ ...validHealthData, fitnessLevel });
      expect(error, `"${fitnessLevel}" deve ser válido`).toBeUndefined();
    }
  });

  it('rejeita fitnessLevel inválido', () => {
    const { error } = studentHealthSchema.validate({ ...validHealthData, fitnessLevel: 'EXPERT' });
    expect(error?.details[0].path).toContain('fitnessLevel');
  });

  it('rejeita peso 0 (não positivo)', () => {
    const { error } = studentHealthSchema.validate({ ...validHealthData, weight: 0 });
    expect(error?.details[0].path).toContain('weight');
  });

  it('rejeita peso acima de 300 kg', () => {
    const { error } = studentHealthSchema.validate({ ...validHealthData, weight: 301 });
    expect(error?.details[0].path).toContain('weight');
  });

  it('aceita peso negativo? Não — deve rejeitar', () => {
    const { error } = studentHealthSchema.validate({ ...validHealthData, weight: -5 });
    expect(error?.details[0].path).toContain('weight');
  });

  it('rejeita altura abaixo de 100 cm', () => {
    const { error } = studentHealthSchema.validate({ ...validHealthData, height: 99 });
    expect(error?.details[0].path).toContain('height');
  });

  it('rejeita altura acima de 250 cm', () => {
    const { error } = studentHealthSchema.validate({ ...validHealthData, height: 251 });
    expect(error?.details[0].path).toContain('height');
  });

  it('usa [] como default quando healthConditions está ausente', () => {
    const { error, value } = studentHealthSchema.validate({
      weight: 70,
      height: 170,
      fitnessLevel: 'SEDENTARIO',
    });
    expect(error).toBeUndefined();
    expect(value.healthConditions).toEqual([]);
  });

  it('aceita healthConditions como array de strings', () => {
    const { error } = studentHealthSchema.validate({
      ...validHealthData,
      healthConditions: ['Diabetes tipo 2', 'Asma'],
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
      weight: validHealthData.weight,
      height: validHealthData.height,
      fitnessLevel: validHealthData.fitnessLevel,
    }));
  });

  it('lança ValidationException para dados inválidos', async () => {
    await expect(updateHealth(STUDENT_ID, { weight: -10, height: 50, fitnessLevel: 'NINJA' }))
      .rejects
      .toBeInstanceOf(ValidationException);
  });

  it('retorna todos os erros de uma vez (abortEarly: false)', async () => {
    try {
      await updateHealth(STUDENT_ID, { weight: 999, height: 50, fitnessLevel: 'GURU' });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationException);
      expect(err.details.length).toBeGreaterThanOrEqual(3);
    }
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
  });

  it('retorna 200 após atualização bem-sucedida', async () => {
    const response = await handler(buildAuthEvent());

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/sucesso/i);
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

  it('retorna 422 para dados de saúde inválidos', async () => {
    const event = buildAuthEvent({ weight: 999, height: 10, fitnessLevel: 'ALIEN' });
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
