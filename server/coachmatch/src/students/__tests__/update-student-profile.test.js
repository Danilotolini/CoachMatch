import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../update-student-profile/repository.js', () => ({
  updateStudentProfile: vi.fn(),
}));

vi.mock('../get-student/repository.js', () => ({
  findStudentById: vi.fn(),
}));

import { handler } from '../update-student-profile/handler.js';
import { updateProfile } from '../update-student-profile/index.js';
import { studentProfileSchema } from '../update-student-profile/schema.js';
import { updateStudentProfile } from '../update-student-profile/repository.js';
import { findStudentById } from '../get-student/repository.js';
import { ValidationException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STUDENT_ID = 'student-abc';

/** Formato enviado pelo front-end (phone formatado como "(11) 99999-9999") */
const frontendProfilePayload = {
  name: 'Ana Ferreira',
  phone: '(11) 98765-4321',
  birthDate: '1995-06-15',
  gender: 'F',
  cep: '01310-100',
  city: 'São Paulo',
  state: 'SP',
  radius: 10,
  goal: 'WEIGHT_LOSS',
};

const validProfileData = frontendProfilePayload;

const buildStudentRecord = () => ({
  studentId: STUDENT_ID,
  email: 'aluno@email.com',
  status: 'ONBOARDING_HEALTH',
  profile: { name: 'Maria' },
  phone: '+5511987654321',
  birthDate: '1995-06-15',
  gender: 'F',
  cep: '01310-100',
  city: 'São Paulo',
  state: 'SP',
  radius: 10,
  goal: 'WEIGHT_LOSS',
});

const buildAuthEvent = (body = frontendProfilePayload, studentId = STUDENT_ID) => ({
  requestContext: {
    authorizer: { jwt: { claims: { sub: studentId } } },
  },
  body: JSON.stringify(body),
});

// ─── Schema ──────────────────────────────────────────────────────────────────
describe('update-student-profile › schema', () => {
  it('aceita telefone no formato visual do front-end "(11) 99999-9999"', () => {
    const { error } = studentProfileSchema.validate(validProfileData);
    expect(error).toBeUndefined();
  });

  it('aceita telefone no formato E.164 "+5511987654321"', () => {
    const { error } = studentProfileSchema.validate({ ...validProfileData, phone: '+5511987654321' });
    expect(error).toBeUndefined();
  });

  it('rejeita telefone inválido (número incompleto)', () => {
    const { error } = studentProfileSchema.validate({ ...validProfileData, phone: '11987' });
    expect(error?.details[0].path).toContain('phone');
  });

  it('rejeita nome ausente', () => {
    const { name, ...withoutName } = validProfileData;
    const { error } = studentProfileSchema.validate(withoutName);
    expect(error?.details[0].path).toContain('name');
  });

  it('aceita gênero M, F, NB e NA', () => {
    for (const gender of ['M', 'F', 'NB', 'NA']) {
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

  it('aceita radius 5, 10, 20 (valores usados pelo front-end)', () => {
    for (const radius of [5, 10, 20]) {
      const { error } = studentProfileSchema.validate({ ...validProfileData, radius });
      expect(error, `radius ${radius} deve ser válido`).toBeUndefined();
    }
  });

  it('rejeita birthDate fora do formato ISO', () => {
    const { error } = studentProfileSchema.validate({ ...validProfileData, birthDate: '15/06/1995' });
    expect(error?.details[0].path).toContain('birthDate');
  });

  it('aceita photo_key opcional (key do S3)', () => {
    const { error, value } = studentProfileSchema.validate({
      ...validProfileData,
      photo_key: 'uploads/aluno-foto.jpg',
    });
    expect(error).toBeUndefined();
    expect(value.photo_key).toBe('uploads/aluno-foto.jpg');
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
      name: validProfileData.name,
      goal: validProfileData.goal,
    }));
  });

  it('repassa photo_key ao repositório quando enviado', async () => {
    await updateProfile(STUDENT_ID, { ...validProfileData, photo_key: 'uploads/aluno-foto.jpg' });

    expect(updateStudentProfile).toHaveBeenCalledWith(STUDENT_ID, expect.objectContaining({
      photo_key: 'uploads/aluno-foto.jpg',
    }));
  });

  it('lança ValidationException quando dados são inválidos', async () => {
    await expect(updateProfile(STUDENT_ID, { phone: 'invalido' }))
      .rejects
      .toBeInstanceOf(ValidationException);
  });

  it('retorna todos os erros juntos (abortEarly: false)', async () => {
    try {
      await updateProfile(STUDENT_ID, { phone: 'ruim', gender: 'Z' });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationException);
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
    findStudentById.mockResolvedValue(buildStudentRecord());
  });

  it('retorna 200 com o perfil atualizado do cliente', async () => {
    const response = await handler(buildAuthEvent());

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.clientId).toBe(STUDENT_ID);
    expect(body.status).toBe('ONBOARDING_HEALTH');
  });

  it('normaliza telefone "(11) 98765-4321" para "+5511987654321" antes da validação', async () => {
    const event = buildAuthEvent({ ...validProfileData, phone: '(11) 98765-4321' });
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    // Verifica que o perfil salvo tem o telefone normalizado
    expect(updateStudentProfile).toHaveBeenCalledWith(
      STUDENT_ID,
      expect.objectContaining({ phone: '+5511987654321' })
    );
  });

  it('não altera telefone já no formato E.164', async () => {
    const event = buildAuthEvent({ ...validProfileData, phone: '+5511987654321' });
    await handler(event);

    expect(updateStudentProfile).toHaveBeenCalledWith(
      STUDENT_ID,
      expect.objectContaining({ phone: '+5511987654321' })
    );
  });

  it('aceita body como objeto JavaScript (não string)', async () => {
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
    expect(body.details).toBeDefined();
  });

  it('propaga erros inesperados sem tratar com 5xx silencioso', async () => {
    updateStudentProfile.mockRejectedValue(new Error('Falha crítica'));
    const event = buildAuthEvent();

    await expect(handler(event)).rejects.toThrow('Falha crítica');
  });
});
