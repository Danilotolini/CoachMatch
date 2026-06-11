import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../update-student-profile/repository.js', () => ({
  updateStudentProfile: vi.fn(),
}));

import { handler } from '../update-student-profile/handler.js';
import { updateProfile } from '../update-student-profile/index.js';
import { studentProfileSchema } from '../update-student-profile/schema.js';
import { updateStudentProfile } from '../update-student-profile/repository.js';
import { ValidationException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STUDENT_ID = 'student-abc';

const validProfileData = {
  phone: '+5511987654321',
  birthDate: '1995-06-15',
  gender: 'F',
  cep: '01310-100',
  city: 'São Paulo',
  state: 'SP',
  radius: 10,
  goal: 'Emagrecer e ganhar condicionamento',
};

const buildAuthEvent = (body = validProfileData, studentId = STUDENT_ID) => ({
  requestContext: {
    authorizer: { jwt: { claims: { sub: studentId } } },
  },
  body: JSON.stringify(body),
});

// ─── Schema ──────────────────────────────────────────────────────────────────
describe('update-student-profile › schema', () => {
  it('aceita payload válido completo', () => {
    const { error } = studentProfileSchema.validate(validProfileData);
    expect(error).toBeUndefined();
  });

  it('rejeita telefone sem código do país +55', () => {
    const { error } = studentProfileSchema.validate({ ...validProfileData, phone: '11987654321' });
    expect(error?.details[0].path).toContain('phone');
  });

  it('rejeita telefone com formato inválido', () => {
    const { error } = studentProfileSchema.validate({ ...validProfileData, phone: '+55119876' });
    expect(error?.details[0].path).toContain('phone');
  });

  it('aceita gênero M, F e O', () => {
    for (const gender of ['M', 'F', 'O']) {
      const { error } = studentProfileSchema.validate({ ...validProfileData, gender });
      expect(error, `gênero "${gender}" deve ser válido`).toBeUndefined();
    }
  });

  it('rejeita gênero inválido', () => {
    const { error } = studentProfileSchema.validate({ ...validProfileData, gender: 'X' });
    expect(error?.details[0].path).toContain('gender');
  });

  it('rejeita CEP sem hífen', () => {
    const { error } = studentProfileSchema.validate({ ...validProfileData, cep: '01310100' });
    expect(error?.details[0].path).toContain('cep');
  });

  it('rejeita state com mais de 2 caracteres', () => {
    const { error } = studentProfileSchema.validate({ ...validProfileData, state: 'SPA' });
    expect(error?.details[0].path).toContain('state');
  });

  it('rejeita radius 0 (abaixo do mínimo)', () => {
    const { error } = studentProfileSchema.validate({ ...validProfileData, radius: 0 });
    expect(error?.details[0].path).toContain('radius');
  });

  it('rejeita radius 101 (acima do máximo)', () => {
    const { error } = studentProfileSchema.validate({ ...validProfileData, radius: 101 });
    expect(error?.details[0].path).toContain('radius');
  });

  it('rejeita birthDate que não é ISO', () => {
    const { error } = studentProfileSchema.validate({ ...validProfileData, birthDate: '15/06/1995' });
    expect(error?.details[0].path).toContain('birthDate');
  });
});

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('update-student-profile › index (updateProfile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateStudentProfile.mockResolvedValue(undefined);
  });

  it('chama updateStudentProfile com studentId e dados validados', async () => {
    await updateProfile(STUDENT_ID, validProfileData);

    expect(updateStudentProfile).toHaveBeenCalledOnce();
    expect(updateStudentProfile).toHaveBeenCalledWith(STUDENT_ID, expect.objectContaining({
      phone: validProfileData.phone,
      goal: validProfileData.goal,
    }));
  });

  it('lança ValidationException quando dados são inválidos', async () => {
    await expect(updateProfile(STUDENT_ID, { phone: 'invalido' }))
      .rejects
      .toBeInstanceOf(ValidationException);
  });

  it('inclui detalhes de todos os erros de validação (abortEarly: false)', async () => {
    try {
      await updateProfile(STUDENT_ID, { phone: 'ruim', email: 'nao-relevante' });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationException);
      expect(err.details).toBeDefined();
      expect(err.details.length).toBeGreaterThan(0);
    }
  });

  it('propaga erro do repositório', async () => {
    updateStudentProfile.mockRejectedValue(new Error('Timeout DynamoDB'));
    await expect(updateProfile(STUDENT_ID, validProfileData)).rejects.toThrow('Timeout DynamoDB');
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('update-student-profile › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateStudentProfile.mockResolvedValue(undefined);
  });

  it('retorna 200 após atualização bem-sucedida', async () => {
    const event = buildAuthEvent();
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/sucesso/i);
  });

  it('aceita body como objeto (não string)', async () => {
    const event = { ...buildAuthEvent(), body: validProfileData };
    const response = await handler(event);
    expect(response.statusCode).toBe(200);
  });

  it('retorna 401 quando não há token', async () => {
    const response = await handler({ body: JSON.stringify(validProfileData) });
    expect(response.statusCode).toBe(401);
  });

  it('retorna 422 quando dados do perfil são inválidos', async () => {
    const event = buildAuthEvent({ phone: 'invalido', gender: 'Z' });
    const response = await handler(event);

    expect(response.statusCode).toBe(422);
    const body = JSON.parse(response.body);
    expect(body.message).toBeDefined();
    expect(body.details).toBeDefined();
  });

  it('propaga erros inesperados sem tratar com 5xx silencioso', async () => {
    updateStudentProfile.mockRejectedValue(new Error('Falha crítica'));
    const event = buildAuthEvent();

    await expect(handler(event)).rejects.toThrow('Falha crítica');
  });
});
